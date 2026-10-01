const { pool } = require('../db/pool');

// Đọc các bảng staging stg_* (nhập từ file Excel kế hoạch nhuộm). Chỉ SELECT.

// Thoát ký tự đại diện của LIKE trong SQL Server; dùng kèm ESCAPE '\'.
function likeContains(text) {
  return `%${text.replace(/[\\%_[]/g, (ch) => `\\${ch}`)}%`;
}

async function findLastImport() {
  const [rows] = await pool.execute(
    `SELECT TOP 1 file_name, CONVERT(char(19), imported_at, 120) AS imported_at
       FROM stg_import_runs
      ORDER BY id DESC`,
  );
  return rows[0] || null;
}

// ---- Sheet "Total" ----

async function findTotalMachines() {
  const [rows] = await pool.execute(
    `SELECT source_row, machine_no, tube_count, zone, fixed_machine, item_code, color_code,
            output_m, team, note, order_type, main_color_group
       FROM stg_total_machines
      ORDER BY source_row`,
  );
  return rows;
}

async function findTotalDateRange() {
  const [rows] = await pool.execute(
    `SELECT CONVERT(char(10), MIN(plan_date), 23) AS min_date,
            CONVERT(char(10), MAX(plan_date), 23) AS max_date,
            MAX(slot_no) AS slots_per_day
       FROM stg_total_slots`,
  );
  return rows[0];
}

async function findTotalSlots(fromDate, toDate) {
  const [rows] = await pool.execute(
    `SELECT source_row, CONVERT(char(10), plan_date, 23) AS plan_date, slot_no, value
       FROM stg_total_slots
      WHERE plan_date BETWEEN ? AND ?
      ORDER BY source_row, plan_date, slot_no`,
    [fromDate, toDate],
  );
  return rows;
}

// ---- Sheet "detail order " ----

async function searchDetailOrders({ q, machine, colorGroup, dyeDateSerial, offset, limit }) {
  const where = [];
  const params = [];
  if (q) {
    const p = likeContains(q);
    where.push(`(order_no LIKE ? ESCAPE '\\' OR batch_no LIKE ? ESCAPE '\\' OR item_code LIKE ? ESCAPE '\\'
              OR color_code LIKE ? ESCAPE '\\' OR customer LIKE ? ESCAPE '\\' OR end_customer LIKE ? ESCAPE '\\')`);
    params.push(p, p, p, p, p, p);
  }
  if (machine) {
    where.push('planned_machine = ?');
    params.push(machine);
  }
  if (colorGroup) {
    where.push('color_group = ?');
    params.push(colorGroup);
  }
  if (dyeDateSerial) {
    where.push('dye_date = ?');
    params.push(String(dyeDateSerial));
  }
  const [rows] = await pool.execute(
    `SELECT source_row, dye_date, planned_machine, current_machine, day_key, batch_no, order_no,
            customer, end_customer, item_code, color_code, color_group, weight_gsm, width,
            order_qty_m, weight_kg, planned_weight_kg, length_m, batches_per_day,
            dye_hours_per_batch, cumulative_hours, delivery_date, greige_done_date,
            COUNT(*) OVER () AS total_count
       FROM stg_detail_orders_ext
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY source_row
     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    [...params, offset, limit],
  );
  return rows;
}

async function findDetailOrderMachines() {
  const [rows] = await pool.execute(
    `SELECT DISTINCT planned_machine AS value
       FROM stg_detail_orders_ext
      WHERE planned_machine IS NOT NULL
      ORDER BY planned_machine`,
  );
  return rows.map((r) => r.value);
}

async function findDetailOrderColorGroups() {
  const [rows] = await pool.execute(
    `SELECT DISTINCT color_group AS value
       FROM stg_detail_orders_ext
      WHERE color_group IS NOT NULL
      ORDER BY color_group`,
  );
  return rows.map((r) => r.value);
}

// ---- Sheet "Master" ----

async function searchBatchesPerDay({ q, offset, limit }) {
  const params = [];
  let where = '';
  if (q) {
    const p = likeContains(q);
    where = `WHERE item_code LIKE ? ESCAPE '\\' OR color_code LIKE ? ESCAPE '\\' OR item_color_key LIKE ? ESCAPE '\\'`;
    params.push(p, p, p);
  }
  const [rows] = await pool.execute(
    `SELECT source_row, item_color_key, item_code, color_code, batches_per_day,
            COUNT(*) OVER () AS total_count
       FROM stg_batches_per_day
      ${where}
      ORDER BY source_row
     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    [...params, offset, limit],
  );
  return rows;
}

module.exports = {
  findLastImport,
  findTotalMachines,
  findTotalDateRange,
  findTotalSlots,
  searchDetailOrders,
  findDetailOrderMachines,
  findDetailOrderColorGroups,
  searchBatchesPerDay,
};
