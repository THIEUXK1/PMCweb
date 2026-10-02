const { pool } = require('../db/pool');

// 6 tham số/dòng; SQL Server giới hạn 2100 tham số mỗi lệnh.
const ROWS_PER_MERGE = 200;

/**
 * @param {Array<{ colorCode, rgbHex, itemCode, batchNo, machineNo, batchAt }>} rows color_code không trùng
 */
async function upsertMany(rows, conn = pool) {
  for (let i = 0; i < rows.length; i += ROWS_PER_MERGE) {
    const chunk = rows.slice(i, i + ROWS_PER_MERGE);
    await conn.execute(
      `MERGE dbo.mes_colors AS t
       USING (VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, TRY_CONVERT(DATETIME2(0), ?, 120))').join(', ')})
         AS s (color_code, rgb_hex, item_code, batch_no, machine_no, batch_at)
          ON t.color_code = s.color_code
        WHEN MATCHED AND (t.batch_at IS NULL OR s.batch_at >= t.batch_at) THEN
          UPDATE SET rgb_hex = s.rgb_hex, item_code = s.item_code, batch_no = s.batch_no,
                     machine_no = s.machine_no, batch_at = s.batch_at, updated_at = SYSDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (color_code, rgb_hex, item_code, batch_no, machine_no, batch_at)
          VALUES (s.color_code, s.rgb_hex, s.item_code, s.batch_no, s.machine_no, s.batch_at);`,
      chunk.flatMap((r) => [r.colorCode, r.rgbHex, r.itemCode, r.batchNo, r.machineNo, r.batchAt]),
    );
  }
}

async function findAll() {
  const [rows] = await pool.execute('SELECT color_code, rgb_hex FROM dbo.mes_colors', []);
  return rows;
}

module.exports = { upsertMany, findAll };
