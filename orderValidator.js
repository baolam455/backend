const Joi = require('joi');

const orderStatus = Joi.string().valid(
    'pending',
    'picked_up',
    'in_transit',
    'delivering',
    'delivered',
    'returned',
    'cancelled'
);

const createOrderSchema = Joi.object({
    receiverPhone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    receiverName: Joi.string().min(2).required(),
    receiverAddress: Joi.string().min(5).required(),
    receiverWard: Joi.string().allow('', null),
    receiverProvince: Joi.string().allow('', null),
    shippingType: Joi.string().valid('express', 'bbs').required(),
    transportType: Joi.string().valid('road', 'air').required(),
    pickupMethod: Joi.string().valid('home', 'post').required(),
    shipPayer: Joi.string().valid('customer', 'shop').required(),
    codAmount: Joi.number().min(0).required(),
    productValue: Joi.number().min(0).required(),
    totalWeight: Joi.number().min(0.1).required(),
    productName: Joi.string().min(1).required(),
    quantity: Joi.number().integer().min(1).required(),
    shopOrderCode: Joi.string().allow('', null),
    pickupAddress: Joi.string().allow('', null),
    pickupNote: Joi.string().allow('', null),
});

const orderIdSchema = Joi.object({
    orderId: Joi.string().required()
});

const updateOrderStatusSchema = Joi.object({
    status: orderStatus.required()
});

const quoteShippingFeeSchema = Joi.object({
    receiverProvince: Joi.string().allow('', null),
    shippingType: Joi.string().valid('express', 'bbs').default('express'),
    totalWeight: Joi.number().min(0.1).default(0.1)
});

const trackingCodeSchema = Joi.object({
    orderCode: Joi.string().required()
});

module.exports = {
    createOrderSchema,
    orderIdSchema,
    quoteShippingFeeSchema,
    trackingCodeSchema,
    updateOrderStatusSchema,
};
