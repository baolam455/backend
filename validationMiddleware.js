const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        // KIỂM TRA: Nếu schema bị trống (undefined) thì báo lỗi ngay cho lập trình viên biết
        if (!schema) {
            console.error("LỖI: Bạn chưa truyền Schema vào hàm validate() ở file Routes!");
            return res.status(500).json({ error: "Lỗi cấu hình Validation trên Server" });
        }

        // Thực hiện validate
        const target = req[source] || {};
        const { error, value } = schema.validate(target, {
            abortEarly: false,
            stripUnknown: true,
        });
        
        if (error) {
            // Dùng "error" (string) thay vì "errors" (array) để FE parse được qua apiClient
            const errorMessage = error.details.map(detail => detail.message).join('; ');
            return res.status(400).json({ error: errorMessage });
        }

        req[source] = value;
        next();
    };
};

module.exports = validate;
