const orderService = require('../services/orderService');

exports.createOrder = async (req, res) => {
    try {
        const data = await orderService.createOrder(req.user.id, req.body);
        res.status(201).json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const data = await orderService.listOrders(req.user.id);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const data = await orderService.getOrder(req.user.id, req.params.orderId, req.user.role);
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

exports.getTracking = async (req, res) => {
    try {
        const data = await orderService.getTracking(req.user.id, req.params.orderId, req.user.role);
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const data = await orderService.cancelOrder(req.user.id, req.params.orderId);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const data = await orderService.getStats(req.user.id, req.query.dateFrom, req.query.dateTo);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
