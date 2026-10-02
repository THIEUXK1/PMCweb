# Phase 1 — Tính năng cốt lõi

Chờ người dùng chốt nghiệp vụ (blocker B2 trong [00-context-memory.md](00-context-memory.md)).

## F1. Quản lý người dùng & vai trò
- Route: `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id`, `POST /api/users/:id/lock` — quyền `admin`.
- Dữ liệu: `users(id, email, name, password_hash, role_id, is_active, created_at, updated_at, deleted_at)`, `roles(id, code, name)`.
- Trang: `public/users.html` + `public/js/pages/users.js` (bảng phân trang, modal thêm/sửa).
- Trạng thái: chưa làm.

## F2. Audit log
- Ghi trong service sau mỗi thao tác tạo/sửa/xoá: `audit_logs(id, user_id, action, entity, entity_id, before_json, after_json, ip, created_at)`.
- Route: `GET /api/audit-logs` (admin, chỉ đọc, lọc theo entity/user/ngày).
- Trạng thái: chưa làm.

## F3+. Nghiệp vụ PMC
_TODO — mỗi nghiệp vụ một mục: route, dữ liệu, quyền, trạng thái._

## Checklist kiểm thử tay (chặn commit khi chưa có test tự động)
- [ ] Chưa đăng nhập gọi `/api/*` → 401; mở trang → về `login.html`.
- [ ] `staff` gọi API admin → 403; truy cập id bản ghi không thuộc mình → 404.
- [ ] Gửi POST thiếu `X-CSRF-Token` → 403.
- [ ] Form sai dữ liệu → 422, lỗi hiện dưới đúng field, không reload trang.
- [ ] Tạo/sửa/xoá cập nhật DOM ngay, không `location.reload()`; F5 vẫn thấy đúng dữ liệu.
- [ ] Xoá → bản ghi có `deleted_at`, biến mất khỏi danh sách, còn trong DB; có dòng `audit_logs`.
- [ ] Nhập `' OR 1=1 --` và `<script>alert(1)</script>` vào ô tìm kiếm/tên → không lỗi SQL, hiển thị dạng text.
- [ ] Mất kết nối SQL Server (sai `DB_HOST` trong `.env`) → API trả 500 `Lỗi hệ thống`, không lộ stack trace; client báo lỗi rõ ràng.
- [ ] Bấm submit liên tục → chỉ tạo một bản ghi.
- [ ] Response JSON không bao giờ chứa `password_hash`.
