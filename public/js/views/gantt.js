import { api } from '../api.js';
import { el, formatDate, formatNumber } from '../dom.js';
import { COLOR_GROUPS, splitCell } from '../color-groups.js';

// Biểu đồ Gantt lịch máy nhuộm (dữ liệu sheet Total): mỗi máy một hàng,
// các ca liền nhau cùng mã hàng-màu gộp thành một thanh.

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_OPTIONS = [3, 7, 14];
const DAY_MS = 86400000;

const state = { from: '', days: 7, filter: '', scrollMin: 1, data: null };
let requestId = 0;
let root = null;
let clockTimer = null;
let scrollTimer = null;

function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function clockText() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Gộp ca liên tiếp cùng giá trị → [{ start, length, value }] theo chỉ số ca toàn khoảng. */
function toSegments(cells, dates, slotsPerDay) {
  const segments = [];
  let cur = null;
  dates.forEach((d, di) => {
    const values = cells[d] || [];
    for (let i = 0; i < slotsPerDay; i++) {
      const v = values[i] || null;
      const idx = di * slotsPerDay + i;
      if (cur && cur.value === v) {
        cur.length++;
        continue;
      }
      cur = v ? { start: idx, length: 1, value: v } : null;
      if (cur) segments.push(cur);
    }
  });
  return segments;
}

function slotLabel(idx, dates, slotsPerDay) {
  return `${formatDate(dates[Math.floor(idx / slotsPerDay)]).slice(0, 5)} ca ${(idx % slotsPerDay) + 1}`;
}

function bar(m, seg, dates, slotsPerDay) {
  const total = dates.length * slotsPerDay;
  const { text, cls, label } = splitCell(seg.value);
  const end = seg.start + seg.length - 1;
  return el('div', {
    class: `gantt-bar ${cls}`,
    style: `left:${(seg.start / total) * 100}%;width:${(seg.length / total) * 100}%`,
    title: [
      `Máy: ${m.machineNo}`,
      `Mã hàng-màu: ${text}`,
      label ? `Hệ màu: ${label}` : '',
      `Từ: ${slotLabel(seg.start, dates, slotsPerDay)}`,
      `Đến: ${slotLabel(end, dates, slotsPerDay)}`,
      `Số ca: ${seg.length}`,
    ].filter(Boolean).join('\n'),
  }, el('span', {}, text));
}

function machineRow(m, dates, slotsPerDay) {
  const segments = toSegments(m.cells, dates, slotsPerDay);
  return el('div', { class: 'gantt-row' }, [
    el('div', { class: 'gantt-label', title: [m.note, m.orderType, m.fixedMachine].filter(Boolean).join('\n') }, [
      el('strong', {}, m.machineNo),
      el('small', {}, [m.zone, m.team, m.tubeCount ? `${m.tubeCount} cửa` : ''].filter(Boolean).join(' · ')),
    ]),
    el('div', { class: 'gantt-track' }, segments.map((s) => bar(m, s, dates, slotsPerDay))),
  ]);
}

function headRow(dates, slotsPerDay, today) {
  return el('div', { class: 'gantt-row gantt-head' }, [
    el('div', { class: 'gantt-label' }, 'Máy'),
    el('div', { class: 'gantt-track' }, dates.map((d) => el('div', { class: `gantt-day${d === today ? ' today' : ''}` }, [
      el('div', {}, `${WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]} ${formatDate(d).slice(0, 5)}`),
      el('div', { class: 'gantt-slots' }, Array.from({ length: slotsPerDay }, (_, i) => el('span', {}, String(i + 1)))),
    ]))),
  ]);
}

/** Vị trí "bây giờ" theo % chiều dài trục thời gian; null nếu ngoài khoảng. */
function nowRatio(dates) {
  const now = new Date();
  const start = new Date(`${dates[0]}T00:00:00`).getTime();
  const ratio = (now.getTime() - start) / (dates.length * DAY_MS);
  return ratio >= 0 && ratio <= 1 ? ratio : null;
}

function renderBoard() {
  const box = root.querySelector('[data-role="board"]');
  const data = state.data;
  if (!data || data.machines.length === 0) {
    box.replaceChildren(el('p', { class: 'muted' }, 'Chưa có dữ liệu sheet Total — chạy npm run import:dyeing-plan.'));
    return;
  }
  const f = state.filter.toLowerCase();
  const machines = f
    ? data.machines.filter((m) => [m.machineNo, m.zone, m.team].some((v) => v && v.toLowerCase().includes(f)))
    : data.machines;

  const ratio = nowRatio(data.dates);
  const body = el('div', { class: 'gantt-body' }, [
    ...machines.map((m) => machineRow(m, data.dates, data.slotsPerDay)),
    ratio === null ? null : el('div', { class: 'gantt-now', style: `--now:${ratio}`, title: 'Hiện tại' }),
  ]);
  const scroll = el('div', { class: 'gantt-scroll', dataset: { role: 'scroll' }, style: `--days:${data.dates.length};--slots:${data.slotsPerDay}` },
    el('div', { class: 'gantt-inner' }, [headRow(data.dates, data.slotsPerDay, todayIso()), body]));

  box.replaceChildren(
    el('div', { class: 'gantt-title' }, [
      el('div', {}, [el('h2', {}, 'Bảng kế hoạch máy nhuộm'), el('small', {}, 'Dyeing Machine Plan Board')]),
      el('div', { class: 'gantt-clock', dataset: { role: 'clock' } }, clockText()),
    ]),
    el('div', { class: 'gantt-legend' }, [
      ...COLOR_GROUPS.map((g) => el('span', { class: `chip ${g.cls}` }, g.label)),
      el('span', { class: 'muted small' }, `${formatNumber(machines.length)} máy · ${formatDate(data.dates[0])} – ${formatDate(data.dates[data.dates.length - 1])}`),
    ]),
    scroll,
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
  const box = root.querySelector('[data-role="board"]');
  box.classList.add('loading');
  try {
    const params = new URLSearchParams({ days: String(state.days) });
    if (state.from) params.set('from', state.from);
    const data = await api.get(`/api/plan/total?${params}`);
    if (id !== requestId || !root) return;
    state.data = data;
    state.from = data.dates[0] || '';
    renderMeta();
    renderBoard();
  } catch (err) {
    if (id === requestId && root) box.replaceChildren(el('p', { class: 'form-error' }, err.message));
  } finally {
    box.classList.remove('loading');
  }
}

// Tự cuộn dọc mỗi N phút một trang, hết thì quay về đầu (như màn hình xưởng).
function autoScrollStep() {
  const box = root && root.querySelector('[data-role="scroll"]');
  if (!box) return;
  const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
  box.scrollTo({ top: atEnd ? 0 : box.scrollTop + box.clientHeight - 40, behavior: 'smooth' });
}

function restartAutoScroll() {
  clearInterval(scrollTimer);
  scrollTimer = state.scrollMin > 0 ? setInterval(autoScrollStep, state.scrollMin * 60000) : null;
}

function tickClock() {
  const clock = root && root.querySelector('[data-role="clock"]');
  if (clock) clock.textContent = clockText();
  const line = root && root.querySelector('.gantt-now');
  if (line && state.data) {
    const ratio = nowRatio(state.data.dates);
    if (ratio !== null) line.style.setProperty('--now', String(ratio));
  }
}

export const title = 'Gantt — Kế hoạch máy nhuộm';

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
    el('label', {}, ['Tự cuộn (phút, 0 = tắt)', el('input', {
      type: 'number', name: 'scrollMin', min: '0', step: '1', value: String(state.scrollMin), class: 'narrow',
    })]),
  ]);
  container.replaceChildren(
    form,
    el('p', { class: 'muted small', dataset: { role: 'meta' } }),
    el('div', { class: 'gantt-board', dataset: { role: 'board' } }, el('p', { class: 'muted' }, 'Đang tải…')),
  );
  if (state.data) {
    renderMeta();
    renderBoard();
  } else {
    load();
  }
  clockTimer = setInterval(tickClock, 1000);
  restartAutoScroll();
}

export function unmount() {
  clearInterval(clockTimer);
  clearInterval(scrollTimer);
  clockTimer = null;
  scrollTimer = null;
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
  } else if (input.name === 'scrollMin') {
    state.scrollMin = Math.max(0, Number(input.value) || 0);
    restartAutoScroll();
  }
}

export function onInput(input) {
  if (input.name === 'filter') {
    state.filter = input.value.trim();
    renderBoard();
  }
}
