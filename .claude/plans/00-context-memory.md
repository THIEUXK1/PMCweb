# Context memory — đọc mỗi phiên, giữ mỏng

## 0. Ràng buộc cứng — không thương lượng
- Node ≥ 20.6 + Express + SQL Server 2016 (`mssql`), DB `PMCweb` @ `10.0.60.33`. Frontend HTML + JS thuần, không build step.
- Secret chỉ ở `.env` (gitignored), nạp bằng `node --env-file` — không `dotenv`.
- Quy tắc lõi: [core.md](../rules/core.md).

## 1. Đang làm gì
Phase 0 — khung + auth + 3 migration nền (users/roles, audit_logs, sessions) đã viết. Migration 001–003 đã chạy trên SQL Server (2026-10-01), đăng nhập test OK.
DB `PMCweb` có bảng nền + 7 bảng staging `stg_*` (≈20.5k dòng từ file 10.01 Dyeing plan, migration 004); bảng nghiệp vụ chưa có (chờ B2).

## 2. Trạng thái repo
- Có `src/`, `public/`, `db/migrations/001–007`, `scripts/migrate.js`, `scripts/create-admin.js`, `.env` (local).
- SQL Server 13.0.7050 (2016 SP3) Enterprise. Node 24. DB MySQL `pmcweb` cũ trên Laragon không còn dùng.
- Git: nhánh `main`, 1 commit `06d63b7` (khởi tạo); thay đổi chưa commit ở docs/plans, `src/app.js`, `src/config`, `public/`.

## 3. Blockers
| Mã | Vấn đề | Chờ ai |
|---|---|---|
| B2 | Chưa chốt nghiệp vụ/bảng của phase 1 | người dùng |

## 4. Nhật ký quyết định — 5 dòng gần nhất (cũ hơn → [decision-log.md](decision-log.md))
| Ngày | Quyết định | Lý do | Hệ quả |
|---|---|---|---|
| 2026-10-02 | Màu Gantt lấy từ MES → bảng `mes_colors` (đồng bộ định kỳ), thêm `src/clients/`, `src/jobs/` | người dùng muốn màu thực tế | xem decision-log |
| 2026-10-01 | Staging `stg_*` từ Excel kế hoạch nhuộm + `exceljs` (dev) | người dùng chọn | xem decision-log |
| 2026-10-01 | Đổi MySQL → SQL Server `10.0.60.33`/`PMCweb`, driver `mssql` | người dùng yêu cầu | xem decision-log |
| 2026-10-01 | Stack Node/Express, hệ thống quản lý nội bộ (DB ban đầu MySQL — đã thay bằng SQL Server) | người dùng chọn | mọi docs bám stack này |
| 2026-10-01 | Frontend HTML tĩnh + JS thuần, không build step | giữ nhẹ, đủ cho app nội bộ | không React/Vite; mọi tương tác qua fetch |
## 5. Ghi chú cho phiên sau
- Dev server: `npm run dev` chạy nền (lệnh đầy đủ ở [core.md §6](../rules/core.md)).
- `.env`: giá trị chứa `#` phải bọc nháy kép (`--env-file` coi `#` là comment).
- SQL Server không có `ON UPDATE CURRENT_TIMESTAMP` → UPDATE tự gán `updated_at = SYSDATETIME()`.
