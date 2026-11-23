import {
  ANALYTICS_CURRENCY,
  GROSS_PROFIT_COST_BASIS,
  computeGrossProfitSummary,
  computeInventoryValuation,
  computeProfitSummary,
  percent,
  resolveDateRange,
  round1,
  round2,
  toNumber,
  withProfit,
  withShare,
} from './analytics.util';

/**
 * Analytics math tests, driven by hand-computed figures.
 *
 * These lock down the financial definitions the dashboard depends on:
 *  - revenue is the money actually charged (`Order.grandTotal`),
 *  - cost of goods is the variant weighted-average cost (`Inventory.costPrice`),
 *  - gross profit is line revenue − cogs, net profit is charged revenue − cogs,
 *  - cancelled orders never reach these helpers (they are filtered in SQL),
 *  - empty / NULL aggregates resolve to 0 and never leak `NaN`.
 */
describe('analytics utils (pure aggregation helpers)', () => {
  describe('toNumber', () => {
    it('coerces numbers, strings, bigints and Prisma.Decimal-like values', () => {
      expect(toNumber(10)).toBe(10);
      expect(toNumber('12.5')).toBe(12.5);
      expect(toNumber(BigInt(7))).toBe(7);
      expect(toNumber({ toNumber: () => 3.5 })).toBe(3.5);
    });

    it('returns 0 for NULL, undefined, NaN and unparseable values', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber(NaN)).toBe(0);
      expect(toNumber('abc')).toBe(0);
      expect(toNumber({})).toBe(0);
    });
  });

  describe('rounding', () => {
    it('rounds money to 2 decimals and ratios to 1', () => {
      expect(round2(4.567)).toBe(4.57);
      expect(round2(0)).toBe(0);
      expect(round1((450 / 1050) * 100)).toBe(42.9);
    });
  });

  describe('percent', () => {
    it('computes a rounded percentage and guards a zero denominator', () => {
      expect(percent(1, 3)).toBe(33.3);
      expect(percent(50, 200)).toBe(25);
      expect(percent(5, 0)).toBe(0);
    });
  });

  describe('withShare', () => {
    it('adds each row share of the total', () => {
      const rows = withShare([{ v: 25 }, { v: 75 }], (row) => row.v);
      expect(rows).toEqual([
        { v: 25, share: 25 },
        { v: 75, share: 75 },
      ]);
    });

    it('returns 0 shares for an empty list', () => {
      expect(withShare([], (row: { v: number }) => row.v)).toEqual([]);
    });
  });

  describe('resolveDateRange', () => {
    it('expands a date-only range to the full day in UTC', () => {
      const range = resolveDateRange('2026-01-01', '2026-11-23');
      expect(range.gte?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(range.lte?.toISOString()).toBe('2026-11-23T23:59:59.999Z');
    });

    it('uses a full ISO timestamp as the exact instant', () => {
      const range = resolveDateRange('2026-01-01T12:30:00.000Z', '2026-01-01T18:00:00.000Z');
      expect(range.gte?.toISOString()).toBe('2026-01-01T12:30:00.000Z');
      expect(range.lte?.toISOString()).toBe('2026-01-01T18:00:00.000Z');
    });

    it('leaves a missing bound open and ignores an invalid value', () => {
      expect(resolveDateRange()).toEqual({ gte: null, lte: null });
      expect(resolveDateRange('not-a-date')).toEqual({ gte: null, lte: null });
    });
  });

  describe('computeProfitSummary', () => {
    it('derives gross/net profit, margins and averages from the aggregates', () => {
      const summary = computeProfitSummary({
        revenue: 1000,
        itemRevenue: 1050,
        discountTotal: 50,
        giftCardDiscount: 0,
        shipping: 30,
        cogs: 600,
        unitsSold: 10,
        orderCount: 4,
      });

      expect(summary).toMatchObject({
        revenue: 1000,
        itemRevenue: 1050,
        discountTotal: 50,
        shipping: 30,
        cogs: 600,
        grossProfit: 450, // 1050 - 600
        netProfit: 400, // 1000 - 600
        grossMarginPct: 42.9, // 450 / 1050
        netMarginPct: 40, // 400 / 1000
        unitsSold: 10,
        orderCount: 4,
        averageOrderValue: 250, // 1000 / 4
        averageUnitCost: 60, // 600 / 10
      });
    });

    it('returns a fully-zeroed summary for an empty data set', () => {
      const summary = computeProfitSummary({
        revenue: 0,
        itemRevenue: 0,
        discountTotal: 0,
        giftCardDiscount: 0,
        shipping: 0,
        cogs: 0,
        unitsSold: 0,
        orderCount: 0,
      });

      expect(summary.netProfit).toBe(0);
      expect(summary.grossProfit).toBe(0);
      expect(summary.grossMarginPct).toBe(0);
      expect(summary.netMarginPct).toBe(0);
      expect(summary.averageOrderValue).toBe(0);
      expect(summary.averageUnitCost).toBe(0);
    });

    it('never divides by zero when there are no units or orders', () => {
      const summary = computeProfitSummary({
        revenue: 500,
        itemRevenue: 500,
        discountTotal: 0,
        giftCardDiscount: 0,
        shipping: 0,
        cogs: 0,
        unitsSold: 0,
        orderCount: 0,
      });

      expect(summary.averageOrderValue).toBe(0);
      expect(summary.averageUnitCost).toBe(0);
      expect(summary.netProfit).toBe(500);
    });
  });

  describe('withProfit', () => {
    it('adds profit and margin to a line-level aggregate', () => {
      expect(withProfit({ revenue: 200, cogs: 150 })).toEqual({
        revenue: 200,
        cogs: 150,
        profit: 50,
        marginPct: 25,
      });
    });

    it('handles a zero-revenue aggregate without NaN', () => {
      expect(withProfit({ revenue: 0, cogs: 0 })).toEqual({
        revenue: 0,
        cogs: 0,
        profit: 0,
        marginPct: 0,
      });
    });
  });

  describe('computeGrossProfitSummary', () => {
    it('derives the gross-profit chain: Net Sales = Gross Sales − Discounts − Refunds', () => {
      const summary = computeGrossProfitSummary({
        grossSales: 1200,
        discountTotal: 100,
        giftCardDiscount: 50,
        refunds: 150,
        cogs: 540,
        unitsSold: 12,
        orderCount: 5,
        uncostedUnits: 2,
      });

      expect(summary).toMatchObject({
        grossSales: 1200,
        discounts: 150, // 100 coupon + 50 gift card
        discountTotal: 100,
        giftCardDiscount: 50,
        refunds: 150,
        netSales: 900, // 1200 - 150 - 150
        cogs: 540,
        grossProfit: null, // withheld because two units have no recorded historical cost
        grossProfitMarginPct: null,
        unitsSold: 12,
        orderCount: 5,
        averageOrderValue: 180, // 900 / 5
        averageUnitCost: 54, // 540 / 10 costed units
        uncostedUnits: 2,
        costCoveragePct: 83.3, // (12 - 2) / 12
      });
    });

    it('treats discount components as independent of cost and refunds', () => {
      const summary = computeGrossProfitSummary({
        grossSales: 1000,
        discountTotal: 0,
        giftCardDiscount: 0,
        refunds: 0,
        cogs: 600,
        unitsSold: 10,
        orderCount: 4,
        uncostedUnits: 0,
      });

      expect(summary.discounts).toBe(0);
      expect(summary.netSales).toBe(1000);
      expect(summary.grossProfit).toBe(400);
      expect(summary.grossProfitMarginPct).toBe(40); // 400 / 1000
      expect(summary.costCoveragePct).toBe(100);
    });

    it('guards a zero Net Sales denominator (fully refunded window) without NaN', () => {
      const summary = computeGrossProfitSummary({
        grossSales: 500,
        discountTotal: 0,
        giftCardDiscount: 0,
        refunds: 500,
        cogs: 0,
        unitsSold: 0,
        orderCount: 0,
        uncostedUnits: 0,
      });

      expect(summary.netSales).toBe(0);
      expect(summary.grossProfit).toBe(0);
      expect(summary.grossProfitMarginPct).toBe(0);
      expect(Number.isNaN(summary.grossProfitMarginPct)).toBe(false);
      expect(summary.averageOrderValue).toBe(0);
      expect(summary.averageUnitCost).toBe(0);
      expect(summary.costCoveragePct).toBe(0);
    });

    it('returns a fully-zeroed chain for an empty window', () => {
      const summary = computeGrossProfitSummary({
        grossSales: 0,
        discountTotal: 0,
        giftCardDiscount: 0,
        refunds: 0,
        cogs: 0,
        unitsSold: 0,
        orderCount: 0,
        uncostedUnits: 0,
      });

      expect(summary.grossSales).toBe(0);
      expect(summary.discounts).toBe(0);
      expect(summary.netSales).toBe(0);
      expect(summary.cogs).toBe(0);
      expect(summary.grossProfit).toBe(0);
      expect(summary.grossProfitMarginPct).toBe(0);
      expect(summary.costCoveragePct).toBe(0);
    });

    it('reports a 0% cost-coverage signal when no sold unit had purchase history', () => {
      const summary = computeGrossProfitSummary({
        grossSales: 300,
        discountTotal: 0,
        giftCardDiscount: 0,
        refunds: 0,
        cogs: 0,
        unitsSold: 5,
        orderCount: 3,
        uncostedUnits: 5,
      });

      expect(summary.costCoveragePct).toBe(0);
      expect(summary.uncostedUnits).toBe(5);
    });

    it('clamps cost coverage so it never goes negative', () => {
      const summary = computeGrossProfitSummary({
        grossSales: 100,
        discountTotal: 0,
        giftCardDiscount: 0,
        refunds: 0,
        cogs: 0,
        unitsSold: 2,
        orderCount: 1,
        uncostedUnits: 5, // defensive: more uncosted than sold
      });

      expect(summary.costCoveragePct).toBe(0);
    });

    it('documents the historical costing basis it reports', () => {
      expect(GROSS_PROFIT_COST_BASIS).toEqual({
        method: 'historical-weighted-average',
        source: 'GoodsReceiptItem.unitCost',
        inventoryMethod: 'weighted-average',
        fallback: 'none (profit withheld when cost history is missing)',
      });
    });
  });

  describe('computeInventoryValuation', () => {
    it('reports cost/retail value and the unrealised margin held in stock', () => {
      const totals = computeInventoryValuation({
        variantCount: 3,
        totalUnits: 10,
        costValue: 500,
        retailValue: 800,
        lowStockCount: 1,
        outOfStockCount: 0,
      });

      expect(totals).toEqual({
        variantCount: 3,
        totalUnits: 10,
        costValue: 500,
        retailValue: 800,
        lowStockCount: 1,
        outOfStockCount: 0,
        potentialProfit: 300, // 800 - 500
        potentialMarginPct: 37.5, // 300 / 800
      });
    });

    it('returns zeros for an empty inventory', () => {
      const totals = computeInventoryValuation({
        variantCount: 0,
        totalUnits: 0,
        costValue: 0,
        retailValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      });

      expect(totals.potentialProfit).toBe(0);
      expect(totals.potentialMarginPct).toBe(0);
    });
  });

  describe('currency', () => {
    it('reports ILS consistently', () => {
      expect(ANALYTICS_CURRENCY).toEqual({ code: 'ILS', symbol: '₪' });
    });
  });
});
