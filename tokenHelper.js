//NHIỆM VỤ: CÔNG CỤ TẠO CHUỗI MÃ HÓA.
//CHỨC NĂNG: CHỨA CÁC HÀM DÙNG CHUNG ĐỂ KÝ ACCESS TOKEN VÀ REFRESH TOKEN BẰNG THƯ VIỆN JWT
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Bắt buộc phải có dòng này ở đ​y

const generateAccessToken = (user) => {
    // Sử dụng đúng tên biến bạn đặt trong .env
    // Nếu trong .env bạn đặt là JWT_SECRET thì sửa lại cho đúng
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET; 

    if (!secret) {
        console.error("LỖI: Không tìm thấy Secret Key trong .env");
        throw new Error("secretOrPrivateKey must have a value");
    }

    return jwt.sign(
        { id: user.id, role: user.role },
        secret,
        { expiresIn: '1h' }  // Giảm từ 24h → 1h để giảm rủi ro nếu token bị đánh cắp
    );
};
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' } // Refresh token sống 7 ngày — user không bị logout khi rời app ngắn hạn
    );
};

module.exports = { generateAccessToken, generateRefreshToken };
