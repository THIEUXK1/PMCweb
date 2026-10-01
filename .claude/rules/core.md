# PMCweb — quy tắc lõi

> File duy nhất tự nạp mỗi phiên. Chi tiết ở `.claude/docs/`, chỉ đọc khi task chạm tới (mục 7).
> Đọc `.claude/plans/00-context-memory.md` trước khi bắt đầu.

## 1. Dự án là gì
Hệ thống quản lý nội bộ (đăng nhập, phân quyền, CRUD nghiệp vụ) cho nhân viên PMC. Dev trên Windows (Laragon chỉ còn làm web server tĩnh).
Stack: **Node.js ≥ 20.6 + Express + SQL Server 2016 (`mssql`)** — DB `PMCweb` trên `10.0.60.33`. Frontend: HTML tĩnh + JS thuần (ES module), **không build step**,
không framework UI. Giao diện tiếng Việt. Dự án đang ở phase 0 (greenfield) — gói phụ thuộc đã chốt ở
[node-express-architecture.md](../docs/node-express-architecture.md#phụ-thuộc).

## 2. Phân lớp
Luồng một chiều: `routes → middlewares → controllers → services → repositories → db/pool`.
Frontend `public/` chỉ nói chuyện với server qua JSON API `/api/*`.

| Nội dung | Thuộc |
|---|---|
| Khai báo URL, gắn middleware | `src/routes/*.routes.js` |
| Đọc `req`, gọi service, trả JSON/status | `src/controllers/*.controller.js` |
| Nghiệp vụ, kiểm quyền theo dữ liệu, transaction | `src/services/*.service.js` |
| SQL (chỉ prepared statement) | `src/repositories/*.repo.js` |
| Validate input | `src/validators/*.validator.js` |
| Auth, CSRF, xử lý lỗi | `src/middlewares/` |
| Tiện ích thuần, không I/O | `src/utils/` |
| Vỏ HTML rỗng / JS / CSS client | `public/*.html` · `public/js/` · `public/css/` |

Một file = một trách nhiệm. Bảng đầy đủ: [architecture-workflow.md](../docs/architecture-workflow.md#tạo-file-mới-ở-đâu).
Không khớp ô nào → hỏi `system-architect` trước.

## 3. Cấm tuyệt đối
| # | Điều cấm |
|---|---|
| 1 | Nối chuỗi vào SQL. Mọi giá trị qua placeholder `?` của `pool.execute`. Tên cột/bảng động → whitelist. |
| 2 | Hardcode credential/secret. Chỉ đọc qua `src/config/index.js` từ `process.env`; không commit `.env`. |
| 3 | Trả secret, hash mật khẩu, stack trace ra client. Không đưa key backend vào `public/`. |
| 4 | Thao tác đổi dữ liệu bằng GET. Đổi dữ liệu = POST/PUT/PATCH/DELETE + validate + kiểm quyền phía server + CSRF. |
| 5 | Chạy DDL/DML phá huỷ (DROP, TRUNCATE, DELETE/UPDATE không WHERE hẹp) — chỉ đề xuất, người dùng tự chạy. Xem [database-safety.md](../docs/database-safety.md). |
| 6 | Thêm dependency ngoài danh sách đã chốt khi chưa ghi quyết định vào Decision Log. |
| 7 | Query hoặc nghiệp vụ trong controller/route; logic trong file HTML. |
| 8 | Commit thẳng `main`; commit khi người dùng chưa duyệt. |

## 4. View & tương tác
- `public/*.html` chỉ là vỏ rỗng + `<script type="module">`; dữ liệu nạp qua `fetch('/api/...')`.
- 100% thao tác không reload trang: `event.preventDefault()`, cập nhật DOM. Cấm `location.reload()`.
- Event delegation trên `document` (`document.addEventListener('click', e => e.target.closest('[data-action]'))`).
- Mọi fetch đi qua `public/js/api.js` (gắn CSRF header, xử lý 401/422/500). Fetch lỗi mạng → fallback điều hướng thật (`location.href = form.action` / link gốc).
- Chèn dữ liệu vào DOM bằng `textContent`; `innerHTML` chỉ với chuỗi tĩnh hoặc đã escape.

## 5. Code style — tóm tắt
- CommonJS phía server (`require`), ES module phía client. 2 space, dấu `;`, nháy đơn.
- `async/await`, không callback; mọi controller bọc lỗi bằng `next(err)` → `errorHandler` duy nhất.
- Lỗi validate → `422 { errors: { field: 'thông báo' } }`. Không nuốt lỗi im lặng.
- Tên file `kebab-case`, biến/hàm `camelCase`, bảng/cột SQL `snake_case` số nhiều.
- Chi tiết: [coding-standards.md](../docs/coding-standards.md).

## 6. Cách làm việc
- **Zero-fluff + output clamping:** quy tắc chung ở `~/.claude/CLAUDE.md`. Riêng dự án: `npm i --silent`, `npm run migrate 2>&1 | Select-String "ERROR|FAIL"`.
- **Hot reload:** `npm run dev` chạy NỀN = `node --watch --watch-preserve-output --env-file=.env src/server.js`
  (giữ log cũ khi restart). Sửa `public/` chỉ cần F5 trình duyệt; sửa `.env`/`package.json` mà chưa thấy đổi → restart ngay, không hỏi.
  Không thêm nodemon/bundler chỉ để có hot reload.
- Quy trình mỗi thay đổi + git flow: [architecture-workflow.md](../docs/architecture-workflow.md).

## 7. Đọc thêm khi nào
| Task đang làm | Mở file |
|---|---|
| Tạo file/module mới, nhánh git, commit | `.claude/docs/architecture-workflow.md` |
| Viết/sửa code, đặt tên, xử lý lỗi, frontend | `.claude/docs/coding-standards.md` |
| Cấu trúc thư mục, gói npm, route, lệnh chạy, bẫy kỹ thuật | `.claude/docs/node-express-architecture.md` |
| Schema, migration, query, dữ liệu nghi sai | `.claude/docs/database-safety.md` |
| Tính năng mới có thuộc phạm vi không | `.claude/docs/project-scope.md` |
| Vì sao quyết định cũ được chốt | `.claude/plans/decision-log.md` |
| Lộ trình, việc của phase | `.claude/plans/00-master-plan.md` · `phase*.md` |

## 8. Subagent
| Tình huống | Agent |
|---|---|
| Thêm module/tầng, đổi cấu trúc, đổi stack/gói | `system-architect` |
| Migration, schema, query nhiều bảng, xoá dữ liệu | `database-auditor` |
| Trước khi người dùng commit một thay đổi đáng kể | `code-reviewer` |
