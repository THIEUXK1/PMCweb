# Coding standards

Tóm tắt nằm ở [core.md §5](../rules/core.md). Đây là chi tiết.

## JavaScript (server)
- CommonJS (`require`/`module.exports`), `'use strict'` không cần (Node ≥ 20).
- `const` mặc định, `let` khi gán lại, cấm `var`. `async/await`; không trộn `.then()`.
- So sánh `===`. Không mutate tham số đầu vào.
- Mỗi file export một object hoặc một hàm; không export default ẩn danh.

## Naming
| Loại | Quy ước | Ví dụ |
|---|---|---|
| File | kebab-case + hậu tố tầng | `leave-requests.service.js` |
| Hàm/biến | camelCase, động từ cho hàm | `findById`, `approveRequest` |
| Hằng | UPPER_SNAKE | `MAX_PAGE_SIZE` |
| Bảng SQL | snake_case số nhiều | `leave_requests` |
| Cột | snake_case; FK `<bảng_số_ít>_id`; thời gian `*_at` | `user_id`, `deleted_at` |
| Route API | `/api/<tài-nguyên-số-nhiều>` kebab-case | `/api/leave-requests/:id/approve` |

## Design pattern của repo
- **Controller mỏng — Service dày — Repository câm.**
- Repository nhận `conn = pool` làm tham số cuối để dùng chung trong transaction:
  ```js
  async function insert(data, conn = pool) {
    const [rows] = await conn.execute('INSERT INTO users (email, name) OUTPUT INSERTED.id VALUES (?, ?)', [data.email, data.name]);
    return rows[0].id;
  }
  ```
- Transaction chỉ mở ở service, qua helper `withTransaction(async conn => {...})` trong `src/db/pool.js`.
- Lỗi nghiệp vụ: `throw new AppError(404, 'Không tìm thấy nhân viên')` (`src/utils/app-error.js`).
- Controller bọc bằng `asyncHandler` (`src/utils/async-handler.js`) để lỗi tự về `errorHandler`.

## Xử lý lỗi & dữ liệu rỗng
- Một `errorHandler` duy nhất (`src/middlewares/error-handler.js`): `AppError` → status + `{ message }`; lỗi khác → log đầy đủ server-side, trả `500 { message: 'Lỗi hệ thống' }`.
- Validate thất bại → `422 { errors: { field: 'thông báo' } }`.
- Chưa đăng nhập → 401; không đủ quyền → 403; bản ghi không thuộc user → **404** (không lộ sự tồn tại).
- Danh sách rỗng trả `200 { items: [], total: 0 }`, không 404. Client hiển thị trạng thái rỗng rõ ràng.
- Không `catch {}` rỗng. Bắt lỗi thì hoặc xử lý thật, hoặc ném tiếp.

## Bảo mật (phần code)
- Điều cấm tuyệt đối: [core.md §3](../rules/core.md). Quy tắc SQL: [database-safety.md](database-safety.md#truy-vấn-an-toàn).
- Mật khẩu: `crypto.scrypt` (built-in) + salt ngẫu nhiên, so sánh bằng `crypto.timingSafeEqual`.
- Session cookie: `httpOnly`, `sameSite: 'lax'`, `secure` khi production. Đăng nhập xong → `req.session.regenerate`.
- CSRF: token trong session, client gửi header `X-CSRF-Token` (lấy từ `GET /api/auth/me`).
- Repository chỉ `SELECT` đúng cột cần; không bao giờ trả `password_hash` ra ngoài service auth.

## Frontend
- Quy tắc view/AJAX: [core.md §4](../rules/core.md).
- `public/js/api.js` export `api.get/post/put/del`; tự gắn `X-CSRF-Token`, parse JSON, 401 → chuyển `/login.html`, 422 → trả `errors` để form hiển thị dưới từng field.
- Mỗi trang: `public/js/pages/<trang>.js` export `init()`; đăng ký listener một lần trên `document`.
- Nút submit disable trong lúc chờ để chống gửi trùng.
- CSS thuần, biến màu ở `:root` trong `public/css/base.css`.

## Comment
- Chỉ comment **vì sao**, không comment cái code đã nói rõ.
- JSDoc ngắn cho hàm service public (tham số, lỗi ném ra).
- Tiếng Việt hoặc tiếng Anh, nhất quán trong một file.
