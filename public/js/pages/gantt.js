import * as view from '../views/gantt.js';

// Trang Gantt toàn màn hình (không sidebar/topbar) — dùng cho màn hình xưởng, xem không cần đăng nhập.

function inApp(e) {
  return e.target.closest('#app');
}

export async function init() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    e.preventDefault();
    view.onAction(target.dataset.action, target, e);
  });
  document.addEventListener('change', (e) => { if (inApp(e)) view.onChange(e.target, e); });
  document.addEventListener('input', (e) => { if (inApp(e)) view.onInput(e.target, e); });
  document.addEventListener('submit', (e) => { if (inApp(e)) e.preventDefault(); });
  view.mount(document.getElementById('app'));
}
