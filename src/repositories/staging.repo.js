const { pool } = require('../db/pool');
const { SHEETS, TOTAL_SHEET } = require('../utils/dyeing-plan-sheets');

// Whitelist tên bảng/cột động — chỉ những gì khai báo trong dyeing-plan-sheets.js.
const TABLE_COLUMNS = new Map([
  ...SHEETS.map((s) => [s.table, ['source_row', ...s.columns.filter(Boolean)]]),
  [TOTAL_SHEET.machinesTable, ['source_row', ...TOTAL_SHEET.machineColumns]],
  [TOTAL_SHEET.slotsTable, ['source_row', ...TOTAL_SHEET.slotColumns]],
]);
const MAX_PARAMS = 2000; // SQL Server giới hạn 2100 tham số/câu.
const MAX_ROWS_PER_INSERT = 1000;

function columnsOf(table) {
  const columns = TABLE_COLUMNS.get(table);
  if (!columns) throw new Error(`Bảng staging không hợp lệ: ${table}`);
  return columns;
}

// Xoá toàn bộ dữ liệu của MỘT bảng staging (đã whitelist). Chỉ gọi trong transaction nhập lại.
async function clear(table, conn = pool) {
  columnsOf(table);
  await conn.execute(`DELETE FROM dbo.${table}`, []);
}

/**
 * @param {Array<Array<string|number|null>>} rows mỗi phần tử theo đúng thứ tự columnsOf(table)
 */
async function insertMany(table, rows, conn = pool) {
  const columns = columnsOf(table);
  const perInsert = Math.min(MAX_ROWS_PER_INSERT, Math.floor(MAX_PARAMS / columns.length));
  const tuple = `(${columns.map(() => '?').join(', ')})`;
  for (let i = 0; i < rows.length; i += perInsert) {
    const chunk = rows.slice(i, i + perInsert);
    await conn.execute(
      `INSERT INTO dbo.${table} (${columns.join(', ')}) VALUES ${chunk.map(() => tuple).join(', ')}`,
      chunk.flat(),
    );
  }
}

async function insertRun(run, conn = pool) {
  await conn.execute(
    'INSERT INTO dbo.stg_import_runs (file_name, sheet_name, table_name, row_count) VALUES (?, ?, ?, ?)',
    [run.fileName, run.sheetName, run.tableName, run.rowCount],
  );
}

module.exports = { columnsOf, clear, insertMany, insertRun };
