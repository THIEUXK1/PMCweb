const planService = require('../services/plan.service');
const {
  validateTotalQuery,
  validateDetailOrderQuery,
  validateBatchesPerDayQuery,
} = require('../validators/plan.validator');
const asyncHandler = require('../utils/async-handler');

const total = asyncHandler(async (req, res) => {
  res.json(await planService.getTotal(validateTotalQuery(req.query)));
});

const detailOrders = asyncHandler(async (req, res) => {
  res.json(await planService.listDetailOrders(validateDetailOrderQuery(req.query)));
});

const detailOrderFilters = asyncHandler(async (req, res) => {
  res.json(await planService.getDetailOrderFilters());
});

const batchesPerDay = asyncHandler(async (req, res) => {
  res.json(await planService.listBatchesPerDay(validateBatchesPerDayQuery(req.query)));
});

module.exports = { total, detailOrders, detailOrderFilters, batchesPerDay };
