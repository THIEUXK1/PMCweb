const fs = require('node:fs/promises');
const path = require('node:path');
const syncHistoryRepo = require('../repositories/sync-history.repo');
const { planDateFromFileName } = require('../utils/dyeing-plan-sheets');
const { localStamp } = require('../utils/local-stamp');

// Thư mục gốc: <root>/<năm>/<tháng…>/MM.DD 染色总排单 Dyeing plan.xlsx (chỉ file nằm trực tiếp trong thư mục tháng;
// bỏ qua weekly/, nháp/… là thư mục con sâu hơn).
const MAX_ERRORS_PER_VERSION = 3; // 1 bản lưu lỗi quá 3 lần → chờ file được lưu lại mới thử tiếp

async function listDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/** Mọi file kế hoạch trong thư mục năm nay và năm trước: { filePath, fileName, planDate, fileMtime }. */
async function scanFiles(root) {
  const year = new Date().getFullYear();
  const years = (await listDirs(root)).filter((n) => n === String(year) || n === String(year - 1));
  const files = [];
  for (const y of years) {
    for (const month of await listDirs(path.join(root, y))) {
      const dir = path.join(root, y, month);
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        if (!e.isFile() || e.name.startsWith('~$')) continue;
        const planDate = planDateFromFileName(e.name, y);
        if (!planDate) continue;
        const filePath = path.resolve(dir, e.name);
        const { mtime } = await fs.stat(filePath);
        files.push({ filePath, fileName: e.name, planDate, fileMtime: localStamp(mtime) });
      }
    }
  }
  return files;
}

const byPlanThenMtime = (a, b) => a.planDate.localeCompare(b.planDate) || a.fileMtime.localeCompare(b.fileMtime);

/**
 * File cần đồng bộ, theo thứ tự chạy: bản lưu mới (chưa ok, lỗi < 3 lần) có ngày kế hoạch ≥ ngày của file mới nhất
 * đã đồng bộ ok, xếp theo ngày tăng dần. File ngày cũ hơn bỏ qua dù được lưu lại: file mới hơn đã phủ các ngày đó.
 * Nhiều file cùng ngày → chạy lại file mới nhất ở cuối để lịch hiện hành thắng.
 * Chưa từng đồng bộ thành công lần nào → chỉ lấy file mới nhất.
 */
async function findPendingFiles(root) {
  const files = await scanFiles(root);
  if (files.length === 0) return [];
  files.sort(byPlanThenMtime);
  const newest = files[files.length - 1];

  const rows = await syncHistoryRepo.findFileAttempts();
  const attempts = new Map(rows.map((a) => [`${a.file_path}|${a.file_mtime}`, a]));
  const okDates = rows.filter((a) => a.ok_count > 0 && a.plan_date).map((a) => a.plan_date).sort();
  if (okDates.length === 0) return [newest];

  const fromDate = okDates[okDates.length - 1];
  const pending = files.filter((f) => {
    if (f.planDate < fromDate) return false;
    const a = attempts.get(`${f.filePath}|${f.fileMtime}`);
    return !a || (a.ok_count === 0 && a.error_count < MAX_ERRORS_PER_VERSION);
  });
  if (pending.length > 0 && pending[pending.length - 1] !== newest) pending.push(newest);
  return pending;
}

/** Đang có lần đồng bộ chạy (vd. ai đó chạy lệnh tay) → job bỏ lượt. Lần treo quá 30 phút coi như đã chết. */
async function isBusy() {
  return syncHistoryRepo.hasRunningSince(30);
}

module.exports = { findPendingFiles, isBusy };
