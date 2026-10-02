# Phase 0 — Setup

## 1. Khung dự án
- [ ] `git init`, nhánh `main`, `.gitignore` (`node_modules/ .env .env.* !.env.example *.log`).
- [ ] `npm init -y`; thêm `"engines": { "node": ">=20.6" }`, `"private": true`.
- [ ] Cài gói đã chốt trong [decision-log.md](decision-log.md) (`npm i --silent …`).
- [ ] Tạo cây thư mục theo [node-express-architecture.md](../docs/node-express-architecture.md).
- [ ] `src/app.js`, `src/server.js`, `error-handler`, `app-error`, `async-handler`.

## 2. CSDL & migration
- [x] Kiểm `SELECT @@VERSION` trên SQL Server `10.0.60.33` → 2016 SP3 (ghi ở context-memory).
- [ ] DB `PMCweb` (Vietnamese_100_CI_AS) + login `pmcweb_app` (db_datareader/writer) — người dùng tự tạo.
- [ ] `src/db/pool.js` (adapter `execute` `?` → `@pN`) + `withTransaction`.
- [ ] `scripts/migrate.js` (up / down 1 bước, bảng `schema_migrations`, tách batch bằng `GO`, user DDL riêng `MIGRATE_DB_USER`).
- [ ] Migration `users` (+ `roles`), `sessions` (cho `src/db/session-store.js`), `audit_logs`.
- [ ] Quy tắc: [database-safety.md](../docs/database-safety.md). Qua `database-auditor` trước khi chạy.

## 3. Cấu hình bảo mật
- [ ] `.env.example` (chỉ key + giá trị giả) — danh sách key xem chính file đó ở gốc repo.
- [ ] `.env` thật — gitignored, không commit.
- [ ] `src/config/index.js` throw khi thiếu key bắt buộc.
- [ ] Session cookie + CSRF middleware theo [coding-standards.md](../docs/coding-standards.md#bảo-mật-phần-code).

## 4. Dựng lại trên máy mới
1. Cài Node ≥ 20.6; máy phải tới được SQL Server `10.0.60.33:1433`.
2. `npm i --silent`
3. Copy `.env.example` → `.env`, điền giá trị thật.
4. Tạo DB + user, `npm run migrate`.
5. `node --env-file=.env scripts/create-admin.js`
6. `npm run dev` → mở `http://localhost:<PORT>`.

## 5. Hot reload
- [ ] `package.json`:
  ```json
  "scripts": {
    "dev": "node --watch --watch-preserve-output --env-file=.env src/server.js",
    "start": "node --env-file=.env src/server.js",
    "migrate": "node --env-file=.env scripts/migrate.js up",
    "migrate:down": "node --env-file=.env scripts/migrate.js down"
  }
  ```
- `--watch` theo dõi file được `require` dưới `src/`; `public/` là static nên chỉ cần F5.
- Quy tắc chạy nền / restart: [core.md §6](../rules/core.md).

## 6. Đăng nhập (cuối phase 0)
- [ ] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- [ ] `public/login.html` + `public/js/pages/login.js`, `public/js/api.js`.
- [ ] `require-auth`, `require-role`.

## Nợ còn lại của phase
_Ghi khi kết thúc phase._
