// Hệ màu: hậu tố trong ô của sheet Total → class CSS + nhãn.
export const COLOR_GROUPS = [
  { suffix: '咖啡色系', cls: 'cg-brown', label: 'Cà phê' },
  { suffix: '黑色系', cls: 'cg-black', label: 'Đen' },
  { suffix: '蓝色系', cls: 'cg-blue', label: 'Xanh' },
  { suffix: '红色系', cls: 'cg-red', label: 'Đỏ' },
  { suffix: '浅色系', cls: 'cg-light', label: 'Nhạt' },
];

export function splitCell(value) {
  const group = COLOR_GROUPS.find((g) => value.endsWith(g.suffix));
  return group
    ? { text: value.slice(0, -group.suffix.length), cls: group.cls, label: group.label }
    : { text: value, cls: 'cg-other', label: '' };
}
