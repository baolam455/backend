const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    // Nếu lỗi từ JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: "Token không hợp lệ" });
    }

    res.status(500).json({
        message: err.message || "Lỗi hệ thống không xác định",
    });
};

module.exports = errorHandler;