import { api } from '../api.js';
import { el, formatDate, formatNumber } from '../dom.js';
import { COLOR_GROUPS, splitCell } from '../color-groups.js';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_OPTIONS = [7, 14, 31];

const state = { from: '', days: 7, filter: '', data: null };
let requestId = 0;
let root = null;

function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateHeader(iso, slotsPerDay, today) {
  const day = WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  return el('th', { colSpan: slotsPerDay, class: `day${iso === today ? ' today' : ''}` }, `${day} ${formatDate(iso).slice(0, 5)}`);
}

function machineRow(m, dates, slotsPerDay, today) {
  const cells = [];
  for (const d of dates) {
    const values = m.cells[d] || [];
    for (let i = 0; i < slotsPerDay; i++) {
      const v = values[i];
      const first = i === 0 ? ' day-start' : '';
      if (!v) {
        cells.push(el('td', { class: `slot${first}${d === today ? ' today' : ''}` }));
        continue;
      }
      const { text, cls, label } = splitCell(v);
      cells.push(el('td', {
        class: `slot ${cls}${first}`,
        title: `${formatDate(d)} · ca ${i + 1}\n${text}${label ? `\nHệ màu: ${label}` : ''}`,
      }, text));
    }
  }
  return el('tr', {}, [
    el('th', { class: 'sticky-col', title: [m.note, m.orderType, m.fixedMachine].filter(Boolean).join('\n') }, m.machineNo),
    el('td', { class: 'num' }, m.tubeCount ?? ''),
    el('td', {}, m.zone ?? ''),
    el('td', {}, m.team ?? ''),
    el('td', {}, m.mainColorGroup ? splitCell(m.mainColorGroup).label || m.mainColorGroup : ''),
    ...cells,
  ]);
}

function renderGrid() {
  const box = root.querySelector('[data-role="grid"]');
  const data = state.data;
  if (!data || data.machines.length === 0) {
    box.replaceChildren(el('p', { class: 'muted' }, 'Chưa có dữ liệu sheet Total — chạy npm run import:dyeing-plan.'));
    return;
  }
  const today = todayIso();
  const f = state.filter.toLowerCase();
  const machines = f
    ? data.machines.filter((m) => [m.machineNo, m.zone, m.team].some((v) => v && v.toLowerCase().includes(f)))
    : data.machines;

  const attrHead = ['Máy', 'Số cửa', 'Khu', 'Team', 'Màu chủ đạo']
    .map((label, i) => el('th', { rowSpan: 2, class: i === 0 ? 'sticky-col' : '' }, label));
  const slotHead = data.dates.flatMap((d) => Array.from({ length: data.slotsPerDay }, (_, i) => (
    el('th', { class: `slot-no${i === 0 ? ' day-start' : ''}${d === today ? ' today' : ''}` }, String(i + 1))
  )));
  const table = el('table', { class: 'data-table schedule' }, [
    el('thead', {}, [
      el('tr', {}, [...attrHead, ...data.dates.map((d) => dateHeader(d, data.slotsPerDay, today))]),
      el('tr', {}, slotHead),
    ]),
    el('tbody', {}, machines.map((m) => machineRow(m, data.dates, data.slotsPerDay, today))),
  ]);
  box.replaceChildren(
    el('p', { class: 'muted small' }, `${formatNumber(machines.length)} máy · ${formatDate(data.dates[0])} – ${formatDate(data.dates[data.dates.length - 1])}`),
    el('div', { class: 'table-wrap tall' }, table),
  );
}

function renderMeta() {
  const data = state.data;
  const meta = root.querySelector('[data-role="meta"]');
  if (!data || !data.range) {
    meta.replaceChildren();
    return;
  }
  const parts = [`Dữ liệu từ ${formatDate(data.range.min)} đến ${formatDate(data.range.max)}`];
  if (data.lastImport) parts.push(`nhập lúc ${data.lastImport.imported_at} từ "${data.lastImport.file_name}"`);
  meta.replaceChildren(parts.join(' · '));
  const input = root.querySelector('input[name="from"]');
  input.value = data.dates[0];
  input.min = data.range.min;
  input.max = data.range.max;
}

async function load() {
  const id = ++requestId;
  const box = root.querySelector('[data-role="grid"]');
  box.classList.add('loading');
  try {
    const params = new URLSearchParams({ days: String(state.days) });
    if (state.from) params.set('from', state.from);
    const data = await api.get(`/api/plan/total?${params}`);
    if (id !== requestId || !root) return;
    state.data = data;
    state.from = data.dates[0] || '';
    renderMeta();
    renderGrid();
  } catch (err) {
    if (id === requestId && root) box.replaceChildren(el('p', { class: 'form-error' }, err.message));
  } finally {
    box.classList.remove('loading');
  }
}

export const title = 'Total — Lịch máy nhuộm';

export function mount(container) {
  root = container;
  const form = el('form', { class: 'toolbar' }, [
    el('label', {}, ['Từ ngày', el('input', { type: 'date', name: 'from', value: state.from })]),
    el('label', {}, ['Số ngày', el('select', { name: 'days' }, DAY_OPTIONS.map((n) => (
      el('option', { value: String(n), selected: n === state.days }, `${n} ngày`)
    )))]),
    el('div', { class: 'btn-group' }, [
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'shift', step: '-1' } }, '‹ Trước'),
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'today' } }, 'Hôm nay'),
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'shift', step: '1' } }, 'Sau ›'),
    ]),
    el('label', { class: 'grow' }, ['Lọc máy / khu / team', el('input', {
      type: 'search', name: 'filter', value: state.filter, placeholder: 'vd. VR0, B5, UQ',
    })]),
  ]);
  const legend = el('div', { class: 'legend' }, COLOR_GROUPS.map((g) => el('span', { class: `chip ${g.cls}` }, g.label)));
  container.replaceChildren(
    form,
    legend,
    el('p', { class: 'muted small', dataset: { role: 'meta' } }),
    el('div', { dataset: { role: 'grid' } }, el('p', { class: 'muted' }, 'Đang tải…')),
  );
  if (state.data) {
    renderMeta();
    renderGrid();
  } else {
    load();
  }
}

export function unmount() {
  root = null;
}

export function onAction(action, target) {
  if (action === 'shift') {
    if (!state.from) return;
    state.from = addDays(state.from, Number(target.dataset.step) * state.days);
    load();
  } else if (action === 'today') {
    state.from = '';
    load();
  }
}

export function onChange(input) {
  if (input.name === 'from') {
    state.from = input.value;
    load();
  } else if (input.name === 'days') {
    state.days = Number(input.value);
    load();
  }
}

export function onInput(input) {
  if (input.name === 'filter') {
    state.filter = input.value.trim();
    renderGrid();
  }
}
