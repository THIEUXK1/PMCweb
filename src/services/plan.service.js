const planRepo = require('../repositories/plan.repo');
const { serialToIsoDate, isoDateToSerial } = require('../utils/excel-date');

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function todayIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

// Cột ngày lưu serial Excel; ô không phải số (vd. "DGproduction") giữ nguyên chữ.
function displayDate(raw) {
  return serialToIsoDate(raw) || raw;
}

function paged(rows, page, pageSize, mapRow) {
  const total = rows.length > 0 ? rows[0].total_count : 0;
  return { rows: rows.map(mapRow), total, page, pageSize };
}

/**
 * Lịch máy (sheet Total) trong khoảng [from, from + days - 1].
 * from bỏ trống → hôm nay nếu nằm trong dữ liệu, ngược lại ngày đầu tiên có dữ liệu.
 */
async function getTotal({ from, days }) {
  const range = await planRepo.findTotalDateRange();
  const lastImport = await planRepo.findLastImport();
  if (!range || !range.min_date) {
    return { dates: [], slotsPerDay: 0, machines: [], range: null, lastImport };
  }

  let start = from;
  if (!start) {
    const today = todayIso();
    start = today >= range.min_date && today <= range.max_date ? today : range.min_date;
  }
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const slotsPerDay = range.slots_per_day;

  const [machines, slots] = await Promise.all([
    planRepo.findTotalMachines(),
    planRepo.findTotalSlots(dates[0], dates[dates.length - 1]),
  ]);

  const cellsByRow = new Map();
  for (const s of slots) {
    if (!cellsByRow.has(s.source_row)) cellsByRow.set(s.source_row, {});
    const byDate = cellsByRow.get(s.source_row);
    if (!byDate[s.plan_date]) byDate[s.plan_date] = Array(slotsPerDay).fill(null);
    byDate[s.plan_date][s.slot_no - 1] = s.value;
  }

  return {
    dates,
    slotsPerDay,
    range: { min: range.min_date, max: range.max_date },
    lastImport,
    machines: machines.map((m) => ({
      machineNo: m.machine_no,
      tubeCount: m.tube_count,
      zone: m.zone,
      fixedMachine: m.fixed_machine,
      itemCode: m.item_code,
      colorCode: m.color_code,
      outputM: m.output_m,
      team: m.team,
      note: m.note,
      orderType: m.order_type,
      mainColorGroup: m.main_color_group,
      cells: cellsByRow.get(m.source_row) || {},
    })),
  };
}

async function listDetailOrders({ q, machine, colorGroup, date, page, pageSize }) {
  const rows = await planRepo.searchDetailOrders({
    q,
    machine,
    colorGroup,
    dyeDateSerial: date ? isoDateToSerial(date) : null,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });
  return paged(rows, page, pageSize, (r) => ({
    sourceRow: r.source_row,
    dyeDate: displayDate(r.dye_date),
    plannedMachine: r.planned_machine,
    currentMachine: r.current_machine,
    dayKey: r.day_key,
    batchNo: r.batch_no,
    orderNo: r.order_no,
    customer: r.customer,
    endCustomer: r.end_customer,
    itemCode: r.item_code,
    colorCode: r.color_code,
    colorGroup: r.color_group,
    weightGsm: r.weight_gsm,
    width: r.width,
    orderQtyM: r.order_qty_m,
    weightKg: r.weight_kg,
    plannedWeightKg: r.planned_weight_kg,
    lengthM: r.length_m,
    batchesPerDay: r.batches_per_day,
    dyeHoursPerBatch: r.dye_hours_per_batch,
    cumulativeHours: r.cumulative_hours,
    deliveryDate: displayDate(r.delivery_date),
    greigeDoneDate: displayDate(r.greige_done_date),
  }));
}

async function getDetailOrderFilters() {
  const [machines, colorGroups] = await Promise.all([
    planRepo.findDetailOrderMachines(),
    planRepo.findDetailOrderColorGroups(),
  ]);
  return { machines, colorGroups };
}

async function listBatchesPerDay({ q, page, pageSize }) {
  const rows = await planRepo.searchBatchesPerDay({ q, offset: (page - 1) * pageSize, limit: pageSize });
  return paged(rows, page, pageSize, (r) => ({
    sourceRow: r.source_row,
    itemColorKey: r.item_color_key,
    itemCode: r.item_code,
    colorCode: r.color_code,
    batchesPerDay: r.batches_per_day,
  }));
}

module.exports = { getTotal, listDetailOrders, getDetailOrderFilters, listBatchesPerDay };
