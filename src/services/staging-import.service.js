const { pool, withTransaction } = require('../db/pool');
const stagingRepo = require('../repositories/staging.repo');
const syncHistoryRepo = require('../repositories/sync-history.repo');
const { serialToIsoDate } = require('../utils/excel-date');

/**
 * Thay toàn bộ dữ liệu các bảng staging trong MỘT transaction: lỗi ở bất kỳ bảng nào → không bảng nào đổi.
 * @param {string} fileName tên file nguồn, ghi vào stg_import_runs
 * @param {Array<{ sheet: string, table: string, rows: Array<Array<string|number|null>> }>} sheets
 */
async function replaceAll(fileName, sheets) {
  return withTransaction(async (conn) => {
    const summary = [];
    for (const s of sheets) {
      await stagingRepo.clear(s.table, conn);
      await stagingRepo.insertMany(s.table, s.rows, conn);
      await stagingRepo.insertRun({ fileName, sheetName: s.sheet, tableName: s.table, rowCount: s.rows.length }, conn);
      summary.push({ table: s.table, rows: s.rows.length });
    }
    return summary;
  });
}

// Ngày dạng Date (cột DATE), '2026-09-30' hoặc serial Excel → '2026-09-30'; không phải ngày → null.
function toIsoDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return serialToIsoDate(v);
}

const normalize = (v) => {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? toIsoDate(v) : String(v);
};

/**
 * So dòng file với dòng DB (mọi cột, kể cả source_row). Dòng DB có ngày (historyColumn) trước ngày sớm nhất
 * trong file được giữ nguyên — đó là lịch các ngày đã qua mà file mới không còn.
 */
async function diffTable(s, conn) {
  const columns = stagingRepo.columnsOf(s.table);
  const dbRows = await stagingRepo.selectAll(s.table, conn);
  const historyIdx = s.historyColumn ? columns.indexOf(s.historyColumn) : -1;
  let keepBefore = null;
  if (historyIdx >= 0) {
    keepBefore = s.rows.map((r) => toIsoDate(r[historyIdx])).filter(Boolean).sort()[0] || null;
  }
  const key = (values) => JSON.stringify(values.map(normalize));

  const dbByKey = new Map();
  let kept = 0;
  for (const r of dbRows) {
    const day = keepBefore && toIsoDate(r[s.historyColumn]);
    if (day && day < keepBefore) {
      kept++;
      continue;
    }
    const k = key(columns.map((c) => r[c]));
    if (!dbByKey.has(k)) dbByKey.set(k, []);
    dbByKey.get(k).push(r);
  }

  const toInsert = [];
  let unchanged = 0;
  for (const row of s.rows) {
    const same = dbByKey.get(key(row));
    if (same && same.length > 0) {
      same.pop();
      unchanged++;
    } else {
      toInsert.push(row);
    }
  }
  const deletedRows = [...dbByKey.values()].flat();
  return { columns, keepBefore, kept, unchanged, toInsert, deletedRows };
}

/**
 * Nhật ký thay đổi của 1 bảng: dòng xoá + dòng thêm cùng record_key (đúng 1 mỗi bên) → 'U' (sửa).
 * record_key mặc định = source_row; bảng ô lịch dùng (máy, ngày, ca).
 */
function buildChanges(s, d) {
  const keyColumns = s.recordKey || ['source_row'];
  const toObject = (values) => Object.fromEntries(d.columns.map((c, i) => [c, normalize(values[i])]));
  const recordKeyOf = (obj) => keyColumns.map((c) => obj[c]).join('|');

  const groups = new Map();
  const add = (obj, side) => {
    const k = recordKeyOf(obj);
    if (!groups.has(k)) groups.set(k, { del: [], ins: [] });
    groups.get(k)[side].push(obj);
  };
  d.deletedRows.forEach((r) => add(toObject(d.columns.map((c) => r[c])), 'del'));
  d.toInsert.forEach((row) => add(toObject(row), 'ins'));

  const changes = [];
  const entry = (action, recordKey, oldObj, newObj) => changes.push({
    table: s.table,
    action,
    recordKey,
    oldData: oldObj ? JSON.stringify(oldObj) : null,
    newData: newObj ? JSON.stringify(newObj) : null,
  });
  for (const [k, g] of groups) {
    if (g.del.length === 1 && g.ins.length === 1) {
      entry('U', k, g.del[0], g.ins[0]);
      continue;
    }
    g.del.forEach((o) => entry('D', k, o, null));
    g.ins.forEach((o) => entry('I', k, null, o));
  }
  return changes;
}

/**
 * Đồng bộ theo chênh lệch: dòng không đổi giữ nguyên; dòng mới/đã sửa → thêm; dòng file không còn → xoá
 * (trừ lịch ngày cũ, xem diffTable). Cả lần đồng bộ trong MỘT transaction.
 * Ghi lịch sử: stg_sync_runs (kể cả lần lỗi), stg_sync_run_tables, stg_change_log (bảng logChanges !== false).
 * @param {{ fileName: string, filePath: string, planDate: string|null, fileMtime: string|null,
 *   triggerType: 'auto'|'manual' }} source fileMtime dạng 'YYYY-MM-DD HH:mm:ss' giờ địa phương
 * @param {Array<{ sheet: string, table: string, rows: Array<Array<string|number|null>>,
 *   historyColumn?: string, remapPastSlots?: boolean, recordKey?: string[], logChanges?: boolean }>} sheets
 * @param {{ dryRun?: boolean }} [options] dryRun: chỉ tính chênh lệch, không ghi DB
 */
async function syncAll(source, sheets, { dryRun = false } = {}) {
  const work = async (conn, runId) => {
    const summary = [];
    const changes = [];
    for (const s of sheets) {
      const d = await diffTable(s, conn);
      let remapped = 0;
      if (!dryRun) {
        await stagingRepo.deleteByIds(s.table, d.deletedRows.map((r) => r.id), conn);
        await stagingRepo.insertMany(s.table, d.toInsert, conn);
        if (s.remapPastSlots && d.keepBefore) remapped = await stagingRepo.remapPastSlots(d.keepBefore, conn);
        await stagingRepo.insertRun(
          { fileName: source.fileName, sheetName: s.sheet, tableName: s.table, rowCount: s.rows.length },
          conn,
        );
      }
      const tableChanges = s.logChanges === false ? [] : buildChanges(s, d);
      changes.push(...tableChanges);
      summary.push({
        table: s.table,
        rows: s.rows.length,
        unchanged: d.unchanged,
        inserted: d.toInsert.length,
        deleted: d.deletedRows.length,
        kept: d.kept,
        keepBefore: d.keepBefore,
        remapped,
        logged: s.logChanges === false ? null : tableChanges.length,
      });
    }
    if (!dryRun) {
      await syncHistoryRepo.insertRunTables(runId, summary, conn);
      await syncHistoryRepo.insertChanges(runId, changes, conn);
    }
    return summary;
  };
  if (dryRun) return work(pool, null);

  const runId = await syncHistoryRepo.insertRun(source);
  try {
    const summary = await withTransaction((conn) => work(conn, runId));
    await syncHistoryRepo.finishRun(runId, 'ok');
    return summary;
  } catch (err) {
    await syncHistoryRepo.finishRun(runId, 'error', err.message);
    throw err;
  }
}

/** Ghi 1 lần đồng bộ thất bại trước khi vào syncAll (vd. file lỗi khi đọc) để lịch sử thấy được. */
async function recordFailure(source, message) {
  const runId = await syncHistoryRepo.insertRun(source);
  await syncHistoryRepo.finishRun(runId, 'error', message);
}

module.exports = { replaceAll, syncAll, recordFailure };
