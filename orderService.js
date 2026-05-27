const orderModel = require('../models/orderModel');

function generateOrderCode() {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TK${ymd}${rand}`;
}

function estimateDistanceKm(receiverProvince = '') {
    const province = receiverProvince.toLowerCase();

    if (
        province.includes('hcm') ||
        province.includes('hồ chí minh') ||
        province.includes('ho chi minh') ||
        province.includes('tp.hcm')
    ) {
        return 10;
    }

    return province ? 35 : 10;
}

function fallbackShippingFee(weightKg, shippingType) {
    const roundedWeight = Math.max(1, Math.ceil(weightKg || 1));
    const baseFee = shippingType === 'bbs' ? 35000 : 22000;
    return baseFee + Math.max(0, roundedWeight - 1) * 5000;
}

exports.calculateShippingFee = async ({ totalWeight, shippingType, receiverProvince }) => {
    const weightKg = Math.max(0.1, Number(totalWeight || 0.1));
    const distanceKm = estimateDistanceKm(receiverProvince);
    const { data, error } = await orderModel.fetchShippingFeeRules();

    if (error || !data?.length) {
        return fallbackShippingFee(weightKg, shippingType);
    }

    const matchedRule = data.find((rule) => {
        const distanceFrom = Number(rule.distance_from_km || 0);
        const distanceTo = Number(rule.distance_to_km || 0);
        const weightFrom = Number(rule.weight_from_kg || 0);
        const weightTo = Number(rule.weight_to_kg || 0);

        return (
            distanceKm >= distanceFrom &&
            distanceKm <= distanceTo &&
            weightKg >= weightFrom &&
            weightKg <= weightTo
        );
    });

    if (!matchedRule) return fallbackShippingFee(weightKg, shippingType);

    const baseFee = Number(matchedRule.base_fee || 0);
    const extraFeePerKg = Number(matchedRule.extra_fee_per_kg || 0);
    const weightFrom = Number(matchedRule.weight_from_kg || 0);
    const extraWeight = Math.max(0, Math.ceil(weightKg - weightFrom));

    return baseFee + extraWeight * extraFeePerKg;
};

exports.createOrder = async (customerId, input) => {
    const shippingFee = await exports.calculateShippingFee(input);
    const orderCode = generateOrderCode();

    const { data, error } = await orderModel.createOrder({
        customer_id: customerId,
        order_code: orderCode,
        shop_order_code: input.shopOrderCode || null,
        status: 'pending',
        receiver_phone: input.receiverPhone,
        receiver_name: input.receiverName,
        receiver_address: input.receiverAddress,
        receiver_ward: input.receiverWard || null,
        receiver_province: input.receiverProvince || null,
        shipping_type: input.shippingType,
        transport_type: input.transportType,
        pickup_method: input.pickupMethod,
        ship_payer: input.shipPayer,
        cod_amount: input.codAmount,
        product_value: input.productValue,
        shipping_fee: shippingFee,
        total_weight: input.totalWeight,
        product_name: input.productName,
        quantity: input.quantity,
        pickup_address: input.pickupAddress || null,
        notes: input.pickupNote || null,
    });

    if (error) throw new Error(error.message);

    await orderModel.insertTracking({
        order_id: data.id,
        status: 'pending',
        note: 'Đơn hàng đã được tạo thành công',
        location: 'Hệ thống',
    });

    return data;
};

exports.listOrders = async (customerId) => {
    const { data, error } = await orderModel.fetchOrdersByCustomer(customerId);
    if (error) throw new Error(error.message);
    return data || [];
};

exports.getOrder = async (customerId, orderId, role = 'customer') => {
    const { data, error } = await orderModel.fetchOrderById(orderId);
    if (error || !data) throw new Error('Không tìm thấy đơn hàng');
    if (role !== 'admin' && data.customer_id !== customerId) {
        throw new Error('Bạn không có quyền xem đơn hàng này');
    }
    return data;
};

exports.getTracking = async (customerId, orderId, role = 'customer') => {
    await exports.getOrder(customerId, orderId, role);
    const { data, error } = await orderModel.fetchTracking(orderId);
    if (error) throw new Error(error.message);
    return data || [];
};

exports.cancelOrder = async (customerId, orderId) => {
    const order = await exports.getOrder(customerId, orderId);
    if (order.status !== 'pending') {
        throw new Error('Chỉ có thể hủy đơn đang chờ lấy hàng');
    }

    const { error } = await orderModel.updateOrder(orderId, {
        status: 'cancelled',
        updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    await orderModel.insertTracking({
        order_id: orderId,
        status: 'cancelled',
        note: 'Đơn hàng đã bị hủy',
        location: 'Hệ thống',
    });

    return { message: 'Đã hủy đơn hàng' };
};

exports.getStats = async (customerId, dateFrom, dateTo) => {
    const { data, error } = await orderModel.fetchDashboardRows(customerId, dateFrom, dateTo);
    if (error) throw new Error(error.message);

    const orders = data || [];
    const deliveringStatuses = ['picked_up', 'in_transit', 'delivering'];
    const delivered = orders.filter((order) => order.status === 'delivered');
    const delivering = orders.filter((order) => deliveringStatuses.includes(order.status));

    return {
        total: orders.length,
        delivered: delivered.length,
        delivering: delivering.length,
        returned: orders.filter((order) => order.status === 'returned').length,
        totalCod: delivered.reduce((sum, order) => sum + Number(order.cod_amount || 0), 0),
        totalShippingFee: orders.reduce((sum, order) => sum + Number(order.shipping_fee || 0), 0),
        totalQuantity: orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0),
        deliveredQuantity: delivered.reduce((sum, order) => sum + Number(order.quantity || 0), 0),
        deliveringQuantity: delivering.reduce((sum, order) => sum + Number(order.quantity || 0), 0),
    };
};

exports.trackByCode = async (orderCode) => {
    const { data: order, error } = await orderModel.fetchOrderByCode(orderCode);
    if (error || !order) throw new Error('Không tìm thấy đơn hàng');

    const { data: tracking } = await orderModel.fetchTracking(order.id);

    // Mask thông tin nhạy cảm — public endpoint không yêu cầu xác thực
    const maskedOrder = {
        order_code: order.order_code,
        status: order.status,
        shipping_type: order.shipping_type,
        receiver_name: order.receiver_name,
        // Chỉ hiện tỉnh/thành, không lộ địa chỉ chi tiết
        receiver_province: order.receiver_province || null,
        receiver_ward: order.receiver_ward || null,
        // Mask số điện thoại: 0987***456
        receiver_phone: order.receiver_phone
            ? order.receiver_phone.slice(0, 4) + '***' + order.receiver_phone.slice(-3)
            : null,
        created_at: order.created_at,
        updated_at: order.updated_at,
    };

    return {
        order: maskedOrder,
        tracking: tracking || [],
    };
};
