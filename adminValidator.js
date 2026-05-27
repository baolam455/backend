const Joi = require('joi');

const adminValidator = {
    // Quy tắc cho việc đổi quyền (set-role)
    setRoleSchema: Joi.object({
        userId: Joi.string().required().messages({
            'any.required': 'Phải cung cấp ID người dùng để đổi quyền.'
        }),
        role: Joi.string().valid('admin', 'dispatcher', 'warehouse', 'customer', 'shipper').required().messages({
            'any.only': 'Quyền hạn không hợp lệ. Chỉ chấp nhận: admin, dispatcher, warehouse, customer, shipper.',
            'any.required': 'Vui lòng chọn quyền hạn mới.'
        })
    }),

    setStatusSchema: Joi.object({
        userId: Joi.string().required().messages({
            'any.required': 'Phải cung cấp ID người dùng để đổi trạng thái.'
        }),
        status: Joi.string().valid('active', 'locked_short', 'locked_long', 'disabled').required().messages({
            'any.only': 'Trạng thái tài khoản không hợp lệ.',
            'any.required': 'Vui lòng chọn trạng thái mới.'
        })
    }),

    createUserSchema: Joi.object({
        fullName: Joi.string().min(2).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
        role: Joi.string().valid('admin', 'dispatcher', 'warehouse', 'customer', 'shipper').required(),
        // Mật khẩu bắt buộc khi admin tạo tài khoản — đồng nhất với registerSchema (min 8)
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
            .required()
            .messages({
                'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
                'string.pattern.base': 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
                'any.required': 'Vui lòng nhập mật khẩu cho tài khoản mới'
            }),
        warehouseName: Joi.string().allow('', null)
    }),

    // Quy tắc cho việc xóa người dùng (nếu truyền ID qua body hoặc params)
    deleteUserSchema: Joi.object({
        userId: Joi.string().required().messages({
            'any.required': 'Cần có ID người dùng để thực hiện lệnh xóa.'
        })
    })
};

module.exports = adminValidator;
