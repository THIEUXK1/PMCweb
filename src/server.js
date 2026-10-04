const config = require('./config');
const { app, sessionStore } = require('./app');
const { pool } = require('./db/pool');
const mesColorSyncJob = require('./jobs/mes-color-sync.job');
const dyeingPlanSyncJob = require('./jobs/dyeing-plan-sync.job');

let stopMesSync = () => {};
let stopDyeingPlanSync = () => {};
const server = app.listen(config.port, () => {
  console.log(`PMCweb chạy tại http://localhost:${config.port} (${config.env})`);
  stopMesSync = mesColorSyncJob.start();
  stopDyeingPlanSync = dyeingPlanSyncJob.start();
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: đang tắt...`);
  stopMesSync();
  stopDyeingPlanSync();
  server.close(async () => {
    await sessionStore.close();
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
