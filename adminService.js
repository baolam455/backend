const adminModel = require('../models/adminModel');
const supabase = require('../config/supabase');

exports.listAllUsers = async () => {
    const { data, error } = await adminModel.fetchAllProfiles();
    if (error) throw new Error(error.message);
    return data;
};

exports.changeRole = async (userId, newRole) => {
    // Logic kiểm tra role hợp lệ (Nếu chưa làm ở Validation Middleware)
    const validRoles = ['admin', 'dispatcher', 'warehouse', 'customer', 'shipper'];
    if (!validRoles.includes(newRole)) {
        throw new Error("Role không hợp lệ");
    }

    const { error } = await adminModel.updateUserRole(userId, newRole);
    if (error) throw new Error(error.message);
    return { message: `Đã đổi quyền thành công sang ${newRole}` };
};

exports.terminateUser = async (userId) => {
    if (!userId) throw new Error("Thiếu ID người dùng");

    const { error } = await adminModel.removeUserAuth(userId);
    if (error) throw new Error(error.message);
    return { message: "Đã xóa người dùng vĩnh viễn" };
};

exports.changeStatus = async (userId, status) => {
    const validStatuses = ['active', 'locked_short', 'locked_long', 'disabled'];
    if (!validStatuses.includes(status)) {
        throw new Error("Trạng thái không hợp lệ");
    }

    const lockDays = status === 'locked_short' ? 7 : status === 'locked_long' ? 365 : null;
    const lockedUntil = lockDays
        ? new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error } = await adminModel.updateUserStatus(userId, status, lockedUntil);
    if (error) throw new Error(error.message);
    return { message: "Đã cập nhật trạng thái tài khoản" };
};

exports.createProfile = async (input) => {
    // Bước 1: Tạo Auth user — truyền đủ metadata để trigger handle_new_auth_user
    // có thể tạo profile với dữ liệu gần đúng nhất có thể.
    // email_confirm: true → kích hoạt tài khoản ngay, không cần verify email.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
            full_name: input.fullName,
            role: input.role,
            phone: input.phone || null,
            warehouse_name: input.warehouseName || null,
        },
    });

    if (authError) throw new Error(authError.message);

    const authUserId = authData.user.id;

    // Bước 2: Upsert profile — trigger có thể đã insert row trước đó.
    // Upsert sẽ ghi đè toàn bộ field bằng giá trị admin muốn (role, status, warehouse...).
    const { data, error } = await adminModel.createProfile({
        id: authUserId,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        status: 'active',
        warehouse_name: input.warehouseName || null,
    });

    if (error) {
        // Rollback: xóa Auth user vừa tạo để tránh orphan account
        await supabase.auth.admin.deleteUser(authUserId);
        throw new Error(error.message);
    }

    // Bước 3: Nếu role là customer thì phải tạo customer_profiles.
    // Lý do: orders.customer_id references customer_profiles(id) —
    // nếu không có row này, customer đăng nhập được nhưng không tạo đơn hàng được.
    if (input.role === 'customer') {
        const { error: cpError } = await adminModel.createCustomerProfile({
            id: authUserId,
            store_name: input.fullName,
            email: input.email,
            phone: input.phone || null,
            address: 'Chưa cập nhật',
        });
        if (cpError) {
            // Rollback toàn bộ nếu tạo customer_profile thất bại
            await supabase.auth.admin.deleteUser(authUserId);
            throw new Error("Lỗi tạo customer profile: " + cpError.message);
        }
    }

    return data;
};

function toOrderDto(order, customerMap) {
    const customer = customerMap.get(order.customer_id);
    return {
        id: order.id,
        code: order.order_code,
        customerName: customer?.store_name || customer?.email || "Khách hàng",
        receiverName: order.receiver_name || "",
        route: [order.receiver_ward, order.receiver_province].filter(Boolean).join(", ") ||
            order.receiver_address ||
            "Chưa có tuyến",
        status: order.status,
        codAmount: Number(order.cod_amount || 0),
        shippingFee: Number(order.shipping_fee || 0),
        assignedShipper: order.assigned_shipper || undefined,
        createdAt: order.created_at,
        updatedAt: order.updated_at || order.created_at,
    };
}

exports.listOrders = async () => {
    const [{ data: orders, error }, { data: customers }] = await Promise.all([
        adminModel.fetchOrders(),
        adminModel.fetchCustomerProfiles(),
    ]);

    if (error) throw new Error(error.message);

    const customerMap = new Map((customers || []).map((customer) => [customer.id, customer]));
    return (orders || []).map((order) => toOrderDto(order, customerMap));
};

exports.changeOrderStatus = async (orderId, status) => {
    const { data, error } = await adminModel.updateOrderStatus(orderId, status);
    if (error || !data) throw new Error(error?.message || "Không tìm thấy đơn hàng");

    await adminModel.insertTracking({
        order_id: data.id,
        status,
        note: "Admin cập nhật trạng thái đơn hàng",
        location:
            [data.receiver_ward, data.receiver_province].filter(Boolean).join(", ") ||
            data.receiver_address ||
            "Hệ thống",
    });

    return { message: "Đã cập nhật trạng thái đơn hàng" };
};

exports.listPostOffices = async () => {
    const { data, error } = await adminModel.fetchPostOffices();
    if (error) throw new Error(error.message);
    return data || [];
};

exports.listShippingFeeRules = async () => {
    const { data, error } = await adminModel.fetchShippingFeeRules();
    if (error) throw new Error(error.message);
    return data || [];
};

exports.toggleShippingFeeRule = async (ruleId, active) => {
    const { error } = await adminModel.updateShippingFeeRule(ruleId, { active });
    if (error) throw new Error(error.message);
    return { message: "Đã cập nhật cấu hình phí" };
};
