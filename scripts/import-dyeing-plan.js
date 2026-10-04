// Dùng: node --env-file=.env scripts/import-dyeing-plan.js "<đường dẫn .xlsx>" [--dry-run] [--replace] [--auto]
// Đọc các sheet khai báo trong src/utils/dyeing-plan-sheets.js, đồng bộ bảng stg_* tương ứng theo chênh lệch:
// dòng không đổi giữ nguyên, dòng mới/sửa → thêm, dòng file không còn → xoá; lịch các ngày cũ hơn file được giữ.
// Mỗi lần đồng bộ ghi lịch sử vào stg_sync_runs / stg_sync_run_tables / stg_change_log (migration 007).
// --dry-run: chỉ in chênh lệch, không ghi DB.  --replace: xoá sạch rồi nhập lại toàn bộ (cách cũ, không ghi lịch sử).
// --auto: đánh dấu lần chạy do job tự động (src/jobs/dyeing-plan-sync.job.js) gọi.
const fs = require('node:fs/promises');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { pool } = require('../src/db/pool');
const { SHEETS, TOTAL_SHEET, MAX_VALUE_LENGTH, planDateFromFileName } = require('../src/utils/dyeing-plan-sheets');
const { serialToIsoDate } = require('../src/utils/excel-date');
const { localStamp } = require('../src/utils/local-stamp');
const stagingImportService = require('../src/services/staging-import.service');

// Giá trị ô → chuỗi thô hoặc null. Công thức lấy kết quả đã lưu; công thức chưa có kết quả → null.
function cellText(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (v.richText) return cellText(v.richText.map((t) => t.text).join(''));
    if ('result' in v) return cellText(v.result);
    if ('formula' in v || 'sharedFormula' in v) return null;
    if (v.error) return v.error;
    if (v.text !== undefined) return cellText(v.text);
    return null;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

// Sheet Total: ma trận máy × (ngày × ca) → { machines, slots }.
async function readTotalSheet(ws, errors) {
  const t = TOTAL_SHEET;
  const machines = [];
  const slots = [];
  let dates = [];
  let slotNos = [];
  for await (const row of ws) {
    const values = row.values || [];
    if (row.number === t.dateRow) dates = values.map(cellText);
    if (row.number === t.slotRow) slotNos = values.map(cellText);
    if (row.number < t.firstDataRow) continue;

    const attrs = t.machineColumns.map((_, i) => cellText(values[i + 1]));
    const machineNo = attrs[t.machineColumns.indexOf('machine_no')];
    if (!machineNo) continue;
    machines.push([row.number, ...attrs]);

    for (let col = t.firstSlotCol; col < values.length; col++) {
      const text = cellText(values[col]);
      if (text === null) continue;
      const planDate = serialToIsoDate(dates[col]);
      const slotNo = Number(slotNos[col]);
      if (!planDate || !Number.isInteger(slotNo)) {
        errors.push(`"${ws.name}" cột ${col}: thiếu ngày/ca ở dòng tiêu đề`);
        continue;
      }
      if (text.length > MAX_VALUE_LENGTH) errors.push(`"${ws.name}" dòng ${row.number} cột ${col}: quá dài`);
      slots.push([row.number, machineNo, planDate, slotNo, text]);
    }
  }
  return { machines, slots };
}

async function readSheets(file) {
  const bySheet = new Map(SHEETS.map((s) => [s.sheet, s]));
  const result = new Map();
  const errors = [];
  // Đọc dạng stream: file có vùng định dạng rất lớn, đọc cả workbook vào RAM sẽ tràn bộ nhớ.
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {
    worksheets: 'emit', sharedStrings: 'cache', styles: 'ignore', hyperlinks: 'ignore',
  });
  let total = null;
  for await (const ws of reader) {
    if (ws.name === TOTAL_SHEET.sheet) {
      total = await readTotalSheet(ws, errors);
      continue;
    }
    const def = bySheet.get(ws.name);
    const rows = [];
    for await (const row of ws) {
      if (!def || row.number < def.firstDataRow) continue;
      const values = row.values || [];
      const out = [row.number];
      let filled = false;
      def.columns.forEach((col, i) => {
        if (!col) return;
        const text = cellText(values[i + 1]);
        if (text !== null) filled = true;
        if (text !== null && text.length > MAX_VALUE_LENGTH) {
          errors.push(`"${ws.name}" dòng ${row.number} cột ${col}: dài ${text.length} > ${MAX_VALUE_LENGTH}`);
        }
        out.push(text);
      });
      if (filled) rows.push(out);
    }
    if (def) result.set(def.sheet, rows);
  }
  const missing = SHEETS.filter((s) => !result.has(s.sheet)).map((s) => `"${s.sheet}"`);
  if (!total) missing.push(`"${TOTAL_SHEET.sheet}"`);
  if (missing.length > 0) errors.push(`Không tìm thấy sheet: ${missing.join(', ')}`);
  return { result, total, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Dùng: import-dyeing-plan.js "<file .xlsx>" [--dry-run] [--replace] [--auto]');
    process.exit(1);
  }

  // Giờ lưu file lấy TRƯỚC khi đọc: file bị lưu lại trong lúc đọc → lần quét sau thấy mtime mới và đồng bộ lại.
  const fileName = path.basename(file);
  const yearInPath = path.resolve(file).split(path.sep).reverse().find((p) => /^20\d{2}$/.test(p));
  const source = {
    fileName,
    filePath: path.resolve(file),
    planDate: planDateFromFileName(fileName, yearInPath || new Date().getFullYear()),
    fileMtime: localStamp((await fs.stat(file)).mtime),
    triggerType: args.includes('--auto') ? 'auto' : 'manual',
  };

  const { result, total, errors } = await readSheets(file);
  if (errors.length > 0) {
    errors.slice(0, 20).forEach((e) => console.error('ERROR', e));
    const message = `${errors.length} lỗi khi đọc file — chưa ghi gì vào DB`;
    if (!dryRun && !replace) await stagingImportService.recordFailure(source, `${message}: ${errors[0]}`);
    throw new Error(message);
  }

  // Thứ tự: máy (Total) trước ô lịch để remapPastSlots ghép theo dòng máy mới.
  const sheets = [
    ...SHEETS.map((s) => ({
      sheet: s.sheet,
      table: s.table,
      rows: result.get(s.sheet),
      historyColumn: s.historyColumn,
      logChanges: s.logChanges,
    })),
    { sheet: TOTAL_SHEET.sheet, table: TOTAL_SHEET.machinesTable, rows: total.machines },
    {
      sheet: TOTAL_SHEET.sheet,
      table: TOTAL_SHEET.slotsTable,
      rows: total.slots,
      historyColumn: TOTAL_SHEET.slotsHistoryColumn,
      recordKey: TOTAL_SHEET.slotsRecordKey,
      remapPastSlots: true,
    },
  ];
  if (replace) {
    if (dryRun) {
      sheets.forEach((s) => console.log(`DRY  ${s.table.padEnd(24)} ${s.rows.length} dòng`));
      return;
    }
    const summary = await stagingImportService.replaceAll(fileName, sheets);
    summary.forEach((s) => console.log(`OK   ${s.table.padEnd(24)} ${s.rows} dòng`));
    return;
  }
  const summary = await stagingImportService.syncAll(source, sheets, { dryRun });
  summary.forEach((s) => {
    const kept = s.keepBefore ? `  giữ lịch trước ${s.keepBefore}: ${s.kept}` : '';
    const remap = s.remapped ? `  ghép lại máy: ${s.remapped}` : '';
    const logged = s.logged ? `  nhật ký: ${s.logged}` : '';
    console.log(`${dryRun ? 'DRY' : 'OK '}  ${s.table.padEnd(24)} file ${String(s.rows).padStart(5)} | không đổi ${String(s.unchanged).padStart(5)}`
      + ` | thêm ${String(s.inserted).padStart(5)} | xoá ${String(s.deleted).padStart(5)}${kept}${remap}${logged}`);
  });
}

main()
  .catch((err) => {
    console.error('ERROR', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
