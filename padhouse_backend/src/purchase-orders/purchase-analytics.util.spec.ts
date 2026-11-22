import {
  AnalyticsItemRow,
  AnalyticsOrderRow,
  aggregatePurchaseAnalytics,
  buildMonthlySpending,
  buildOutstandingByProduct,
  buildRecentOrders,
  buildStatusDistribution,
  buildSupplierPerformance,
  buildTopSuppliers,
  computeKpis,
} from './purchase-analytics.util';
import { PurchaseOrderStatus } from '@prisma/client';

/**
 * Analytics calculation tests, driven by a fixed set of realistic purchase
 * records. Every number here is hand-computed from the fixture below, so the
 * spec doubles as the definition of the financial rules:
 *   - cancelled orders are never counted,
 *   - "products purchased" uses received (not ordered) quantities,
 *   - a partially received order is never treated as fully received,
 *   - outstanding quantity is the not-yet-received remainder of committed orders.
 */

const d = (iso: string): Date => new Date(iso);

const item = (
  productId: string,
  productName: string,
  sku: string,
  orderedQuantity: number,
  receivedQuantity: number,
): AnalyticsItemRow => ({ productId, productName, sku, orderedQuantity, receivedQuantity });

const order = (
  id: string,
  status: PurchaseOrderStatus,
  supplierId: string,
  supplierName: string,
  grandTotal: number,
  orderDate: string,
  createdAt: string,
  items: AnalyticsItemRow[],
  receivedAt: string | null = null,
): AnalyticsOrderRow => ({
  id,
  orderNumber: `PO-${id}`,
  status,
  currency: 'ILS',
  orderDate: d(orderDate),
  expectedAt: null,
  receivedAt: receivedAt ? d(receivedAt) : null,
  createdAt: d(createdAt),
  grandTotal,
  supplierId,
  supplierName,
  supplierCompany: `${supplierName} Ltd`,
  items,
});

/**
 * Fixture (8 orders, 3 suppliers, 3 products):
 *  A RECEIVED     S1  1000  lines: P1 10/10            receivedAt = +15d
 *  B PARTIAL      S1   500  lines: P1 20/8, P2 5/0
 *  C APPROVED     S2   300  lines: P2 10/0
 *  D PENDING      S2   200  lines: P3 4/0
 *  E CANCELLED    S1  9999  lines: P3 100/0
 *  F SENT         S3   700  lines: P3 7/0
 *  G RECEIVED     S2   400  lines: P1 4/4             receivedAt = +8d
 *  H DRAFT        S3   150  lines: P2 3/0
 */
const rows: AnalyticsOrderRow[] = [
  order('A', 'RECEIVED', 'S1', 'المورد الأول', 1000, '2026-01-05', '2026-01-05', [item('P1', 'منتج ١', 'SKU-1', 10, 10)], '2026-01-20'),
  order('B', 'PARTIALLY_RECEIVED', 'S1', 'المورد الأول', 500, '2026-02-10', '2026-02-10', [
    item('P1', 'منتج ١', 'SKU-1', 20, 8),
    item('P2', 'منتج ٢', 'SKU-2', 5, 0),
  ]),
  order('C', 'APPROVED', 'S2', 'المورد الثاني', 300, '2026-02-15', '2026-02-15', [item('P2', 'منتج ٢', 'SKU-2', 10, 0)]),
  order('D', 'PENDING_APPROVAL', 'S2', 'المورد الثاني', 200, '2026-03-01', '2026-03-01', [item('P3', 'منتج ٣', 'SKU-3', 4, 0)]),
  order('E', 'CANCELLED', 'S1', 'المورد الأول', 9999, '2026-03-02', '2026-03-02', [item('P3', 'منتج ٣', 'SKU-3', 100, 0)]),
  order('F', 'SENT', 'S3', 'المورد الثالث', 700, '2026-01-25', '2026-01-25', [item('P3', 'منتج ٣', 'SKU-3', 7, 0)]),
  order('G', 'RECEIVED', 'S2', 'المورد الثاني', 400, '2026-02-20', '2026-02-20', [item('P1', 'منتج ١', 'SKU-1', 4, 4)], '2026-02-28'),
  order('H', 'DRAFT', 'S3', 'المورد الثالث', 150, '2026-03-10', '2026-03-10', [item('P2', 'منتج ٢', 'SKU-2', 3, 0)]),
];

describe('purchase-analytics utils (real purchase records)', () => {
  describe('computeKpis', () => {
    it('computes every KPI from the records', () => {
      expect(computeKpis(rows)).toEqual({
        totalOrders: 8,
        totalPurchaseAmount: 3250, // 1000+500+300+200+700+400+150 (cancelled excluded)
        pendingApprovalOrders: 1,
        approvedOrders: 1,
        partiallyReceivedOrders: 1,
        completedOrders: 2,
        totalProductsPurchased: 22, // received only: A 10, B 8, G 4
        outstandingQuantity: 34, // B 17, C 10, F 7
      });
    });

    it('does not treat partially received quantities as fully received', () => {
      const partial = rows.filter((r) => r.id === 'B');
      const kpis = computeKpis(partial);
      // 8 received, not 25 ordered; the order is not "completed".
      expect(kpis.totalProductsPurchased).toBe(8);
      expect(kpis.completedOrders).toBe(0);
      expect(kpis.partiallyReceivedOrders).toBe(1);
      // Remaining = (20-8) + (5-0).
      expect(kpis.outstandingQuantity).toBe(17);
    });

    it('excludes cancelled orders from value and quantities', () => {
      const cancelled = rows.filter((r) => r.id === 'E');
      const kpis = computeKpis(cancelled);
      expect(kpis.totalOrders).toBe(1);
      expect(kpis.totalPurchaseAmount).toBe(0);
      expect(kpis.totalProductsPurchased).toBe(0);
      expect(kpis.outstandingQuantity).toBe(0);
    });

    it('returns zeros for an empty data set', () => {
      expect(computeKpis([])).toEqual({
        totalOrders: 0,
        totalPurchaseAmount: 0,
        pendingApprovalOrders: 0,
        approvedOrders: 0,
        partiallyReceivedOrders: 0,
        completedOrders: 0,
        totalProductsPurchased: 0,
        outstandingQuantity: 0,
      });
    });
  });

  describe('buildStatusDistribution', () => {
    it('always lists every status with counts and value', () => {
      expect(buildStatusDistribution(rows)).toEqual([
        { status: 'DRAFT', count: 1, value: 150 },
        { status: 'PENDING_APPROVAL', count: 1, value: 200 },
        { status: 'APPROVED', count: 1, value: 300 },
        { status: 'SENT', count: 1, value: 700 },
        { status: 'PARTIALLY_RECEIVED', count: 1, value: 500 },
        { status: 'RECEIVED', count: 2, value: 1400 },
        { status: 'CANCELLED', count: 1, value: 9999 },
      ]);
    });

    it('emits zero-count rows for missing statuses', () => {
      const only = rows.filter((r) => r.status === 'RECEIVED');
      const distribution = buildStatusDistribution(only);
      expect(distribution).toHaveLength(7);
      expect(distribution.find((r) => r.status === 'RECEIVED')).toEqual({
        status: 'RECEIVED',
        count: 2,
        value: 1400,
      });
      expect(distribution.find((r) => r.status === 'DRAFT')).toEqual({
        status: 'DRAFT',
        count: 0,
        value: 0,
      });
    });
  });

  describe('buildMonthlySpending', () => {
    it('returns a trailing, zero-filled series anchored to the latest month', () => {
      expect(buildMonthlySpending(rows, 3)).toEqual([
        { key: '2026-01', orders: 2, total: 1700 }, // A + F
        { key: '2026-02', orders: 3, total: 1200 }, // B + C + G
        { key: '2026-03', orders: 2, total: 350 }, // D + H (E cancelled)
      ]);
    });

    it('fills empty months with zeros', () => {
      const series = buildMonthlySpending(rows, 5);
      expect(series).toHaveLength(5);
      expect(series[0]).toEqual({ key: '2025-11', orders: 0, total: 0 });
      expect(series[4]).toEqual({ key: '2026-03', orders: 2, total: 350 });
    });
  });

  describe('buildTopSuppliers', () => {
    it('ranks suppliers by committed value with share percentages', () => {
      expect(buildTopSuppliers(rows, 10)).toEqual([
        { id: 'S1', name: 'المورد الأول', company: 'المورد الأول Ltd', orders: 2, total: 1500, share: 46.2 },
        { id: 'S2', name: 'المورد الثاني', company: 'المورد الثاني Ltd', orders: 3, total: 900, share: 27.7 },
        { id: 'S3', name: 'المورد الثالث', company: 'المورد الثالث Ltd', orders: 2, total: 850, share: 26.2 },
      ]);
    });

    it('caps the list at the requested limit', () => {
      const top = buildTopSuppliers(rows, 1);
      expect(top).toHaveLength(1);
      expect(top[0].id).toBe('S1');
    });
  });

  describe('buildSupplierPerformance', () => {
    it('derives completion rate, quantities and average lead time', () => {
      const performance = buildSupplierPerformance(rows, 10);

      expect(performance).toHaveLength(3);

      const s1 = performance.find((p) => p.id === 'S1')!;
      expect(s1).toMatchObject({
        orders: 2,
        total: 1500,
        completedOrders: 1,
        completionRate: 50,
        receivedQuantity: 18, // A 10 + B 8
        outstandingQuantity: 17,
        avgLeadTimeDays: 15, // 2026-01-05 → 2026-01-20
      });

      const s2 = performance.find((p) => p.id === 'S2')!;
      expect(s2).toMatchObject({
        orders: 3,
        total: 900,
        completedOrders: 1,
        completionRate: 33.3,
        receivedQuantity: 4,
        outstandingQuantity: 10, // only the APPROVED order C
        avgLeadTimeDays: 8, // 2026-02-20 → 2026-02-28
      });

      const s3 = performance.find((p) => p.id === 'S3')!;
      expect(s3).toMatchObject({
        orders: 2,
        total: 850,
        completedOrders: 0,
        completionRate: 0,
        receivedQuantity: 0,
        outstandingQuantity: 7, // SENT order F
        avgLeadTimeDays: null,
      });
    });
  });

  describe('buildOutstandingByProduct', () => {
    it('reports only the unreceived remainder of committed orders', () => {
      expect(buildOutstandingByProduct(rows, 10)).toEqual([
        {
          productId: 'P2',
          productName: 'منتج ٢',
          sku: 'SKU-2',
          orders: 2,
          orderedQuantity: 15, // B 5 + C 10
          receivedQuantity: 0,
          outstandingQuantity: 15,
        },
        {
          productId: 'P1',
          productName: 'منتج ١',
          sku: 'SKU-1',
          orders: 1,
          orderedQuantity: 20,
          receivedQuantity: 8,
          outstandingQuantity: 12,
        },
        {
          productId: 'P3',
          productName: 'منتج ٣',
          sku: 'SKU-3',
          orders: 1,
          orderedQuantity: 7,
          receivedQuantity: 0,
          outstandingQuantity: 7,
        },
      ]);
    });

    it('ignores fully received and non-outstanding orders', () => {
      // Only the RECEIVED order A → nothing outstanding.
      const none = buildOutstandingByProduct(rows.filter((r) => r.id === 'A'), 10);
      expect(none).toEqual([]);
    });
  });

  describe('buildRecentOrders', () => {
    it('returns the latest orders first, capped at the limit', () => {
      const recent = buildRecentOrders(rows, 3);
      expect(recent.map((r) => r.orderNumber)).toEqual(['PO-H', 'PO-E', 'PO-D']);
      expect(recent[0]).toMatchObject({
        orderNumber: 'PO-H',
        status: 'DRAFT',
        supplierName: 'المورد الثالث',
        grandTotal: 150,
        itemsCount: 1,
      });
    });
  });

  describe('aggregatePurchaseAnalytics', () => {
    it('returns every section from a single pass over the records', () => {
      const result = aggregatePurchaseAnalytics(rows, { topLimit: 10, months: 3 });

      expect(Object.keys(result).sort()).toEqual([
        'kpis',
        'monthlySpending',
        'outstandingByProduct',
        'recentOrders',
        'statusDistribution',
        'supplierPerformance',
        'topSuppliers',
      ]);
      expect(result.kpis.totalOrders).toBe(8);
      expect(result.statusDistribution).toHaveLength(7);
      expect(result.monthlySpending).toHaveLength(3);
      expect(result.topSuppliers).toHaveLength(3);
      expect(result.supplierPerformance).toHaveLength(3);
      expect(result.outstandingByProduct).toHaveLength(3);
      expect(result.recentOrders).toHaveLength(8);
    });

    it('handles an empty data set without throwing', () => {
      const result = aggregatePurchaseAnalytics([], { topLimit: 10, months: 12 });
      expect(result.kpis.totalOrders).toBe(0);
      expect(result.topSuppliers).toEqual([]);
      expect(result.outstandingByProduct).toEqual([]);
      expect(result.recentOrders).toEqual([]);
      expect(result.monthlySpending).toHaveLength(12);
      expect(result.statusDistribution).toHaveLength(7);
    });
  });
});
