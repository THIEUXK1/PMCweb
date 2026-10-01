const { pool } = require('../db/pool');

// Chỉ dùng trong auth.service — trả password_hash.
async function findCredentialsByUsername(username, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT id, username, full_name, password_hash, is_active
       FROM users
      WHERE username = ? AND deleted_at IS NULL`,
    [username],
  );
  return rows[0] || null;
}

async function findRoleNames(userId, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?`,
    [userId],
  );
  return rows.map((r) => r.name);
}

async function insert(data, conn = pool) {
  const [rows] = await conn.execute(
    'INSERT INTO users (username, password_hash, full_name) OUTPUT INSERTED.id VALUES (?, ?, ?)',
    [data.username, data.passwordHash, data.fullName],
  );
  return rows[0].id;
}

async function addRole(userId, roleId, conn = pool) {
  await conn.execute(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?)`,
    [userId, roleId, userId, roleId],
  );
}

module.exports = { findCredentialsByUsername, findRoleNames, insert, addRole };
