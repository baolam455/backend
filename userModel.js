// supabase từ config đã dùng SUPABASE_SERVICE_ROLE_KEY — không cần tạo adminClient riêng
const supabase = require('../config/supabase');

exports.getProfileById = async (userId) => {
    return await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, status, warehouse_name, created_at, updated_at")
        .eq("id", userId)
        .single();
};

exports.getCustomerProfileById = async (userId) => {
    return await supabase
        .from("customer_profiles")
        .select("id, store_name, phone, email, address, avatar_url, cccd_front_url, cccd_back_url, business_license_url, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();
};

exports.updateProfile = async (userId, updateData) => {
    return await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();
};

exports.updateCustomerProfile = async (userId, updateData) => {
    return await supabase
        .from("customer_profiles")
        .update(updateData)
        .eq("id", userId)
        .select()
        .maybeSingle();
};

exports.deleteAuthUser = async (userId) => {
    return await supabase.auth.admin.deleteUser(userId);
};
