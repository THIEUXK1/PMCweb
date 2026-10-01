-- Staging cho file "染色总排单 Dyeing plan.xlsx" (scripts/import-dyeing-plan.js).
-- Dữ liệu thô dạng chuỗi, mỗi lần nhập thay toàn bộ. Ánh xạ cột: src/utils/dyeing-plan-sheets.js.
-- source_row = số dòng trong sheet Excel.
IF OBJECT_ID(N'dbo.stg_import_runs', N'U') IS NULL
CREATE TABLE dbo.stg_import_runs (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_import_runs PRIMARY KEY,
  file_name NVARCHAR(255) NOT NULL,
  sheet_name NVARCHAR(100) NOT NULL,
  table_name NVARCHAR(100) NOT NULL,
  row_count INT NOT NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_import_runs_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "3.色单(Đơn màu)."
IF OBJECT_ID(N'dbo.stg_dyeing_batches', N'U') IS NULL
CREATE TABLE dbo.stg_dyeing_batches (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_dyeing_batches PRIMARY KEY,
  source_row INT NOT NULL,
  machine_no NVARCHAR(500) NULL,
  order_date NVARCHAR(500) NULL,
  machine_start_date NVARCHAR(500) NULL,
  greige_done_date NVARCHAR(500) NULL,
  sample_ship_date NVARCHAR(500) NULL,
  completed_date NVARCHAR(500) NULL,
  customer NVARCHAR(500) NULL,
  end_customer NVARCHAR(500) NULL,
  sd_confirmed_delivery_date NVARCHAR(500) NULL,
  days_to_ship_gap NVARCHAR(500) NULL,
  order_no NVARCHAR(500) NULL,
  item_color_key NVARCHAR(500) NULL,
  ship_schedule NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  ok_color NVARCHAR(500) NULL,
  weight_gsm NVARCHAR(500) NULL,
  width NVARCHAR(500) NULL,
  item_code NVARCHAR(500) NULL,
  order_qty_m NVARCHAR(500) NULL,
  weight_kg NVARCHAR(500) NULL,
  batch_no NVARCHAR(500) NULL,
  planned_weight_kg NVARCHAR(500) NULL,
  pending_dye_qty_m NVARCHAR(500) NULL,
  pending_total_by_item_color NVARCHAR(500) NULL,
  color_group NVARCHAR(500) NULL,
  batches_per_day NVARCHAR(500) NULL,
  machine_plan NVARCHAR(500) NULL,
  col_28 NVARCHAR(500) NULL,
  dye_time NVARCHAR(500) NULL,
  col_30 NVARCHAR(500) NULL,
  col_31 NVARCHAR(500) NULL,
  matched_machine NVARCHAR(500) NULL,
  match_result NVARCHAR(500) NULL,
  owner NVARCHAR(500) NULL,
  last_week_machine NVARCHAR(500) NULL,
  daily_plan_machine NVARCHAR(500) NULL,
  concat_formula NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_dyeing_batches_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "detail order"
IF OBJECT_ID(N'dbo.stg_detail_orders', N'U') IS NULL
CREATE TABLE dbo.stg_detail_orders (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_detail_orders PRIMARY KEY,
  source_row INT NOT NULL,
  total_by_item_color NVARCHAR(500) NULL,
  delivery_date NVARCHAR(500) NULL,
  greige_done_date NVARCHAR(500) NULL,
  customer NVARCHAR(500) NULL,
  end_customer NVARCHAR(500) NULL,
  vv NVARCHAR(500) NULL,
  order_no NVARCHAR(500) NULL,
  item_color_key NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  color_prefix NVARCHAR(500) NULL,
  weight_gsm NVARCHAR(500) NULL,
  width NVARCHAR(500) NULL,
  item_code NVARCHAR(500) NULL,
  day_seq NVARCHAR(500) NULL,
  order_qty_m NVARCHAR(500) NULL,
  weight_kg NVARCHAR(500) NULL,
  batch_no NVARCHAR(500) NULL,
  batches_per_day NVARCHAR(500) NULL,
  planned_weight_kg NVARCHAR(500) NULL,
  merge_key NVARCHAR(500) NULL,
  color_group NVARCHAR(500) NULL,
  length_m NVARCHAR(500) NULL,
  col_23 NVARCHAR(500) NULL,
  dye_date NVARCHAR(500) NULL,
  day_key NVARCHAR(500) NULL,
  planned_machine NVARCHAR(500) NULL,
  paidan NVARCHAR(500) NULL,
  actual NVARCHAR(500) NULL,
  gap NVARCHAR(500) NULL,
  paidan_kg NVARCHAR(500) NULL,
  col_31 NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_detail_orders_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "detail order "
IF OBJECT_ID(N'dbo.stg_detail_orders_ext', N'U') IS NULL
CREATE TABLE dbo.stg_detail_orders_ext (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_detail_orders_ext PRIMARY KEY,
  source_row INT NOT NULL,
  total_by_item_color NVARCHAR(500) NULL,
  delivery_date NVARCHAR(500) NULL,
  greige_done_date NVARCHAR(500) NULL,
  customer NVARCHAR(500) NULL,
  end_customer NVARCHAR(500) NULL,
  machine_day_key NVARCHAR(500) NULL,
  order_no NVARCHAR(500) NULL,
  item_color_key NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  color_prefix NVARCHAR(500) NULL,
  weight_gsm NVARCHAR(500) NULL,
  width NVARCHAR(500) NULL,
  item_code NVARCHAR(500) NULL,
  day_seq NVARCHAR(500) NULL,
  order_qty_m NVARCHAR(500) NULL,
  weight_kg NVARCHAR(500) NULL,
  batch_no NVARCHAR(500) NULL,
  batches_per_day NVARCHAR(500) NULL,
  planned_weight_kg NVARCHAR(500) NULL,
  merge_key NVARCHAR(500) NULL,
  color_group NVARCHAR(500) NULL,
  length_m NVARCHAR(500) NULL,
  col_23 NVARCHAR(500) NULL,
  dye_date NVARCHAR(500) NULL,
  day_key NVARCHAR(500) NULL,
  planned_machine NVARCHAR(500) NULL,
  actual_kou NVARCHAR(500) NULL,
  gap NVARCHAR(500) NULL,
  current_machine NVARCHAR(500) NULL,
  position NVARCHAR(500) NULL,
  vv NVARCHAR(500) NULL,
  hh NVARCHAR(500) NULL,
  dye_hours_per_batch NVARCHAR(500) NULL,
  start_date NVARCHAR(500) NULL,
  cumulative_hours NVARCHAR(500) NULL,
  dye_day NVARCHAR(500) NULL,
  seq_no NVARCHAR(500) NULL,
  col_38 NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_detail_orders_ext_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "Master"
IF OBJECT_ID(N'dbo.stg_batches_per_day', N'U') IS NULL
CREATE TABLE dbo.stg_batches_per_day (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_batches_per_day PRIMARY KEY,
  source_row INT NOT NULL,
  item_color_key NVARCHAR(500) NULL,
  item_code NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  batches_per_day NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_batches_per_day_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "đếm lô"
IF OBJECT_ID(N'dbo.stg_machines', N'U') IS NULL
CREATE TABLE dbo.stg_machines (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_machines PRIMARY KEY,
  source_row INT NOT NULL,
  machine_no NVARCHAR(500) NULL,
  tube_count NVARCHAR(500) NULL,
  schedule_area NVARCHAR(500) NULL,
  zone NVARCHAR(500) NULL,
  fixed_machine NVARCHAR(500) NULL,
  total NVARCHAR(500) NULL,
  brown_count NVARCHAR(500) NULL,
  light_count NVARCHAR(500) NULL,
  red_count NVARCHAR(500) NULL,
  blue_count NVARCHAR(500) NULL,
  black_count NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_machines_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "颜色系"
IF OBJECT_ID(N'dbo.stg_color_groups', N'U') IS NULL
CREATE TABLE dbo.stg_color_groups (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_color_groups PRIMARY KEY,
  source_row INT NOT NULL,
  item_code NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  color_prefix NVARCHAR(500) NULL,
  color_group NVARCHAR(500) NULL,
  item_color_key NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_color_groups_imported_at DEFAULT SYSDATETIME()
);
GO

-- Sheet "daily"
IF OBJECT_ID(N'dbo.stg_daily_plans', N'U') IS NULL
CREATE TABLE dbo.stg_daily_plans (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_daily_plans PRIMARY KEY,
  source_row INT NOT NULL,
  machine_no NVARCHAR(500) NULL,
  col_02 NVARCHAR(500) NULL,
  delivery_date NVARCHAR(500) NULL,
  col_04 NVARCHAR(500) NULL,
  customer NVARCHAR(500) NULL,
  end_customer NVARCHAR(500) NULL,
  col_07 NVARCHAR(500) NULL,
  and_key NVARCHAR(500) NULL,
  order_no NVARCHAR(500) NULL,
  item_color_key NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  ok_color NVARCHAR(500) NULL,
  weight_gsm NVARCHAR(500) NULL,
  width NVARCHAR(500) NULL,
  item_code NVARCHAR(500) NULL,
  day_seq NVARCHAR(500) NULL,
  order_qty_m NVARCHAR(500) NULL,
  weight_kg NVARCHAR(500) NULL,
  batch_no NVARCHAR(500) NULL,
  planned_weight_kg NVARCHAR(500) NULL,
  setting_plan NVARCHAR(500) NULL,
  merge_key NVARCHAR(500) NULL,
  color_group NVARCHAR(500) NULL,
  length_m NVARCHAR(500) NULL,
  paidan NVARCHAR(500) NULL,
  dye_date NVARCHAR(500) NULL,
  day_key NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_daily_plans_imported_at DEFAULT SYSDATETIME()
);
GO
