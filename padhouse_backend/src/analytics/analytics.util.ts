/**
 * Pure helpers shared by the Analytics module.
 *
 * These functions contain no database access and no Nest HTTP coupling: the
 * service runs the aggregations in PostgreSQL and hands the already-grouped
 * result rows to these helpers for rounding, share and margin math. Keeping the
 * math pure makes it unit-testable against real aggregates and guarantees the
 * API and any future consumer compute identical figures.
 *
 * Business rules reused verbatim from the existing modules (Part 1):
 *  - Sales revenue is the money actually charged (`Order.grandTotal`); cancelled
 *    orders are never counted.
 *  - The sellable price of a line is the price snapshotted on `OrderItem.unitPrice`
 *    (which the order flow writes as `salePrice || basePrice`), so analytics never
 *    re-derive prices from the catalog.
 *  - Cost of goods is the weighted-average cost held on `Inventory.costPrice`
 *    (no historical cost snapshot exists on `OrderItem` — see limitations).
 *  - Currency is ILS (₪).
 */

/** Canonical currency reported by every analytics endpoint. */
export const ANALYTICS_CURRENCY = { code: 'ILS', symbol: '₪' } as const;

/** Orders with this status never contribute to sales, profit or rankings. */
export const CANCELLED_STATUS = 'CANCELLED';

/**
 * Supported trend granularities. The value maps 1:1 to a PostgreSQL
 * `date_trunc` unit, so it is validated by the DTO before reaching the query.
 */
export const ANALYTICS_GROUP_BY = ['day', 'week', 'month'] as const;
export type AnalyticsGroupBy = (typeof ANALYTICS_GROUP_BY)[number];

/** A resolved, inclusive date window in UTC. */
export interface ResolvedDateRange {
  /** Lower bound (inclusive) or `null` for "from the beginning". */
  gte: Date | null;
  /** Upper bound (inclusive) or `null` for "until now". */
  lte: Date | null;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------------------------------------------ */
/* Numeric helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Coerces a raw PostgreSQL value (`bigint` for COUNT/SUM(int), `Prisma.Decimal`
 * for numeric, or a string) into a finite JS number. Anything unusable becomes 0
 * so empty datasets and NULL aggregates never leak `null`/`NaN` into responses.
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** Money rounding — 2 decimals, matching `Order`/`OrderItem` column precision. */
export const round2 = (value: number): number => round(toNumber(value), 2);
/** Percentage/ratio rounding — 1 decimal. */
export const round1 = (value: number): number => round(toNumber(value), 1);

/** `part / whole` as a percentage, rounded to 1 decimal (0 when `whole` is 0). */
export function percent(part: number, whole: number, decimals = 1): number {
  const base = toNumber(whole);
  if (base <= 0) return 0;
  return round((toNumber(part) / base) * 100, decimals);
}

/**
 * Returns a new list where each row gains a `share` field — its value as a
 * percentage of the total, using `pick` to read the value from each row.
 */
export function withShare<T extends object>(
  rows: T[],
  pick: (row: T) => number,
  decimals = 1,
): (T & { share: number })[] {
  const total = rows.reduce((sum, row) => sum + toNumber(pick(row)), 0);
  return rows.map((row) => ({ ...row, share: percent(pick(row), total, decimals) }));
}

/* ------------------------------------------------------------------ */
/* Date handling                                                       */
/* ------------------------------------------------------------------ */

/**
 * Resolves an optional `startDate`/`endDate` pair into an inclusive UTC window.
 *
 * Timezone rule (documented behaviour): a **date-only** value (`YYYY-MM-DD`) is
 * expanded to the whole day — `00:00:00.000Z` for the start and `23:59:59.999Z`
 * for the end — so an end date of `2026-11-23` includes everything created that
 * day. A **full ISO timestamp** is used as the exact instant it denotes. All
 * boundaries are applied against the UTC-stored `Order.createdAt`, so results do
 * not shift with the server's local timezone.
 */
export function resolveDateRange(
  startDate?: string | null,
  endDate?: string | null,
): ResolvedDateRange {
  return {
    gte: toBoundary(startDate, 'start'),
    lte: toBoundary(endDate, 'end'),
  };
}

function toBoundary(value: string | null | undefined, edge: 'start' | 'end'): Date | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) {
    const time = edge === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
    return new Date(`${value}${time}`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ------------------------------------------------------------------ */
/* Profit math                                                         */
/* ------------------------------------------------------------------ */

/** Raw totals needed to derive the profit summary. All values are in ILS. */
export interface ProfitInputs {
  /** Money actually charged to customers (`SUM(Order.grandTotal)`). */
  revenue: number;
  /** Sum of line totals before discounts/shipping (`SUM(OrderItem.totalPrice)`). */
  itemRevenue: number;
  discountTotal: number;
  giftCardDiscount: number;
  shipping: number;
  /** Cost of goods sold, from the variant weighted-average cost. */
  cogs: number;
  unitsSold: number;
  orderCount: number;
}

export interface ProfitSummary {
  revenue: number;
  itemRevenue: number;
  discountTotal: number;
  giftCardDiscount: number;
  shipping: number;
  cogs: number;
  /** Product margin: line revenue minus cost of goods, before discounts/shipping. */
  grossProfit: number;
  grossMarginPct: number;
  /** Bottom line actually kept on the order, minus cost of goods. */
  netProfit: number;
  netMarginPct: number;
  unitsSold: number;
  orderCount: number;
  /** Average amount charged per order. */
  averageOrderValue: number;
  /** Average cost per sold unit. */
  averageUnitCost: number;
}

/**
 * Derives the profit summary from raw aggregates.
 *
 * Two profit figures are reported so no assumption has to be made about which
 * one the dashboard wants:
 *  - `grossProfit`  = itemRevenue − cogs  (pure product margin)
 *  - `netProfit`    = revenue − cogs      (after discounts, including shipping)
 *
 * Shipping is treated as revenue and no shipping **cost** is tracked in the
 * schema, so it is not subtracted from either figure.
 */
export function computeProfitSummary(inputs: ProfitInputs): ProfitSummary {
  const revenue = toNumber(inputs.revenue);
  const itemRevenue = toNumber(inputs.itemRevenue);
  const cogs = toNumber(inputs.cogs);
  const unitsSold = toNumber(inputs.unitsSold);
  const orderCount = toNumber(inputs.orderCount);

  const grossProfit = round2(itemRevenue - cogs);
  const netProfit = round2(revenue - cogs);

  return {
    revenue: round2(revenue),
    itemRevenue: round2(itemRevenue),
    discountTotal: round2(inputs.discountTotal),
    giftCardDiscount: round2(inputs.giftCardDiscount),
    shipping: round2(inputs.shipping),
    cogs: round2(cogs),
    grossProfit,
    grossMarginPct: percent(grossProfit, itemRevenue),
    netProfit,
    netMarginPct: percent(netProfit, revenue),
    unitsSold,
    orderCount,
    averageOrderValue: orderCount > 0 ? round2(revenue / orderCount) : 0,
    averageUnitCost: unitsSold > 0 ? round2(cogs / unitsSold) : 0,
  };
}

/** Adds `profit`/`marginPct` to an item-level aggregate row (line revenue − cogs). */
export function withProfit<T extends { revenue: number; cogs: number }>(
  row: T,
): T & { profit: number; marginPct: number } {
  const profit = round2(toNumber(row.revenue) - toNumber(row.cogs));
  return { ...row, profit, marginPct: percent(profit, row.revenue) };
}

/* ------------------------------------------------------------------ */
/* Gross profit chain (Part 6)                                         */
/* ------------------------------------------------------------------ */

/** Historical costing basis reported alongside the gross-profit chain. */
export const GROSS_PROFIT_COST_BASIS = {
  /** Costing method applied to historical lines. */
  method: 'historical-weighted-average' as const,
  /** Where the purchase cost comes from. */
  source: 'GoodsReceiptItem.unitCost',
  /** Method the inventory module itself uses for on-hand stock. */
  inventoryMethod: 'weighted-average' as const,
  /** Cost used only when no purchase history precedes the sale. */
  fallback: 'none (profit withheld when cost history is missing)',
};

/**
 * Raw totals that feed the Part 6 gross-profit chain. All values are in ILS and
 * already aggregated over **non-cancelled** sales, except `refunds` which comes
 * from refunded (cancelled) orders and is positive.
 */
export interface GrossProfitInputs {
  /** Merchandise value before discounts (`SUM(OrderItem.totalPrice)`). */
  grossSales: number;
  /** Order-level coupon discount. */
  discountTotal: number;
  /** Gift-card discount applied at checkout. */
  giftCardDiscount: number;
  /** Money returned on refunded orders (net of their own discounts). */
  refunds: number;
  /** Cost of goods sold from historical purchase costs. */
  cogs: number;
  unitsSold: number;
  orderCount: number;
  /**
   * Units whose cost could not be resolved from purchase history before the
   * sale; these units are excluded from COGS and profit is withheld.
   */
  uncostedUnits: number;
}

export interface GrossProfitSummary {
  /** Gross Sales — merchandise value before discounts and refunds. */
  grossSales: number;
  /** Total discounts = order coupon discount + gift-card discount. */
  discounts: number;
  discountTotal: number;
  giftCardDiscount: number;
  /** Refunds — value returned on refunded orders. */
  refunds: number;
  /** Net Sales = Gross Sales − Discounts − Refunds. */
  netSales: number;
  /** Cost of Goods Sold from historical purchase costs. */
  cogs: number;
  /** Gross Profit = Net Sales − COGS. */
  grossProfit: number | null;
  /** Gross Profit Margin = (Gross Profit ÷ Net Sales) × 100. */
  grossProfitMarginPct: number | null;
  unitsSold: number;
  orderCount: number;
  /** Average value of a net sale (`netSales ÷ orderCount`). */
  averageOrderValue: number;
  /** Average historical cost per sold unit (`cogs ÷ unitsSold`). */
  averageUnitCost: number;
  /** Units without historical cost; their COGS and profit are not invented. */
  uncostedUnits: number;
  /** Percentage of sold units priced from real purchase history (0–100). */
  costCoveragePct: number;
}

/**
 * Derives the Part 6 Gross Profit chain exactly as specified:
 *
 *   Net Sales   = Gross Sales − Discounts − Refunds
 *   Gross Profit = Net Sales − COGS
 *   Margin %     = (Gross Profit ÷ Net Sales) × 100
 *
 * Every division is guarded: `percent` returns 0 when the denominator is ≤ 0, so
 * an empty window or a fully-refunded period never yields `NaN`/`Infinity`.
 *
 * Gross Profit is deliberately **not** a net-profit figure: salaries, marketing,
 * operating and overhead costs are not represented in this model and are never
 * subtracted here. Shipping is likewise excluded from the chain (it is not part
 * of the cost of goods, and no shipping cost is tracked in the schema).
 */
export function computeGrossProfitSummary(inputs: GrossProfitInputs): GrossProfitSummary {
  const grossSales = round2(inputs.grossSales);
  const discountTotal = round2(inputs.discountTotal);
  const giftCardDiscount = round2(inputs.giftCardDiscount);
  const refunds = round2(inputs.refunds);
  const discounts = round2(discountTotal + giftCardDiscount);
  const cogs = round2(inputs.cogs);
  const unitsSold = toNumber(inputs.unitsSold);
  const orderCount = toNumber(inputs.orderCount);
  const uncostedUnits = toNumber(inputs.uncostedUnits);

  const netSales = round2(grossSales - discounts - refunds);
  const grossProfit = uncostedUnits === 0 ? round2(netSales - cogs) : null;
  const costedUnits = Math.max(0, unitsSold - uncostedUnits);

  return {
    grossSales,
    discounts,
    discountTotal,
    giftCardDiscount,
    refunds,
    netSales,
    cogs,
    grossProfit,
    grossProfitMarginPct: grossProfit === null ? null : percent(grossProfit, netSales),
    unitsSold,
    orderCount,
    averageOrderValue: orderCount > 0 ? round2(netSales / orderCount) : 0,
    averageUnitCost: costedUnits > 0 ? round2(cogs / costedUnits) : 0,
    uncostedUnits,
    costCoveragePct: percent(costedUnits, unitsSold),
  };
}

/* ------------------------------------------------------------------ */
/* Inventory valuation                                                 */
/* ------------------------------------------------------------------ */

export interface InventoryValuationInputs {
  variantCount: number;
  totalUnits: number;
  /** `SUM(currentStock × costPrice)` — the balance-sheet value at WAC. */
  costValue: number;
  /** `SUM(currentStock × salePrice||basePrice)` — value if sold at list price. */
  retailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryValuationTotals extends InventoryValuationInputs {
  /** retailValue − costValue: unrealised margin held in stock. */
  potentialProfit: number;
  potentialMarginPct: number;
}

/** Normalises raw valuation aggregates into the reported totals. */
export function computeInventoryValuation(
  inputs: InventoryValuationInputs,
): InventoryValuationTotals {
  const costValue = round2(inputs.costValue);
  const retailValue = round2(inputs.retailValue);
  const potentialProfit = round2(retailValue - costValue);

  return {
    variantCount: toNumber(inputs.variantCount),
    totalUnits: toNumber(inputs.totalUnits),
    costValue,
    retailValue,
    lowStockCount: toNumber(inputs.lowStockCount),
    outOfStockCount: toNumber(inputs.outOfStockCount),
    potentialProfit,
    potentialMarginPct: percent(potentialProfit, retailValue),
  };
}
