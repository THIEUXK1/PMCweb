const AppError = require('../utils/app-error');

function requireAuth(req, res, next) {
  if (!req.session.user) return next(new AppError(401, 'Chưa đăng nhập'));
  return next();
}

module.exports = requireAuth;
