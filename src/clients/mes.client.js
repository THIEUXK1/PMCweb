const config = require('../config');

// Gọi MES công ty (chỉ đọc). Mỗi lần lấy dữ liệu đăng nhập mới, giữ cookie JSESSIONID trong bộ nhớ.
// Không đưa tài khoản/cookie vào thông báo lỗi.

const TIMEOUT_MS = 60000;

function url(path) {
  return `${config.mes.baseUrl}${path}`;
}

async function login() {
  const res = await fetch(url('/sys/ssologin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: config.mes.username, password: config.mes.password }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.code !== 0) {
    throw new Error(`MES đăng nhập thất bại (HTTP ${res.status}${body && body.msg ? `: ${body.msg}` : ''})`);
  }
  const cookie = res.headers.getSetCookie()
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('JSESSIONID='));
  if (!cookie) throw new Error('MES đăng nhập không trả cookie phiên');
  return cookie;
}

/** Danh sách máy nhuộm, mỗi máy kèm tBatchEntityList (các mẻ) — đúng dữ liệu trang databoardSedo/gantt.html. */
async function getGanttMachines() {
  const cookie = await login();
  const res = await fetch(url('/rsedo/tBatch/getDataForGantt'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: '{}',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Hết phiên → MES trả trang login HTML thay vì JSON.
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.code !== 0 || !Array.isArray(body.rows)) {
    throw new Error(`MES getDataForGantt lỗi (HTTP ${res.status})`);
  }
  return body.rows;
}

module.exports = { getGanttMachines };
