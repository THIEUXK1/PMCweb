const { pool } = require('../db/pool');

// Lịch sử đồng bộ kế hoạch nhuộm (migration 007). Thời gian file_mtime truyền/đọc dạng chuỗi
// 'YYYY-MM-DD HH:mm:ss' giờ địa phương để khớp started_at (SYSDATETIME) — tránh driver đổi sang UTC.

const MAX_PARAMS = 2000;

async function insertRun(run, conn = pool) {
  const [rows] = await conn.execute(
    `INSERT INTO dbo.stg_sync_runs (trigger_type, file_name, file_path, plan_date, file_mtime, status)
     OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, 'running')`,
    [run.triggerType, run.fileName, run.filePath, run.planDate, run.fileMtime],
  );
  return rows[0].id;
}

async function finishRun(id, status, errorMessage = null, conn = pool) {
  await conn.execute(
    'UPDATE dbo.stg_sync_runs SET status = ?, error_message = ?, finished_at = SYSDATETIME() WHERE id = ?',
    [status, errorMessage ? String(errorMessage).slice(0, 2000) : null, id],
  );
}

async function insertRunTables(runId, tables, conn = pool) {
  for (const t of tables) {
    await conn.execute(
      `INSERT INTO dbo.stg_sync_run_tables
         (run_id, table_name, file_rows, unchanged_rows, inserted_rows, deleted_rows, kept_rows)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [runId, t.table, t.rows, t.unchanged, t.inserted, t.deleted, t.kept],
    );
  }
}

/** @param {Array<{ table: string, action: 'I'|'U'|'D', recordKey: string, oldData: string|null, newData: string|null }>} changes */
async function insertChanges(runId, changes, conn = pool) {
  const perInsert = Math.floor(MAX_PARAMS / 6);
  for (let i = 0; i < changes.length; i += perInsert) {
    const chunk = changes.slice(i, i + perInsert);
    await conn.execute(
      `INSERT INTO dbo.stg_change_log (run_id, table_name, action, record_key, old_data, new_data)
       VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
      chunk.flatMap((c) => [runId, c.table, c.action, c.recordKey.slice(0, 500), c.oldData, c.newData]),
    );
  }
}

/** Số lần ok / lỗi theo từng cặp (file_path, file_mtime), kèm ngày kế hoạch. */
async function findFileAttempts(conn = pool) {
  const [rows] = await conn.execute(
    `SELECT file_path, CONVERT(char(19), file_mtime, 120) AS file_mtime, CONVERT(char(10), plan_date, 23) AS plan_date,
            SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok_count,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
       FROM dbo.stg_sync_runs
      WHERE file_mtime IS NOT NULL
      GROUP BY file_path, file_mtime, plan_date`,
    [],
  );
  return rows;
}

/** Có lần đồng bộ đang chạy (bắt đầu trong `minutes` phút gần đây) không — lần treo lâu hơn coi như đã chết. */
async function hasRunningSince(minutes, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS n FROM dbo.stg_sync_runs
      WHERE status = 'running' AND started_at > DATEADD(minute, -?, SYSDATETIME())`,
    [minutes],
  );
  return rows[0].n > 0;
}

module.exports = { insertRun, finishRun, insertRunTables, insertChanges, findFileAttempts, hasRunningSince };
