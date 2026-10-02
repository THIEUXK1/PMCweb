// Đồng bộ màu MES một lần: npm run sync:mes-colors
const config = require('../src/config');
const { pool } = require('../src/db/pool');
const mesColorService = require('../src/services/mes-color.service');

(async () => {
  if (!config.mes.enabled) throw new Error('Thiếu MES_USERNAME/MES_PASSWORD trong .env');
  const { saved } = await mesColorService.syncFromMes();
  console.log(`Đã đồng bộ ${saved} mã màu từ MES`);
})()
  .catch((err) => {
    console.error(`Lỗi: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
