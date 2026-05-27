const express = require('express');
const Joi = require('joi');
const router = express.Router();

const publicController = require('../controllers/publicController');
const validate = require('../middlewares/validationMiddleware');
const {
    quoteShippingFeeSchema,
    trackingCodeSchema,
} = require('../validation/orderValidator');

const businessRequestSchema = Joi.object({
    fullName: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    email: Joi.string().email().required(),
    company: Joi.string().min(2).required(),
    taxCode: Joi.string().min(3).required(),
});

router.get('/post-offices', publicController.getPostOffices);
router.post('/shipping-fee/quote', validate(quoteShippingFeeSchema), publicController.quoteShippingFee);
router.get('/track/:orderCode', validate(trackingCodeSchema, 'params'), publicController.trackOrder);
router.post('/business-request', validate(businessRequestSchema), publicController.createBusinessRequest);

module.exports = router;
