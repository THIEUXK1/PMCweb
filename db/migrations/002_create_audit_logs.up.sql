-- Append-only: ứng dụng chỉ INSERT. old_data/new_data là JSON lưu trong NVARCHAR(MAX).
IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
CREATE TABLE dbo.audit_logs (
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_audit_logs PRIMARY KEY,
  username NVARCHAR(100) NULL,
  table_name NVARCHAR(100) NULL,
  action NVARCHAR(50) NULL,
  old_data NVARCHAR(MAX) NULL CONSTRAINT ck_audit_logs_old_data CHECK (old_data IS NULL OR ISJSON(old_data) = 1),
  new_data NVARCHAR(MAX) NULL CONSTRAINT ck_audit_logs_new_data CHECK (new_data IS NULL OR ISJSON(new_data) = 1),
  created_at DATETIME2(0) NOT NULL CONSTRAINT df_audit_logs_created_at DEFAULT SYSDATETIME(),
  INDEX ix_audit_logs_created_at (created_at),
  INDEX ix_audit_logs_table_name (table_name)
);
GO
