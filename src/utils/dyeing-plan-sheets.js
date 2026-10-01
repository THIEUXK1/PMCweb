// Ánh xạ sheet của file "染色总排单 Dyeing plan.xlsx" → bảng staging (migration 004).
// columns[i] = tên cột cho cột Excel thứ i+1; null = bỏ qua. Cột không có tiêu đề đặt col_NN.
// Giá trị giữ thô dạng chuỗi: ngày là số serial Excel (vd. 46295), lỗi công thức giữ nguyên (#N/A).

const SHEETS = [
  {
    sheet: '3.色单(Đơn màu).',
    table: 'stg_dyeing_batches',
    firstDataRow: 3,
    columns: [
      'machine_no', 'order_date', 'machine_start_date', 'greige_done_date', 'sample_ship_date',
      'completed_date', 'customer', 'end_customer', 'sd_confirmed_delivery_date', 'days_to_ship_gap',
      'order_no', 'item_color_key', 'ship_schedule', 'color_code', 'ok_color',
      'weight_gsm', 'width', 'item_code', 'order_qty_m', 'weight_kg',
      'batch_no', 'planned_weight_kg', 'pending_dye_qty_m', 'pending_total_by_item_color', 'color_group',
      'batches_per_day', 'machine_plan', 'col_28', 'dye_time', 'col_30',
      'col_31', 'matched_machine', 'match_result', 'owner', 'last_week_machine',
      'daily_plan_machine', 'concat_formula',
    ],
  },
  {
    sheet: 'detail order',
    table: 'stg_detail_orders',
    firstDataRow: 3,
    columns: [
      'total_by_item_color', 'delivery_date', 'greige_done_date', 'customer', 'end_customer',
      'vv', 'order_no', 'item_color_key', 'color_code', 'color_prefix',
      'weight_gsm', 'width', 'item_code', 'day_seq', 'order_qty_m',
      'weight_kg', 'batch_no', 'batches_per_day', 'planned_weight_kg', 'merge_key',
      'color_group', 'length_m', 'col_23', 'dye_date', 'day_key',
      'planned_machine', 'paidan', 'actual', 'gap', 'paidan_kg',
      'col_31',
    ],
  },
  {
    sheet: 'detail order ',
    table: 'stg_detail_orders_ext',
    firstDataRow: 3,
    columns: [
      'total_by_item_color', 'delivery_date', 'greige_done_date', 'customer', 'end_customer',
      'machine_day_key', 'order_no', 'item_color_key', 'color_code', 'color_prefix',
      'weight_gsm', 'width', 'item_code', 'day_seq', 'order_qty_m',
      'weight_kg', 'batch_no', 'batches_per_day', 'planned_weight_kg', 'merge_key',
      'color_group', 'length_m', 'col_23', 'dye_date', 'day_key',
      'planned_machine', 'actual_kou', 'gap', 'current_machine', 'position',
      'vv', 'hh', 'dye_hours_per_batch', 'start_date', 'cumulative_hours',
      'dye_day', 'seq_no', 'col_38',
    ],
  },
  {
    sheet: 'Master',
    table: 'stg_batches_per_day',
    firstDataRow: 2,
    columns: ['item_color_key', 'item_code', 'color_code', 'batches_per_day'],
  },
  {
    sheet: 'đếm lô',
    table: 'stg_machines',
    firstDataRow: 3,
    columns: [
      'machine_no', 'tube_count', 'schedule_area', 'zone', 'fixed_machine',
      'total', 'brown_count', 'light_count', 'red_count', 'blue_count',
      'black_count',
    ],
  },
  {
    sheet: '颜色系',
    table: 'stg_color_groups',
    firstDataRow: 4,
    columns: ['item_code', 'color_code', 'color_prefix', 'color_group', 'item_color_key'],
  },
  {
    sheet: 'daily',
    table: 'stg_daily_plans',
    firstDataRow: 3,
    columns: [
      'machine_no', 'col_02', 'delivery_date', 'col_04', 'customer',
      'end_customer', 'col_07', 'and_key', 'order_no', 'item_color_key',
      'color_code', 'ok_color', 'weight_gsm', 'width', 'item_code',
      'day_seq', 'order_qty_m', 'weight_kg', 'batch_no', 'planned_weight_kg',
      'setting_plan', 'merge_key', 'color_group', 'length_m', 'paidan',
      'dye_date', 'day_key',
    ],
  },
];

// Sheet "Total  " là ma trận máy × (ngày × 5 ca) → tách 2 bảng (migration 005):
// cột 1..12 = thuộc tính máy; từ cột firstSlotCol mỗi ô = 1 dòng stg_total_slots.
const TOTAL_SHEET = {
  sheet: 'Total  ',
  machinesTable: 'stg_total_machines',
  slotsTable: 'stg_total_slots',
  dateRow: 4, // ô ngày = số serial Excel
  slotRow: 3, // số ca 1..5
  firstDataRow: 6,
  firstSlotCol: 13,
  machineColumns: [
    'seq_no', 'machine_no', 'tube_count', 'zone', 'fixed_machine',
    'item_code', 'color_code', 'output_m', 'team', 'note',
    'order_type', 'main_color_group',
  ],
  slotColumns: ['machine_no', 'plan_date', 'slot_no', 'value'],
};

// Độ dài tối đa mỗi giá trị — khớp NVARCHAR(500) trong migration 004/005.
const MAX_VALUE_LENGTH = 500;

module.exports = { SHEETS, TOTAL_SHEET, MAX_VALUE_LENGTH };
