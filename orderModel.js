const supabase = require('../config/supabase');

exports.fetchShippingFeeRules = async () => {
    return await supabase
        .from('shipping_fee_rules')
        .select('*')
        .eq('active', true)
        .order('distance_from_km', { ascending: true });
};

exports.createOrder = async (orderData) => {
    return await supabase.from('orders').insert(orderData).select().single();
};

exports.insertTracking = async (trackingData) => {
    return await supabase.from('order_tracking').insert(trackingData);
};

exports.fetchOrdersByCustomer = async (customerId) => {
    return await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
};

exports.fetchOrderById = async (orderId) => {
    return await supabase.from('orders').select('*').eq('id', orderId).single();
};

exports.fetchOrderByCode = async (orderCode) => {
    return await supabase.from('orders').select('*').eq('order_code', orderCode).single();
};

exports.fetchTracking = async (orderId) => {
    return await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
};

exports.updateOrder = async (orderId, patch) => {
    return await supabase.from('orders').update(patch).eq('id', orderId).select().single();
};

exports.fetchDashboardRows = async (customerId, dateFrom, dateTo) => {
    let query = supabase
        .from('orders')
        .select('status, cod_amount, shipping_fee, quantity, created_at')
        .eq('customer_id', customerId);

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    return await query;
};
