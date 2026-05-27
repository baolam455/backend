const authService = require('../services/authService');

exports.register = async (req, res) => {
    try {
        const result = await authService.registerUser(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { account, email, password } = req.body;
        const result = await authService.loginUser(account || email, password);
        res.json({ message: "Đăng nhập thành công", ...result });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
};

exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshSession(refreshToken);
        res.json(result);
    } catch (err) {
        res.status(403).json({ message: "Phiên làm việc hết hạn", error: err.message });
    }
};
