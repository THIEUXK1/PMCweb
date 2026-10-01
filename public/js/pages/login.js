import { api } from '../api.js';

function showErrors(form, errors, message) {
  form.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = errors[el.dataset.errorFor] || '';
  });
  document.getElementById('form-error').textContent = message || '';
}

async function onSubmit(e) {
  const form = e.target.closest('#login-form');
  if (!form) return;
  e.preventDefault();

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  showErrors(form, {}, '');
  try {
    await api.post('/api/auth/login', {
      username: form.elements.username.value,
      password: form.elements.password.value,
    });
    location.href = '/';
  } catch (err) {
    if (err.status === undefined) {
      // Lỗi mạng: không có phản hồi JSON → để trình duyệt tự gửi form.
      form.submit();
      return;
    }
    showErrors(form, err.errors, err.status === 422 ? '' : err.message);
  } finally {
    button.disabled = false;
  }
}

export function init() {
  document.addEventListener('submit', onSubmit);
}
