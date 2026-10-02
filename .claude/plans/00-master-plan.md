# Master plan — PMCweb

## Bối cảnh
Hệ thống quản lý nội bộ cho nhân viên PMC. Phạm vi: [project-scope.md](../docs/project-scope.md).

## Stack thực tế
Node ≥ 20.6 · Express · SQL Server 2016 (`10.0.60.33`/`PMCweb`) qua `mssql` · HTML + JS thuần. Chi tiết gói và lý do:
[node-express-architecture.md](../docs/node-express-architecture.md).

## Cấu trúc mã nguồn
Cây thư mục: [node-express-architecture.md](../docs/node-express-architecture.md#cây-thư-mục-đích-phase-0).

## Lộ trình
| Phase | Mục tiêu | File | Trạng thái |
|---|---|---|---|
| 0 | Khung dự án, DB, cấu hình bảo mật, hot reload, đăng nhập | [phase0-setup.md](phase0-setup.md) | đang làm |
| 1 | Quản lý người dùng/vai trò + nghiệp vụ cốt lõi + audit log | [phase1-core-features.md](phase1-core-features.md) | chờ chốt nghiệp vụ |
| 2 | _TBD_ — báo cáo, tiện ích theo yêu cầu | — | — |

## Ràng buộc đã chốt
Xem [00-context-memory.md §0](00-context-memory.md) và [decision-log.md](decision-log.md).

## Rủi ro đang mở
- Môi trường production chưa xác định (hosting, HTTPS, DB riêng hay chung).
- SQL Server 2016 (compat 130) không có `STRING_AGG`, `TRIM`, `CREATE TABLE IF NOT EXISTS` → migration idempotent dùng `IF NOT EXISTS (SELECT … FROM sys.*)`.
- Nghiệp vụ phase 1 chưa rõ → dễ phình phạm vi.
