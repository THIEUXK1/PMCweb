-- Màu thực tế theo mã màu, tích luỹ từ MES (getDataForGantt) để tô thanh Gantt.
-- color_code đã chuẩn hoá (in hoa, bỏ khoảng trắng). Upsert: mẻ có batch_at mới hơn thắng.
IF OBJECT_ID(N'dbo.mes_colors', N'U') IS NULL
CREATE TABLE dbo.mes_colors (
  color_code NVARCHAR(100) NOT NULL CONSTRAINT pk_mes_colors PRIMARY KEY,
  rgb_hex CHAR(7) NOT NULL,
  item_code NVARCHAR(100) NULL,
  batch_no NVARCHAR(100) NULL,
  machine_no NVARCHAR(50) NULL,
  batch_at DATETIME2(0) NULL,
  updated_at DATETIME2(0) NOT NULL CONSTRAINT df_mes_colors_updated_at DEFAULT SYSDATETIME()
);
GO
