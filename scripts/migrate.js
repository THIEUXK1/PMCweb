// Dùng: node --env-file=.env scripts/migrate.js up|down
// up: chạy mọi migration chưa áp dụng. down: lùi đúng 1 bước (chỉ dev).
const fs = require('node:fs/promises');
const path = require('node:path');
const sql = require('mssql');
const config = require('../src/config');

const DIR = path.join(__dirname, '..', 'db', 'migrations');

async function listVersions() {
  const files = await fs.readdir(DIR);
  return files
    .filter((f) => f.endsWith('.up.sql'))
    .map((f) => f.slice(0, -'.up.sql'.length))
    .sort();
}

// Tách batch theo dòng GO như sqlcmd. File migration là SQL tĩnh trong repo, không chứa input người dùng.
function splitBatches(text) {
  return text.split(/^\s*GO\s*$/im).map((b) => b.trim()).filter(Boolean);
}

async function run(tx, version, direction) {
  const text = await fs.readFile(path.join(DIR, `${version}.${direction}.sql`), 'utf8');
  for (const batch of splitBatches(text)) {
    await new sql.Request(tx).batch(batch);
  }
}

async function main() {
  const direction = process.argv[2];
  if (direction !== 'up' && direction !== 'down') {
    console.error('Dùng: migrate.js up|down');
    process.exit(1);
  }
  if (direction === 'down' && config.isProduction) {
    console.error('ERROR: không chạy down ở production');
    process.exit(1);
  }

  const pool = await new sql.ConnectionPool({
    server: config.db.host,
    port: config.db.port,
    database: config.db.database,
    ...config.migrateDb,
    options: { encrypt: config.db.encrypt, trustServerCertificate: config.db.trustServerCertificate },
  }).connect();

  // Mỗi migration chạy trong một transaction cùng bản ghi schema_migrations.
  async function apply(version, dir, bookkeeping) {
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await run(tx, version, dir);
      await new sql.Request(tx).input('version', sql.NVarChar(100), version).query(bookkeeping);
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  try {
    await pool.request().batch(`IF OBJECT_ID(N'dbo.schema_migrations', N'U') IS NULL
      CREATE TABLE dbo.schema_migrations (
        version NVARCHAR(100) NOT NULL CONSTRAINT pk_schema_migrations PRIMARY KEY,
        applied_at DATETIME2(0) NOT NULL CONSTRAINT df_schema_migrations_applied_at DEFAULT SYSDATETIME()
      )`);
    const { recordset: rows } = await pool.request().query('SELECT version FROM dbo.schema_migrations ORDER BY version');
    const applied = new Set(rows.map((r) => r.version));

    if (direction === 'up') {
      const pending = (await listVersions()).filter((v) => !applied.has(v));
      if (pending.length === 0) console.log('Không có migration mới.');
      for (const version of pending) {
        await apply(version, 'up', 'INSERT INTO dbo.schema_migrations (version) VALUES (@version)');
        console.log(`UP   ${version}`);
      }
    } else {
      const last = rows.length > 0 ? rows[rows.length - 1].version : null;
      if (!last) {
        console.log('Chưa có migration nào để lùi.');
        return;
      }
      await apply(last, 'down', 'DELETE FROM dbo.schema_migrations WHERE version = @version');
      console.log(`DOWN ${last}`);
    }
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
