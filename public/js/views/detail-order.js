import { createListView } from './list-view.js';
import { formatDate } from '../dom.js';

// Sheet "detail order " — chia lô theo ngày/máy.
export default createListView({
  title: 'Detail order — Kế hoạch chia lô',
  endpoint: '/api/plan/detail-orders',
  filtersEndpoint: '/api/plan/detail-orders/filters',
  searchPlaceholder: 'Mã đơn, số lô, mã hàng, mã màu, khách hàng…',
  filters: [
    { name: 'machine', label: 'Máy', type: 'select', optionsKey: 'machines' },
    { name: 'colorGroup', label: 'Hệ màu', type: 'select', optionsKey: 'colorGroups' },
    { name: 'date', label: 'Ngày nhuộm', type: 'date' },
  ],
  columns: [
    { key: 'sourceRow', label: 'Dòng', numeric: true, format: (v) => String(v) },
    { key: 'dyeDate', label: 'Ngày nhuộm', format: formatDate },
    { key: 'plannedMachine', label: 'Máy xếp' },
    { key: 'currentMachine', label: 'Máy hiện tại' },
    { key: 'batchNo', label: 'Số lô (BC)' },
    { key: 'orderNo', label: 'Mã đơn hàng' },
    { key: 'customer', label: 'Khách hàng' },
    { key: 'endCustomer', label: 'KH cuối' },
    { key: 'itemCode', label: 'Mã hàng' },
    { key: 'colorCode', label: 'Mã màu' },
    { key: 'colorGroup', label: 'Hệ màu' },
    { key: 'weightGsm', label: 'Trọng lượng', numeric: true },
    { key: 'width', label: 'Khổ', numeric: true },
    { key: 'orderQtyM', label: 'Đơn (m)', numeric: true },
    { key: 'weightKg', label: 'KL (kg)', numeric: true },
    { key: 'plannedWeightKg', label: 'KL xếp (kg)', numeric: true },
    { key: 'lengthM', label: 'Dài (m)', numeric: true },
    { key: 'batchesPerDay', label: 'Lô/ngày', numeric: true },
    { key: 'dyeHoursPerBatch', label: 'Giờ/lô', numeric: true },
    { key: 'cumulativeHours', label: 'Giờ lũy kế', numeric: true },
    { key: 'deliveryDate', label: 'Giao hàng', format: formatDate },
    { key: 'greigeDoneDate', label: 'Dệt xong', format: formatDate },
  ],
});
