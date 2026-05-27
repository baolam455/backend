const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validationMiddleware');
const {
    createOrderSchema,
    orderIdSchema,
} = require('../validation/orderValidator');

router.use(verifyToken);

router.get('/', orderController.getOrders);
router.get('/stats', orderController.getStats);
router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/:orderId', validate(orderIdSchema, 'params'), orderController.getOrderById);
router.get('/:orderId/tracking', validate(orderIdSchema, 'params'), orderController.getTracking);
router.post('/:orderId/cancel', validate(orderIdSchema, 'params'), orderController.cancelOrder);

module.exports = router;
