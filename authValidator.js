// NHIỆM VỤ: ĐỊNH NGHĨA CÁC QUY TẮC (SCHEMA) KIỂM TRA DỮ LIỆU CHO AUTH.
// CHỨC NĂNG: ĐẢM BẢO DỮ LIỆU ĐĂNG KÝ/ĐĂNG NHẬP ĐÚNG ĐỊNH DẠNG TRƯỚC KHI XỬ LÝ.

const Joi = require('joi');

// 1. Quy tắc cho Đăng ký (Register)
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email không đúng định dạng (ví dụ: abc@gmail.com)',
        'any.required': 'Email là trường bắt buộc'
    }),
    // Đồng bộ với FE: min 8 ký tự, phải có chữ hoa, chữ thường, số, ký tự đặc biệt.
    // Regex: (?=.*[A-Z]) ít nhất 1 chữ hoa | (?=.*[a-z]) chữ thường | (?=.*\d) số | (?=.*[\W_]) ký tự đặc biệt
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/)
        .required()
        .messages({
            'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
            'string.pattern.base': 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
            'any.required': 'Mật khẩu là trường bắt buộc'
        }),
    full_name: Joi.string().min(3).required().messages({
        'string.min': 'Họ tên phải có ít nhất 3 ký tự',
        'any.required': 'Họ tên không được để trống'
    }),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'string.pattern.base': 'Số điện thoại phải có đúng 10 chữ số'
    }),
    address: Joi.string().allow('', null),
    role: Joi.string().valid('customer').default('customer')
});

// 2. Quy tắc cho Đăng nhập (Login)
const loginSchema = Joi.object({
    account: Joi.string(),
    email: Joi.string().email().messages({
        'string.email': 'Email không hợp lệ',
        'any.required': 'Vui lòng nhập Email'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Vui lòng nhập mật khẩu'
    })
}).or('account', 'email');

// 3. Quy tắc cho Refresh Token
const refreshSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Không tìm thấy Refresh Token trong yêu cầu'
    })
});

// Xuất các schema để các file khác (như Route) sử dụng
module.exports = {
    registerSchema,
    loginSchema,
    refreshSchema
};
