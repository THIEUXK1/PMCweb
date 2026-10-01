import { el, formatNumber } from '../dom.js';

/**
 * @param {Array<{ key: string, label: string, numeric?: boolean, format?: (v: any, row: object) => string }>} columns
 * @param {object[]} rows
 */
export function renderTable(columns, rows) {
  const head = el('tr', {}, columns.map((c) => el('th', { class: c.numeric ? 'num' : '' }, c.label)));
  const body = rows.length === 0
    ? [el('tr', {}, el('td', { colSpan: columns.length, class: 'empty' }, 'Không có dữ liệu'))]
    : rows.map((row) => el('tr', {}, columns.map((c) => {
      const raw = row[c.key];
      const text = c.format ? c.format(raw, row) : (c.numeric ? formatNumber(raw) : (raw ?? ''));
      return el('td', { class: c.numeric ? 'num' : '' }, text);
    })));
  return el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' }, [
    el('thead', {}, head),
    el('tbody', {}, body),
  ]));
}

/** Nút phân trang: data-action="page" data-page="n". */
export function renderPager({ page, pageSize, total }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = (label, target, disabled) => el('button', {
    type: 'button', class: 'btn-light', disabled, dataset: { action: 'page', page: String(target) },
  }, label);
  return el('div', { class: 'pager' }, [
    el('span', { class: 'muted' }, `${formatNumber(from)}–${formatNumber(to)} / ${formatNumber(total)} dòng`),
    btn('« Đầu', 1, page <= 1),
    btn('‹ Trước', page - 1, page <= 1),
    el('span', {}, `Trang ${page}/${pages}`),
    btn('Sau ›', page + 1, page >= pages),
    btn('Cuối »', pages, page >= pages),
  ]);
}
