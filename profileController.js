const userService = require('../services/userServices');

exports.getMe = async (req, res) => {
    try {
        const data = await userService.getMyProfile(req.user.id);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateMe = async (req, res) => {
    try {
        const data = await userService.updateMyProfile(req.user.id, req.body);
        res.json({ message: "Cập nhật thành công", data });
    } catch (err) {
        const status = err.message === "FORBIDDEN_ROLE_CHANGE" ? 403 : 400;
        res.status(status).json({ error: err.message });
    }
};

exports.deleteMe = async (req, res) => {
    try {
        const result = await userService.deleteMyAccount(req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const result = await userService.changeMyPassword(req.user.id, req.body);
        res.json(result);
    } catch (err) {
        // 400 cho cả "mật khẩu sai" lẫn lỗi hệ thống — FE sẽ hiển thị message
        res.status(400).json({ error: err.message });
    }
};