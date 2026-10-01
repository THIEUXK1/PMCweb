import { createListView } from './list-view.js';

// Sheet "Master" — mã hàng + mã màu → số lô nhuộm mỗi ngày.
export default createListView({
  title: 'Master — Số lô mỗi ngày',
  endpoint: '/api/plan/batches-per-day',
  searchPlaceholder: 'Mã hàng, mã màu…',
  columns: [
    { key: 'sourceRow', label: 'Dòng', numeric: true, format: (v) => String(v) },
    { key: 'itemCode', label: 'Mã hàng' },
    { key: 'colorCode', label: 'Mã màu' },
    { key: 'itemColorKey', label: 'Mã hàng + mã màu' },
    { key: 'batchesPerDay', label: 'Số lô/ngày', numeric: true },
  ],
});
