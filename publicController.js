const adminService = require('../services/adminService');
const orderService = require('../services/orderService');
const supabase = require('../config/supabase');

exports.getPostOffices = async (req, res) => {
    try {
        const data = await adminService.listPostOffices();
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.quoteShippingFee = async (req, res) => {
    try {
        const shippingFee = await orderService.calculateShippingFee(req.body);
        res.json({ shippingFee });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.trackOrder = async (req, res) => {
    try {
        const data = await orderService.trackByCode(req.params.orderCode);
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

exports.createBusinessRequest = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('business_requests')
            .insert({
                full_name: req.body.fullName,
                phone: req.body.phone,
                email: req.body.email,
                company: req.body.company,
                tax_code: req.body.taxCode,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        res.status(201).json({ data, message: "Gửi thông tin doanh nghiệp thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
