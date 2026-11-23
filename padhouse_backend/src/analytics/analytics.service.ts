import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsCacheService } from './analytics-cache.service';
import {
  ANALYTICS_CURRENCY,
  AnalyticsGroupBy,
  GROSS_PROFIT_COST_BASIS,
  GrossProfitSummary,
  InventoryValuationInputs,
  ResolvedDateRange,
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
import {
  AnalyticsBestSellingQueryDto,
  AnalyticsInventoryValuationQueryDto,
  AnalyticsOrdersQueryDto,
  AnalyticsOverviewQueryDto,
  AnalyticsProductPerformanceQueryDto,
  AnalyticsProfitQueryDto,
  AnalyticsSalesByCategoryQueryDto,
  AnalyticsSalesQueryDto,
  BestSellingSort,
  InventoryValuationSort,
  ProductPerformanceSort,
  SalesCategorySort,
} from './dto/analytics-query.dto';

/* ------------------------------------------------------------------ */
/* Raw query row shapes                                                */
/* ------------------------------------------------------------------ */

export interface SalesSummaryRow {
  orderCount: number;
  subtotal: number;
  shipping: number;
  discountTotal: number;
  giftCardDiscount: number;
  revenue: number;
}

export interface ItemTotalsRow {
  unitsSold: number;
  itemRevenue: number;
  cogs: number;
  productCount: number;
}

export interface OrderTrendRow {
  key: string;
  orderCount: number;
  revenue: number;
}

export interface CategoryRow {
  categoryId: string;
  nameAr: string;
  nameEn: string | null;
  revenue: number;
  cogs: number;
  unitsSold: number;
  orderCount: number;
}

export interface ProductRow {
  productId: string;
  sku: string | null;
  nameAr: string;
  nameEn: string | null;
  categoryId: string | null;
  categoryNameAr: string | null;
  /** Primary product image URL (`ProductImage`, `isPrimary` first), or `null`. */
  imageUrl: string | null;
  unitsSold: number;
  revenue: number;
  cogs: number;
  /**
   * Units whose variant had a recorded cost (`Inventory.costPrice > 0`).
   * Compared against `unitsSold` to decide whether profit may be reported.
   */
  costedUnits: number;
  orderCount: number;
}

export interface ProductPerformanceRow extends Omit<ProductRow, 'imageUrl' | 'costedUnits'> {
  imageUrl: string | null;
  costedUnits: number;
  currentStock: number;
  minStock: number;
  avgUnitCost: number;
  inventoryValue: number;
}

export interface CountRow {
  total: number;
}

export interface StatusRow {
  status: string;
  count: number;
  value: number;
}

export interface ValuationTotalsRow {
  variantCount: number;
  productCount: number;
  totalUnits: number;
  costValue: number;
  retailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
}

export interface ValuationCategoryRow {
  categoryId: string;
  nameAr: string;
  variantCount: number;
  totalUnits: number;
  costValue: number;
  retailValue: number;
}

export interface ValuationItemRow {
  inventoryId: string;
  variantId: string;
  variantSku: string;
  color: string | null;
  productId: string;
  productSku: string;
  nameAr: string;
  nameEn: string | null;
  categoryNameAr: string | null;
  currentStock: number;
  minThreshold: number;
  maxStock: number;
  costPrice: number;
  costValue: number;
  retailValue: number;
}

export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  itemsCount: number;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/* Gross-profit chain rows (Part 6)                                    */
/* ------------------------------------------------------------------ */

/** Line-level gross sales, historical COGS and cost coverage for a window. */
export interface ProfitLineAggregateRow {
  unitsSold: number;
  grossSales: number;
  cogs: number;
  /** Sold units whose unit cost came from real purchase history. */
  unitsWithHistory: number;
  productCount: number;
}

/** Order-level discounts, refunds and shipping for a window. */
export interface ProfitOrderAggregateRow {
  orderCount: number;
  discountTotal: number;
  giftCardDiscount: number;
  shipping: number;
  refunds: number;
  refundOrderCount: number;
}

/** Per-period order money (discounts/refunds) for the profit trend. */
export interface ProfitTrendOrderRow {
  key: string;
  orderCount: number;
  discountTotal: number;
  giftCardDiscount: number;
  refunds: number;
}

/** Per-period line money (gross sales/COGS/units) for the profit trend. */
export interface ProfitTrendLineRow {
  key: string;
  grossSales: number;
  cogs: number;
  unitsSold: number;
}

/** Product-level cost-coverage row backing the data-quality warning. */
export interface ProfitCostQualityRow {
  productId: string;
  sku: string | null;
  nameAr: string;
  unitsSold: number;
  unitsWithHistory: number;
}

/* ------------------------------------------------------------------ */
/* Sort allow-lists (identifier-safe: never interpolated from user input) */
/* ------------------------------------------------------------------ */

const SALES_CATEGORY_SORT_SQL: Record<SalesCategorySort, string> = {
  revenue: 'revenue',
  unitsSold: '"unitsSold"',
  orderCount: '"orderCount"',
};

const BEST_SELLING_SORT_SQL: Record<BestSellingSort, string> = {
  unitsSold: '"unitsSold"',
  revenue: 'revenue',
  orderCount: '"orderCount"',
};

const PRODUCT_PERFORMANCE_SORT_SQL: Record<ProductPerformanceSort, string> = {
  revenue: 'revenue DESC',
  unitsSold: '"unitsSold" DESC',
  orderCount: '"orderCount" DESC',
  profit: 'profit DESC',
  marginPct: '"marginPct" DESC',
  revenueAsc: 'revenue ASC',
  stockAsc: '"currentStock" ASC',
};

const INVENTORY_VALUATION_SORT_SQL: Record<InventoryValuationSort, string> = {
  costValue: '"costValue"',
  retailValue: '"retailValue"',
  currentStock: '"currentStock"',
};

/**
 * Sales & Profit Analytics.
 *
 * Every figure is produced by PostgreSQL against the live tables — no mock data,
 * no in-memory scans of `Order`/`OrderItem`/`Product`:
 *  - order-level money comes from `SUM(Order.*)`,
 *  - line-level money and units come from `SUM(OrderItem.*)`,
 *  - cost of goods comes from the recorded purchase cost (see below),
 *  - category grouping is a single `GROUP BY` join, so there is no N+1 access.
 *
 * Financial rules reused verbatim from the order/inventory modules (Part 1):
 * cancelled orders are excluded from sales/profit and the price is the one
 * already snapshotted on `OrderItem.unitPrice`.
 *
 * The dedicated **gross-profit** endpoint (`profit`) costs sold lines from
 * historical purchase records instead of the current inventory cost: for every
 * `OrderItem` it resolves the goods-receipt weighted average as of the sale
 * timestamp (`GoodsReceiptItem.unitCost`), which is the same weighted-average
 * method the inventory module applies at stock-in. Only when no receipt precedes
 * the sale does it fall back to `Inventory.costPrice`, and those units are
 * surfaced in the payload's data-quality block rather than silently priced.
 * Gross profit is `Net Sales − COGS`; it is deliberately **not** a net-profit
 * figure (salaries, marketing, operating and overhead costs are not modelled).
 * See `analytics.util.ts` for the documented definitions.
 *
 * Read payloads are memoised by {@link AnalyticsCacheService} for a short TTL and
 * dropped whenever a sale, refund, purchase or stock movement is written.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Endpoints                                                          */
  /* ------------------------------------------------------------------ */

  async overview(query: AnalyticsOverviewQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:overview', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        groupBy: query.groupBy,
        limit: query.limit,
      }),
      () => this.buildOverview(query, range),
    );
  }

  async sales(query: AnalyticsSalesQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:sales', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        groupBy: query.groupBy,
        limit: query.limit,
      }),
      () => this.buildSales(query, range),
    );
  }

  async salesByCategory(query: AnalyticsSalesByCategoryQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:sales-by-category', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        sortBy: query.sortBy,
        limit: query.limit,
      }),
      () => this.buildSalesByCategory(query, range),
    );
  }

  async bestSellingProducts(query: AnalyticsBestSellingQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:best-selling', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        sortBy: query.sortBy,
        limit: query.limit,
        page: query.page,
      }),
      () => this.buildBestSelling(query, range),
    );
  }

  async profit(query: AnalyticsProfitQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:profit', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        groupBy: query.groupBy,
        limit: query.limit,
      }),
      () => this.buildProfit(query, range),
    );
  }

  async inventoryValuation(query: AnalyticsInventoryValuationQueryDto) {
    return this.cache.wrap(
      this.cache.buildKey('analytics:inventory-valuation', {
        categoryId: query.categoryId,
        sortBy: query.sortBy,
        limit: query.limit,
        page: query.page,
        lowStockLimit: query.lowStockLimit,
      }),
      () => this.buildInventoryValuation(query),
    );
  }

  async orders(query: AnalyticsOrdersQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:orders', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        groupBy: query.groupBy,
        limit: query.limit,
        page: query.page,
      }),
      () => this.buildOrders(query, range),
    );
  }

  async productPerformance(query: AnalyticsProductPerformanceQueryDto) {
    const range = this.range(query);
    return this.cache.wrap(
      this.cache.buildKey('analytics:product-performance', {
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        sortBy: query.sortBy,
        limit: query.limit,
        page: query.page,
      }),
      () => this.buildProductPerformance(query, range),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Payload builders                                                    */
  /* ------------------------------------------------------------------ */

  private async buildOverview(query: AnalyticsOverviewQueryDto, range: ResolvedDateRange) {
    const groupBy: AnalyticsGroupBy = query.groupBy ?? 'month';
    const limit = query.limit ?? 10;
    const where = this.orderFilter(range, query.categoryId);
    const itemWhere = this.itemFilter(range, query.categoryId);

    const [summary, totals, statusRows, paymentRows, valuation, trend, categories, products] =
      await Promise.all([
        this.salesSummary(where),
        this.itemTotals(itemWhere),
        this.statusDistribution(this.orderFilter(range, query.categoryId, true), 'status'),
        this.statusDistribution(this.orderFilter(range, query.categoryId, true), 'paymentStatus'),
        this.valuationTotals(query.categoryId),
        this.orderTrend(groupBy, where),
        this.categoryBreakdown(itemWhere, SALES_CATEGORY_SORT_SQL.revenue, limit),
        this.productBreakdown(itemWhere, BEST_SELLING_SORT_SQL.unitsSold, limit, 0),
      ]);

    const profitSummary = computeProfitSummary({
      revenue: summary.revenue,
      itemRevenue: totals.itemRevenue,
      discountTotal: summary.discountTotal,
      giftCardDiscount: summary.giftCardDiscount,
      shipping: summary.shipping,
      cogs: totals.cogs,
      unitsSold: totals.unitsSold,
      orderCount: summary.orderCount,
    });

    const cancelled = statusRows.find((row) => row.status === 'CANCELLED');

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, groupBy),
      filters: {
        categoryId: query.categoryId ?? null,
        groupBy,
        limit,
      },
      sales: profitSummary,
      orders: {
        completedOrders: totalOrdersByStatus(statusRows, ['DELIVERED']),
        cancelledOrders: cancelled?.count ?? 0,
        statusDistribution: statusRows,
        paymentDistribution: paymentRows,
      },
      inventory: valuation,
      trend,
      topCategories: withShare(categories, (row) => row.revenue),
      topProducts: products,
      generatedAt: new Date(),
    };
  }

  private async buildSales(query: AnalyticsSalesQueryDto, range: ResolvedDateRange) {
    const groupBy: AnalyticsGroupBy = query.groupBy ?? 'day';
    const limit = query.limit ?? 10;
    const where = this.orderFilter(range, query.categoryId);
    const itemWhere = this.itemFilter(range, query.categoryId);

    const [summary, totals, trend, categories, products, statusRows] = await Promise.all([
      this.salesSummary(where),
      this.itemTotals(itemWhere),
      this.orderTrend(groupBy, where),
      this.categoryBreakdown(itemWhere, SALES_CATEGORY_SORT_SQL.revenue, limit),
      this.productBreakdown(itemWhere, BEST_SELLING_SORT_SQL.unitsSold, limit, 0),
      this.statusDistribution(this.orderFilter(range, query.categoryId, true), 'status'),
    ]);

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, groupBy),
      filters: { categoryId: query.categoryId ?? null, groupBy, limit },
      summary: computeProfitSummary({
        revenue: summary.revenue,
        itemRevenue: totals.itemRevenue,
        discountTotal: summary.discountTotal,
        giftCardDiscount: summary.giftCardDiscount,
        shipping: summary.shipping,
        cogs: totals.cogs,
        unitsSold: totals.unitsSold,
        orderCount: summary.orderCount,
      }),
      statusDistribution: statusRows,
      trend,
      byCategory: withShare(categories, (row) => row.revenue),
      topProducts: products,
      generatedAt: new Date(),
    };
  }

  private async buildSalesByCategory(
    query: AnalyticsSalesByCategoryQueryDto,
    range: ResolvedDateRange,
  ) {
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'revenue';
    const itemWhere = this.itemFilter(range, query.categoryId);

    const rows = await this.categoryBreakdown(itemWhere, SALES_CATEGORY_SORT_SQL[sortBy], limit);
    const withMargins = rows.map((row) => withProfit(row));
    const totals = withMargins.reduce(
      (acc, row) => ({
        revenue: round2(acc.revenue + row.revenue),
        cogs: round2(acc.cogs + row.cogs),
        profit: round2(acc.profit + row.profit),
        unitsSold: acc.unitsSold + row.unitsSold,
        orderCount: acc.orderCount + row.orderCount,
      }),
      { revenue: 0, cogs: 0, profit: 0, unitsSold: 0, orderCount: 0 },
    );

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, null),
      filters: { categoryId: query.categoryId ?? null, sortBy, limit },
      totals: { ...totals, marginPct: totals.revenue > 0 ? round1((totals.profit / totals.revenue) * 100) : 0 },
      categories: withShare(withMargins, (row) => row.revenue),
      generatedAt: new Date(),
    };
  }

  private async buildBestSelling(
    query: AnalyticsBestSellingQueryDto,
    range: ResolvedDateRange,
  ) {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const sortBy = query.sortBy ?? 'unitsSold';
    const itemWhere = this.itemFilter(range, query.categoryId);
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.productBreakdown(itemWhere, BEST_SELLING_SORT_SQL[sortBy], limit, offset),
      this.productCount(itemWhere),
    ]);

    const products = rows.map((row) => {
      const unitsSold = toNumber(row.unitsSold);
      const revenue = round2(row.revenue);
      const cogs = round2(row.cogs);
      // Profit is reported only when every sold unit resolved to a recorded cost
      // (`Inventory.costPrice > 0`); otherwise it is `null` so the dashboard never
      // shows a fabricated margin for products whose cost was never captured.
      const costKnown = unitsSold > 0 && toNumber(row.costedUnits) >= unitsSold;
      const profit = costKnown ? round2(revenue - cogs) : null;
      return {
        productId: row.productId,
        sku: row.sku,
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        categoryId: row.categoryId,
        categoryNameAr: row.categoryNameAr,
        imageUrl: row.imageUrl,
        unitsSold,
        revenue,
        cogs,
        costKnown,
        profit,
        marginPct: profit === null ? null : percent(profit, revenue),
        orderCount: toNumber(row.orderCount),
      };
    });

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, null),
      filters: { categoryId: query.categoryId ?? null, sortBy, limit, page },
      totals: {
        revenue: round2(products.reduce((sum, row) => sum + row.revenue, 0)),
        unitsSold: products.reduce((sum, row) => sum + row.unitsSold, 0),
      },
      // `share` follows the active ranking metric so the UI bars always match
      // the ordering the list is sorted by.
      products: withShare(products, (row) =>
        sortBy === 'revenue'
          ? row.revenue
          : sortBy === 'orderCount'
            ? row.orderCount
            : row.unitsSold,
      ),
      pagination: this.pagination(total, page, limit),
      generatedAt: new Date(),
    };
  }

  private async buildProfit(query: AnalyticsProfitQueryDto, range: ResolvedDateRange) {
    const groupBy: AnalyticsGroupBy = query.groupBy ?? 'month';
    const limit = query.limit ?? 10;

    // Both filters are built **without** a status clause: refunded sales (cancelled
    // + refunded orders) must reach the aggregates so their merchandise can be
    // counted in gross sales and then deducted again as refunds. The active /
    // refunded / revenue predicates are applied per aggregate below.
    const orderWhere = this.orderFilter(range, query.categoryId, true);
    const itemWhere = this.itemFilter(range, query.categoryId, true);

    const [lines, orders, trendOrders, trendLines, quality] = await Promise.all([
      this.profitLineAggregate(itemWhere),
      this.profitOrderAggregate(orderWhere),
      this.profitTrendOrders(groupBy, orderWhere),
      this.profitTrendLines(groupBy, itemWhere),
      this.profitCostQuality(itemWhere, limit),
    ]);

    const unitsSold = toNumber(lines.unitsSold);
    const unitsWithHistory = toNumber(lines.unitsWithHistory);
    const uncostedUnits = Math.max(0, unitsSold - unitsWithHistory);

    const summary = computeGrossProfitSummary({
      grossSales: lines.grossSales,
      discountTotal: orders.discountTotal,
      giftCardDiscount: orders.giftCardDiscount,
      refunds: orders.refunds,
      cogs: lines.cogs,
      unitsSold,
      orderCount: orders.orderCount,
      uncostedUnits,
    });

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, groupBy),
      filters: { categoryId: query.categoryId ?? null, groupBy, limit },
      costBasis: GROSS_PROFIT_COST_BASIS,
      summary,
      breakdown: {
        discounts: {
          coupon: round2(orders.discountTotal),
          giftCard: round2(orders.giftCardDiscount),
          total: summary.discounts,
          sharePct: percent(summary.discounts, summary.grossSales),
        },
        refunds: {
          total: summary.refunds,
          orderCount: toNumber(orders.refundOrderCount),
          sharePct: percent(summary.refunds, summary.grossSales),
        },
        // Shipping is reported for completeness only; it is deliberately excluded
        // from the gross-profit chain (it is not part of the cost of goods).
        shipping: round2(orders.shipping),
      },
      trend: this.mergeProfitTrend(trendOrders, trendLines).map((point) => uncostedUnits > 0 ? { ...point, grossProfit: null, marginPct: null } : point),
      dataQuality: this.profitDataQuality(summary, quality, uncostedUnits),
      generatedAt: new Date(),
    };
  }

  /**
   * Merges the order-level and line-level trend queries into one gross-profit
   * series, filling any period that only appears in one of the two queries so the
   * chart never drops a bucket.
   */
  private mergeProfitTrend(orderRows: ProfitTrendOrderRow[], lineRows: ProfitTrendLineRow[]) {
    const orderByKey = new Map(orderRows.map((row) => [row.key, row]));
    const lineByKey = new Map(lineRows.map((row) => [row.key, row]));
    const keys = Array.from(new Set([...orderByKey.keys(), ...lineByKey.keys()])).sort();

    return keys.map((key) => {
      const orderRow = orderByKey.get(key);
      const lineRow = lineByKey.get(key);
      const grossSales = round2(lineRow?.grossSales ?? 0);
      const discounts = round2(
        toNumber(orderRow?.discountTotal) + toNumber(orderRow?.giftCardDiscount),
      );
      const refunds = round2(orderRow?.refunds ?? 0);
      const cogs = round2(lineRow?.cogs ?? 0);
      const netSales = round2(grossSales - discounts - refunds);
      const grossProfit = round2(netSales - cogs);

      return {
        key,
        grossSales,
        discounts,
        refunds,
        netSales,
        cogs,
        grossProfit,
        marginPct: percent(grossProfit, netSales),
        unitsSold: toNumber(lineRow?.unitsSold ?? 0),
        orderCount: toNumber(orderRow?.orderCount ?? 0),
      };
    });
  }

  /**
   * Data-quality signals for the gross-profit chain: how many sold units were
   * costed from real purchase history, which products fell back to the current
   * inventory cost, and human-readable warnings (Arabic) for the dashboard.
   */
  private profitDataQuality(
    summary: GrossProfitSummary,
    rows: ProfitCostQualityRow[],
    uncostedUnits: number,
  ) {
    const affectedProducts = rows
      .map((row) => {
        const rowUnits = toNumber(row.unitsSold);
        const rowCosted = toNumber(row.unitsWithHistory);
        return {
          productId: row.productId,
          sku: row.sku,
          nameAr: row.nameAr,
          unitsSold: rowUnits,
          uncostedUnits: Math.max(0, rowUnits - rowCosted),
        };
      })
      .filter((row) => row.uncostedUnits > 0);

    const isComplete = summary.unitsSold > 0 ? uncostedUnits === 0 : true;
    const notes: string[] = [];

    if (summary.unitsSold === 0) {
      notes.push('لا توجد وحدات مبيعة في هذه الفترة، لذلك لا يمكن احتساب تكلفة البضاعة المباعة.');
    } else if (isComplete) {
      notes.push('جميع الوحدات المبيعة احتُسبت تكلفتها من سجلات الشراء التاريخية.');
    } else {
      notes.push(
        `تكلفة ${uncostedUnits} من أصل ${summary.unitsSold} وحدة غير متوفرة في سجلات الشراء التاريخية؛ تُستبعد الوحدات غير المسعرة وتُحجب قيم الربح والهامش.`, 
      );
      if (summary.cogs === 0) {
        notes.push('لا تتوفر بيانات تكلفة لهذه الفترة، لذلك قيمة الربح الإجمالي غير موثوقة.');
      }
    }

    return {
      isComplete,
      unitsSold: summary.unitsSold,
      unitsWithHistory: Math.max(0, summary.unitsSold - uncostedUnits),
      uncostedUnits,
      costCoveragePct: summary.costCoveragePct,
      affectedProducts,
      notes,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Gross-profit chain SQL (Part 6)                                     */
  /* ------------------------------------------------------------------ */

  /** Order status predicates applied per aggregate (aliased `o`). */
  private readonly refundedOrderSql = Prisma.sql`(o."paymentStatus" = 'REFUNDED')`;
  /** Recognize paid or delivered orders; exclude cancelled, refunded and unpaid open orders. */
  private readonly saleOrderSql = Prisma.sql`(o.status <> 'CANCELLED' AND o."paymentStatus" <> 'REFUNDED' AND (o.status = 'DELIVERED' OR o."paymentStatus" = 'PAID'))`;
  /** Include refunded records in gross sales so refunds can be subtracted separately. */
  private readonly revenueOrderSql = Prisma.sql`(${this.saleOrderSql} OR ${this.refundedOrderSql})`;

  /**
   * Historical weighted-average unit cost of a sold line, evaluated **as of the
   * sale timestamp** (`o."createdAt"`) from the goods-receipt layers recorded for
   * that product:
   *
   *   Σ(quantityReceived × unitCost) ÷ Σ(quantityReceived)   for receipts received ≤ sale time
   *
   * Returns `NULL` when no receipt precedes the sale, so the caller can fall back
   * to `Inventory.costPrice` and flag the line as not historically costed. The
   * expression references the outer aliases `oi` (order item) and `o` (order).
   */
  private historicalUnitCostSql(): Prisma.Sql {
    return Prisma.sql`(
      SELECT SUM(gri."quantityReceived" * gri."unitCost")::float8
           / NULLIF(SUM(gri."quantityReceived"), 0)
      FROM "GoodsReceiptItem" gri
      JOIN "GoodsReceipt" gr ON gr.id = gri."goodsReceiptId"
      WHERE gri."productId" = oi."productId"
        AND gri."quantityReceived" > 0
        AND gr."receivedAt" <= o."createdAt"
    )`;
  }

  /** Per-line unit cost from historical weighted-average goods receipt records. */
  private lineUnitCostSql(): Prisma.Sql {
    return this.historicalUnitCostSql();
  }

  /** `true` when the line had purchase history before the sale. */
  private lineHasHistorySql(): Prisma.Sql {
    return Prisma.sql`(${this.historicalUnitCostSql()} IS NOT NULL)`;
  }

  /** Line-level gross sales, historical COGS and cost coverage for the window. */
  private async profitLineAggregate(where: Prisma.Sql): Promise<ProfitLineAggregateRow> {
    const rows = await this.prisma.$queryRaw<ProfitLineAggregateRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(oi.quantity) FILTER (WHERE ${this.saleOrderSql}), 0)::int AS "unitsSold",
        COALESCE(SUM(oi."totalPrice") FILTER (WHERE ${this.revenueOrderSql}), 0)::float8 AS "grossSales",
        COALESCE(
          SUM(oi.quantity * ${this.lineUnitCostSql()}) FILTER (WHERE ${this.saleOrderSql}),
          0
        )::float8 AS cogs,
        COALESCE(
          SUM(
            CASE WHEN ${this.saleOrderSql} AND ${this.lineHasHistorySql()}
                 THEN oi.quantity ELSE 0 END
          ),
          0
        )::int AS "unitsWithHistory",
        COUNT(DISTINCT oi."productId")::int AS "productCount"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Inventory" inv ON inv."variantId" = oi."variantId"
      ${where}
    `);
    return (
      rows[0] ?? { unitsSold: 0, grossSales: 0, cogs: 0, unitsWithHistory: 0, productCount: 0 }
    );
  }

  /** Order-level discounts, refunds and shipping for the window. */
  private async profitOrderAggregate(where: Prisma.Sql): Promise<ProfitOrderAggregateRow> {
    const rows = await this.prisma.$queryRaw<ProfitOrderAggregateRow[]>(Prisma.sql`
      SELECT
        (COUNT(*) FILTER (WHERE ${this.saleOrderSql}))::int AS "orderCount",
        COALESCE(
          SUM(o."discountTotal") FILTER (WHERE ${this.revenueOrderSql}),
          0
        )::float8 AS "discountTotal",
        COALESCE(
          SUM(o."giftCardDiscount") FILTER (WHERE ${this.revenueOrderSql}),
          0
        )::float8 AS "giftCardDiscount",
        COALESCE(SUM(o."shippingFee") FILTER (WHERE ${this.revenueOrderSql}), 0)::float8 AS shipping,
        (COUNT(*) FILTER (WHERE ${this.refundedOrderSql}))::int AS "refundOrderCount",
        COALESCE(
          SUM(GREATEST(0, o.subtotal - o."discountTotal" - o."giftCardDiscount"))
            FILTER (WHERE ${this.refundedOrderSql}),
          0
        )::float8 AS refunds
      FROM "Order" o
      ${where}
    `);
    return (
      rows[0] ?? {
        orderCount: 0,
        discountTotal: 0,
        giftCardDiscount: 0,
        shipping: 0,
        refunds: 0,
        refundOrderCount: 0,
      }
    );
  }

  /** Per-period order money (discounts/refunds) for the profit trend. */
  private async profitTrendOrders(
    unit: AnalyticsGroupBy,
    where: Prisma.Sql,
  ): Promise<ProfitTrendOrderRow[]> {
    return this.prisma.$queryRaw<ProfitTrendOrderRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc(${unit}::text, o."createdAt"), 'YYYY-MM-DD') AS key,
        (COUNT(*) FILTER (WHERE ${this.saleOrderSql}))::int AS "orderCount",
        COALESCE(
          SUM(o."discountTotal") FILTER (WHERE ${this.revenueOrderSql}),
          0
        )::float8 AS "discountTotal",
        COALESCE(
          SUM(o."giftCardDiscount") FILTER (WHERE ${this.revenueOrderSql}),
          0
        )::float8 AS "giftCardDiscount",
        COALESCE(
          SUM(GREATEST(0, o.subtotal - o."discountTotal" - o."giftCardDiscount"))
            FILTER (WHERE ${this.refundedOrderSql}),
          0
        )::float8 AS refunds
      FROM "Order" o
      ${where}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
  }

  /** Per-period line money (gross sales/COGS/units) for the profit trend. */
  private async profitTrendLines(
    unit: AnalyticsGroupBy,
    where: Prisma.Sql,
  ): Promise<ProfitTrendLineRow[]> {
    return this.prisma.$queryRaw<ProfitTrendLineRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc(${unit}::text, o."createdAt"), 'YYYY-MM-DD') AS key,
        COALESCE(SUM(oi."totalPrice") FILTER (WHERE ${this.revenueOrderSql}), 0)::float8 AS "grossSales",
        COALESCE(
          SUM(oi.quantity * ${this.lineUnitCostSql()}) FILTER (WHERE ${this.saleOrderSql}),
          0
        )::float8 AS cogs,
        COALESCE(SUM(oi.quantity) FILTER (WHERE ${this.saleOrderSql}), 0)::int AS "unitsSold"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Inventory" inv ON inv."variantId" = oi."variantId"
      ${where}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
  }

  /**
   * Products whose sold units were not fully costed from purchase history,
   * ranked by the number of uncosted units — feeds the data-quality warning.
   */
  private async profitCostQuality(
    where: Prisma.Sql,
    limit: number,
  ): Promise<ProfitCostQualityRow[]> {
    return this.prisma.$queryRaw<ProfitCostQualityRow[]>(Prisma.sql`
      SELECT
        p.id AS "productId",
        p.sku AS sku,
        p."nameAr" AS "nameAr",
        COALESCE(SUM(oi.quantity) FILTER (WHERE ${this.saleOrderSql}), 0)::int AS "unitsSold",
        COALESCE(
          SUM(
            CASE WHEN ${this.saleOrderSql} AND ${this.lineHasHistorySql()}
                 THEN oi.quantity ELSE 0 END
          ),
          0
        )::int AS "unitsWithHistory"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      ${where}
      GROUP BY p.id, p.sku, p."nameAr"
      HAVING (
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status <> 'CANCELLED'), 0)
        - COALESCE(
            SUM(
              CASE WHEN o.status <> 'CANCELLED' AND ${this.lineHasHistorySql()}
                   THEN oi.quantity ELSE 0 END
            ),
            0
          )
      ) > 0
      ORDER BY (
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status <> 'CANCELLED'), 0)
        - COALESCE(
            SUM(
              CASE WHEN o.status <> 'CANCELLED' AND ${this.lineHasHistorySql()}
                   THEN oi.quantity ELSE 0 END
            ),
            0
          )
      ) DESC
      LIMIT ${limit}
    `);
  }

  private async buildInventoryValuation(query: AnalyticsInventoryValuationQueryDto) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const sortBy = query.sortBy ?? 'costValue';
    const lowStockLimit = query.lowStockLimit ?? 5;
    const where = this.inventoryFilter(query.categoryId);
    const offset = (page - 1) * limit;

    const [totalsRow, categoryRows, items, total, lowStock] = await Promise.all([
      this.valuationTotals(query.categoryId),
      this.valuationByCategory(query.categoryId),
      this.valuationItems(where, INVENTORY_VALUATION_SORT_SQL[sortBy], limit, offset),
      this.valuationItemCount(where),
      this.lowStockItems(query.categoryId, lowStockLimit),
    ]);

    const totals = computeInventoryValuation(totalsRow);

    return {
      currency: ANALYTICS_CURRENCY,
      filters: {
        categoryId: query.categoryId ?? null,
        sortBy,
        limit,
        page,
      },
      totals: { ...totals, productCount: toNumber(totalsRow.productCount), overstockCount: toNumber(totalsRow.overstockCount) },
      byCategory: withShare(
        categoryRows.map((row) => ({
          categoryId: row.categoryId,
          nameAr: row.nameAr,
          variantCount: toNumber(row.variantCount),
          totalUnits: toNumber(row.totalUnits),
          costValue: round2(row.costValue),
          retailValue: round2(row.retailValue),
        })),
        (row) => row.costValue,
      ),
      items: items.map((row) => ({
        inventoryId: row.inventoryId,
        variantId: row.variantId,
        variantSku: row.variantSku,
        color: row.color,
        productId: row.productId,
        productSku: row.productSku,
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        categoryNameAr: row.categoryNameAr,
        currentStock: toNumber(row.currentStock),
        reservedStock: 0,
        availableStock: toNumber(row.currentStock),
        minThreshold: toNumber(row.minThreshold),
        maxStock: toNumber(row.maxStock),
        costPrice: round2(row.costPrice),
        costValue: round2(row.costValue),
        retailValue: round2(row.retailValue),
        isLowStock: toNumber(row.currentStock) <= toNumber(row.minThreshold),
        isOverstocked: toNumber(row.currentStock) > toNumber(row.maxStock),
      })),
      lowStock: lowStock.map((row) => ({
        inventoryId: row.inventoryId,
        variantId: row.variantId,
        productId: row.productId,
        nameAr: row.nameAr,
        variantSku: row.variantSku,
        currentStock: toNumber(row.currentStock),
        minThreshold: toNumber(row.minThreshold),
        shortfall: Math.max(0, toNumber(row.minThreshold) - toNumber(row.currentStock)),
      })),
      pagination: this.pagination(total, page, limit),
      generatedAt: new Date(),
    };
  }

private async buildOrders(query: AnalyticsOrdersQueryDto, range: ResolvedDateRange) {
    const groupBy: AnalyticsGroupBy = query.groupBy ?? 'day';
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    const scoped = this.orderFilter(range, query.categoryId);
    const allStatuses = this.orderFilter(range, query.categoryId, true);

    const [statusRows, paymentRows, trend, summary, recent, total] = await Promise.all([
      this.statusDistribution(allStatuses, 'status'),
      this.statusDistribution(allStatuses, 'paymentStatus'),
      this.orderTrend(groupBy, scoped),
      this.salesSummary(scoped),
      this.recentOrders(allStatuses, limit, offset),
      this.orderCount(allStatuses),
    ]);

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, groupBy),
      filters: { categoryId: query.categoryId ?? null, groupBy, limit, page },
      summary: {
        totalOrders: summary.orderCount,
        revenue: round2(summary.revenue),
        averageOrderValue:
          summary.orderCount > 0 ? round2(summary.revenue / summary.orderCount) : 0,
        grossTotal: round2(summary.subtotal + summary.shipping),
        discounts: round2(summary.discountTotal + summary.giftCardDiscount),
      },
      statusDistribution: statusRows,
      paymentDistribution: paymentRows,
      trend,
      recentOrders: recent.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        paymentStatus: row.paymentStatus,
        grandTotal: round2(row.grandTotal),
        itemsCount: toNumber(row.itemsCount),
        createdAt: row.createdAt,
      })),
      pagination: this.pagination(total, page, limit),
      generatedAt: new Date(),
    };
  }

  private async buildProductPerformance(
    query: AnalyticsProductPerformanceQueryDto,
    range: ResolvedDateRange,
  ) {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const sortBy = query.sortBy ?? 'revenue';
    const itemWhere = this.itemFilter(range, query.categoryId);
    const offset = (page - 1) * limit;

    const productWhere = query.categoryId
      ? Prisma.sql`WHERE p."categoryId" = ${query.categoryId}`
      : Prisma.empty;
    const [rows, total] = await Promise.all([
      this.productPerformanceRows(itemWhere, PRODUCT_PERFORMANCE_SORT_SQL[sortBy], limit, offset, productWhere),
      this.prisma.product.count({ where: query.categoryId ? { categoryId: query.categoryId } : undefined }),
    ]);

    const products = rows.map((row) => ({
      productId: row.productId,
      sku: row.sku,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      imageUrl: row.imageUrl,
      categoryId: row.categoryId,
      categoryNameAr: row.categoryNameAr,
      unitsSold: toNumber(row.unitsSold),
      orderCount: toNumber(row.orderCount),
      revenue: round2(row.revenue),
      cogs: round2(row.cogs),
      profit: toNumber(row.unitsSold) > 0 && toNumber(row.costedUnits) < toNumber(row.unitsSold)
        ? null
        : round2(row.revenue - row.cogs),
      marginPct: toNumber(row.unitsSold) > 0 && toNumber(row.costedUnits) < toNumber(row.unitsSold)
        ? null
        : row.revenue > 0 ? round1(((row.revenue - row.cogs) / row.revenue) * 100) : 0,
      costKnown: toNumber(row.unitsSold) === 0 || toNumber(row.costedUnits) >= toNumber(row.unitsSold),
      averageUnitPrice: toNumber(row.unitsSold) > 0 ? round2(row.revenue / row.unitsSold) : 0,
      averageUnitCost: round2(row.avgUnitCost),
      currentStock: toNumber(row.currentStock),
      inventoryValue: round2(row.inventoryValue),
      minStock: toNumber(row.minStock),
      isLowStock: toNumber(row.currentStock) <= toNumber(row.minStock),
    }));

    return {
      currency: ANALYTICS_CURRENCY,
      range: this.rangeMeta(range, null),
      filters: { categoryId: query.categoryId ?? null, sortBy, limit, page },
      products,
      pagination: this.pagination(total, page, limit),
      generatedAt: new Date(),
    };
  }

  /* ------------------------------------------------------------------ */
  /* SQL fragments                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Inclusive UTC window from the query plus a guard that the start is not after
   * the end. Boundaries target `Order.createdAt` (the sales timestamp).
   */
  private range(query: { startDate?: string; endDate?: string }): ResolvedDateRange {
    const range = resolveDateRange(query.startDate, query.endDate);
    if (range.gte && range.lte && range.gte.getTime() > range.lte.getTime()) {
      throw new BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له');
    }
    return range;
  }

  private rangeMeta(range: ResolvedDateRange, groupBy: AnalyticsGroupBy | null) {
    return {
      startDate: range.gte ? range.gte.toISOString() : null,
      endDate: range.lte ? range.lte.toISOString() : null,
      groupBy,
      timezone: 'UTC',
    };
  }

  /** `WHERE` for order-level queries (table aliased `o`). */
  private orderFilter(
    range: ResolvedDateRange,
    categoryId?: string,
    includeCancelled = false,
  ): Prisma.Sql {
    const clauses: Prisma.Sql[] = [];
    if (!includeCancelled) clauses.push(this.saleOrderSql);
    if (range.gte) clauses.push(Prisma.sql`o."createdAt" >= ${range.gte}`);
    if (range.lte) clauses.push(Prisma.sql`o."createdAt" <= ${range.lte}`);
    if (categoryId) {
      clauses.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "OrderItem" x JOIN "Product" xp ON xp.id = x."productId" WHERE x."orderId" = o.id AND xp."categoryId" = ${categoryId})`,
      );
    }
    return clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
  }

  /**
   * `WHERE` for line-level queries. Requires `"OrderItem" oi`, `"Order" o` and
   * `"Product" p` to be joined; the category filter is pushed into SQL rather
   * than applied in memory.
   */
  private itemFilter(
    range: ResolvedDateRange,
    categoryId?: string,
    includeCancelled = false,
  ): Prisma.Sql {
    const clauses: Prisma.Sql[] = [];
    if (!includeCancelled) clauses.push(this.saleOrderSql);
    if (range.gte) clauses.push(Prisma.sql`o."createdAt" >= ${range.gte}`);
    if (range.lte) clauses.push(Prisma.sql`o."createdAt" <= ${range.lte}`);
    if (categoryId) clauses.push(Prisma.sql`p."categoryId" = ${categoryId}`);
    return clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
  }

  /** `WHERE` for inventory valuation queries (alias `p` for the product). */
  private inventoryFilter(categoryId?: string): Prisma.Sql {
    if (!categoryId) return Prisma.empty;
    return Prisma.sql`WHERE p."categoryId" = ${categoryId}`;
  }

  private pagination(total: number, page: number, limit: number) {
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    return { page, limit, total, totalPages, hasNext: page * limit < total };
  }

  /* ------------------------------------------------------------------ */
  /* Individual aggregations                                             */
  /* ------------------------------------------------------------------ */

  private async salesSummary(where: Prisma.Sql): Promise<SalesSummaryRow> {
    const rows = await this.prisma.$queryRaw<SalesSummaryRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "orderCount",
        COALESCE(SUM(o.subtotal), 0)::float8 AS subtotal,
        COALESCE(SUM(o."shippingFee"), 0)::float8 AS shipping,
        COALESCE(SUM(o."discountTotal"), 0)::float8 AS "discountTotal",
        COALESCE(SUM(o."giftCardDiscount"), 0)::float8 AS "giftCardDiscount",
        COALESCE(SUM(o."grandTotal"), 0)::float8 AS revenue
      FROM "Order" o
      ${where}
    `);
    return rows[0] ?? emptySummary();
  }

  private async itemTotals(where: Prisma.Sql): Promise<ItemTotalsRow> {
    const rows = await this.prisma.$queryRaw<ItemTotalsRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
        COALESCE(SUM(oi."totalPrice"), 0)::float8 AS "itemRevenue",
        COALESCE(SUM(oi.quantity * COALESCE(inv."costPrice", 0)), 0)::float8 AS cogs,
        COUNT(DISTINCT oi."productId")::int AS "productCount"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Inventory" inv ON inv."variantId" = oi."variantId"
      ${where}
    `);
    return rows[0] ?? { unitsSold: 0, itemRevenue: 0, cogs: 0, productCount: 0 };
  }

  private async orderTrend(unit: AnalyticsGroupBy, where: Prisma.Sql): Promise<OrderTrendRow[]> {
    return this.prisma.$queryRaw<OrderTrendRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc(${unit}::text, o."createdAt"), 'YYYY-MM-DD') AS key,
        COUNT(*)::int AS "orderCount",
        COALESCE(SUM(o."grandTotal"), 0)::float8 AS revenue
      FROM "Order" o
      ${where}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
  }

  private async categoryBreakdown(
    where: Prisma.Sql,
    orderExpr: string,
    limit: number,
  ): Promise<CategoryRow[]> {
    return this.prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
      SELECT
        c.id AS "categoryId",
        c."nameAr" AS "nameAr",
        c."nameEn" AS "nameEn",
        COALESCE(SUM(oi."totalPrice"), 0)::float8 AS revenue,
        COALESCE(SUM(oi.quantity * COALESCE(inv."costPrice", 0)), 0)::float8 AS cogs,
        COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
        COUNT(DISTINCT o.id)::int AS "orderCount"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Inventory" inv ON inv."variantId" = oi."variantId"
      ${where}
      GROUP BY c.id, c."nameAr", c."nameEn"
      ORDER BY ${Prisma.raw(orderExpr)} DESC NULLS LAST
      LIMIT ${limit}
    `);
  }

  private async productBreakdown(
    where: Prisma.Sql,
    orderExpr: string,
    limit: number,
    offset: number,
  ): Promise<ProductRow[]> {
    return this.prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT
        p.id AS "productId",
        p.sku AS sku,
        p."nameAr" AS "nameAr",
        p."nameEn" AS "nameEn",
        p."categoryId" AS "categoryId",
        c."nameAr" AS "categoryNameAr",
        (
          SELECT pi.url FROM "ProductImage" pi
          WHERE pi."productId" = p.id
          ORDER BY pi."isPrimary" DESC, pi."displayOrder" ASC
          LIMIT 1
        ) AS "imageUrl",
        COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
        COALESCE(SUM(oi."totalPrice"), 0)::float8 AS revenue,
        COALESCE(SUM(oi.quantity * COALESCE(inv."costPrice", 0)), 0)::float8 AS cogs,
        COALESCE(
          SUM(CASE WHEN inv."costPrice" > 0 THEN oi.quantity ELSE 0 END),
          0
        )::int AS "costedUnits",
        COUNT(DISTINCT o.id)::int AS "orderCount"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Inventory" inv ON inv."variantId" = oi."variantId"
      ${where}
      GROUP BY p.id, p.sku, p."nameAr", p."nameEn", p."categoryId", c."nameAr"
      ORDER BY ${Prisma.raw(orderExpr)} DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  private async productPerformanceRows(
    where: Prisma.Sql,
    orderExpr: string,
    limit: number,
    offset: number,
    productWhere: Prisma.Sql,
  ): Promise<ProductPerformanceRow[]> {
    return this.prisma.$queryRaw<ProductPerformanceRow[]>(Prisma.sql`
      WITH sales AS (
        SELECT
          p.id AS "productId",
          COALESCE(SUM(oi.quantity) FILTER (WHERE ${this.saleOrderSql}), 0)::int AS "unitsSold",
          COALESCE(SUM(oi."totalPrice") FILTER (WHERE ${this.revenueOrderSql}), 0)::float8 AS revenue,
          COALESCE(SUM(oi.quantity * ${this.lineUnitCostSql()}) FILTER (WHERE ${this.saleOrderSql}), 0)::float8 AS cogs,
          COALESCE(SUM(CASE WHEN ${this.saleOrderSql} AND ${this.lineHasHistorySql()} THEN oi.quantity ELSE 0 END), 0)::int AS "costedUnits",
          COUNT(DISTINCT o.id) FILTER (WHERE ${this.saleOrderSql})::int AS "orderCount"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        LEFT JOIN "Inventory" inv ON inv."variantId" = oi."variantId"
        ${where}
        GROUP BY p.id
      )
      SELECT
        p.id AS "productId",
        p.sku AS sku,
        p."nameAr" AS "nameAr",
        p."nameEn" AS "nameEn",
        p."categoryId" AS "categoryId",
        c."nameAr" AS "categoryNameAr",
        (
          SELECT pi.url FROM "ProductImage" pi
          WHERE pi."productId" = p.id
          ORDER BY pi."isPrimary" DESC, pi."displayOrder" ASC
          LIMIT 1
        ) AS "imageUrl",
        COALESCE(s."unitsSold", 0)::int AS "unitsSold",
        COALESCE(s.revenue, 0)::float8 AS revenue,
        COALESCE(s.cogs, 0)::float8 AS cogs,
        COALESCE(s."costedUnits", 0)::int AS "costedUnits",
        COALESCE(s."orderCount", 0)::int AS "orderCount",
        COALESCE((
          SELECT SUM(stockInv."currentStock")
          FROM "Inventory" stockInv
          JOIN "ProductVariant" stockVariant ON stockVariant.id = stockInv."variantId"
          WHERE stockVariant."productId" = p.id
        ), 0)::int AS "currentStock",
        p."minStock" AS "minStock",
        COALESCE((
          SELECT AVG(costInv."costPrice")
          FROM "Inventory" costInv
          JOIN "ProductVariant" costVariant ON costVariant.id = costInv."variantId"
          WHERE costVariant."productId" = p.id
        ), 0)::float8 AS "avgUnitCost",
        COALESCE((
          SELECT SUM(valueInv."currentStock" * valueInv."costPrice")
          FROM "Inventory" valueInv
          JOIN "ProductVariant" valueVariant ON valueVariant.id = valueInv."variantId"
          WHERE valueVariant."productId" = p.id
        ), 0)::float8 AS "inventoryValue",
        CASE
          WHEN COALESCE(s."unitsSold", 0) = 0 OR COALESCE(s."costedUnits", 0) >= s."unitsSold"
          THEN (COALESCE(s.revenue, 0) - COALESCE(s.cogs, 0))::float8
          ELSE NULL
        END AS profit,
        CASE
          WHEN COALESCE(s.revenue, 0) > 0
            AND COALESCE(s."costedUnits", 0) >= s."unitsSold"
          THEN ((COALESCE(s.revenue, 0) - COALESCE(s.cogs, 0)) / s.revenue * 100)::float8
          ELSE 0
        END AS "marginPct"
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN sales s ON s."productId" = p.id
      ${productWhere}
      ORDER BY ${Prisma.raw(orderExpr)} NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  private async productCount(where: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM (
        SELECT p.id
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        ${where}
        GROUP BY p.id
      ) t
    `);
    return toNumber(rows[0]?.total ?? 0);
  }

  private async statusDistribution(
    where: Prisma.Sql,
    column: 'status' | 'paymentStatus',
  ): Promise<StatusRow[]> {
    const col = column === 'status' ? Prisma.sql`o.status` : Prisma.sql`o."paymentStatus"`;
    const rows = await this.prisma.$queryRaw<StatusRow[]>(Prisma.sql`
      SELECT
        ${col}::text AS status,
        COUNT(*)::int AS count,
        COALESCE(SUM(o."grandTotal"), 0)::float8 AS value
      FROM "Order" o
      ${where}
      GROUP BY 1
      ORDER BY 2 DESC
    `);
    return rows.map((row) => ({
      status: row.status,
      count: toNumber(row.count),
      value: round2(row.value),
    }));
  }

  private async orderCount(where: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM "Order" o ${where}
    `);
    return toNumber(rows[0]?.total ?? 0);
  }

  private async recentOrders(
    where: Prisma.Sql,
    limit: number,
    offset: number,
  ): Promise<RecentOrderRow[]> {
    return this.prisma.$queryRaw<RecentOrderRow[]>(Prisma.sql`
      SELECT
        o.id AS id,
        o."orderNumber" AS "orderNumber",
        o.status::text AS status,
        o."paymentStatus"::text AS "paymentStatus",
        o."grandTotal"::float8 AS "grandTotal",
        COALESCE(SUM(oi.quantity), 0)::int AS "itemsCount",
        o."createdAt" AS "createdAt"
      FROM "Order" o
      LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
      ${where}
      GROUP BY o.id
      ORDER BY o."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  private async valuationTotals(categoryId?: string): Promise<ValuationTotalsRow> {
    const where = this.inventoryFilter(categoryId);
    const rows = await this.prisma.$queryRaw<ValuationTotalsRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "variantCount",
        COUNT(DISTINCT p.id)::int AS "productCount",
        COALESCE(SUM(inv."currentStock"), 0)::int AS "totalUnits",
        COALESCE(SUM(inv."currentStock" * inv."costPrice"), 0)::float8 AS "costValue",
        COALESCE(
          SUM(inv."currentStock" * COALESCE(p."salePrice", p."basePrice")),
          0
        )::float8 AS "retailValue",
        COALESCE(
          SUM(CASE WHEN inv."currentStock" <= inv."minThreshold" THEN 1 ELSE 0 END),
          0
        )::int AS "lowStockCount",
        COALESCE(
          SUM(CASE WHEN inv."currentStock" <= 0 THEN 1 ELSE 0 END),
          0
        )::int AS "outOfStockCount",
        COALESCE(SUM(CASE WHEN inv."currentStock" > p."maxStock" THEN 1 ELSE 0 END), 0)::int AS "overstockCount"
      FROM "Inventory" inv
      JOIN "ProductVariant" pv ON pv.id = inv."variantId"
      JOIN "Product" p ON p.id = pv."productId"
      ${where}
    `);
    return (
      rows[0] ?? {
        variantCount: 0,
        productCount: 0,
        totalUnits: 0,
        costValue: 0,
        retailValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        overstockCount: 0,
      }
    );
  }

  private async valuationByCategory(categoryId?: string): Promise<ValuationCategoryRow[]> {
    const where = this.inventoryFilter(categoryId);
    return this.prisma.$queryRaw<ValuationCategoryRow[]>(Prisma.sql`
      SELECT
        c.id AS "categoryId",
        c."nameAr" AS "nameAr",
        COUNT(*)::int AS "variantCount",
        COALESCE(SUM(inv."currentStock"), 0)::int AS "totalUnits",
        COALESCE(SUM(inv."currentStock" * inv."costPrice"), 0)::float8 AS "costValue",
        COALESCE(
          SUM(inv."currentStock" * COALESCE(p."salePrice", p."basePrice")),
          0
        )::float8 AS "retailValue"
      FROM "Inventory" inv
      JOIN "ProductVariant" pv ON pv.id = inv."variantId"
      JOIN "Product" p ON p.id = pv."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      ${where}
      GROUP BY c.id, c."nameAr"
      ORDER BY "costValue" DESC NULLS LAST
    `);
  }

  private async valuationItems(
    where: Prisma.Sql,
    orderExpr: string,
    limit: number,
    offset: number,
  ): Promise<ValuationItemRow[]> {
    return this.prisma.$queryRaw<ValuationItemRow[]>(Prisma.sql`
      SELECT
        inv.id AS "inventoryId",
        pv.id AS "variantId",
        pv.sku AS "variantSku",
        pv."colorNameAr" AS color,
        p.id AS "productId",
        p.sku AS "productSku",
        p."nameAr" AS "nameAr",
        p."nameEn" AS "nameEn",
        c."nameAr" AS "categoryNameAr",
        inv."currentStock" AS "currentStock",
        inv."minThreshold" AS "minThreshold",
        p."maxStock" AS "maxStock",
        inv."costPrice"::float8 AS "costPrice",
        (inv."currentStock" * inv."costPrice")::float8 AS "costValue",
        (
          inv."currentStock" * COALESCE(p."salePrice", p."basePrice")
        )::float8 AS "retailValue"
      FROM "Inventory" inv
      JOIN "ProductVariant" pv ON pv.id = inv."variantId"
      JOIN "Product" p ON p.id = pv."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      ${where}
      ORDER BY ${Prisma.raw(orderExpr)} DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  private async valuationItemCount(where: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM "Inventory" inv
      JOIN "ProductVariant" pv ON pv.id = inv."variantId"
      JOIN "Product" p ON p.id = pv."productId"
      ${where}
    `);
    return toNumber(rows[0]?.total ?? 0);
  }

  private async lowStockItems(categoryId: string | undefined, limit: number): Promise<ValuationItemRow[]> {
    const clauses: Prisma.Sql[] = [Prisma.sql`inv."currentStock" <= inv."minThreshold"`];
    if (categoryId) clauses.push(Prisma.sql`p."categoryId" = ${categoryId}`);

    return this.prisma.$queryRaw<ValuationItemRow[]>(Prisma.sql`
      SELECT
        inv.id AS "inventoryId",
        pv.id AS "variantId",
        pv.sku AS "variantSku",
        pv."colorNameAr" AS color,
        p.id AS "productId",
        p.sku AS "productSku",
        p."nameAr" AS "nameAr",
        p."nameEn" AS "nameEn",
        c."nameAr" AS "categoryNameAr",
        inv."currentStock" AS "currentStock",
        inv."minThreshold" AS "minThreshold",
        inv."costPrice"::float8 AS "costPrice",
        (inv."currentStock" * inv."costPrice")::float8 AS "costValue",
        (
          inv."currentStock" * COALESCE(p."salePrice", p."basePrice")
        )::float8 AS "retailValue"
      FROM "Inventory" inv
      JOIN "ProductVariant" pv ON pv.id = inv."variantId"
      JOIN "Product" p ON p.id = pv."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE ${Prisma.join(clauses, ' AND ')}
      ORDER BY (inv."currentStock" - inv."minThreshold") ASC, inv."currentStock" ASC
      LIMIT ${limit}
    `);
  }
}

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

function emptySummary(): SalesSummaryRow {
  return {
    orderCount: 0,
    subtotal: 0,
    shipping: 0,
    discountTotal: 0,
    giftCardDiscount: 0,
    revenue: 0,
  };
}

function totalOrdersByStatus(rows: StatusRow[], statuses: string[]): number {
  return rows
    .filter((row) => statuses.includes(row.status))
    .reduce((sum, row) => sum + toNumber(row.count), 0);
}

/** Re-exported for the unit spec / future consumers. */
export type { InventoryValuationInputs };
