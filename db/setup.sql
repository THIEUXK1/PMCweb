-- Chạy MỘT lần bằng tài khoản sysadmin (sa) của SQL Server:
--   sqlcmd -S <host> -U sa -P <pass> -v APP_PASSWORD="<mật khẩu>" -i db/setup.sql
-- APP_PASSWORD phải trùng DB_PASSWORD trong .env.
IF DB_ID(N'PMCweb') IS NULL
  CREATE DATABASE PMCweb COLLATE Vietnamese_100_CI_AS;
GO

IF SUSER_ID(N'pmcweb_app') IS NULL
  CREATE LOGIN pmcweb_app WITH PASSWORD = N'$(APP_PASSWORD)', DEFAULT_DATABASE = PMCweb, CHECK_POLICY = ON;
GO

USE PMCweb;
GO

-- Ứng dụng chỉ đọc/ghi dữ liệu; DDL đi qua scripts/migrate.js bằng MIGRATE_DB_USER.
IF USER_ID(N'pmcweb_app') IS NULL
  CREATE USER pmcweb_app FOR LOGIN pmcweb_app;
ALTER ROLE db_datareader ADD MEMBER pmcweb_app;
ALTER ROLE db_datawriter ADD MEMBER pmcweb_app;
GO
