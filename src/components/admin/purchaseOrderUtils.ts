/**
 * purchaseOrderUtils.ts — shared helpers for the Purchase Orders UI.
 *
 * The line/total math here mirrors the backend (`computeLine` / `computeTotals`
 * in purchase-orders.service.ts) so the form can preview exactly what the API
 * will persist. The backend remains the source of truth and re-validates
 * everything on write.
 */
import type { AdminPurchaseOrderListItem, PurchaseOrderStatus } from '../../services/adminApi';

export interface PoStatusMeta {
  label: string;
  /** Chip styling (bg + text + border). */
  className: string;
  /** Solid dot colour for the workflow stepper. */
  dot: string;
}

export const PO_STATUS_META: Record<PurchaseOrderStatus, PoStatusMeta> = {
  DRAFT: {
    label: 'مسودة',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  PENDING_APPROVAL: {
    label: 'بانتظار الموافقة',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'معتمد',
    className: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  SENT: {
    label: 'مُرسل للمورد',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  PARTIALLY_RECEIVED: {
    label: 'مستلم جزئياً',
    className: 'bg-teal-100 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
  },
  RECEIVED: {
    label: 'مستلم بالكامل',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'ملغى',
    className: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
};

/** Happy-path workflow, used for the visual stepper (excludes CANCELLED). */
export const PO_WORKFLOW: PurchaseOrderStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
];

/** Statuses whose goods can still be received (receipt-capable orders). */
export const PO_RECEIVABLE_STATUSES: PurchaseOrderStatus[] = [
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
];

/** Top-level sections of the Purchase Management module (hosted by AdminPage). */
export type PurchaseSection =
  | 'inventory'
  | 'sales-analytics'
  | 'inventory-orders-analytics'
  | 'profit-analytics'
  | 'best-selling'
  | 'purchase-dashboard'
  | 'purchase-orders'
  | 'goods-receipts'
  | 'purchase-analytics'
  | 'ai-reorder'
  | 'demand-forecasting'
  | 'suppliers';

export const poStatusLabel = (status: PurchaseOrderStatus | string): string =>
  PO_STATUS_META[status as PurchaseOrderStatus]?.label ?? status;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Currency symbol for the small set used by the storefront. */
export const currencySymbol = (currency?: string | null): string => {
  switch ((currency || 'ILS').toUpperCase()) {
    case 'ILS':
      return '₪';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'JOD':
      return 'د.أ';
    default:
      return currency || '';
  }
};

export const formatMoney = (value: number, currency?: string | null): string => {
  const amount = (value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${currencySymbol(currency)}`;
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ------------------------------------------------------------------ */
/* Draft line/total math (mirrors the backend)                         */
/* ------------------------------------------------------------------ */

export interface PoDraftLine {
  productId: string;
  orderedQuantity: number;
  unitCost: number;
  discountRate: number;
  taxRate: number;
}

export interface PoLineMoney {
  gross: number;
  discountAmount: number;
  taxAmount: number;
  lineSubtotal: number;
}

/** gross = qty × unitCost; discount = gross × rate%; tax = (gross − discount) × rate%. */
export function computeDraftLine(line: PoDraftLine): PoLineMoney {
  const qty = Number(line.orderedQuantity) || 0;
  const unitCost = Number(line.unitCost) || 0;
  const discountRate = Number(line.discountRate) || 0;
  const taxRate = Number(line.taxRate) || 0;

  const gross = round2(qty * unitCost);
  const discountAmount = round2((gross * discountRate) / 100);
  const taxable = round2(gross - discountAmount);
  const taxAmount = round2((taxable * taxRate) / 100);
  const lineSubtotal = round2(taxable + taxAmount);

  return { gross, discountAmount, taxAmount, lineSubtotal };
}

export interface PoTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingCost: number;
  grandTotal: number;
}

/** Rolls draft lines up into the order header totals. */
export function computeDraftTotals(lines: PoDraftLine[], shippingCost = 0): PoTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const money = computeDraftLine(line);
    subtotal += money.gross;
    discountTotal += money.discountAmount;
    taxTotal += money.taxAmount;
  }

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxTotal = round2(taxTotal);
  const shipping = round2(Number(shippingCost) || 0);
  const grandTotal = round2(subtotal - discountTotal + taxTotal + shipping);

  return { subtotal, discountTotal, taxTotal, shippingCost: shipping, grandTotal };
}

/* ------------------------------------------------------------------ */
/* Dashboard & analytics aggregation                                   */
/* Every helper below derives its values from live API payloads only.  */
/* ------------------------------------------------------------------ */

/** A cancelled order is not committed spend. */
export const isCommittedOrder = (po: AdminPurchaseOrderListItem): boolean =>
  po.status !== 'CANCELLED';

/**
 * Counts orders per status. Prefers the API's own `byStatus` map when present
 * (authoritative for the whole filtered result), otherwise derives from items.
 */
export function countByStatus(
  items: AdminPurchaseOrderListItem[],
  apiCounts?: Record<string, number> | null,
): Record<PurchaseOrderStatus, number> {
  const counts = (Object.keys(PO_STATUS_META) as PurchaseOrderStatus[]).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<PurchaseOrderStatus, number>,
  );

  if (apiCounts && Object.keys(apiCounts).length > 0) {
    for (const [status, value] of Object.entries(apiCounts)) {
      if (status in counts) counts[status as PurchaseOrderStatus] = value;
    }
    return counts;
  }

  for (const po of items) counts[po.status] = (counts[po.status] ?? 0) + 1;
  return counts;
}

/** Sums `grandTotal` across the orders matching `predicate` (defaults to all). */
export function sumGrandTotal(
  items: AdminPurchaseOrderListItem[],
  predicate: (po: AdminPurchaseOrderListItem) => boolean = () => true,
): number {
  return round2(
    items.filter(predicate).reduce((acc, po) => acc + (Number(po.grandTotal) || 0), 0),
  );
}

export interface PoSupplierAggregate {
  id: string;
  name: string;
  company: string | null;
  orders: number;
  total: number;
}

/** Ranks suppliers by committed purchase value. */
export function aggregateBySupplier(
  items: AdminPurchaseOrderListItem[],
  predicate: (po: AdminPurchaseOrderListItem) => boolean = isCommittedOrder,
): PoSupplierAggregate[] {
  const map = new Map<string, PoSupplierAggregate>();

  for (const po of items) {
    if (!predicate(po)) continue;
    const id = po.supplier?.id ?? '—';
    const entry =
      map.get(id) ??
      ({
        id,
        name: po.supplier?.name ?? 'مورد غير معروف',
        company: po.supplier?.company ?? null,
        orders: 0,
        total: 0,
      } as PoSupplierAggregate);
    entry.orders += 1;
    entry.total += Number(po.grandTotal) || 0;
    map.set(id, entry);
  }

  return [...map.values()]
    .map((entry) => ({ ...entry, total: round2(entry.total) }))
    .sort((a, b) => b.total - a.total);
}

/** Most-recent-first ordering of a purchase-order list. */
export function sortByCreatedDesc(
  items: AdminPurchaseOrderListItem[],
): AdminPurchaseOrderListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
