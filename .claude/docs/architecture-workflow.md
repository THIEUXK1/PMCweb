# Kiến trúc & quy trình làm việc

Phân lớp tóm tắt + điều cấm: [core.md](../rules/core.md). File này là bản đầy đủ.

## Tạo file mới ở đâu

| Cần thêm | Đường dẫn | Ghi chú |
|---|---|---|
| Module nghiệp vụ mới `<x>` | `routes/<x>.routes.js` + `controllers/<x>.controller.js` + `services/<x>.service.js` + `repositories/<x>.repo.js` + `validators/<x>.validator.js` | Đủ bộ 5 file, cùng tên gốc. Mount route trong `src/app.js`. |
| Endpoint mới của module có sẵn | thêm hàm vào đúng 4 file của module đó | Không tạo file thứ hai cho cùng module. |
| Middleware dùng chung | `src/middlewares/<tên>.js` | vd. `require-role.js`. |
| Hàm tiện ích thuần (format ngày, slug, phân trang) | `src/utils/<tên>.js` | Không truy cập DB/`req`. |
| Đọc biến môi trường mới | `src/config/index.js` + thêm key giả vào `.env.example` | Thiếu key bắt buộc → throw khi khởi động. |
| Bảng/cột mới | `db/migrations/NNN_<mô-tả>.up.sql` + `.down.sql` | Xem [database-safety.md](database-safety.md). |
| Dữ liệu mẫu dev | `db/seeds/NNN_<mô-tả>.sql` | Chỉ chạy ở dev. |
| Trang mới | `public/<trang>.html` (vỏ rỗng) + `public/js/pages/<trang>.js` | Gọi API qua `public/js/api.js`. |
| Thành phần UI tái dùng (bảng, modal, toast) | `public/js/components/<tên>.js` | Hàm render nhận dữ liệu, trả DOM node. |
| Script CLI (migrate, tạo admin) | `scripts/<tên>.js` | Khai báo trong `package.json > scripts`. |

Cấm tạo file ngoài các thư mục trên. Không khớp → hỏi `system-architect`.

## Trách nhiệm từng tầng

- **routes**: chỉ `router.post('/x', requireAuth, csrf, ctrl.create)`. Không logic.
- **controllers**: lấy `req.body/params/session.user`, gọi validator → service, map kết quả sang HTTP status. Không SQL, không quy tắc nghiệp vụ.
- **services**: quy tắc nghiệp vụ, kiểm quyền theo dữ liệu (user có sở hữu bản ghi không — chống IDOR), mở transaction khi ghi nhiều bảng. Ném `AppError(status, message)`.
- **repositories**: một hàm = một câu SQL có tham số. Trả object thuần. Nhận `conn` tuỳ chọn để chạy trong transaction.
- **public/js**: render + gọi API. Không chứa quy tắc phân quyền (server mới là nơi quyết định; client chỉ ẩn/hiện nút).

## Git flow

Repo chưa `git init` (xem blocker trong [00-context-memory.md](../plans/00-context-memory.md)).

- Nhánh chính `main` — luôn chạy được. Không commit thẳng.
- Tiền tố nhánh: `feat/` · `fix/` · `refactor/` · `docs/` · `chore/` · `db/` (migration). vd. `feat/quan-ly-nhan-vien`.
- Commit: Conventional Commits, mô tả tiếng Việt: `feat(users): thêm API khoá tài khoản`.
- Mỗi migration một commit riêng tiền tố `db:`.
- Thay đổi `.claude/` → commit `docs:` riêng.
- Không commit `.env`, dump DB, `node_modules/`.

## Quy trình cho mỗi thay đổi

1. Đọc `00-context-memory.md`; xác định task thuộc phase nào.
2. Kiểm phạm vi ([project-scope.md](project-scope.md)) — vùng xám thì hỏi.
3. Xác định file theo bảng trên; thay đổi cấu trúc → `system-architect`.
4. Đụng schema → viết migration up/down trước, gọi `database-auditor`.
5. Viết code từ dưới lên: repo → service → validator → controller → route → frontend.
6. Chạy `npm run dev` (nền), kiểm tay theo checklist trong `phase*.md`.
7. Gọi `code-reviewer` với thay đổi đáng kể.
8. Cập nhật `00-context-memory.md` (đang làm gì, quyết định mới); báo người dùng duyệt rồi mới commit.

## Khi nào gọi subagent nào
Bảng ở [core.md §8](../rules/core.md).
