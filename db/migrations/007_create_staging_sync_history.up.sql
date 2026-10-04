-- Lịch sử đồng bộ file "染色总排单 Dyeing plan.xlsx" → stg_* (job tự động + lệnh tay).
-- Mỗi lần đồng bộ = 1 dòng stg_sync_runs; số liệu từng bảng ở stg_sync_run_tables;
-- dòng thêm/sửa/xoá ở stg_change_log (trừ bảng khai báo logChanges: false, xem src/utils/dyeing-plan-sheets.js).
IF OBJECT_ID(N'dbo.stg_sync_runs', N'U') IS NULL
CREATE TABLE dbo.stg_sync_runs (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_sync_runs PRIMARY KEY,
  trigger_type NVARCHAR(20) NOT NULL, -- auto | manual
  file_name NVARCHAR(255) NOT NULL,
  file_path NVARCHAR(1000) NOT NULL,
  plan_date DATE NULL, -- ngày trong tên file (MM.DD)
  file_mtime DATETIME2(0) NULL, -- giờ lưu file lúc đọc
  status NVARCHAR(20) NOT NULL, -- running | ok | error
  error_message NVARCHAR(2000) NULL,
  started_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_sync_runs_started_at DEFAULT SYSDATETIME(),
  finished_at DATETIME2(0) NULL,
  INDEX ix_stg_sync_runs_file (file_path, file_mtime, status)
);
GO

IF OBJECT_ID(N'dbo.stg_sync_run_tables', N'U') IS NULL
CREATE TABLE dbo.stg_sync_run_tables (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_sync_run_tables PRIMARY KEY,
  run_id INT NOT NULL CONSTRAINT fk_stg_sync_run_tables_run REFERENCES dbo.stg_sync_runs (id),
  table_name NVARCHAR(100) NOT NULL,
  file_rows INT NOT NULL,
  unchanged_rows INT NOT NULL,
  inserted_rows INT NOT NULL,
  deleted_rows INT NOT NULL,
  kept_rows INT NOT NULL, -- lịch ngày cũ hơn file, giữ lại
  INDEX ix_stg_sync_run_tables_run (run_id)
);
GO

-- action: I = thêm, U = sửa (cùng record_key), D = xoá. old_data/new_data = JSON {cột: giá trị}.
IF OBJECT_ID(N'dbo.stg_change_log', N'U') IS NULL
CREATE TABLE dbo.stg_change_log (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_change_log PRIMARY KEY,
  run_id INT NOT NULL CONSTRAINT fk_stg_change_log_run REFERENCES dbo.stg_sync_runs (id),
  table_name NVARCHAR(100) NOT NULL,
  action CHAR(1) NOT NULL CONSTRAINT ck_stg_change_log_action CHECK (action IN ('I', 'U', 'D')),
  record_key NVARCHAR(500) NOT NULL,
  old_data NVARCHAR(MAX) NULL,
  new_data NVARCHAR(MAX) NULL,
  INDEX ix_stg_change_log_run (run_id, table_name),
  INDEX ix_stg_change_log_key (table_name, record_key)
);
GO
