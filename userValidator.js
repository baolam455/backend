const Joi = require('joi');

// Đồng nhất với registerSchema: min 8, phải có chữ hoa, thường, số, ký tự đặc biệt
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const userValidator = {
    updateMeSchema: Joi.object({
        full_name: Joi.string().min(3).max(50).messages({
            'string.min': 'Họ tên phải ít nhất 3 ký tự'
        }),
        phone: Joi.string().pattern(/^[0-9]{10}$/).messages({
            'string.pattern.base': 'Số điện thoại phải có đúng 10 chữ số'
        }),
        address: Joi.string().allow('', null),
        avatar_url: Joi.string().uri().allow('').optional(),
        role: Joi.forbidden().messages({
            'any.unknown': 'Bạn không có quyền tự thay đổi vai trò!'
        })
    }),

    // Đổi mật khẩu: xác thực mật khẩu cũ + mật khẩu mới + xác nhận lại
    changePasswordSchema: Joi.object({
        oldPassword: Joi.string().required().messages({
            'any.required': 'Vui lòng nhập mật khẩu hiện tại'
        }),
        newPassword: Joi.string().min(8).pattern(PW_REGEX).required().messages({
            'string.min': 'Mật khẩu mới phải có ít nhất 8 ký tự',
            'string.pattern.base': 'Mật khẩu mới phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
            'any.required': 'Vui lòng nhập mật khẩu mới'
        }),
        // FE gửi confirmPassword để UX — BE validate khớp để chặn bypass FE
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
            'any.only': 'Xác nhận mật khẩu không khớp',
            'any.required': 'Vui lòng xác nhận mật khẩu mới'
        }),
    })
};

module.exports = userValidator;
