const sql = require('mssql');
const config = require('../config');

const mssqlPool = new sql.ConnectionPool({
  server: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: {
    encrypt: config.db.encrypt,
    trustServerCertificate: config.db.trustServerCertificate,
  },
});

// Kết nối lười: lỗi kết nối nổi lên ở query đầu tiên thay vì unhandled rejection lúc khởi động.
let connecting = null;
function connect() {
  if (!connecting) {
    connecting = mssqlPool.connect().catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

/**
 * Đổi placeholder `?` thành tham số @p0, @p1... của mssql.
 * Chỉ dùng với SQL tĩnh trong repo: không đặt dấu `?` trong chuỗi literal của câu SQL.
 */
function bind(request, text, params) {
  let i = 0;
  const out = text.replace(/\?/g, () => {
    if (i >= params.length) throw new Error('Thiếu tham số cho câu SQL');
    request.input(`p${i}`, params[i]);
    return `@p${i++}`;
  });
  if (i !== params.length) throw new Error('Thừa tham số cho câu SQL');
  return out;
}

async function run(request, text, params = []) {
  const result = await request.query(bind(request, text, params));
  return [result.recordset || [], { rowsAffected: result.rowsAffected }];
}

// API giữ dạng `execute(sql, params) → [rows, meta]` để repository không phụ thuộc driver.
const pool = {
  async execute(text, params) {
    await connect();
    return run(mssqlPool.request(), text, params);
  },
  async end() {
    if (connecting) await mssqlPool.close();
  },
};

async function withTransaction(work) {
  await connect();
  const tx = new sql.Transaction(mssqlPool);
  await tx.begin();
  const conn = { execute: (text, params) => run(new sql.Request(tx), text, params) };
  try {
    const result = await work(conn);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// Lỗi vi phạm UNIQUE/PRIMARY KEY của SQL Server.
function isDuplicateKeyError(err) {
  return err && (err.number === 2627 || err.number === 2601);
}

module.exports = { pool, withTransaction, isDuplicateKeyError };
