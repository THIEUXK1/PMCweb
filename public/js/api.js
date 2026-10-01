let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

async function request(method, url, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401 && !url.startsWith('/api/auth/login')) {
    location.href = '/login.html';
    return new Promise(() => {});
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || 'Lỗi hệ thống');
    err.status = res.status;
    err.errors = (data && data.errors) || {};
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};
