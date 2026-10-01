const AppError = require('../utils/app-error');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = err.errors ? { message: err.message, errors: err.errors } : { message: err.message };
    return res.status(err.status).json(body);
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Lỗi hệ thống' });
}

module.exports = errorHandler;
