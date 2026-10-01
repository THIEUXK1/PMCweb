# Phạm vi dự án

## Định nghĩa
PMCweb là hệ thống web quản lý nội bộ cho nhân viên PMC: đăng nhập, phân quyền theo vai trò và các màn hình CRUD nghiệp vụ.

_TODO (người dùng điền): các nghiệp vụ cụ thể cần quản lý ở phase 1._

## In scope
- Xác thực bằng tài khoản nội bộ (email + mật khẩu), phiên phía server.
- Phân quyền theo vai trò (tối thiểu `admin`, `staff`).
- Quản lý người dùng & vai trò (admin).
- CRUD các đối tượng nghiệp vụ được chốt trong [phase1-core-features.md](../plans/phase1-core-features.md).
- Nhật ký thao tác (audit log) cho thao tác ghi.

## Out of scope (đến khi có quyết định mới)
- Truy cập công khai / đăng ký tự do.
- App mobile, PWA offline.
- SSO/LDAP/OAuth bên ngoài.
- Đồng bộ hoặc ghi vào hệ thống khác của công ty.
- Đa ngôn ngữ (chỉ tiếng Việt).

## Do's & Don'ts riêng của phạm vi
- **Do:** mọi màn hình yêu cầu đăng nhập trừ `login.html`.
- **Do:** ghi `audit_logs` cho tạo/sửa/xoá dữ liệu nghiệp vụ (ai, lúc nào, bản ghi nào, trước/sau).
- **Don't:** tự thêm tính năng "tiện thể" (export Excel, gửi mail, thông báo realtime) khi chưa được yêu cầu.
- **Don't:** hiển thị dữ liệu của phòng ban khác nếu vai trò không cho phép.

## Vùng xám — hỏi trước
- Xuất/nhập Excel, in báo cáo PDF.
- Gửi email (cần SMTP credential).
- Upload file đính kèm (nơi lưu, giới hạn dung lượng).
- Kết nối DB/hệ thống có sẵn của PMC.
- Phân quyền chi tiết hơn vai trò (theo phòng ban, theo bản ghi).

## Người dùng & môi trường
- Người dùng: nhân viên nội bộ, trình duyệt desktop (Chrome/Edge) trong mạng công ty.
- Dev: Windows 10 + Laragon (MySQL) + Node ≥ 20.6.
- Production: _chưa xác định_.
