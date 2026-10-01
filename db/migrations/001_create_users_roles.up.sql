-- password_hash: định dạng scrypt$salt$hash (src/utils/password.js).
-- SQL Server không có ON UPDATE CURRENT_TIMESTAMP: mọi câu UPDATE phải tự gán updated_at = SYSDATETIME().
IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
CREATE TABLE dbo.roles (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_roles PRIMARY KEY,
  name NVARCHAR(50) NOT NULL CONSTRAINT uq_roles_name UNIQUE,
  description NVARCHAR(255) NULL,
  created_at DATETIME2(0) NOT NULL CONSTRAINT df_roles_created_at DEFAULT SYSDATETIME(),
  updated_at DATETIME2(0) NOT NULL CONSTRAINT df_roles_updated_at DEFAULT SYSDATETIME()
);
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
CREATE TABLE dbo.users (
  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_users PRIMARY KEY,
  username NVARCHAR(50) NOT NULL CONSTRAINT uq_users_username UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  full_name NVARCHAR(100) NULL,
  is_active BIT NOT NULL CONSTRAINT df_users_is_active DEFAULT 1,
  created_at DATETIME2(0) NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSDATETIME(),
  updated_at DATETIME2(0) NOT NULL CONSTRAINT df_users_updated_at DEFAULT SYSDATETIME(),
  deleted_at DATETIME2(0) NULL
);
GO

IF OBJECT_ID(N'dbo.user_roles', N'U') IS NULL
CREATE TABLE dbo.user_roles (
  user_id INT NOT NULL CONSTRAINT fk_user_roles_user REFERENCES dbo.users (id) ON DELETE CASCADE,
  role_id INT NOT NULL CONSTRAINT fk_user_roles_role REFERENCES dbo.roles (id) ON DELETE CASCADE,
  created_at DATETIME2(0) NOT NULL CONSTRAINT df_user_roles_created_at DEFAULT SYSDATETIME(),
  CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
  INDEX ix_user_roles_role_id (role_id)
);
GO
