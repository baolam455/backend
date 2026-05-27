const adminService = require('../services/adminService');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await adminService.listAllUsers();
        res.json(users);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.setRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        // Ngăn admin tự đổi role chính mình — có thể vô tình mất quyền admin
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Không thể tự thay đổi vai trò của chính mình' });
        }

        const result = await adminService.changeRole(userId, role);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.setStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;
        const result = await adminService.changeStatus(userId, status);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const result = await adminService.createProfile(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Ngăn admin tự xóa chính mình — bảo vệ tài khoản admin cuối cùng
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Không thể tự xóa tài khoản của chính mình' });
        }

        const result = await adminService.terminateUser(userId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await adminService.listOrders();
        res.json(orders);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.setOrderStatus = async (req, res) => {
    try {
        const result = await adminService.changeOrderStatus(req.params.orderId, req.body.status);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getPostOffices = async (req, res) => {
    try {
        const offices = await adminService.listPostOffices();
        res.json(offices);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getShippingFeeRules = async (req, res) => {
    try {
        const rules = await adminService.listShippingFeeRules();
        res.json(rules);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.toggleShippingFeeRule = async (req, res) => {
    try {
        const result = await adminService.toggleShippingFeeRule(req.params.ruleId, req.body.active);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
