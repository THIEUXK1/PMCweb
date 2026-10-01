const crypto = require('node:crypto');
const AppError = require('../utils/app-error');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Login chưa có session nên chưa có token; sameSite=lax chặn phần lớn login-CSRF.
const EXEMPT_PATHS = new Set(['/auth/login']);

function issueToken(session) {
  if (!session.csrfToken) session.csrfToken = crypto.randomBytes(32).toString('hex');
  return session.csrfToken;
}

function csrf(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();
  const expected = req.session.csrfToken;
  const actual = req.get('X-CSRF-Token');
  if (!expected || !actual || expected.length !== actual.length
    || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    return next(new AppError(403, 'CSRF token không hợp lệ'));
  }
  return next();
}

module.exports = { csrf, issueToken };
