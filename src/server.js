const config = require('./config');
const { app, sessionStore } = require('./app');
const { pool } = require('./db/pool');

const server = app.listen(config.port, () => {
  console.log(`PMCweb chạy tại http://localhost:${config.port} (${config.env})`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: đang tắt...`);
  server.close(async () => {
    await sessionStore.close();
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
