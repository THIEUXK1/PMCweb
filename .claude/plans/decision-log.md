# Decision Log

Mới nhất trước. 5 dòng gần nhất cũng nằm ở [00-context-memory.md](00-context-memory.md); khi đó có quá 5 dòng thì chuyển dòng cũ nhất xuống đây.

| Ngày | Quyết định | Lý do | Hệ quả |
|---|---|---|---|
| 2026-10-01 | Nhập file Excel kế hoạch nhuộm vào 7 bảng staging `stg_*` (NVARCHAR thô, thay toàn bộ mỗi lần nhập, log `stg_import_runs`); thêm devDependency `exceljs` | người dùng chọn staging thô trước, chuẩn hoá sau | ánh xạ cột ở `src/utils/dyeing-plan-sheets.js`; ngày là serial Excel → chuẩn hoá bằng `DATEADD(day, n - 2, '1900-01-01')` |
| 2026-10-01 | Đổi DB MySQL Laragon → SQL Server 2016 `10.0.60.33`, DB `PMCweb` (Vietnamese_100_CI_AS), login `pmcweb_app` (db_datareader/writer). Gói `mysql2` + `express-mysql-session` → `mssql`; session store tự viết `src/db/session-store.js` | người dùng yêu cầu dùng SQL Server công ty | `pool.execute` giữ API `?` (adapter đổi sang @pN); insert lấy id bằng `OUTPUT INSERTED.id`; migration T-SQL tách batch bằng `GO` |
| 2026-10-01 | DB `pmcweb` rỗng, chỉ có bảng nền (users/roles/user_roles, audit_logs, sessions); bảng nghiệp vụ thêm sau | TStoreSystem chỉ là ví dụ, người dùng muốn DB mới rỗng | phase 1 tự thiết kế bảng nghiệp vụ |
| 2026-10-01 | Chốt gói: `express@5`, `mysql2`, `express-session`, `express-mysql-session` | người dùng yêu cầu dựng dự án | bảng `sessions` tạo bằng migration 003 |
| 2026-10-01 | (đã chốt) Gói: `express`, `mysql2`, `express-session`, `express-mysql-session` | tối thiểu cho API + phiên bền qua restart; scrypt/`--env-file`/`--watch` built-in thay bcrypt/dotenv/nodemon | thêm gói khác phải ghi dòng mới ở đây |
| 2026-10-01 | (đề xuất) Migration bằng file SQL up/down + `scripts/migrate.js`, không ORM | kiểm soát SQL, dễ cho `database-auditor` duyệt | tự viết runner nhỏ (~60 dòng) |
| 2026-10-01 | (đề xuất) Xác thực bằng session phía server, không JWT | app nội bộ cùng domain; thu hồi phiên dễ | cần CSRF token cho thao tác ghi |
