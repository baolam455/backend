const supabase = require('../config/supabase');

// Lấy tất cả profiles
exports.fetchAllProfiles = async () => {
    return await supabase.from('profiles').select('*');
};

exports.createProfile = async (profileData) => {
    // Dùng upsert thay vì insert để tránh conflict với trigger handle_new_auth_user.
    // Trigger tạo row profiles trước khi code này chạy → insert sẽ fail duplicate key.
    // onConflict: 'id' → nếu đã tồn tại thì UPDATE các field bằng giá trị mình muốn.
    return await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();
};

// Tạo customer_profiles khi admin tạo tài khoản có role='customer'
// orders.customer_id references customer_profiles(id) → nếu thiếu thì không tạo đơn được.
exports.createCustomerProfile = async (customerData) => {
    return await supabase
        .from('customer_profiles')
        .upsert(customerData, { onConflict: 'id' })
        .select()
        .single();
};

// Cập nhật role theo ID
exports.updateUserRole = async (userId, newRole) => {
    return await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
};

exports.updateUserStatus = async (userId, status, lockedUntil = null) => {
    return await supabase
        .from('profiles')
        .update({
            status,
            locked_until: lockedUntil,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
};

exports.fetchOrders = async () => {
    return await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
};

exports.fetchCustomerProfiles = async () => {
    return await supabase.from('customer_profiles').select('id, store_name, email, phone');
};

exports.updateOrderStatus = async (orderId, status) => {
    const patch = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (status === 'picked_up') patch.pickup_at = new Date().toISOString();
    if (status === 'delivered') patch.delivered_at = new Date().toISOString();

    return await supabase
        .from('orders')
        .update(patch)
        .eq('id', orderId)
        .select('id, receiver_address, receiver_ward, receiver_province')
        .single();
};

exports.insertTracking = async (trackingData) => {
    return await supabase.from('order_tracking').insert(trackingData);
};

exports.fetchPostOffices = async () => {
    return await supabase
        .from('post_offices')
        .select('*')
        .order('province', { ascending: true })
        .order('district', { ascending: true });
};

exports.fetchShippingFeeRules = async () => {
    return await supabase
        .from('shipping_fee_rules')
        .select('*')
        .order('distance_from_km', { ascending: true });
};

exports.updateShippingFeeRule = async (ruleId, patch) => {
    return await supabase.from('shipping_fee_rules').update(patch).eq('id', ruleId);
};

// Xóa user khỏi hệ thống Auth (kéo theo xóa Profile)
exports.removeUserAuth = async (userId) => {
    return await supabase.auth.admin.deleteUser(userId);
};
