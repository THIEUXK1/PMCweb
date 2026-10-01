const AppError = require('../utils/app-error');

function requireRole(...allowed) {
  return (req, res, next) => {
    const roles = (req.session.user && req.session.user.roles) || [];
    if (!roles.some((r) => allowed.includes(r))) return next(new AppError(403, 'Không đủ quyền'));
    return next();
  };
}

module.exports = requireRole;
