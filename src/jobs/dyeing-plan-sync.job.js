const path = require('node:path');
const { fork } = require('node:child_process');
const config = require('../config');
const dyeingPlanSyncService = require('../services/dyeing-plan-sync.service');

// Tự động đồng bộ file kế hoạch nhuộm mỗi DYEING_PLAN_SYNC_MINUTES phút.
// Quét chỉ đọc giờ lưu file (nhẹ); có bản lưu mới → chạy scripts/import-dyeing-plan.js ở TIẾN TRÌNH CON
// (đọc Excel tốn CPU/RAM vài phút, không làm chậm web). Giả định chạy 1 tiến trình server.

const SCRIPT = path.join(__dirname, '../../scripts/import-dyeing-plan.js');
const TIMEOUT_MS = 20 * 60000;

let running = false;
let stopped = false;

function runImport(filePath) {
  return new Promise((resolve) => {
    // execArgv rỗng: không kế thừa --watch của server (con sẽ không bao giờ thoát). env kế thừa từ --env-file.
    const child = fork(SCRIPT, [filePath, '--auto'], { execArgv: [], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    const log = (stream, write) => stream.on('data', (buf) => buf.toString().split(/\r?\n/)
      .filter(Boolean).forEach((line) => write(`  ${line}`)));
    log(child.stdout, console.log);
    log(child.stderr, console.error);
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function runOnce() {
  if (running) return;
  running = true;
  try {
    if (await dyeingPlanSyncService.isBusy()) {
      console.log('Kế hoạch nhuộm: đang có lần đồng bộ khác chạy → bỏ lượt');
      return;
    }
    const files = await dyeingPlanSyncService.findPendingFiles(config.dyeingPlan.dir);
    for (const f of files) {
      if (stopped) break;
      const started = Date.now();
      console.log(`Kế hoạch nhuộm: đồng bộ ${f.fileName} (lưu ${f.fileMtime})`);
      const ok = await runImport(f.filePath);
      console.log(`Kế hoạch nhuộm: ${ok ? 'xong' : 'LỖI'} ${f.fileName} (${Math.round((Date.now() - started) / 1000)} s)`);
    }
  } catch (err) {
    console.error(`Kế hoạch nhuộm: quét/đồng bộ lỗi — ${err.message}`);
  } finally {
    running = false;
  }
}

/** Chạy ngay rồi lặp mỗi DYEING_PLAN_SYNC_MINUTES phút. Trả hàm dừng. */
function start() {
  if (!config.dyeingPlan.enabled) {
    console.warn('Kế hoạch nhuộm: chưa cấu hình DYEING_PLAN_DIR → tắt tự động đồng bộ');
    return () => {};
  }
  runOnce();
  const timer = setInterval(runOnce, config.dyeingPlan.syncMinutes * 60000);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

module.exports = { start };
