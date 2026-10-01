-- Bảng cho src/db/session-store.js. Tạo bằng migration vì user ứng dụng không có quyền DDL.
-- expires: Unix time (giây).
IF OBJECT_ID(N'dbo.sessions', N'U') IS NULL
CREATE TABLE dbo.sessions (
  session_id VARCHAR(128) COLLATE Latin1_General_BIN2 NOT NULL CONSTRAINT pk_sessions PRIMARY KEY,
  expires INT NOT NULL,
  data NVARCHAR(MAX) NULL,
  INDEX ix_sessions_expires (expires)
);
GO
