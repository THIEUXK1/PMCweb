const { pool } = require('../db/pool');

// expires: Unix time (giây).
async function findData(sessionId, nowSec) {
  const [rows] = await pool.execute(
    'SELECT data FROM sessions WHERE session_id = ? AND expires > ?',
    [sessionId, nowSec],
  );
  return rows[0] ? rows[0].data : null;
}

async function upsert(sessionId, expires, data) {
  await pool.execute(
    `MERGE sessions WITH (HOLDLOCK) AS t
     USING (SELECT ? AS session_id, ? AS expires, ? AS data) AS s
        ON t.session_id = s.session_id
      WHEN MATCHED THEN UPDATE SET expires = s.expires, data = s.data
      WHEN NOT MATCHED THEN INSERT (session_id, expires, data) VALUES (s.session_id, s.expires, s.data);`,
    [sessionId, expires, data],
  );
}

async function updateExpires(sessionId, expires) {
  await pool.execute('UPDATE sessions SET expires = ? WHERE session_id = ?', [expires, sessionId]);
}

async function remove(sessionId) {
  await pool.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
}

async function removeExpired(nowSec) {
  await pool.execute('DELETE FROM sessions WHERE expires <= ?', [nowSec]);
}

module.exports = { findData, upsert, updateExpires, remove, removeExpired };
