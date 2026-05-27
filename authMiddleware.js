// NHIỆM VỤ: Người gác cổng — kiểm tra access token và trạng thái tài khoản.
// Lý do query DB: nếu chỉ tin JWT thì admin khóa user nhưng token cũ vẫn hoạt động đến khi hết hạn (1h).
// Query trực tiếp Supabase trong middleware để phát hiện thay đổi ngay lập tức.
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Access Denied" });

    try {
        const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
        const verified = jwt.verify(token, secret);

        // Kiểm tra trạng thái tài khoản từ DB — phát hiện ngay khi admin khóa/xóa quyền
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, role, status')
            .eq('id', verified.id)
            .single();

        if (error || !profile) {
            return res.status(401).json({ message: "Tài khoản không tồn tại" });
        }
        if (profile.status !== 'active') {
            return res.status(401).json({ message: "Tài khoản đang bị khóa hoặc vô hiệu hóa" });
        }

        // Gắn thông tin user (dùng role mới nhất từ DB, không dùng role trong JWT cũ)
        req.user = { id: verified.id, role: profile.role };
        next();
    } catch (err) {
        // 401 = chưa xác thực (token hết hạn / sai chữ ký) → client nên thử refresh
        res.status(401).json({ message: "Token hết hạn hoặc không hợp lệ" });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập" });
        }
        next();
    };
};

module.exports = { verifyToken, authorize };
