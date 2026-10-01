# An toàn cơ sở dữ liệu

## Sự thật nền tảng
- DBMS: SQL Server 2016 SP3 tại `10.0.60.33`, DB `PMCweb` (collation `Vietnamese_100_CI_AS`). Server dùng chung với hệ thống khác. Production: _chưa xác định_ — **không chắc môi trường nào thì coi như production**.
- PMCweb **sở hữu** schema của mình (database `PMCweb`). Không đọc/ghi DB của hệ thống khác khi chưa có quyết định.
- Thông tin kết nối chỉ ở `.env` (gitignored). Mẫu key: `.env.example`.
- Login ứng dụng `pmcweb_app` chỉ có `db_datareader` + `db_datawriter` trên `PMCweb`; DDL chạy bằng `MIGRATE_DB_USER`. Tạo DB/login: `db/setup.sql`.

## Quy tắc tuyệt đối
1. Tham số hoá SQL: xem [core.md §3 cấm #1](../rules/core.md). Không template string, không `+`; whitelist đặt trong repository.
2. Không chạy DROP / TRUNCATE / `ALTER … DROP COLUMN` / DELETE hoặc UPDATE không có WHERE theo khoá. Claude chỉ đề xuất, người dùng tự chạy — kèm câu lệnh, bảng, số hàng bị chạm, cách rollback.
3. Xoá nghiệp vụ = **soft delete** (`deleted_at DATETIME NULL`). Mọi SELECT mặc định thêm `deleted_at IS NULL`.
4. Bảng `audit_logs` append-only: chỉ INSERT; không UPDATE/DELETE từ ứng dụng.
5. Ghi nhiều bảng → một transaction (`withTransaction`).
6. Trước khi xoá/sửa hàng loạt: `SELECT COUNT(*)` cùng WHERE, báo số hàng.

## Migration
- File: `db/migrations/NNN_<mô-tả>.up.sql` + `NNN_<mô-tả>.down.sql`, NNN tăng dần 3 chữ số.
- Bảng `schema_migrations(version, applied_at)` do `scripts/migrate.js` quản lý.
- **Idempotent:** `IF OBJECT_ID(N'dbo.x', N'U') IS NULL CREATE TABLE …`; thêm cột kiểm `COL_LENGTH('dbo.x', 'col') IS NULL`; index kiểm `sys.indexes`. Down dùng `DROP TABLE IF EXISTS` (có từ 2016). Tách batch bằng dòng `GO`.
- Down phải đảo ngược đúng up. Down có mất dữ liệu (drop cột có dữ liệu) → ghi rõ cảnh báo ở đầu file, chỉ chạy ở dev.
- Đổi kiểu/đổi tên cột có dữ liệu: thêm cột mới → copy → đối soát `COUNT` + checksum → chuyển code → xoá cột cũ ở migration sau.
- Mỗi bảng: `id INT IDENTITY(1,1)` (BIGINT chỉ khi bảng rất lớn — mssql trả BIGINT dạng chuỗi), chuỗi `NVARCHAR`, thời gian `DATETIME2(0)` default `SYSDATETIME()`, `created_at`, `updated_at`, `deleted_at` (nếu soft delete). Đặt tên constraint (`pk_`, `uq_`, `fk_`, `df_`, `ck_`). JSON = `NVARCHAR(MAX)` + `CHECK (ISJSON(col) = 1)`.
- Mọi migration qua `database-auditor` trước khi người dùng chạy.

## Truy vấn an toàn
- `SELECT` liệt kê cột, không `SELECT *` trong repository.
- Phân trang bắt buộc cho danh sách: `ORDER BY … OFFSET ? ROWS FETCH NEXT ? ROWS ONLY` (bắt buộc có ORDER BY) với số nguyên đã ép kiểu, `MAX_PAGE_SIZE = 100`.
- Lọc theo quyền ngay trong WHERE (vd. `AND department_id = ?`), không lọc sau ở JS.
- Tránh N+1: lấy danh sách con bằng một query `WHERE parent_id IN (?)` hoặc JOIN.
- Index cho mọi FK và cột lọc thường dùng.

## Khi nghi ngờ dữ liệu sai
1. Dừng mọi thao tác ghi liên quan.
2. Chỉ chạy SELECT để khoanh vùng; ghi lại câu lệnh + kết quả.
3. Đối chiếu `audit_logs`.
4. Đề xuất script sửa (có WHERE hẹp + bản backup `CREATE TABLE … AS SELECT` các hàng bị chạm) → người dùng duyệt và tự chạy.
