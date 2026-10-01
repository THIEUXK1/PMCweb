const { withTransaction } = require('../db/pool');
const stagingRepo = require('../repositories/staging.repo');

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

module.exports = { replaceAll };
