// Khớp ô sheet Total ("mã hàng + mã màu + hệ màu", không phân cách) với màu MES theo mã màu.
// Mã hàng MES khác Excel nên chỉ dựa vào mã màu: mã màu dài nhất là hậu tố của ô.

const MIN_COLOR_CODE_LENGTH = 5;

function normalizeCode(value) {
  return String(value ?? '').toUpperCase().replace(/\s+/g, '');
}

/** Loại mã rác ("7", "-") dễ khớp nhầm hậu tố. */
function isUsableColorCode(code) {
  return code.length >= MIN_COLOR_CODE_LENGTH && /\d/.test(code);
}

/** MES lưu màu dạng COLORREF của Windows: 0x00BBGGRR. */
function bgrToHex(num) {
  const n = Number(num);
  const hex = (v) => v.toString(16).padStart(2, '0');
  return `#${hex(n & 0xff)}${hex((n >> 8) & 0xff)}${hex((n >> 16) & 0xff)}`.toUpperCase();
}

/** Bỏ hậu tố hệ màu chữ Hán (黑色系, 浅色系...). */
function stripColorGroup(value) {
  return normalizeCode(value).replace(/[一-鿿]+$/u, '');
}

/**
 * @param {Array<{ color_code: string, rgb_hex: string }>} rows
 * @returns {(value: string) => string|null} hex màu hoặc null
 */
function buildColorMatcher(rows) {
  const byCode = new Map(rows.map((r) => [r.color_code, r.rgb_hex]));
  const lengths = [...new Set([...byCode.keys()].map((k) => k.length))].sort((a, b) => b - a);
  return (value) => {
    const v = stripColorGroup(value);
    for (const len of lengths) {
      if (len > v.length) continue;
      const hex = byCode.get(v.slice(-len));
      if (hex) return hex;
    }
    return null;
  };
}

module.exports = { normalizeCode, isUsableColorCode, bgrToHex, stripColorGroup, buildColorMatcher };
