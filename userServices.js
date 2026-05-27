const { createClient } = require('@supabase/supabase-js');
const userModel = require('../models/userModel');
const supabase = require('../config/supabase');

function mergeProfile(profile, customerProfile) {
    return {
        ...(profile || {}),
        ...(customerProfile || {}),
        id: profile?.id || customerProfile?.id,
        full_name: profile?.full_name || customerProfile?.store_name,
        store_name: customerProfile?.store_name || profile?.full_name,
        email: profile?.email || customerProfile?.email,
        phone: profile?.phone || customerProfile?.phone || '',
        role: profile?.role || 'customer',
        status: profile?.status || 'active',
    };
}

exports.getMyProfile = async (userId) => {
    const [{ data: profile, error }, { data: customerProfile }] = await Promise.all([
        userModel.getProfileById(userId),
        userModel.getCustomerProfileById(userId),
    ]);

    if (error || !profile) throw new Error("Không tìm thấy profile người dùng");
    return mergeProfile(profile, customerProfile);
};

exports.updateMyProfile = async (userId, updateData) => {
    if ('role' in updateData || 'status' in updateData) {
        throw new Error("FORBIDDEN_ROLE_CHANGE");
    }

    const profilePatch = {};
    const customerPatch = {};

    if (updateData.full_name !== undefined) {
        profilePatch.full_name = updateData.full_name;
        customerPatch.store_name = updateData.full_name;
    }
    if (updateData.phone !== undefined) {
        profilePatch.phone = updateData.phone;
        customerPatch.phone = updateData.phone;
    }
    if (updateData.address !== undefined) {
        customerPatch.address = updateData.address;
    }
    if (updateData.avatar_url !== undefined) {
        customerPatch.avatar_url = updateData.avatar_url;
    }
    if (Object.keys(profilePatch).length) {
        profilePatch.updated_at = new Date().toISOString();
        const { error } = await userModel.updateProfile(userId, profilePatch);
        if (error) throw new Error(error.message);
    }

    if (Object.keys(customerPatch).length) {
        customerPatch.updated_at = new Date().toISOString();
        await userModel.updateCustomerProfile(userId, customerPatch);
    }

    return exports.getMyProfile(userId);
};

exports.deleteMyAccount = async (userId) => {
    const { error } = await userModel.deleteAuthUser(userId);
    if (error) throw new Error(error.message);
    return { message: "Đã xóa tài khoản" };
};

// Đổi mật khẩu: xác minh mật khẩu cũ, rồi cập nhật mật khẩu mới qua Supabase Admin
exports.changeMyPassword = async (userId, { oldPassword, newPassword }) => {
    // 1. Lấy email của user từ profiles để verify mật khẩu cũ
    const { data: profile, error: profileError } = await userModel.getProfileById(userId);
    if (profileError || !profile) throw new Error("Không tìm thấy tài khoản");

    // 2. Tạo client tạm thời riêng để verify mật khẩu cũ.
    //    Lý do: dùng singleton service-role client để gọi signInWithPassword sẽ
    //    ghi đè auth session của client đó → có thể làm hỏng các admin ops song song.
    //    Client mới này chỉ dùng trong scope hàm này, không affect state toàn cục.
    const authClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { error: signInError } = await authClient.auth.signInWithPassword({
        email: profile.email,
        password: oldPassword,
    });
    if (signInError) throw new Error("Mật khẩu hiện tại không đúng");

    // 3. Cập nhật mật khẩu mới qua Admin API trên singleton client (không cần session)
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
    });
    if (updateError) throw new Error(updateError.message);

    return { message: "Đổi mật khẩu thành công" };
};
