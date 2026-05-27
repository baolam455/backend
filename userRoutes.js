const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validationMiddleware');
const { updateMeSchema, changePasswordSchema } = require('../validation/userValidator');

// Các route này đều nằm sau tiền tố /api/users (cấu hình ở server.js)

// Xem thông tin cá nhân: GET /api/users/me
router.get('/me', verifyToken, profileController.getMe);

// Cập nhật thông tin: PUT /api/users/me
router.put('/me', verifyToken, validate(updateMeSchema), profileController.updateMe);

// Đổi mật khẩu: POST /api/users/me/password
router.post('/me/password', verifyToken, validate(changePasswordSchema), profileController.changePassword);

// Xóa tài khoản: DELETE /api/users/me
router.delete('/me', verifyToken, profileController.deleteMe);

module.exports = router;
