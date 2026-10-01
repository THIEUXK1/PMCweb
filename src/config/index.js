const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME', 'SESSION_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Thiếu biến môi trường: ${missing.join(', ')} (xem .env.example)`);
}

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  isProduction: env === 'production',
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
  },
  migrateDb: {
    user: process.env.MIGRATE_DB_USER || process.env.DB_USER,
    password: process.env.MIGRATE_DB_USER ? (process.env.MIGRATE_DB_PASSWORD || '') : (process.env.DB_PASSWORD || ''),
  },
  sessionSecret: process.env.SESSION_SECRET,
};
