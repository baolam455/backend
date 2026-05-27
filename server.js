const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ─── Import Routes ────────────────────────────────────────────────────────────
const authRoutes   = require('./src/routes/authRoutes');
const userRoutes   = require('./src/routes/userRoutes');
const adminRoutes  = require('./src/routes/adminRoutes');
const orderRoutes  = require('./src/routes/orderRoutes');
const publicRoutes = require('./src/routes/publicRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

// ─── 1. Security Headers (thay thế helmet) ────────────────────────────────────
// Các header này ngăn tấn công phổ biến: clickjacking, MIME sniffing, XSS.
// Người dùng F12 chỉ thấy được response từ server — không thể thay đổi dữ liệu DB.
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');           // Ngăn MIME sniffing
    res.setHeader('X-Frame-Options', 'DENY');                     // Ngăn clickjacking qua iframe
    res.setHeader('X-XSS-Protection', '1; mode=block');          // Bảo vệ XSS (IE/Edge cũ)
    res.setHeader('Referrer-Policy', 'no-referrer');              // Không gửi Referer header
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()'); // Tắt feature browser
    // HSTS chỉ bật khi đã có HTTPS (production)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// ─── 2. CORS — whitelist origin thay vì mở toàn bộ (*) ──────────────────────
// Chỉ cho phép FE đã được cấu hình trong .env gọi API.
// Mobile app (Expo Go) không có origin nên vẫn qua.
const allowedOrigins = [
    'http://localhost:8081',    // Expo web dev
    'http://localhost:19006',   // Expo web cũ
    'http://localhost:3001',    // FE port tùy chỉnh
    process.env.FRONTEND_URL,   // Production URL — set trong .env
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // origin = undefined → request từ mobile (Expo Go) / Postman / curl → cho qua
        if (!origin) return callback(null, true);

        // So sánh exact — tránh bypass kiểu "http://localhost:8081.evil.com"
        // (dùng startsWith() trước đây có thể bị khai thác nếu origin bị giả)
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin "${origin}" không được phép`));
        }
    },
    credentials: true,
}));

// ─── 3. Rate Limiter — chống brute-force login/register ──────────────────────
// In-memory store đơn giản: đủ dùng cho đồ án và server đơn lẻ.
// Production nhiều node nên dùng Redis store (ioredis + rate-limit-redis).
// Mỗi limiter có store riêng — tránh một IP tra cứu đơn hàng ảnh hưởng quota login.
function createRateLimiter(maxRequests, windowMs, message) {
    const store = new Map(); // store riêng cho từng limiter instance
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const entry = store.get(ip) || { count: 0, resetAt: now + windowMs };

        // Reset nếu đã qua window
        if (now > entry.resetAt) {
            entry.count = 0;
            entry.resetAt = now + windowMs;
        }

        entry.count += 1;
        store.set(ip, entry);

        // Thêm header thông báo limit cho client
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

        if (entry.count > maxRequests) {
            return res.status(429).json({ message });
        }
        next();
    };
}

// Áp dụng rate limit 10 lần / 15 phút cho login và register
const authLimiter = createRateLimiter(
    10,
    15 * 60 * 1000,
    'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 15 phút.'
);

// Rate limit nhẹ hơn cho public tracking (30 lần / 1 phút)
const publicLimiter = createRateLimiter(
    30,
    60 * 1000,
    'Quá nhiều yêu cầu tra cứu. Vui lòng thử lại sau.'
);

// ─── 4. Body Parser ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' })); // Giới hạn payload tránh tấn công memory

// ─── 5. Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);    // Rate limit cho auth
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicLimiter, publicRoutes); // Rate limit cho public

// ─── 6. Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'Loogistic API đang chạy ổn định' });
});

// ─── 7. 404 + Error handler ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: 'Đường dẫn không tồn tại trên hệ thống' });
});

app.use(errorHandler);

// ─── 8. Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`🚀 Loogistic API: http://localhost:${PORT}`);
    console.log(`   Auth:   /api/auth   (rate-limited)`);
    console.log(`   Users:  /api/users`);
    console.log(`   Admin:  /api/admin`);
    console.log(`   Orders: /api/orders`);
    console.log(`   Public: /api/public (rate-limited)`);
    console.log(`   Health: /health`);
    console.log('─────────────────────────────────────────');
});
