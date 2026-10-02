const config = require('../config');
const mesColorService = require('../services/mes-color.service');

// Đồng bộ màu MES định kỳ trong tiến trình server (giả định chạy 1 tiến trình).

let running = false;

async function runOnce() {
  if (running) return;
  running = true;
  const started = Date.now();
  try {
    const { saved } = await mesColorService.syncFromMes();
    console.log(`MES: đồng bộ ${saved} mã màu (${Date.now() - started} ms)`);
  } catch (err) {
    console.error(`MES: đồng bộ màu lỗi — ${err.message}`);
  } finally {
    running = false;
  }
}

/** Chạy ngay rồi lặp mỗi MES_SYNC_MINUTES phút. Trả hàm dừng. */
function start() {
  if (!config.mes.enabled) {
    console.warn('MES: chưa cấu hình MES_USERNAME/MES_PASSWORD → tắt đồng bộ màu');
    return () => {};
  }
  runOnce();
  const timer = setInterval(runOnce, config.mes.syncMinutes * 60000);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { start };
