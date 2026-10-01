const { pool } = require('../db/pool');

// Append-only: không có update/delete.
async function insert(entry, conn = pool) {
  await conn.execute(
    'INSERT INTO audit_logs (username, table_name, action, old_data, new_data) VALUES (?, ?, ?, ?, ?)',
    [
      entry.username || null,
      entry.tableName || null,
      entry.action,
      entry.oldData === undefined ? null : JSON.stringify(entry.oldData),
      entry.newData === undefined ? null : JSON.stringify(entry.newData),
    ],
  );
}

module.exports = { insert };
