# Node/Express — kiến trúc kỹ thuật

## Cây thư mục (đích phase 0)
```
PMCweb/
├─ src/
│  ├─ server.js            # khởi động, listen, graceful shutdown (đóng pool)
│  ├─ app.js               # tạo express app, middleware chung, mount routes, static public/
│  ├─ config/index.js      # đọc + kiểm process.env, export object config
│  ├─ db/pool.js           # mssql pool, adapter execute(`?`) + withTransaction()
│  ├─ routes/              # *.routes.js
│  ├─ controllers/         # *.controller.js
│  ├─ services/            # *.service.js
│  ├─ repositories/        # *.repo.js
│  ├─ validators/          # *.validator.js
│  ├─ middlewares/         # require-auth.js, require-role.js, csrf.js, error-handler.js
│  └─ utils/               # app-error.js, async-handler.js, password.js, pagination.js
├─ public/
│  ├─ index.html, login.html   # vỏ rỗng
│  ├─ js/ api.js · pages/ · components/
│  └─ css/
├─ db/ migrations/ · seeds/
├─ scripts/ migrate.js · create-admin.js
├─ .env.example
└─ package.json
```
Bảng "tạo file mới ở đâu": [architecture-workflow.md](architecture-workflow.md#tạo-file-mới-ở-đâu).

## Phụ thuộc
Đã chốt (xem [decision-log.md](../plans/decision-log.md)). Thêm gói ngoài danh sách = ghi Decision Log trước.

| Gói | Lý do |
|---|---|
| `express` | HTTP server + router. |
| `mssql` | Driver SQL Server (tedious, thuần JS) — tham số hoá thật qua `sp_executesql`. |
| `exceljs` _(dev)_ | Đọc xlsx cho `scripts/import-dyeing-plan.js` — dùng stream reader (đọc cả workbook tràn RAM). |
| `express-session` | Phiên đăng nhập phía server (ứng dụng nội bộ, không cần JWT). |
| _(tự viết)_ `src/db/session-store.js` | Lưu session vào bảng `sessions` — MemoryStore rò bộ nhớ; tránh thêm gói store ít bảo trì. |

Cố ý **không** dùng: `dotenv` (Node ≥ 20.6 có `--env-file`), `nodemon` (có `node --watch`), `bcrypt` (dùng `crypto.scrypt` built-in, tránh build native trên Windows), ORM (SQL tay + repository đủ cho quy mô này), bundler/framework UI.

## Quy ước bắt buộc
- Node ≥ 20.6 (cần `--env-file`, `--watch`). Ghi `"engines": { "node": ">=20.6" }` trong `package.json`.
- `app.js` không gọi `listen` → có thể require trong script/test.
- `express.json({ limit: '1mb' })`; static `public/` mount **sau** `/api`.
- `app.set('trust proxy', 1)` chỉ khi chạy sau reverse proxy.
- Mọi route `/api/*` không khớp → 404 JSON, không rơi về HTML.
- `config/index.js` throw ngay khi thiếu `DB_HOST`, `DB_USER`, `DB_NAME`, `SESSION_SECRET`.

## Cạm bẫy kỹ thuật đã thực sự cắn
_Chưa có — ghi vào đây khi gặp, kèm ngày + cách tránh._

Rủi ro đã biết trước (chưa xảy ra):
- `pool.execute` là adapter: đổi mọi `?` thành `@p0, @p1…` → **không** viết dấu `?` trong chuỗi literal của SQL; số `?` phải khớp số tham số (adapter throw nếu lệch).
- Không có `insertId`: lấy id bằng `INSERT … OUTPUT INSERTED.id VALUES (…)`. Không có `INSERT IGNORE`/`ON DUPLICATE KEY` → `WHERE NOT EXISTS` hoặc `MERGE … WITH (HOLDLOCK)`.
- Lỗi trùng khoá: `isDuplicateKeyError(err)` (số lỗi 2627/2601), không phải `ER_DUP_ENTRY`.
- Cột `BIGINT` trả về chuỗi trong JS → id dùng `INT`.
- (2026-10-01) `.env`: giá trị có `#` bị `--env-file` cắt như comment → bọc nháy kép.
- Port 3000 có thể trùng dịch vụ khác của Laragon → đọc `PORT` từ `.env`.

## Route
| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| POST | `/api/auth/login` | đăng nhập | công khai |
| POST | `/api/auth/logout` | đăng xuất | đã đăng nhập |
| GET | `/api/auth/me` | user hiện tại + CSRF token | đã đăng nhập |
| GET | `/api/plan/total?from&days` | lịch máy (sheet Total), tối đa 31 ngày | đã đăng nhập |
| GET | `/api/plan/detail-orders?q&machine&colorGroup&date&page&pageSize` | sheet "detail order " | đã đăng nhập |
| GET | `/api/plan/detail-orders/filters` | danh sách máy, hệ màu | đã đăng nhập |
| GET | `/api/plan/batches-per-day?q&page&pageSize` | sheet Master | đã đăng nhập |
| _phase 1_ | `/api/users` … | quản lý người dùng | admin |

Cập nhật bảng này khi thêm module.

## Lệnh hay dùng (PowerShell)
```powershell
npm i --silent                                   # cài gói
npm run dev                                      # chạy NỀN — xem core.md §6
npm run migrate 2>&1 | Select-String "ERROR|FAIL" # chạy migration up
npm run migrate:down                             # rollback 1 bước (dev only)
node --env-file=.env scripts/create-admin.js     # tạo tài khoản admin đầu tiên
npm run import:dyeing-plan -- "<file.xlsx>" --dry-run  # đọc thử; bỏ --dry-run để thay toàn bộ stg_* (~4 phút)
```
CLI: `sqlcmd -S 10.0.60.33 -U <user> -P <pass> -d PMCweb` (đã có sẵn trong PATH).
