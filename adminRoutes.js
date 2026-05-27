// NHIỆM VỤ: KHAI BÁO ĐƯỜNG DẪN API CHO ADMIN VÀ ÁP DỤNG CÁC LỚP BẢO VỆ (AUTH & VALIDATION).
// CHỨC NĂNG: ĐIỀU PHỐI REQUEST QUA "CẢNH SÁT" KIỂM TRA QUYỀN VÀ "BẢO VỆ" KIỂM TRA DỮ LIỆU.

const express = require('express');
const router = express.Router();

// 1. Import Controllers
const adminController = require('../controllers/adminController');

// 2. Import Middlewares bảo mật (Auth)
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// 3. Import Middleware Validation & Schemas (Kiểm soát dữ liệu)
const validate = require('../middlewares/validationMiddleware');
const {
    createUserSchema,
    deleteUserSchema,
    setRoleSchema,
    setStatusSchema,
} = require('../validation/adminValidator');
const { orderIdSchema, updateOrderStatusSchema } = require('../validation/orderValidator');
const Joi = require('joi');

// --- CẤU HÌNH BẢO VỆ CHUNG ---
// Tất cả các route Admin bắt buộc phải Đăng nhập và phải có Role là 'admin'
router.use(verifyToken, authorize(['admin']));

// --- DANH SÁCH API ---

// GET /api/admin/users — lấy danh sách user (RESTful)
router.get('/users', adminController.getAllUsers);

// POST /api/admin/users — admin tạo tài khoản mới
router.post('/users', validate(createUserSchema), adminController.createUser);

// 2. Đổi quyền: POST /api/admin/set-role
// Thêm validate(setRoleSchema) để kiểm tra role mới có hợp lệ không (admin/customer/shipper)
router.post('/set-role', validate(setRoleSchema), adminController.setRole);

router.post('/set-status', validate(setStatusSchema), adminController.setStatus);

router.get('/orders', adminController.getOrders);

router.patch(
    '/orders/:orderId/status',
    validate(orderIdSchema, 'params'),
    validate(updateOrderStatusSchema),
    adminController.setOrderStatus
);

router.get('/post-offices', adminController.getPostOffices);

router.get('/shipping-fee-rules', adminController.getShippingFeeRules);

router.patch(
    '/shipping-fee-rules/:ruleId',
    validate(Joi.object({ ruleId: Joi.string().required() }), 'params'),
    validate(Joi.object({ active: Joi.boolean().required() })),
    adminController.toggleShippingFeeRule
);

// DELETE /api/admin/users/:userId — xóa user (nhất quán với GET/POST /admin/users)
router.delete('/users/:userId', validate(deleteUserSchema, 'params'), adminController.deleteUser);

module.exports = router;
