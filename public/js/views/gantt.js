import { api } from '../api.js';
import { el, formatDate, formatNumber } from '../dom.js';
import { COLOR_GROUPS, splitCell } from '../color-groups.js';

// Biểu đồ Gantt lịch máy nhuộm (dữ liệu sheet Total): mỗi máy một hàng,
// mỗi lô một thanh. Đầu cột mỗi ngày ghi lô 1..slotsPerDay (cột Excel); máy-ngày có n lô
// thì chia đều cả ngày cho n lô. Vị trí tính bằng đơn vị "ngày" (số thực).

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_OPTIONS = [3, 7, 14];
const DAY_MS = 86400000;
const LABEL_W = 170;
const DAY_W = { min: 80, max: 2400, step: 1.25, def: 700 };
const PREFS_VER = 2; // tăng khi đổi mặc định cần ghi đè prefs cũ
const FOLLOW_MS = 5000;
const REFRESH_MS = 60000;
const IDLE_MS = 15000;
const DRAG_PX = 5;
const EXTEND_DAYS = 7;
const MAX_SPAN = 31; // = MAX_TOTAL_DAYS phía server (tự làm mới tải lại cả khoảng một lần)
const PREFS_KEY = 'pmc.gantt.prefs';

const state = {
  from: '',
  days: 7,
  filter: '',
  data: null,
  selected: null,
  prefs: {
    theme: 'dark', dayW: DAY_W.def, follow: true, refresh: true, scrollMin: 1, pulse: true, pinned: [],
  },
};
let requestId = 0;
let extending = false;
let root = null;
let timers = [];
let scrollTimer = null;
let lastInteract = 0;
let nowPos = -1;
let nextChange = Infinity;
let centerOnRender = true;
let barIndex = [];
const fsQuery = window.matchMedia('(display-mode: fullscreen)');

// ---- Tiện ích ----

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    // Prefs bản cũ: bỏ độ rộng ngày đã lưu để dùng mặc định mới (đủ chỗ đọc mã từng lô).
    if (saved.ver !== PREFS_VER) delete saved.dayW;
    Object.assign(state.prefs, saved, { ver: PREFS_VER });
  } catch { /* trình duyệt chặn storage → dùng mặc định */ }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  } catch { /* bỏ qua */ }
}

function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function timeText(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function longDateText(d = new Date()) {
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Tỉ lệ của "bây giờ" trên trục thời gian (có thể < 0 hoặc ≥ 1). */
function rawRatio() {
  const dates = state.data && state.data.dates;
  if (!dates || dates.length === 0) return null;
  const start = new Date(`${dates[0]}T00:00:00`).getTime();
  return (Date.now() - start) / (dates.length * DAY_MS);
}

/** Như rawRatio nhưng null nếu ngoài khoảng đang xem. */
function nowRatio() {
  const ratio = rawRatio();
  return ratio !== null && ratio >= 0 && ratio < 1 ? ratio : null;
}

/** Vị trí "bây giờ" tính bằng ngày kể từ đầu khoảng (null nếu chưa có dữ liệu). */
function currentPos() {
  const ratio = rawRatio();
  return ratio === null ? null : ratio * state.data.dates.length;
}

/** Giờ nhuộm/lô của mã (sheet detail), null nếu không tra được. */
function dyeHours(value) {
  const h = state.data.hours && Number(state.data.hours[value]);
  return h > 0 ? h : null;
}

/**
 * Mỗi lô một thanh; ngày có n lô thì chia đều cả ngày cho n lô (ít lô vẫn kéo dài hết ngày).
 * → [{ start, end, value, lot, dayLots, hours }] theo đơn vị ngày.
 */
function toSegments(cells, dates) {
  const segments = [];
  dates.forEach((d, di) => {
    const lots = (cells[d] || []).filter(Boolean);
    lots.forEach((v, k) => {
      segments.push({
        start: di + k / lots.length,
        end: di + (k + 1) / lots.length,
        value: v,
        lot: k + 1,
        dayLots: lots.length,
        hours: dyeHours(v),
      });
    });
  });
  return segments;
}

/** Nhãn "dd/mm HH:MM" cho vị trí pos (đơn vị ngày). */
function posLabel(pos) {
  let day = Math.floor(pos);
  let mins = Math.round((pos - day) * 1440);
  if (mins === 1440) {
    day++;
    mins = 0;
  }
  return `${formatDate(addDays(state.data.dates[0], day)).slice(0, 5)} ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

function segStatus(seg, pos) {
  if (seg.start > pos) return 'upcoming';
  if (seg.end <= pos) return 'done';
  return 'running';
}

const STATUS_TEXT = { running: 'Đang chạy', done: 'Đã xong', upcoming: 'Sắp tới' };

/** Màu thực tế từ MES ('#RRGGBB') hoặc null → dùng màu hệ màu. */
function mesColor(value) {
  const hex = state.data.colors && state.data.colors[value];
  return /^#[0-9A-F]{6}$/i.test(hex || '') ? hex : null;
}

/** Chữ đen/trắng theo độ sáng nền (YIQ). */
function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const yiq = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return yiq >= 150 ? '#111827' : '#ffffff';
}

function colorStyle(hex) {
  return hex ? `;--bar-bg:${hex};--bar-fg:${textOn(hex)}` : '';
}

// ---- Vẽ bảng ----

function bar(m, seg, pos) {
  const total = state.data.dates.length;
  const { text, cls } = splitCell(seg.value);
  const status = segStatus(seg, pos);
  const sel = state.selected && state.selected.value === seg.value;
  const rgb = mesColor(seg.value);
  barIndex.push({ m, seg });
  return el('div', {
    class: `gantt-bar ${cls}${rgb ? ' has-rgb' : ''}${status === 'running' ? ' is-running' : ''}${status === 'done' ? ' is-done' : ''}${sel ? ' is-match' : ''}`,
    style: `left:${(seg.start / total) * 100}%;width:${((seg.end - seg.start) / total) * 100}%${colorStyle(rgb)}`,
    title: `${text} · lô ${seg.lot}/${seg.dayLots} ngày ${posLabel(seg.start).slice(0, 5)}${seg.hours ? ` · ${formatNumber(seg.hours)} giờ/lô` : ''}`,
    dataset: { action: 'bar', index: String(barIndex.length - 1) },
  }, [
    el('span', {}, text),
    el('b', { class: 'gantt-lots' }, `${seg.lot}/${seg.dayLots}`),
  ]);
}

function machineRow(m, pos, pinned) {
  const segments = toSegments(m.cells, state.data.dates);
  return el('div', { class: `gantt-row${pinned ? ' is-pinned' : ''}` }, [
    el('div', { class: 'gantt-label', title: [m.note, m.orderType, m.fixedMachine].filter(Boolean).join('\n') }, [
      el('div', { class: 'gantt-label-top' }, [
        el('strong', {}, m.machineNo),
        el('button', {
          type: 'button',
          class: `gantt-pin${pinned ? ' on' : ''}`,
          title: pinned ? 'Bỏ ghim' : 'Ghim lên đầu',
          dataset: { action: 'pin', machine: m.machineNo },
        }, '📌'),
      ]),
      el('small', {}, [m.zone, m.team, m.tubeCount ? `${m.tubeCount} cửa` : ''].filter(Boolean).join(' · ')),
    ]),
    el('div', { class: 'gantt-track' }, segments.map((s) => bar(m, s, pos))),
  ]);
}

function headRow(ratio) {
  const { dates } = state.data;
  const today = todayIso();
  const slots = state.data.slotsPerDay || 5;
  return el('div', { class: 'gantt-row gantt-head' }, [
    el('div', { class: 'gantt-label' }, 'Máy'),
    el('div', { class: 'gantt-track' }, [
      ...dates.map((d) => el('div', { class: `gantt-day${d === today ? ' today' : ''}` }, [
        el('div', {}, `${WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]} ${formatDate(d).slice(0, 5)}`),
        el('div', { class: 'gantt-slots' }, Array.from({ length: slots }, (_, i) => el('span', {}, String(i + 1)))),
      ])),
      ratio === null ? null : el('div', { class: 'gantt-now-tag', style: `--now:${ratio}` }, timeText()),
    ]),
  ]);
}

function visibleMachines() {
  const f = state.filter.toLowerCase();
  const pinned = new Set(state.prefs.pinned);
  const list = f
    ? state.data.machines.filter((m) => [m.machineNo, m.zone, m.team].some((v) => v && v.toLowerCase().includes(f)))
    : state.data.machines;
  return [...list.filter((m) => pinned.has(m.machineNo)), ...list.filter((m) => !pinned.has(m.machineNo))];
}

function renderBoard() {
  const box = root.querySelector('[data-role="board"]');
  const data = state.data;
  if (!data || data.machines.length === 0) {
    box.replaceChildren(el('p', { class: 'gantt-empty' }, 'Chưa có dữ liệu sheet Total — chạy npm run import:dyeing-plan.'));
    return;
  }
  const old = box.querySelector('[data-role="scroll"]');
  const keep = old ? { top: old.scrollTop, left: old.scrollLeft } : null;

  barIndex = [];
  nowPos = currentPos();
  const ratio = nowRatio();
  const pinned = new Set(state.prefs.pinned);
  const machines = visibleMachines();
  const rows = machines.map((m) => machineRow(m, nowPos, pinned.has(m.machineNo)));
  // Mốc gần nhất mà một thanh đổi trạng thái → tick() vẽ lại khi kim giờ chạm tới.
  nextChange = barIndex.reduce((min, { seg }) => (
    Math.min(min, seg.start > nowPos ? seg.start : Infinity, seg.end > nowPos ? seg.end : Infinity)
  ), Infinity);

  const scroll = el('div', {
    class: `gantt-scroll${state.selected ? ' has-selection' : ''}${state.prefs.pulse ? '' : ' no-pulse'}`,
    dataset: { role: 'scroll' },
    style: `--days:${data.dates.length};--day-w:${state.prefs.dayW}px;--gantt-label:${LABEL_W}px`,
  }, el('div', { class: 'gantt-inner' }, [
    headRow(ratio),
    el('div', { class: 'gantt-body' }, [
      ...rows,
      rows.length === 0 ? el('p', { class: 'gantt-empty' }, 'Không có máy khớp bộ lọc.') : null,
      ratio === null ? null : el('div', { class: 'gantt-now', style: `--now:${ratio}` }),
    ]),
  ]));
  scroll.addEventListener('wheel', onWheel, { passive: false });
  scroll.addEventListener('pointerdown', onDragStart);
  scroll.addEventListener('scroll', checkEdges, { passive: true });

  const running = barIndex.filter((b) => segStatus(b.seg, nowPos) === 'running').length;
  box.replaceChildren(
    el('div', { class: 'gantt-title' }, [
      el('div', {}, [el('h2', {}, 'Bảng kế hoạch máy nhuộm'), el('small', {}, 'Dyeing Machine Plan Board')]),
      el('div', { class: 'gantt-clock' }, [
        el('div', { class: 'gantt-clock-time', dataset: { role: 'clock' } }, new Date().toLocaleTimeString('vi-VN', { hour12: false })),
        el('div', { class: 'gantt-clock-date', dataset: { role: 'clock-date' } }, longDateText()),
      ]),
    ]),
    el('div', { class: 'gantt-legend' }, [
      el('strong', {}, 'Chú thích:'),
      ...COLOR_GROUPS.map((g) => el('span', { class: `chip ${g.cls}` }, g.label)),
      el('button', {
        type: 'button',
        class: `gantt-legend-toggle${state.prefs.pulse ? '' : ' is-off'}`,
        title: 'Bật/tắt viền nhấp nháy',
        dataset: { action: 'toggle-pulse' },
      }, [el('span', { class: 'swatch-running' }), 'Đang chạy']),
      el('span', {}, [el('span', { class: 'swatch-done' }), 'Đã xong']),
      el('span', { class: 'gantt-count' },
        `${formatNumber(machines.length)} máy · ${formatNumber(barIndex.length)} thanh · ${formatNumber(running)} đang chạy · ${formatDate(data.dates[0])} – ${formatDate(data.dates[data.dates.length - 1])}`),
    ]),
    scroll,
  );

  if (centerOnRender) {
    centerOnRender = false;
    requestAnimationFrame(() => {
      centerNow(false);
      checkEdges();
    });
  } else if (keep) {
    scroll.scrollTop = keep.top;
    scroll.scrollLeft = keep.left;
  }
}

// ---- Cuộn vô hạn kiểu lịch: gần mép trái/phải thì nạp thêm EXTEND_DAYS ngày ----

/** Gần mép (hoặc bảng chưa đủ rộng để cuộn) → nạp thêm ngày phía đó. */
function checkEdges() {
  const box = scrollBox();
  if (!box || extending || !state.data) return;
  const edge = state.prefs.dayW;
  if (box.scrollWidth <= box.clientWidth + edge) {
    if (state.data.dates.length >= MAX_SPAN) return;
    if (canExtend(-1)) extend(-1);
    else if (canExtend(1)) extend(1);
  } else if (box.scrollLeft < edge) {
    if (canExtend(-1)) extend(-1);
  } else if (box.scrollLeft + box.clientWidth > box.scrollWidth - edge) {
    if (canExtend(1)) extend(1);
  }
}

/** Ngoài khoảng có dữ liệu thì dừng, tránh nạp mãi ngày trống. */
function canExtend(dir) {
  const data = state.data;
  if (extending || !data || !data.range || data.dates.length === 0) return false;
  return dir < 0 ? data.dates[0] > data.range.min : data.dates[data.dates.length - 1] < data.range.max;
}

async function extend(dir) {
  const data = state.data;
  const first = data.dates[0];
  const last = data.dates[data.dates.length - 1];
  extending = true;
  const id = requestId;
  try {
    const from = dir < 0 ? addDays(first, -EXTEND_DAYS) : addDays(last, 1);
    const more = await api.get(`/api/plan/total?${new URLSearchParams({ from, days: String(EXTEND_DAYS) })}`);
    if (id !== requestId || !root || state.data !== data) return;
    mergeDays(data, more, dir);
  } catch (err) {
    const meta = root && root.querySelector('[data-role="meta"]');
    if (meta) meta.textContent = `Không nạp thêm được ngày: ${err.message}`;
  } finally {
    extending = false;
  }
}

/** Ghép ngày mới vào dữ liệu đang có; vượt MAX_SPAN thì bỏ bớt ngày ở phía đối diện. */
function mergeDays(data, more, dir) {
  const all = dir < 0 ? [...more.dates, ...data.dates] : [...data.dates, ...more.dates];
  const drop = Math.max(0, all.length - MAX_SPAN);
  const dates = dir < 0 ? all.slice(0, all.length - drop) : all.slice(drop);
  const keepDates = new Set(dates);
  data.machines.forEach((m, i) => {
    const extra = more.machines[i];
    const cells = { ...m.cells, ...(extra && extra.machineNo === m.machineNo ? extra.cells : {}) };
    m.cells = Object.fromEntries(Object.entries(cells).filter(([d]) => keepDates.has(d)));
  });
  Object.assign(data.colors, more.colors);
  data.hours = { ...data.hours, ...more.hours };
  data.dates = dates;
  state.from = dates[0];
  state.span = dates.length;

  // Giữ nguyên ngày đang nhìn: thêm bên trái / bỏ bên trái thì dịch scrollLeft tương ứng.
  const shiftDays = dir < 0 ? more.dates.length : -drop;
  const left = scrollBox().scrollLeft;
  renderBoard();
  renderMeta();
  scrollBox().scrollLeft = left + shiftDays * state.prefs.dayW;
}

/** Cập nhật mỗi giây: đồng hồ, kim hiện tại; có thanh đổi trạng thái thì vẽ lại. */
function tick() {
  if (!root) return;
  const now = new Date();
  const clock = root.querySelector('[data-role="clock"]');
  if (clock) clock.textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
  const date = root.querySelector('[data-role="clock-date"]');
  if (date) date.textContent = longDateText(now);
  if (!state.data) return;
  if (currentPos() >= nextChange) {
    renderBoard();
    return;
  }
  const ratio = nowRatio();
  if (ratio === null) return;
  root.querySelectorAll('.gantt-now, .gantt-now-tag').forEach((n) => n.style.setProperty('--now', String(ratio)));
  const tag = root.querySelector('.gantt-now-tag');
  if (tag) tag.textContent = timeText(now);
}

// ---- Cuộn / phóng to ----

function scrollBox() {
  return root && root.querySelector('[data-role="scroll"]');
}

function markInteract() {
  lastInteract = Date.now();
}

function centerNow(smooth = true) {
  const box = scrollBox();
  const ratio = nowRatio();
  if (!box || ratio === null) return;
  const trackW = state.data.dates.length * state.prefs.dayW;
  const left = ratio * trackW - (box.clientWidth - LABEL_W) / 2;
  box.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
}

/** Đổi độ rộng một ngày, giữ nguyên thời điểm nằm dưới clientX (mặc định: giữa vùng nhìn). */
function setZoom(dayW, clientX) {
  const box = scrollBox();
  const next = Math.min(DAY_W.max, Math.max(DAY_W.min, Math.round(dayW)));
  if (!box || next === state.prefs.dayW) return;
  const rect = box.getBoundingClientRect();
  const x = (clientX === undefined ? rect.left + LABEL_W + (rect.width - LABEL_W) / 2 : clientX) - rect.left - LABEL_W;
  const t = (box.scrollLeft + x) / (state.data.dates.length * state.prefs.dayW);
  state.prefs.dayW = next;
  savePrefs();
  const cur = scrollBox();
  cur.style.setProperty('--day-w', `${next}px`);
  cur.scrollLeft = t * state.data.dates.length * next - x;
}

function onWheel(e) {
  markInteract();
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(state.prefs.dayW * (e.deltaY < 0 ? DAY_W.step : 1 / DAY_W.step), e.clientX);
}

// Kéo chuột trái/phải (và lên/xuống) để cuộn bảng; cảm ứng đã cuộn sẵn bằng trình duyệt.
function onDragStart(e) {
  markInteract();
  if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.gantt-label, button, input')) return;
  const start = { x: e.clientX, y: e.clientY };
  let last = start;
  let dragging = false;
  // Cuộn theo độ lệch từng bước và luôn lấy scrollBox() mới: bảng có thể vẽ lại giữa chừng khi nạp thêm ngày.
  const move = (ev) => {
    if (!dragging && Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) < DRAG_PX) return;
    dragging = true;
    markInteract();
    const box = scrollBox();
    if (!box) return;
    box.classList.add('is-dragging');
    box.scrollLeft -= ev.clientX - last.x;
    box.scrollTop -= ev.clientY - last.y;
    last = { x: ev.clientX, y: ev.clientY };
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    const box = scrollBox();
    if (box) box.classList.remove('is-dragging');
    // Vừa kéo xong thì nuốt cú click kế tiếp để không mở popup chi tiết.
    if (!dragging) return;
    const swallow = (ev) => ev.stopPropagation();
    document.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 0);
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

// Tự cuộn dọc mỗi N phút một trang, hết thì quay về đầu (như màn hình xưởng).
function autoScrollStep() {
  const box = scrollBox();
  if (!box || Date.now() - lastInteract < IDLE_MS) return;
  const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
  box.scrollTo({ top: atEnd ? 0 : box.scrollTop + box.clientHeight - 60, behavior: 'smooth' });
}

function restartAutoScroll() {
  clearInterval(scrollTimer);
  scrollTimer = state.prefs.scrollMin > 0 ? setInterval(autoScrollStep, state.prefs.scrollMin * 60000) : null;
}

// ---- Popup chi tiết ----

function closeDetail() {
  if (!state.selected) return;
  state.selected = null;
  const pop = root && root.querySelector('[data-role="detail"]');
  if (pop) pop.remove();
  const box = scrollBox();
  if (box) {
    box.classList.remove('has-selection');
    box.querySelectorAll('.gantt-bar.is-match').forEach((b) => b.classList.remove('is-match'));
  }
}

/** Tổng số lô/thanh của cùng mã hàng-màu trên mọi máy trong khoảng đang xem. */
function lotTotals(value) {
  const { dates, machines } = state.data;
  const byMachine = [];
  let lots = 0;
  for (const m of machines) {
    const n = toSegments(m.cells, dates).filter((s) => s.value === value).length;
    if (n === 0) continue;
    lots += n;
    byMachine.push({ machineNo: m.machineNo, lots: n });
  }
  return { lots, byMachine };
}

function openDetail(target, e) {
  const item = barIndex[Number(target.dataset.index)];
  if (!item) return;
  const { m, seg } = item;
  closeDetail();
  state.selected = { value: seg.value };

  const { text, cls, label } = splitCell(seg.value);
  const status = segStatus(seg, nowPos);
  const totals = lotTotals(seg.value);
  const rgb = mesColor(seg.value);
  const row = (dt, dd) => [el('dt', {}, dt), el('dd', {}, dd)];

  const pop = el('div', { class: 'gantt-detail', dataset: { role: 'detail' } }, [
    el('button', { type: 'button', class: 'gantt-detail-close', title: 'Đóng (Esc)', dataset: { action: 'close-detail' } }, '✕'),
    el('div', { class: 'gantt-detail-head' }, [
      el('span', { class: `gantt-detail-swatch ${cls}${rgb ? ' has-rgb' : ''}`, style: colorStyle(rgb).slice(1) }),
      el('strong', {}, `Máy ${m.machineNo}`),
    ]),
    el('dl', {}, [
      ...row('Mã hàng-màu', text),
      ...row('Hệ màu', label || '—'),
      ...row('Màu thực tế', rgb || 'Chưa có trên MES (tô theo hệ màu)'),
      ...row('Trạng thái', el('span', { class: `status-${status}` }, STATUS_TEXT[status])),
      ...row('Ngày', posLabel(seg.start).slice(0, 5)),
      ...row('Lô', `${seg.lot}/${seg.dayLots} trong ngày`),
      ...row('Giờ nhuộm/lô', seg.hours ? `${formatNumber(seg.hours)} giờ (sheet detail)` : 'Không có trong sheet detail'),
      ...row('Tổng mã này', `${formatNumber(totals.lots)} lô trên ${totals.byMachine.length} máy`),
      ...row('Theo máy', el('span', { class: 'gantt-detail-machines' }, totals.byMachine.map((b) => (
        el('span', {}, [`${b.machineNo}: `, el('strong', {}, String(b.lots))])
      )))),
    ]),
    el('p', { class: 'gantt-detail-note' }, 'Các thanh cùng mã đang được làm nổi bật. Mỗi ngày chia đều cho số lô của máy trong ngày.'),
  ]);
  root.append(pop);

  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const left = Math.max(8, Math.min(e.clientX + 14, window.innerWidth - w - 8));
  const top = e.clientY + 14 + h > window.innerHeight ? Math.max(8, e.clientY - 14 - h) : e.clientY + 14;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;

  const box = scrollBox();
  box.classList.add('has-selection');
  box.querySelectorAll('.gantt-bar').forEach((b) => {
    const it = barIndex[Number(b.dataset.index)];
    b.classList.toggle('is-match', !!it && it.seg.value === seg.value);
  });
}

function onDocMouseDown(e) {
  if (state.selected && !e.target.closest('[data-role="detail"]') && !e.target.closest('.gantt-bar')) closeDetail();
}

function onKeyDown(e) {
  if (e.key === 'Escape') closeDetail();
}

// ---- Toàn màn hình / theme ----

function isFullscreen() {
  return !!document.fullscreenElement || fsQuery.matches;
}

function syncFullscreen() {
  document.body.classList.toggle('is-immersive', isFullscreen());
  const btn = root && root.querySelector('[data-action="fullscreen"]');
  if (btn) btn.textContent = isFullscreen() ? '⤢ Thoát toàn màn hình' : '⛶ Toàn màn hình';
}

function exitFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  const hint = root.querySelector('[data-role="fs-hint"]');
  hint.hidden = false;
  setTimeout(() => { hint.hidden = true; }, 4000);
}

function applyTheme() {
  document.body.classList.toggle('theme-light', state.prefs.theme === 'light');
  const btn = root && root.querySelector('[data-action="theme"]');
  if (btn) btn.textContent = state.prefs.theme === 'light' ? '🌙 Tối' : '☀ Sáng';
}

// ---- Tải dữ liệu ----

async function load() {
  const id = ++requestId;
  const box = root.querySelector('[data-role="board"]');
  box.classList.add('loading');
  try {
    // Mặc định lùi nửa khoảng để hôm nay nằm giữa, bên trái là các ngày đã qua.
    // Tự làm mới giữ nguyên khoảng đã nạp thêm (state.span); đổi ngày/số ngày thì reset về state.days.
    if (!state.from) state.span = state.days;
    const from = state.from || addDays(todayIso(), -Math.floor(state.days / 2));
    const params = new URLSearchParams({ days: String(state.span || state.days), from });
    const data = await api.get(`/api/plan/total?${params}`);
    if (id !== requestId || !root) return;
    state.data = data;
    state.from = data.dates[0] || '';
    closeDetail();
    renderMeta();
    renderBoard();
  } catch (err) {
    if (id === requestId && root) box.replaceChildren(el('p', { class: 'form-error' }, err.message));
  } finally {
    box.classList.remove('loading');
  }
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
  parts.push('Ctrl + lăn chuột để phóng to/thu nhỏ · bấm vào thanh để xem chi tiết');
  meta.replaceChildren(parts.join(' · '));
  const input = root.querySelector('input[name="from"]');
  input.value = data.dates[0];
  input.min = data.range.min;
  input.max = data.range.max;
}

// ---- Vòng đời view ----

export const title = 'Gantt — Kế hoạch máy nhuộm';

export function mount(container) {
  root = container;
  loadPrefs();
  const p = state.prefs;
  const check = (name, checked, text) => el('label', { class: 'check' }, [el('input', { type: 'checkbox', name, checked }), text]);
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
    el('div', { class: 'btn-group' }, [
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'now' } }, '⌖ Về hiện tại'),
      el('button', { type: 'button', class: 'btn-light', title: 'Thu nhỏ (Ctrl + lăn xuống)', dataset: { action: 'zoom', step: '-1' } }, '−'),
      el('button', { type: 'button', class: 'btn-light', title: 'Phóng to (Ctrl + lăn lên)', dataset: { action: 'zoom', step: '1' } }, '+'),
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'reload' } }, '↻ Tải lại'),
    ]),
    check('follow', p.follow, 'Bám hiện tại'),
    check('refresh', p.refresh, 'Tự làm mới'),
    el('label', {}, ['Tự cuộn (phút, 0 = tắt)', el('input', {
      type: 'number', name: 'scrollMin', min: '0', step: '1', value: String(p.scrollMin), class: 'narrow',
    })]),
    el('div', { class: 'btn-group' }, [
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'theme' } }),
      el('button', { type: 'button', class: 'btn-light', dataset: { action: 'fullscreen' } }),
    ]),
  ]);
  container.replaceChildren(
    form,
    el('p', { class: 'muted small gantt-meta', dataset: { role: 'meta' } }),
    el('div', { class: 'gantt-board', dataset: { role: 'board' } }, el('p', { class: 'gantt-empty' }, 'Đang tải…')),
    el('div', { class: 'gantt-fs-exit' }, [
      el('span', { class: 'gantt-fs-hint', hidden: true, dataset: { role: 'fs-hint' } }, ['Nhấn ', el('kbd', {}, 'F11'), ' để thoát toàn màn hình']),
      el('button', { type: 'button', dataset: { action: 'exit-fullscreen' } }, '⤢ Thoát toàn màn hình'),
    ]),
  );
  applyTheme();
  syncFullscreen();
  centerOnRender = true;
  if (state.data) {
    renderMeta();
    renderBoard();
  } else {
    load();
  }

  timers = [
    setInterval(tick, 1000),
    setInterval(() => {
      if (state.prefs.follow && Date.now() - lastInteract > IDLE_MS) centerNow();
    }, FOLLOW_MS),
    setInterval(() => {
      if (state.prefs.refresh && !state.selected) load();
    }, REFRESH_MS),
  ];
  restartAutoScroll();
  document.addEventListener('mousedown', onDocMouseDown);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('fullscreenchange', syncFullscreen);
  fsQuery.addEventListener('change', syncFullscreen);
}

export function unmount() {
  timers.forEach(clearInterval);
  clearInterval(scrollTimer);
  timers = [];
  scrollTimer = null;
  document.removeEventListener('mousedown', onDocMouseDown);
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('fullscreenchange', syncFullscreen);
  fsQuery.removeEventListener('change', syncFullscreen);
  root = null;
}

export function onAction(action, target, e) {
  if (action === 'shift') {
    if (!state.from) return;
    state.from = addDays(state.from, Number(target.dataset.step) * state.days);
    state.span = state.days;
    load();
  } else if (action === 'today') {
    state.from = '';
    centerOnRender = true;
    load();
  } else if (action === 'reload') {
    load();
  } else if (action === 'now') {
    lastInteract = 0;
    if (nowRatio() !== null) {
      centerNow();
    } else { // đã cuộn xa khỏi hôm nay → nạp lại khoảng quanh hôm nay
      state.from = '';
      centerOnRender = true;
      load();
    }
  } else if (action === 'zoom') {
    setZoom(state.prefs.dayW * (Number(target.dataset.step) > 0 ? DAY_W.step : 1 / DAY_W.step));
  } else if (action === 'bar') {
    openDetail(target, e);
  } else if (action === 'close-detail') {
    closeDetail();
  } else if (action === 'pin') {
    const pinned = new Set(state.prefs.pinned);
    const id = target.dataset.machine;
    if (pinned.has(id)) pinned.delete(id);
    else pinned.add(id);
    state.prefs.pinned = [...pinned];
    savePrefs();
    renderBoard();
  } else if (action === 'toggle-pulse') {
    state.prefs.pulse = !state.prefs.pulse;
    savePrefs();
    renderBoard();
  } else if (action === 'theme') {
    state.prefs.theme = state.prefs.theme === 'light' ? 'dark' : 'light';
    savePrefs();
    applyTheme();
  } else if (action === 'fullscreen') {
    if (isFullscreen()) exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  } else if (action === 'exit-fullscreen') {
    exitFullscreen();
  }
}

export function onChange(input) {
  if (input.name === 'from') {
    state.from = input.value;
    state.span = state.days;
    load();
  } else if (input.name === 'days') {
    state.days = Number(input.value);
    state.from = '';
    centerOnRender = true;
    load();
  } else if (input.name === 'scrollMin') {
    state.prefs.scrollMin = Math.max(0, Number(input.value) || 0);
    savePrefs();
    restartAutoScroll();
  } else if (input.name === 'follow' || input.name === 'refresh') {
    state.prefs[input.name] = input.checked;
    savePrefs();
    if (input.name === 'follow' && input.checked) centerNow();
  }
}

export function onInput(input) {
  if (input.name === 'filter') {
    state.filter = input.value.trim();
    closeDetail();
    renderBoard();
  }
}
