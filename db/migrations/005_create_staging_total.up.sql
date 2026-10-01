-- Staging cho sheet "Total  " (lịch máy nhuộm) của file "染色总排单 Dyeing plan.xlsx".
-- Mỗi lần nhập thay toàn bộ cùng các bảng stg_* của migration 004.
IF OBJECT_ID(N'dbo.stg_total_machines', N'U') IS NULL
CREATE TABLE dbo.stg_total_machines (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_total_machines PRIMARY KEY,
  source_row INT NOT NULL,
  seq_no NVARCHAR(500) NULL,
  machine_no NVARCHAR(500) NULL,
  tube_count NVARCHAR(500) NULL,
  zone NVARCHAR(500) NULL,
  fixed_machine NVARCHAR(500) NULL,
  item_code NVARCHAR(500) NULL,
  color_code NVARCHAR(500) NULL,
  output_m NVARCHAR(500) NULL,
  team NVARCHAR(500) NULL,
  note NVARCHAR(500) NULL,
  order_type NVARCHAR(500) NULL,
  main_color_group NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_total_machines_imported_at DEFAULT SYSDATETIME()
);
GO

-- source_row = dòng máy trong sheet; plan_date lấy từ dòng ngày (serial Excel → DATE).
IF OBJECT_ID(N'dbo.stg_total_slots', N'U') IS NULL
CREATE TABLE dbo.stg_total_slots (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_stg_total_slots PRIMARY KEY,
  source_row INT NOT NULL,
  machine_no NVARCHAR(500) NULL,
  plan_date DATE NOT NULL,
  slot_no TINYINT NOT NULL,
  value NVARCHAR(500) NULL,
  imported_at DATETIME2(0) NOT NULL CONSTRAINT df_stg_total_slots_imported_at DEFAULT SYSDATETIME(),
  INDEX ix_stg_total_slots_plan_date (plan_date, source_row)
);
GO
