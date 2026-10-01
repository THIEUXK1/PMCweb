const usersRepo = require('../repositories/users.repo');
const auditLogsRepo = require('../repositories/audit-logs.repo');
const { verifyPassword } = require('../utils/password');
const AppError = require('../utils/app-error');

/**
 * Kiểm tra thông tin đăng nhập, trả user an toàn để lưu vào session.
 * @throws {AppError} 401 khi sai tài khoản/mật khẩu hoặc tài khoản bị khoá.
 */
async function login({ username, password }) {
  const user = await usersRepo.findCredentialsByUsername(username);
  const ok = user && await verifyPassword(password, user.password_hash);
  // Cùng một thông báo cho mọi trường hợp để không lộ tài khoản nào tồn tại.
  if (!ok || !user.is_active) throw new AppError(401, 'Sai tên đăng nhập hoặc mật khẩu');

  const roles = await usersRepo.findRoleNames(user.id);
  await auditLogsRepo.insert({ username: user.username, tableName: 'users', action: 'login' });
  return { id: user.id, username: user.username, fullName: user.full_name, roles };
}

module.exports = { login };
