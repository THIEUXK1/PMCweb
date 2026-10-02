const express = require('express');
const planController = require('../controllers/plan.controller');
const requireAuth = require('../middlewares/require-auth');

// Dữ liệu kế hoạch nhuộm (bảng staging stg_*), chỉ đọc.
const router = express.Router();

// Công khai: trang Gantt (màn hình xưởng) xem không cần đăng nhập.
router.get('/total', planController.total);

router.use(requireAuth);
router.get('/detail-orders', planController.detailOrders);
router.get('/detail-orders/filters', planController.detailOrderFilters);
router.get('/batches-per-day', planController.batchesPerDay);

module.exports = router;
