const jwt = require('jsonwebtoken');
const userModel = require('../models/authModel');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenHelper');

exports.registerUser = async (userData) => {
    const { email, password, full_name, phone, address } = userData;

    const metadata = { full_name, phone, address, role: 'customer' };

    // 1. Tạo Auth user — trigger on_auth_user_created sẽ tự tạo profile tối giản ngay sau đây
    const { data: authUser, error: authError } = await userModel.createAuthUser(email, password, metadata);
    if (authError) throw new Error(authError.message);

    if (authUser.user) {
        const authUserId = authUser.user.id;

        // 2. Upsert profile đầy đủ (trigger có thể đã tạo bản ghi rỗng trước)
        const { error: profileError } = await userModel.createProfile({
            id: authUserId,
            full_name,
            email,
            phone,
            role: 'customer',
            status: 'active',
        });
        if (profileError) {
            // Xóa auth user → trigger cascade sẽ xóa profile theo
            await userModel.deleteAuthUser(authUserId);
            throw new Error("Lỗi lưu profile: " + profileError.message);
        }

        // 3. Upsert customer profile
        const { error: customerError } = await userModel.createCustomerProfile({
            id: authUserId,
            store_name: full_name,
            phone,
            email,
            address: address || 'Chưa cập nhật',
        });
        if (customerError) {
            // Xóa auth user → cascade xóa profiles
            await userModel.deleteAuthUser(authUserId);
            throw new Error("Lỗi lưu thông tin khách hàng: " + customerError.message);
        }
    }

    return { message: "Đăng ký thành công!" };
};

exports.loginUser = async (account, password) => {
    const rawAccount = String(account || '').trim();
    let email = rawAccount.toLowerCase();

    // ── 1. Nếu nhập SĐT → tìm email tương ứng ──────────────────────────────
    if (!rawAccount.includes('@')) {
        const phone = rawAccount.replace(/\D/g, '');
        if (!/^[0-9]{10}$/.test(phone)) {
            throw new Error("Số điện thoại phải có 10 chữ số hoặc nhập email hợp lệ");
        }
        email = await userModel.findEmailByPhone(phone);
        if (!email) throw new Error("Sai thông tin đăng nhập");
    }

    // ── 2. Kiểm tra trạng thái tài khoản TRƯỚC khi gọi Supabase Auth ────────
    //      Điều này tránh bị Supabase rate-limit toàn hệ thống
    const preCheck = await userModel.getProfileByEmail(email);

    if (preCheck) {
        if (preCheck.status === 'locked_short' || preCheck.is_locked) {
            // Thử tự động mở khóa nếu đã hết thời gian
            const autoUnlocked = await userModel.tryAutoUnlock(preCheck.id, preCheck.locked_until);
            if (!autoUnlocked) {
                // Tính thời gian còn lại
                const remainMs = preCheck.locked_until
                    ? Math.max(0, new Date(preCheck.locked_until) - new Date())
                    : 0;
                const remainMin = Math.ceil(remainMs / 60000);
                throw new Error(
                    remainMin > 0
                        ? `Tài khoản bị khóa tạm thời do nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainMin} phút.`
                        : "Tài khoản đang bị khóa tạm thời, vui lòng thử lại sau."
                );
            }
            // Đã auto-unlock → tiếp tục đăng nhập bình thường
        } else if (preCheck.status === 'locked_long' || preCheck.status === 'disabled') {
            throw new Error("Tài khoản đang bị khóa vĩnh viễn, vui lòng liên hệ admin.");
        }
    }

    // ── 3. Xác thực với Supabase Auth ────────────────────────────────────────
    const { data, error } = await userModel.signInAuth(email, password);

    if (error) {
        // Đăng nhập sai → tăng counter cho đúng tài khoản này
        const result = await userModel.incrementFailedLogin(email);

        if (result?.isNowLocked) {
            throw new Error(
                `Tài khoản bị khóa tạm thời 15 phút do nhập sai mật khẩu ${result.attempts} lần liên tiếp.`
            );
        }

        if (result) {
            const left = result.remainingAttempts;
            throw new Error(
                left > 0
                    ? `Sai thông tin đăng nhập. Còn ${left} lần thử trước khi tài khoản bị khóa.`
                    : "Sai thông tin đăng nhập."
            );
        }

        throw new Error("Sai thông tin đăng nhập");
    }

    // ── 4. Lấy profile đầy đủ ────────────────────────────────────────────────
    const { data: profile, error: profileError } = await userModel.getUserProfile(data.user.id);
    if (profileError || !profile) throw new Error("Sai thông tin đăng nhập");

    // ── 5. Kiểm tra lần cuối (phòng race condition) ───────────────────────────
    if (profile.status !== 'active') {
        if (profile.status === 'locked_short' && profile.locked_until) {
            const autoUnlocked = await userModel.tryAutoUnlock(profile.id, profile.locked_until);
            if (!autoUnlocked) {
                throw new Error("Tài khoản đang bị khóa tạm thời, vui lòng thử lại sau.");
            }
        } else {
            throw new Error("Tài khoản đang bị khóa, vui lòng liên hệ admin.");
        }
    }

    // ── 6. Đăng nhập thành công → reset failed counter ───────────────────────
    await userModel.resetFailedLogin(profile.id);

    // ── 7. Cấp token ──────────────────────────────────────────────────────────
    const accessToken = generateAccessToken({ id: data.user.id, role: profile.role });
    const refreshToken = generateRefreshToken({ id: data.user.id });

    return { accessToken, refreshToken, role: profile.role, user: profile };
};

exports.refreshSession = async (oldRefreshToken) => {
    // 1. Xác thực Refresh Token
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);

    // 2. Kiểm tra profile
    const { data: profile, error } = await userModel.getUserProfile(decoded.id);
    if (error || !profile) throw new Error("User không tồn tại");
    if (profile.status !== 'active') throw new Error("Tài khoản đang bị khóa");

    // 3. Cấp token mới (xoay vòng)
    const accessToken = generateAccessToken({ id: decoded.id, role: profile.role });
    const refreshToken = generateRefreshToken({ id: decoded.id });

    return { accessToken, refreshToken };
};