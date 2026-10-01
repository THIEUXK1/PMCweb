import { api } from '../api.js';
import { el, debounce } from '../dom.js';
import { renderTable, renderPager } from '../components/paged-table.js';

const PAGE_SIZES = [20, 50, 100];

/**
 * Tạo view dạng bảng có tìm kiếm + bộ lọc + phân trang.
 * @param {{
 *   title: string,
 *   endpoint: string,
 *   columns: Array<object>,
 *   searchPlaceholder: string,
 *   filters?: Array<{ name: string, label: string, type: 'select'|'date', optionsKey?: string }>,
 *   filtersEndpoint?: string,
 * }} cfg
 */
export function createListView(cfg) {
  const filters = cfg.filters || [];
  const state = { q: '', page: 1, pageSize: 50, ...Object.fromEntries(filters.map((f) => [f.name, ''])) };
  let options = null;
  let lastResult = null;
  let requestId = 0;
  let root = null;

  function filterControl(f) {
    if (f.type === 'date') {
      return el('label', {}, [f.label, el('input', { type: 'date', name: f.name, value: state[f.name] })]);
    }
    const values = (options && options[f.optionsKey]) || [];
    return el('label', {}, [f.label, el('select', { name: f.name }, [
      el('option', { value: '' }, 'Tất cả'),
      ...values.map((v) => el('option', { value: v, selected: v === state[f.name] }, v)),
    ])]);
  }

  function renderToolbar() {
    return el('form', { class: 'toolbar' }, [
      el('label', { class: 'grow' }, ['Tìm kiếm', el('input', {
        type: 'search', name: 'q', value: state.q, placeholder: cfg.searchPlaceholder, autocomplete: 'off',
      })]),
      ...filters.map(filterControl),
      el('label', {}, ['Số dòng', el('select', { name: 'pageSize' }, PAGE_SIZES.map((n) => (
        el('option', { value: String(n), selected: n === state.pageSize }, String(n))
      )))]),
      el('div', { class: 'btn-group' }, el('button', { type: 'button', class: 'btn-light', dataset: { action: 'reset' } }, 'Xoá lọc')),
    ]);
  }

  function renderResult() {
    const box = root.querySelector('[data-role="result"]');
    if (!lastResult) return;
    box.replaceChildren(
      renderPager(lastResult),
      renderTable(cfg.columns, lastResult.rows),
      renderPager(lastResult),
    );
  }

  async function load() {
    const id = ++requestId;
    const box = root.querySelector('[data-role="result"]');
    box.classList.add('loading');
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(state)) if (v !== '' && v !== null) params.set(k, String(v));
      const data = await api.get(`${cfg.endpoint}?${params}`);
      if (id !== requestId || !root) return;
      lastResult = data;
      renderResult();
    } catch (err) {
      if (id !== requestId || !root) return;
      const msg = Object.values(err.errors || {})[0] || err.message;
      box.replaceChildren(el('p', { class: 'form-error' }, msg));
    } finally {
      box.classList.remove('loading');
    }
  }

  const loadDebounced = debounce(() => {
    state.page = 1;
    load();
  }, 300);

  async function loadOptions() {
    if (!cfg.filtersEndpoint || options) return;
    try {
      options = await api.get(cfg.filtersEndpoint);
      if (root) root.querySelector('form.toolbar').replaceWith(renderToolbar());
    } catch {
      // Bộ lọc không tải được vẫn dùng được tìm kiếm.
    }
  }

  return {
    title: cfg.title,
    mount(container) {
      root = container;
      container.replaceChildren(
        renderToolbar(),
        el('div', { dataset: { role: 'result' } }, el('p', { class: 'muted' }, 'Đang tải…')),
      );
      if (lastResult) renderResult();
      load();
      loadOptions();
    },
    unmount() {
      root = null;
    },
    onAction(action, target) {
      if (action === 'page') {
        state.page = Number(target.dataset.page);
        load();
        root.querySelector('[data-role="result"]').scrollIntoView({ block: 'start' });
      } else if (action === 'reset') {
        Object.assign(state, { q: '', page: 1 }, Object.fromEntries(filters.map((f) => [f.name, ''])));
        root.querySelector('form.toolbar').replaceWith(renderToolbar());
        load();
      }
    },
    onChange(input) {
      if (input.name === 'q') return;
      if (input.name === 'pageSize') state.pageSize = Number(input.value);
      else if (input.name in state) state[input.name] = input.value;
      else return;
      state.page = 1;
      load();
    },
    onInput(input) {
      if (input.name !== 'q') return;
      state.q = input.value.trim();
      loadDebounced();
    },
  };
}
