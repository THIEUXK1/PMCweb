const session = require('express-session');
const sessionsRepo = require('../repositories/sessions.repo');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function expiresOf(sess) {
  const ms = sess && sess.cookie && sess.cookie.expires
    ? new Date(sess.cookie.expires).getTime()
    : Date.now() + DEFAULT_TTL_MS;
  return Math.floor(ms / 1000);
}

// Store express-session lưu vào bảng sessions (migration 003).
class MssqlSessionStore extends session.Store {
  constructor({ checkExpirationInterval = 15 * 60 * 1000 } = {}) {
    super();
    this.timer = setInterval(() => {
      sessionsRepo.removeExpired(nowSec()).catch((err) => console.error('ERROR dọn session hết hạn:', err.message));
    }, checkExpirationInterval);
    this.timer.unref();
  }

  get(sid, cb) {
    sessionsRepo.findData(sid, nowSec())
      .then((data) => cb(null, data ? JSON.parse(data) : null))
      .catch(cb);
  }

  set(sid, sess, cb) {
    sessionsRepo.upsert(sid, expiresOf(sess), JSON.stringify(sess))
      .then(() => cb && cb(null))
      .catch((err) => cb && cb(err));
  }

  touch(sid, sess, cb) {
    sessionsRepo.updateExpires(sid, expiresOf(sess))
      .then(() => cb && cb(null))
      .catch((err) => cb && cb(err));
  }

  destroy(sid, cb) {
    sessionsRepo.remove(sid)
      .then(() => cb && cb(null))
      .catch((err) => cb && cb(err));
  }

  async close() {
    clearInterval(this.timer);
  }
}

module.exports = MssqlSessionStore;
