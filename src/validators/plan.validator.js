const AppError = require('../utils/app-error');

const PAGE_SIZES = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const MAX_TOTAL_DAYS = 31;
const DEFAULT_TOTAL_DAYS = 7;

function str(value, max, field, errors) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string') {
    errors[field] = 'Giá trị không hợp lệ';
    return '';
  }
  const s = value.trim();
  if (s.length > max) errors[field] = `Tối đa ${max} ký tự`;
  return s;
}

function isoDate(value, field, errors) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    errors[field] = 'Ngày không hợp lệ (YYYY-MM-DD)';
    return '';
  }
  return value;
}

function int(value, { min, max, fallback }, field, errors) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    errors[field] = `Phải là số nguyên từ ${min} đến ${max}`;
    return fallback;
  }
  return n;
}

function pageParams(query, errors) {
  const page = int(query.page, { min: 1, max: 100000, fallback: 1 }, 'page', errors);
  const pageSize = int(query.pageSize, { min: 1, max: 100, fallback: DEFAULT_PAGE_SIZE }, 'pageSize', errors);
  if (!PAGE_SIZES.includes(pageSize)) errors.pageSize = `Chỉ nhận ${PAGE_SIZES.join(', ')}`;
  return { page, pageSize };
}

function done(errors, value) {
  if (Object.keys(errors).length > 0) throw new AppError(422, 'Dữ liệu không hợp lệ', errors);
  return value;
}

function validateTotalQuery(query) {
  const errors = {};
  return done(errors, {
    from: isoDate(query.from, 'from', errors),
    days: int(query.days, { min: 1, max: MAX_TOTAL_DAYS, fallback: DEFAULT_TOTAL_DAYS }, 'days', errors),
  });
}

function validateDetailOrderQuery(query) {
  const errors = {};
  return done(errors, {
    q: str(query.q, 100, 'q', errors),
    machine: str(query.machine, 50, 'machine', errors),
    colorGroup: str(query.colorGroup, 50, 'colorGroup', errors),
    date: isoDate(query.date, 'date', errors),
    ...pageParams(query, errors),
  });
}

function validateBatchesPerDayQuery(query) {
  const errors = {};
  return done(errors, {
    q: str(query.q, 100, 'q', errors),
    ...pageParams(query, errors),
  });
}

module.exports = { validateTotalQuery, validateDetailOrderQuery, validateBatchesPerDayQuery };
