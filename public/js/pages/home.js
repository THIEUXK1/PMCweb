import { api, setCsrfToken } from '../api.js';
import * as totalView from '../views/total.js';
import detailOrderView from '../views/detail-order.js';
import masterView from '../views/master.js';

// Hash route → view. Mỗi view: { title, mount(container), unmount(), onAction?, onChange?, onInput? }.
const ROUTES = {
  '#/total': totalView,
  '#/detail-order': detailOrderView,
  '#/master': masterView,
};
const DEFAULT_ROUTE = '#/total';

let current = null;

function closeMenu() {
  document.body.classList.remove('menu-open');
}

function navigate() {
  // Gantt là trang toàn màn hình riêng; giữ link #/gantt cũ còn dùng được.
  if (location.hash === '#/gantt') {
    location.replace('/gantt.html');
    return;
  }
  const hash = ROUTES[location.hash] ? location.hash : DEFAULT_ROUTE;
  if (location.hash !== hash) history.replaceState(null, '', hash);
  const view = ROUTES[hash];
  if (current === view) return;
  if (current && current.unmount) current.unmount();
  current = view;

  document.querySelectorAll('.sidebar-nav a').forEach((a) => a.classList.toggle('active', a.hash === hash));
  document.getElementById('page-title').textContent = view.title;
  document.title = `${view.title} · PMCweb`;
  view.mount(document.getElementById('app'));
  closeMenu();
}

async function onClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'toggle-menu' || action === 'close-menu') {
    e.preventDefault();
    document.body.classList.toggle('menu-open', action === 'toggle-menu' && !document.body.classList.contains('menu-open'));
    return;
  }
  if (action === 'logout') {
    e.preventDefault();
    target.disabled = true;
    try {
      await api.post('/api/auth/logout');
    } finally {
      location.href = '/login.html';
    }
    return;
  }
  if (current && current.onAction) {
    e.preventDefault();
    current.onAction(action, target, e);
  }
}

function onChange(e) {
  if (current && current.onChange && e.target.closest('#app')) current.onChange(e.target, e);
}

function onInput(e) {
  if (current && current.onInput && e.target.closest('#app')) current.onInput(e.target, e);
}

function onSubmit(e) {
  // Toolbar lọc tự áp dụng khi đổi giá trị; Enter không gửi form.
  if (e.target.closest('#app')) e.preventDefault();
}

export async function init() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('submit', onSubmit);

  const { user, csrfToken } = await api.get('/api/auth/me');
  setCsrfToken(csrfToken);
  document.getElementById('current-user').textContent = user.fullName || user.username;

  window.addEventListener('hashchange', navigate);
  navigate();
}
