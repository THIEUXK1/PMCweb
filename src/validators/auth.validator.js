const AppError = require('../utils/app-error');

function validateLogin(body) {
  const errors = {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username) errors.username = 'Nhập tên đăng nhập';
  else if (username.length > 50) errors.username = 'Tối đa 50 ký tự';
  if (!password) errors.password = 'Nhập mật khẩu';
  else if (password.length > 200) errors.password = 'Mật khẩu quá dài';
  if (Object.keys(errors).length > 0) throw new AppError(422, 'Dữ liệu không hợp lệ', errors);
  return { username, password };
}

module.exports = { validateLogin };
