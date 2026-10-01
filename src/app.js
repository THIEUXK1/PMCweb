const path = require('node:path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const MssqlSessionStore = require('./db/session-store');
const { csrf } = require('./middlewares/csrf');
const errorHandler = require('./middlewares/error-handler');
const authRoutes = require('./routes/auth.routes');
const planRoutes = require('./routes/plan.routes');

// Bảng do migration 003 tạo; user ứng dụng không có quyền DDL.
const sessionStore = new MssqlSessionStore({ checkExpirationInterval: 15 * 60 * 1000 });

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'pmcweb.sid',
  secret: config.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  // Đăng nhập "vĩnh viễn": 400 ngày (trần cookie của Chrome), mỗi request gia hạn lại.
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 400 * 24 * 60 * 60 * 1000,
  },
}));

const api = express.Router();
api.use(csrf);
api.use('/auth', authRoutes);
api.use('/plan', planRoutes);
api.use((req, res) => res.status(404).json({ message: 'Không tìm thấy API' }));
app.use('/api', api);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(errorHandler);

module.exports = { app, sessionStore };
