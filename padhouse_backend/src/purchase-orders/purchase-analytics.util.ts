import { PurchaseOrderStatus } from '@prisma/client';

/**
 * Pure aggregation helpers for the Purchase Analytics dashboard.
 *
 * These functions contain no database access: the service reads the raw
 * purchase-order rows (a single projected query) and hands them to
 * {@link aggregatePurchaseAnalytics}. Keeping the math pure makes it fully
 * unit-testable against real purchase records and guarantees the API and any
 * future consumer compute identical figures.
 *
 * Financial correctness rules baked in here:
 *  - Cancelled orders never count towards spend, quantities or supplier ranks.
 *  - Received quantities (not ordered quantities) drive "products purchased", so
 *    a partially received order is never treated as fully received.
 *  - Outstanding quantity is only the not-yet-received remainder of committed
 *    orders (approved / sent / partially received).
 */

/** Every purchase-order status, in workflow order (cancelled last). */
export const PO_ANALYTICS_STATUSES: PurchaseOrderStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
];

/**
 * Orders whose goods are committed to the supplier but not yet fully received.
 * Only lines on these orders contribute to "outstanding quantity".
 */
export const OUTSTANDING_STATUSES: PurchaseOrderStatus[] = [
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
];

/** A purchase-order line, reduced to the fields analytics needs. */
export interface AnalyticsItemRow {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
}

/** A purchase order with its supplier and lines, reduced for analytics. */
export interface AnalyticsOrderRow {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  orderDate: Date;
  expectedAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  grandTotal: number;
  supplierId: string;
  supplierName: string | null;
  supplierCompany: string | null;
  items: AnalyticsItemRow[];
}

export interface PurchaseAnalyticsKpis {
  /** All matching orders (including cancelled). */
  totalOrders: number;
  /** Committed spend: sum of grand totals excluding cancelled orders. */
  totalPurchaseAmount: number;
  pendingApprovalOrders: number;
  approvedOrders: number;
  partiallyReceivedOrders: number;
  /** Orders received in full. */
  completedOrders: number;
  /** Units actually received across non-cancelled orders. */
  totalProductsPurchased: number;
  /** Units ordered but not yet received, on committed orders. */
  outstandingQuantity: number;
}

export interface StatusDistributionRow {
  status: PurchaseOrderStatus;
  count: number;
  value: number;
}

export interface MonthlySpendingPoint {
  /** Stable `YYYY-MM` key. */
  key: string;
  orders: number;
  total: number;
}

export interface TopSupplierRow {
  id: string;
  name: string;
  company: string | null;
  orders: number;
  total: number;
  /** Share of the total committed spend, as a percentage. */
  share: number;
}

export interface SupplierPerformanceRow {
  id: string;
  name: string;
  company: string | null;
  orders: number;
  total: number;
  completedOrders: number;
  /** Completed / total orders, as a percentage. */
  completionRate: number;
  receivedQuantity: number;
  outstandingQuantity: number;
  /** Average days between order date and full receipt (null if none completed). */
  avgLeadTimeDays: number | null;
}

export interface OutstandingProductRow {
  productId: string;
  productName: string;
  sku: string;
  orders: number;
  orderedQuantity: number;
  receivedQuantity: number;
  outstandingQuantity: number;
}

export interface RecentPurchaseOrderRow {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  supplierName: string | null;
  supplierCompany: string | null;
  currency: string;
  orderDate: Date;
  expectedAt: Date | null;
  grandTotal: number;
  itemsCount: number;
}

export interface PurchaseAnalytics {
  kpis: PurchaseAnalyticsKpis;
  statusDistribution: StatusDistributionRow[];
  monthlySpending: MonthlySpendingPoint[];
  topSuppliers: TopSupplierRow[];
  supplierPerformance: SupplierPerformanceRow[];
  outstandingByProduct: OutstandingProductRow[];
  recentOrders: RecentPurchaseOrderRow[];
}

export interface AggregateOptions {
  /** Max rows per ranked list (top suppliers, products, recent orders). */
  topLimit: number;
  /** Number of trailing months in the spending trend. */
  months: number;
}

/* ------------------------------------------------------------------ */
/* Small numeric + date helpers                                        */
/* ------------------------------------------------------------------ */

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const round2 = (value: number): number => round(value, 2);
const round1 = (value: number): number => round(value, 1);

const isCommitted = (row: AnalyticsOrderRow): boolean => row.status !== 'CANCELLED';

const isOutstandingStatus = (status: PurchaseOrderStatus): boolean =>
  OUTSTANDING_STATUSES.includes(status);

const safeNumber = (value: number | null | undefined): number =>
  Number.isFinite(value as number) ? (value as number) : 0;

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toTime = (value: Date | string): number => toDate(value)?.getTime() ?? 0;

/** `YYYY-MM` bucket key for a date (local time). */
const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** The not-yet-received remainder of a line. */
const remainingOf = (item: AnalyticsItemRow): number =>
  Math.max(0, safeNumber(item.orderedQuantity) - safeNumber(item.receivedQuantity));

/* ------------------------------------------------------------------ */
/* Aggregations                                                        */
/* ------------------------------------------------------------------ */

/** Counts orders and sums committed value per status. */
export function buildStatusDistribution(rows: AnalyticsOrderRow[]): StatusDistributionRow[] {
  const map = new Map<PurchaseOrderStatus, StatusDistributionRow>();
  for (const status of PO_ANALYTICS_STATUSES) {
    map.set(status, { status, count: 0, value: 0 });
  }
  for (const row of rows) {
    const entry = map.get(row.status);
    if (!entry) continue;
    entry.count += 1;
    entry.value = round2(entry.value + safeNumber(row.grandTotal));
  }
  return PO_ANALYTICS_STATUSES.map((status) => map.get(status)!);
}

/** Headline KPIs. Cancelled orders are excluded from every monetary/quantity KPI. */
export function computeKpis(rows: AnalyticsOrderRow[]): PurchaseAnalyticsKpis {
  let totalPurchaseAmount = 0;
  let pendingApprovalOrders = 0;
  let approvedOrders = 0;
  let partiallyReceivedOrders = 0;
  let completedOrders = 0;
  let totalProductsPurchased = 0;
  let outstandingQuantity = 0;

  for (const row of rows) {
    if (row.status === 'PENDING_APPROVAL') pendingApprovalOrders += 1;
    else if (row.status === 'APPROVED') approvedOrders += 1;
    else if (row.status === 'PARTIALLY_RECEIVED') partiallyReceivedOrders += 1;
    else if (row.status === 'RECEIVED') completedOrders += 1;

    if (!isCommitted(row)) continue;

    totalPurchaseAmount += safeNumber(row.grandTotal);

    for (const item of row.items) {
      totalProductsPurchased += safeNumber(item.receivedQuantity);
      if (isOutstandingStatus(row.status)) {
        outstandingQuantity += remainingOf(item);
      }
    }
  }

  return {
    totalOrders: rows.length,
    totalPurchaseAmount: round2(totalPurchaseAmount),
    pendingApprovalOrders,
    approvedOrders,
    partiallyReceivedOrders,
    completedOrders,
    totalProductsPurchased,
    outstandingQuantity,
  };
}

/**
 * Trailing `months`-month spending trend, anchored to the latest order month in
 * the data set (or the current month when there is none). Cancelled orders are
 * excluded; empty months are filled with zeros so the chart stays continuous.
 */
export function buildMonthlySpending(
  rows: AnalyticsOrderRow[],
  months: number,
): MonthlySpendingPoint[] {
  const totals = new Map<string, { orders: number; total: number }>();
  let latest: Date | null = null;

  for (const row of rows) {
    if (!isCommitted(row)) continue;
    const d = toDate(row.orderDate);
    if (!d) continue;
    const key = monthKey(d);
    const entry = totals.get(key) ?? { orders: 0, total: 0 };
    entry.orders += 1;
    entry.total += safeNumber(row.grandTotal);
    totals.set(key, entry);
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }

  const end = latest ?? new Date();
  const series: MonthlySpendingPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const key = monthKey(d);
    const entry = totals.get(key);
    series.push({ key, orders: entry?.orders ?? 0, total: round2(entry?.total ?? 0) });
  }
  return series;
}

/** Suppliers ranked by committed purchase value (cancelled orders excluded). */
export function buildTopSuppliers(rows: AnalyticsOrderRow[], limit: number): TopSupplierRow[] {
  const map = new Map<string, TopSupplierRow>();
  let grandTotal = 0;

  for (const row of rows) {
    if (!isCommitted(row)) continue;
    const value = safeNumber(row.grandTotal);
    const entry =
      map.get(row.supplierId) ??
      {
        id: row.supplierId,
        name: row.supplierName ?? '—',
        company: row.supplierCompany ?? null,
        orders: 0,
        total: 0,
        share: 0,
      };
    entry.orders += 1;
    entry.total += value;
    map.set(row.supplierId, entry);
    grandTotal += value;
  }

  return [...map.values()]
    .map((entry) => ({
      ...entry,
      total: round2(entry.total),
      share: grandTotal > 0 ? round1((entry.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(0, limit));
}

/** Per-supplier purchasing performance (value, completion rate, lead time, quantities). */
export function buildSupplierPerformance(
  rows: AnalyticsOrderRow[],
  limit: number,
): SupplierPerformanceRow[] {
  interface Acc {
    row: SupplierPerformanceRow;
    leadSum: number;
    leadCount: number;
  }

  const map = new Map<string, Acc>();

  for (const order of rows) {
    if (!isCommitted(order)) continue;

    let acc = map.get(order.supplierId);
    if (!acc) {
      acc = {
        row: {
          id: order.supplierId,
          name: order.supplierName ?? '—',
          company: order.supplierCompany ?? null,
          orders: 0,
          total: 0,
          completedOrders: 0,
          completionRate: 0,
          receivedQuantity: 0,
          outstandingQuantity: 0,
          avgLeadTimeDays: null,
        },
        leadSum: 0,
        leadCount: 0,
      };
      map.set(order.supplierId, acc);
    }

    acc.row.orders += 1;
    acc.row.total += safeNumber(order.grandTotal);

    if (order.status === 'RECEIVED') {
      acc.row.completedOrders += 1;
      const received = toDate(order.receivedAt);
      const placed = toDate(order.orderDate);
      if (received && placed && received.getTime() >= placed.getTime()) {
        acc.leadSum += (received.getTime() - placed.getTime()) / 86_400_000;
        acc.leadCount += 1;
      }
    }

    for (const item of order.items) {
      acc.row.receivedQuantity += safeNumber(item.receivedQuantity);
      if (isOutstandingStatus(order.status)) {
        acc.row.outstandingQuantity += remainingOf(item);
      }
    }
  }

  return [...map.values()]
    .map(({ row, leadSum, leadCount }) => ({
      ...row,
      total: round2(row.total),
      completionRate: row.orders > 0 ? round1((row.completedOrders / row.orders) * 100) : 0,
      avgLeadTimeDays: leadCount > 0 ? round1(leadSum / leadCount) : null,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(0, limit));
}

/**
 * Products with not-yet-received quantities, ranked by outstanding units.
 * Only committed, unreceived remainder counts — partially received lines appear
 * with their remaining quantity, never their full ordered quantity.
 */
export function buildOutstandingByProduct(
  rows: AnalyticsOrderRow[],
  limit: number,
): OutstandingProductRow[] {
  interface Acc extends OutstandingProductRow {
    orderIds: Set<string>;
  }

  const map = new Map<string, Acc>();

  for (const order of rows) {
    if (!isOutstandingStatus(order.status)) continue;
    for (const item of order.items) {
      const remaining = remainingOf(item);
      if (remaining <= 0) continue;

      let acc = map.get(item.productId);
      if (!acc) {
        acc = {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          orders: 0,
          orderedQuantity: 0,
          receivedQuantity: 0,
          outstandingQuantity: 0,
          orderIds: new Set(),
        };
        map.set(item.productId, acc);
      }
      acc.orderedQuantity += safeNumber(item.orderedQuantity);
      acc.receivedQuantity += safeNumber(item.receivedQuantity);
      acc.outstandingQuantity += remaining;
      acc.orderIds.add(order.id);
    }
  }

  return [...map.values()]
    .map((acc) => ({
      productId: acc.productId,
      productName: acc.productName,
      sku: acc.sku,
      orders: acc.orderIds.size,
      orderedQuantity: acc.orderedQuantity,
      receivedQuantity: acc.receivedQuantity,
      outstandingQuantity: acc.outstandingQuantity,
    }))
    .sort((a, b) => b.outstandingQuantity - a.outstandingQuantity)
    .slice(0, Math.max(0, limit));
}

/** Most recently created orders first. */
export function buildRecentOrders(
  rows: AnalyticsOrderRow[],
  limit: number,
): RecentPurchaseOrderRow[] {
  return [...rows]
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, Math.max(0, limit))
    .map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      supplierName: row.supplierName,
      supplierCompany: row.supplierCompany,
      currency: row.currency,
      orderDate: row.orderDate,
      expectedAt: row.expectedAt,
      grandTotal: round2(safeNumber(row.grandTotal)),
      itemsCount: row.items.length,
    }));
}

/** Runs every aggregation over a single read of purchase-order rows. */
export function aggregatePurchaseAnalytics(
  rows: AnalyticsOrderRow[],
  options: AggregateOptions,
): PurchaseAnalytics {
  const { topLimit, months } = options;
  return {
    kpis: computeKpis(rows),
    statusDistribution: buildStatusDistribution(rows),
    monthlySpending: buildMonthlySpending(rows, months),
    topSuppliers: buildTopSuppliers(rows, topLimit),
    supplierPerformance: buildSupplierPerformance(rows, topLimit),
    outstandingByProduct: buildOutstandingByProduct(rows, topLimit),
    recentOrders: buildRecentOrders(rows, topLimit),
  };
}
