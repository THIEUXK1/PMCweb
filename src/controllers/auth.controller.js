const authService = require('../services/auth.service');
const { validateLogin } = require('../validators/auth.validator');
const { issueToken } = require('../middlewares/csrf');
const asyncHandler = require('../utils/async-handler');

function regenerate(session) {
  return new Promise((resolve, reject) => session.regenerate((err) => (err ? reject(err) : resolve())));
}

function destroy(session) {
  return new Promise((resolve, reject) => session.destroy((err) => (err ? reject(err) : resolve())));
}

const login = asyncHandler(async (req, res) => {
  const input = validateLogin(req.body || {});
  const user = await authService.login(input);
  await regenerate(req.session);
  req.session.user = user;
  res.json({ user, csrfToken: issueToken(req.session) });
});

const logout = asyncHandler(async (req, res) => {
  await destroy(req.session);
  res.clearCookie('pmcweb.sid');
  res.status(204).end();
});

const me = (req, res) => {
  res.json({ user: req.session.user, csrfToken: issueToken(req.session) });
};

module.exports = { login, logout, me };
