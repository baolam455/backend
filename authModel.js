const supabase = require('../config/supabase');

// ─── Auth User ────────────────────────────────────────────────────────────────

exports.createAuthUser = async (email, password, metadata = {}) => {
    return await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
    });
};

exports.deleteAuthUser = async (userId) => {
    return await supabase.auth.admin.deleteUser(userId);
};

exports.signInAuth = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
};

// ─── Profile lookup ───────────────────────────────────────────────────────────

exports.findEmailByPhone = async (phone) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('phone', phone)
        .maybeSingle();

    if (profile?.email) return profile.email;

    const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('email')
        .eq('phone', phone)
        .maybeSingle();

    return customerProfile?.email || null;
};

exports.findExistingAccount = async ({ email, phone }) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '');

    const [{ data: profileByEmail }, { data: profileByPhone }, { data: customerByEmail }, { data: customerByPhone }] =
        await Promise.all([
            supabase.from('profiles').select('id, email, phone').eq('email', cleanEmail).maybeSingle(),
            cleanPhone
                ? supabase.from('profiles').select('id, email, phone').eq('phone', cleanPhone).maybeSingle()
                : Promise.resolve({ data: null }),
            supabase.from('customer_profiles').select('id, email, phone').eq('email', cleanEmail).maybeSingle(),
            cleanPhone
                ? supabase.from('customer_profiles').select('id, email, phone').eq('phone', cleanPhone).maybeSingle()
                : Promise.resolve({ data: null }),
        ]);

    return profileByEmail || profileByPhone || customerByEmail || customerByPhone || null;
};

// Lấy profile đầy đủ theo userId (dùng sau khi đăng nhập thành công)
exports.getUserProfile = async (userId) => {
    return await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, status, is_locked, locked_until, locked_at, failed_login_attempts, warehouse_name, created_at')
        .eq('id', userId)
        .single();
};

// Lấy profile theo email (dùng TRƯỚC khi đăng nhập để kiểm tra trạng thái khóa)
exports.getProfileByEmail = async (email) => {
    const { data } = await supabase
        .from('profiles')
        .select('id, status, is_locked, locked_until, locked_at, failed_login_attempts')
        .eq('email', email)
        .maybeSingle();
    return data || null;
};

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

// Dùng upsert thay vì insert để tránh lỗi duplicate key
// khi trigger on_auth_user_created đã tạo profile sẵn trước đó
exports.createProfile = async (profileData) => {
    return await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();
};

exports.createCustomerProfile = async (profileData) => {
    return await supabase
        .from('customer_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();
};

exports.deletePublicProfile = async (userId) => {
    await supabase.from('customer_profiles').delete().eq('id', userId);
    return await supabase.from('profiles').delete().eq('id', userId);
};

// ─── Login security ───────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;   // số lần sai tối đa
const LOCK_MINUTES = 15;  // khóa tạm thời bao nhiêu phút

/**
 * Tăng failed_login_attempts cho tài khoản.
 * Nếu đạt MAX_ATTEMPTS → tự động set status='locked_short', is_locked=true, locked_until=+15 phút.
 * Trả về { attempts, isNowLocked, lockedUntil }
 */
exports.incrementFailedLogin = async (email) => {
    const profile = await exports.getProfileByEmail(email);
    if (!profile) return null; // email không tồn tại → không làm gì

    const attempts = (profile.failed_login_attempts || 0) + 1;
    const now = new Date().toISOString();
    const shouldLock = attempts >= MAX_ATTEMPTS;

    const updatePayload = {
        failed_login_attempts: attempts,
        locked_at: now,
        ...(shouldLock && {
            status: 'locked_short',
            is_locked: true,
            locked_until: new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString(),
        }),
    };

    await supabase.from('profiles').update(updatePayload).eq('email', email);

    return {
        attempts,
        isNowLocked: shouldLock,
        lockedUntil: shouldLock ? updatePayload.locked_until : null,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
    };
};

/**
 * Reset failed_login_attempts về 0 sau khi đăng nhập thành công.
 */
exports.resetFailedLogin = async (userId) => {
    return await supabase
        .from('profiles')
        .update({ failed_login_attempts: 0, locked_at: null })
        .eq('id', userId);
};

/**
 * Tự động mở khóa nếu locked_until đã qua.
 * Trả về true nếu đã mở khóa, false nếu vẫn còn locked.
 */
exports.tryAutoUnlock = async (userId, lockedUntil) => {
    if (!lockedUntil || new Date(lockedUntil) > new Date()) return false;

    await supabase
        .from('profiles')
        .update({
            status: 'active',
            is_locked: false,
            locked_until: null,
            locked_at: null,
            failed_login_attempts: 0,
        })
        .eq('id', userId);

    return true;
};

/**
 * Mở khóa thủ công (admin dùng).
 */
exports.unlockProfile = async (userId) => {
    return await supabase
        .from('profiles')
        .update({
            status: 'active',
            is_locked: false,
            locked_until: null,
            locked_at: null,
            failed_login_attempts: 0,
        })
        .eq('id', userId);
};