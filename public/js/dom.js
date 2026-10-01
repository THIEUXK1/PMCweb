/**
 * Tạo element. Chuỗi con chèn bằng textContent (an toàn XSS).
 * @param {string} tag
 * @param {Record<string, any>} [attrs] class, dataset, các thuộc tính DOM khác
 * @param {Array<Node|string|number|null|false>|Node|string} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node && typeof value !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/** '633.267661131438' → '633,27'; không phải số → giữ nguyên. */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? numberFormat.format(n) : String(value);
}

/** '2026-09-30' → '30/09/2026'; chuỗi khác giữ nguyên. */
export function formatDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (value || '');
}
