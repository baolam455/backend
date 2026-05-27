// NHIỆM VỤ: KHAI BÁO CÁC ĐƯỜNG DẪN XÁC THỰC (AUTHENTICATION) CHO HỆ THỐNG.
// CHỨC NĂNG: ĐIỀU PHỐI REQUEST ĐĂNG NHẬP/ĐĂNG KÝ QUA LỚP KIỂM TRA DỮ LIỆU TRƯỚC KHI VÀO LOGIC.

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Import Middleware thực thi luật
const validate = require('../middlewares/validationMiddleware');
// Import các Bộ luật (Schema) tương ứng
const { registerSchema, loginSchema, refreshSchema } = require('../validation/authValidator');

// 1. Đăng ký: Kiểm tra dữ liệu đầu vào (email, pass, name) trước khi tạo User
router.post('/register', validate(registerSchema), authController.register);

// 2. Đăng nhập: Kiểm tra định dạng email/pass trước khi xác thực mật khẩu
router.post('/login', validate(loginSchema), authController.login);

// 3. Cấp lại Access Token: Kiểm tra xem có gửi kèm refreshToken không
router.post('/refresh', validate(refreshSchema), authController.refresh);

module.exports = router;