const express = require('express');
const planController = require('../controllers/plan.controller');
const requireAuth = require('../middlewares/require-auth');

// Dữ liệu kế hoạch nhuộm (bảng staging stg_*), chỉ đọc.
const router = express.Router();
router.use(requireAuth);

router.get('/total', planController.total);
router.get('/detail-orders', planController.detailOrders);
router.get('/detail-orders/filters', planController.detailOrderFilters);
router.get('/batches-per-day', planController.batchesPerDay);

module.exports = router;
