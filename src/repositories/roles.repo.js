const { pool } = require('../db/pool');

async function findIdByName(name, conn = pool) {
  const [rows] = await conn.execute('SELECT id FROM roles WHERE name = ?', [name]);
  return rows[0] ? rows[0].id : null;
}

async function insert(data, conn = pool) {
  const [rows] = await conn.execute(
    'INSERT INTO roles (name, description) OUTPUT INSERTED.id VALUES (?, ?)',
    [data.name, data.description],
  );
  return rows[0].id;
}

module.exports = { findIdByName, insert };
