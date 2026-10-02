const mesClient = require('../clients/mes.client');
const mesColorsRepo = require('../repositories/mes-colors.repo');
const { withTransaction } = require('../db/pool');
const { normalizeCode, isUsableColorCode, bgrToHex, buildColorMatcher } = require('../utils/color-match');

const NO_DATE = '1990-01-01'; // MES dùng ngày này cho mốc chưa xảy ra

// Matcher dựng từ bảng mes_colors; dựng lại sau mỗi lần đồng bộ.
let matcherPromise = null;

function batchTime(b) {
  for (const v of [b.cStarteddt, b.cScheduleddt]) {
    if (v && !v.startsWith(NO_DATE)) return v.slice(0, 19);
  }
  return null;
}

function text(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

/** Mỗi mã màu giữ mẻ mới nhất (theo giờ chạy/giờ xếp lịch). */
function latestByColor(machines) {
  const byCode = new Map();
  for (const m of machines) {
    for (const b of [m, ...(m.tBatchEntityList || [])]) {
      const colorCode = normalizeCode(b.cText09);
      const rgb = Number(b.cRgbcolor);
      // rgb = 0: MES chưa nhập màu cho mẻ đó.
      if (!isUsableColorCode(colorCode) || !Number.isInteger(rgb) || rgb <= 0) continue;
      const row = {
        colorCode,
        rgbHex: bgrToHex(rgb),
        itemCode: text(b.cText06),
        batchNo: text(b.cText05),
        machineNo: text(b.machineName || m.machineName),
        batchAt: batchTime(b),
      };
      const prev = byCode.get(colorCode);
      if (!prev || (row.batchAt && (!prev.batchAt || row.batchAt >= prev.batchAt))) byCode.set(colorCode, row);
    }
  }
  return [...byCode.values()];
}

async function syncFromMes() {
  const rows = latestByColor(await mesClient.getGanttMachines());
  await withTransaction((conn) => mesColorsRepo.upsertMany(rows, conn));
  matcherPromise = null;
  return { saved: rows.length };
}

function getMatcher() {
  if (!matcherPromise) {
    matcherPromise = mesColorsRepo.findAll().then(buildColorMatcher).catch((err) => {
      matcherPromise = null;
      throw err;
    });
  }
  return matcherPromise;
}

/**
 * Màu MES cho các ô Gantt: { [value]: '#RRGGBB' }, bỏ ô không khớp.
 * Lỗi đọc bảng (vd. chưa chạy migration 006) → log và trả {} để Gantt vẫn hiển thị theo hệ màu.
 */
async function colorsFor(values) {
  let match;
  try {
    match = await getMatcher();
  } catch (err) {
    console.error(`MES: không đọc được bảng mes_colors — ${err.message}`);
    return {};
  }
  const out = {};
  for (const v of values) {
    const hex = match(v);
    if (hex) out[v] = hex;
  }
  return out;
}

module.exports = { syncFromMes, colorsFor };
