// Ngày serial của Excel (hệ 1900): 25569 = 1970-01-01. Chỉ đúng với serial > 60 (sau 1900-02-28).
const EPOCH_OFFSET = 25569;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 46295 hoặc '46295' → '2026-09-30'; không phải số nguyên hợp lệ → null. */
function serialToIsoDate(serial) {
  const n = Number(serial);
  if (!Number.isInteger(n) || n <= 60 || n > 2958465) return null;
  return new Date((n - EPOCH_OFFSET) * DAY_MS).toISOString().slice(0, 10);
}

/** '2026-09-30' → 46295. */
function isoDateToSerial(iso) {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS) + EPOCH_OFFSET;
}

module.exports = { serialToIsoDate, isoDateToSerial };
