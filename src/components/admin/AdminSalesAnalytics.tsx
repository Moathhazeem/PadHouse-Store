/**
 * AdminSalesAnalytics.tsx — Sales Analytics section (Parts 3 + 4).
 *
 * Every figure is aggregated server-side by the Analytics module over the live
 * `Order` / `OrderItem` / `Inventory` tables — nothing here is mocked:
 *  - `/analytics/sales`            → KPIs, trend, category & product breakdown
 *  - `/analytics/best-selling-products?sortBy=revenue` → revenue-ranked products
 *  - `/analytics/inventory-valuation` → live stock snapshot (range-independent)
 *  - `/categories` / `/products`   → filter options and product thumbnails
 *
 * Business rules (enforced in SQL by the backend, mirrored here):
 *  - cancelled orders never contribute to any figure;
 *  - each order is counted exactly once;
 *  - revenue is the money actually charged (`Order.grandTotal`);
 *  - gross profit = line revenue − COGS (weighted-average cost).
 *
 * Period-over-period comparison is not exposed by the API, so growth is derived
 * by requesting the *previous equivalent window* from the same endpoints and
 * diffing it against the current one. A zero previous period never yields a
 * percentage (no divide-by-zero) — it is surfaced as «لا توجد بيانات سابقة».
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  Filter,
  ImageOff,
  Info,
  Minus,
  Package,
  PieChart,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Trophy,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchAnalyticsBestSellingProductsApi,
  adminFetchAnalyticsInventoryValuationApi,
  adminFetchAnalyticsSalesApi,
  adminFetchCategoriesApi,
  adminFetchProductsApi,
  type AdminAnalyticsBestSellingResult,
  type AdminAnalyticsInventoryTotals,
  type AdminAnalyticsSalesResult,
  type AdminAnalyticsSalesSummary,
  type AdminAnalyticsTrendPoint,
  type AdminCategoryOption,
  type AdminInventoryValuationResult,
  type AnalyticsGroupBy,
} from '../../services/adminApi';
import type { Product } from '../../types';
import { formatMoney } from './purchaseOrderUtils';
import {
  RANGE_PRESETS,
  formatCount,
  formatPct,
  formatRangeLabel,
  niceCeil,
  parseISODate,
  previousRange,
  rangeForPreset,
  toISODate,
  type RangePreset,
} from './analyticsRangeUtils';

export interface AdminSalesAnalyticsProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

/** How many products the revenue ranking shows. */
const PRODUCT_LIMIT = 10;
/** How many category rows the backend returns for the sales call. */
const CATEGORY_LIMIT = 20;

/* ------------------------------------------------------------------ */
/* Trend grouping selector                                             */
/* ------------------------------------------------------------------ */

/** Grouping selector: `auto` lets the window length decide. */
type GroupByMode = 'auto' | AnalyticsGroupBy;

const GROUP_BY_OPTIONS: { key: GroupByMode; label: string }[] = [
  { key: 'auto', label: 'تلقائي' },
  { key: 'day', label: 'يومي' },
  { key: 'week', label: 'أسبوعي' },
  { key: 'month', label: 'شهري' },
];

const GROUP_BY_LABEL: Record<AnalyticsGroupBy, string> = {
  day: 'يومي',
  week: 'أسبوعي',
  month: 'شهري',
};

/** Trend granularity that keeps the chart readable for the window length. */
function groupByForWindow(startISO: string, endISO: string): AnalyticsGroupBy {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

const formatTrendLabel = (key: string, groupBy: AnalyticsGroupBy): string => {
  if (groupBy === 'month') {
    const [y, m] = key.split('-').map(Number);
    if (!y || !m) return key;
    return new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });
  }
  const d = parseISODate(key.slice(0, 10));
  if (Number.isNaN(d.getTime())) return key;
  const label = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  return groupBy === 'week' ? `أسبوع ${label}` : label;
};

/* ------------------------------------------------------------------ */
/* Growth math                                                         */
/* ------------------------------------------------------------------ */

interface MetricDelta {
  /** Percent change vs the previous window; `null` when no rate is meaningful. */
  pct: number | null;
  dir: 'up' | 'down' | 'flat' | 'none';
  /** Previous period had no sales, so a rate cannot be computed. */
  noBaseline: boolean;
}

/**
 * Growth Rate = ((current − previous) / previous) × 100.
 * A zero (or non-finite) previous period never produces a percentage — the
 * caller renders «لا توجد بيانات سابقة» instead of `Infinity`/`NaN`.
 */
function growthRate(current: number, previous: number): MetricDelta {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { pct: null, dir: 'none', noBaseline: false };
  }
  if (previous === 0) {
    if (current === 0) return { pct: 0, dir: 'flat', noBaseline: false };
    return { pct: null, dir: 'up', noBaseline: true };
  }
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0.05) return { pct, dir: 'up', noBaseline: false };
  if (pct < -0.05) return { pct, dir: 'down', noBaseline: false };
  return { pct, dir: 'flat', noBaseline: false };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const AdminSalesAnalytics: React.FC<AdminSalesAnalyticsProps> = ({ onToast }) => {
  // Keep the latest toast callback in a ref: the parent recreates it on every
  // render, and an unstable dep on `load` would re-trigger the fetch effect.
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const [current, setCurrent] = useState<AdminAnalyticsSalesResult | null>(null);
  const [previous, setPrevious] = useState<AdminAnalyticsSalesSummary | null>(null);
  const [ranking, setRanking] = useState<AdminAnalyticsBestSellingResult | null>(null);
  const [inventory, setInventory] = useState<AdminInventoryValuationResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [preset, setPreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('auto');
  const [categoryId, setCategoryId] = useState<string>('');

  // Filter options + product thumbnails are loaded once — they change far less
  // often than the analytics and never depend on the selected range.
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  const { startDate, endDate } = useMemo(
    () => rangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const prevWindow = useMemo(() => previousRange(startDate, endDate), [startDate, endDate]);
  const autoGroupBy = useMemo(() => groupByForWindow(startDate, endDate), [startDate, endDate]);
  const groupBy: AnalyticsGroupBy = groupByMode === 'auto' ? autoGroupBy : groupByMode;

  /* Options (categories + product images) — best-effort, loaded once. */
  useEffect(() => {
    let active = true;
    Promise.all([
      adminFetchCategoriesApi().catch(() => [] as AdminCategoryOption[]),
      adminFetchProductsApi().catch(() => [] as Product[]),
    ]).then(([cats, products]) => {
      if (!active) return;
      setCategories(cats);
      const map: Record<string, string> = {};
      for (const p of products) {
        const image = p.image || p.images?.[0];
        if (p.id && image) map[p.id] = image;
      }
      setProductImages(map);
    });
    return () => {
      active = false;
    };
  }, []);

  /* Inventory valuation is a live snapshot — loaded once and on manual refresh,
     never re-fetched when the sales date range changes. */
  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const data = await adminFetchAnalyticsInventoryValuationApi();
      setInventory(data);
      setInventoryError(null);
    } catch (err: any) {
      setInventory(null);
      setInventoryError(err?.message || 'تعذر جلب قيمة المخزون الحالية');
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const scoped = categoryId || undefined;
    try {
      const [cur, prev, ranked] = await Promise.all([
        adminFetchAnalyticsSalesApi({
          startDate,
          endDate,
          categoryId: scoped,
          groupBy,
          limit: CATEGORY_LIMIT,
        }),
        adminFetchAnalyticsSalesApi({
          startDate: prevWindow.startDate,
          endDate: prevWindow.endDate,
          categoryId: scoped,
          groupBy,
          limit: 1,
        }),
        adminFetchAnalyticsBestSellingProductsApi({
          startDate,
          endDate,
          categoryId: scoped,
          sortBy: 'revenue',
          limit: PRODUCT_LIMIT,
          page: 1,
        }),
      ]);
      setCurrent(cur);
      setPrevious(prev.summary);
      setRanking(ranked);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب تحليلات المبيعات من الخادم';
      setCurrent(null);
      setPrevious(null);
      setRanking(null);
      setError(message);
      onToastRef.current?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy, categoryId, prevWindow.startDate, prevWindow.endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const selectPreset = (next: RangePreset) => {
    setPreset(next);
    if (next !== 'custom') {
      setCustomFrom('');
      setCustomTo('');
    }
  };

  const refreshAll = () => {
    void load();
    void loadInventory();
  };

  const currency = current?.currency?.code ?? 'ILS';
  const summary = current?.summary;
  const trend = current?.trend ?? [];
  const byCategory = current?.byCategory ?? [];
  const products = ranking?.products ?? [];
  const hasData = !!summary && summary.orderCount > 0;
  const prevRangeLabel = formatRangeLabel(prevWindow.startDate, prevWindow.endDate);

  /* Growth card models — the growth rate drives both the badges and the panel. */
  const growth = useMemo(() => {
    const g = (cur?: number, prev?: number) => growthRate(cur ?? 0, prev ?? 0);
    return {
      revenue: g(summary?.revenue, previous?.revenue),
      orders: g(summary?.orderCount, previous?.orderCount),
      units: g(summary?.unitsSold, previous?.unitsSold),
      aov: g(summary?.averageOrderValue, previous?.averageOrderValue),
      grossProfit: g(summary?.grossProfit, previous?.grossProfit),
    };
  }, [summary, previous]);

  const cards: KpiCardModel[] = useMemo(
    () => [
      {
        key: 'sales',
        icon: <Banknote className="h-4 w-4" />,
        tone: 'brand',
        label: 'إجمالي المبيعات',
        tooltip:
          'مجموع المبالغ المحصّلة فعلياً على الطلبات السارية خلال الفترة (Order.grandTotal). تُستبعد الطلبات الملغاة تماماً، ويُحتسب كل طلب مرة واحدة.',
        value: formatMoney(summary?.revenue ?? 0, currency),
        delta: growth.revenue,
      },
      {
        key: 'orders',
        icon: <Receipt className="h-4 w-4" />,
        tone: 'sky',
        label: 'عدد الطلبات',
        tooltip:
          'عدد الطلبات السارية خلال الفترة، ويُحتسب كل طلب مرة واحدة فقط. الطلبات الملغاة غير مشمولة في هذا العدّ.',
        value: formatCount(summary?.orderCount ?? 0),
        delta: growth.orders,
      },
      {
        key: 'gross-profit',
        icon: <TrendingUp className="h-4 w-4" />,
        tone: 'emerald',
        label: 'إجمالي الربح',
        tooltip:
          'ربح المنتجات = إيراد بنود الطلبات − تكلفة البضاعة المبيعة (COGS) بالمتوسط المرجّح. الطلبات الملغاة مستبعدة.',
        value: formatMoney(summary?.grossProfit ?? 0, currency),
        delta: growth.grossProfit,
        sub: summary ? `هامش ${summary.grossMarginPct.toFixed(1)}%` : undefined,
      },
      {
        key: 'inventory-value',
        icon: <Warehouse className="h-4 w-4" />,
        tone: 'indigo',
        label: 'قيمة المخزون',
        tooltip:
          'لقطة لحظية لقيمة المخزون الحالي (الكمية × متوسط التكلفة). لا تتأثر بفلتر التاريخ لأنها تعبّر عن الحالة الآن.',
        value: inventory ? formatMoney(inventory.totals.costValue, currency) : '—',
        snapshot: true,
        loading: inventoryLoading,
        error: inventoryError ? 'تعذر تحميل قيمة المخزون' : undefined,
        onRetry: loadInventory,
        sub: inventory ? `${formatCount(inventory.totals.totalUnits)} وحدة` : undefined,
      },
      {
        key: 'aov',
        icon: <ShoppingBag className="h-4 w-4" />,
        tone: 'teal',
        label: 'متوسط قيمة الطلب',
        tooltip:
          'متوسط قيمة الطلب = إجمالي المبيعات ÷ عدد الطلبات السارية، بنفس مجموعة الطلبات المستخدمة في الإيراد.',
        value: formatMoney(summary?.averageOrderValue ?? 0, currency),
        delta: growth.aov,
      },
      {
        key: 'units',
        icon: <Package className="h-4 w-4" />,
        tone: 'amber',
        label: 'الوحدات المبيعة',
        tooltip:
          'إجمالي عدد الوحدات المبيعة على بنود الطلبات السارية خلال الفترة، بعد استبعاد الطلبات الملغاة.',
        value: formatCount(summary?.unitsSold ?? 0),
        delta: growth.units,
      },
    ],
    [summary, growth, currency, inventory, inventoryLoading, inventoryError, loadInventory],
  );

  const activeCategoryName =
    categories.find((c) => c.id === categoryId)?.nameAr ?? 'كل الأقسام';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="admin-sales-analytics-title"
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-sales-analytics-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4 text-ph-brand" />
            تحليلات المبيعات
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            لكل الأرقام محسوبة مباشرة من سجلات الطلبات والمخزون الفعلية على الخادم — الطلبات الملغاة
            مستبعدة، وكل طلب يُحتسب مرة واحدة.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          className="self-start lg:self-auto flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-ph-brand' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-black text-ph-ink flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-ph-brand" />
            الفلاتر
          </h3>
          <span className="text-[11px] text-ph-muted">
            {formatRangeLabel(startDate, endDate)} · {GROUP_BY_LABEL[groupBy]} · {activeCategoryName}
          </span>
        </div>

        {/* Date presets */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-ph-muted">النطاق الزمني</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Calendar className="h-4 w-4 text-ph-muted" />
            {RANGE_PRESETS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => selectPreset(opt.key)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  preset === opt.key
                    ? 'bg-ph-brand text-white shadow-xs'
                    : 'bg-ph-background text-ph-muted hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom range */}
        {preset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-ph-muted">من تاريخ</span>
              <input
                type="date"
                value={customFrom}
                max={customTo || toISODate(new Date())}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-ph-muted">إلى تاريخ</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
              />
            </label>
          </div>
        )}

        {/* Grouping + category */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-ph-muted">التجميع الزمني</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {GROUP_BY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setGroupByMode(opt.key)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    groupByMode === opt.key
                      ? 'bg-ph-ink text-white shadow-xs'
                      : 'bg-ph-background text-ph-muted hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                  {opt.key === 'auto' ? ` (${GROUP_BY_LABEL[autoGroupBy]})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 sm:mr-auto">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-ph-muted">القسم</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-9 min-w-[180px] rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
              >
                <option value="">كل الأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black">تعذر تحميل تحليلات المبيعات</p>
              <p className="text-[11px] text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="shrink-0 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Loading skeletons (first load) */}
      {loading && !current ? (
        <KpiSkeletonGrid />
      ) : !current ? null : (
        <>
          {/* Empty state */}
          {!hasData && (
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-ph-border bg-white px-4 py-3.5">
              <BarChart3 className="h-4 w-4 text-ph-border mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-ph-ink">لا توجد مبيعات في هذه الفترة</p>
                <p className="text-[11px] text-ph-muted mt-0.5">
                  لم تُسجَّل أي طلبات سارية ضمن النطاق المحدد
                  {categoryId ? ' لهذا القسم' : ''}. جرّب توسيع النطاق الزمني — تبقى «قيمة المخزون»
                  ظاهرة كونها لقطة حالية.
                </p>
              </div>
            </div>
          )}

          {/* KPI cards */}
          <div
            aria-busy={loading}
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {cards.map((card) => (
              <KpiCard key={card.key} card={card} compareLabel={prevRangeLabel} />
            ))}
          </div>

          {/* 1 · Sales over time */}
          <section
            aria-labelledby="sales-over-time-title"
            className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="sales-over-time-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4 text-ph-brand" />
                المبيعات عبر الزمن
              </h3>
              <span className="text-[11px] text-ph-muted whitespace-nowrap">
                {trend.length} نقطة · {GROUP_BY_LABEL[groupBy]}
              </span>
            </div>

            {/* Compact period summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-ph-border border-b border-ph-border">
              <TimeStat
                label="إجمالي المبيعات"
                value={formatMoney(summary?.revenue ?? 0, currency)}
                delta={growth.revenue}
              />
              <TimeStat
                label="عدد الطلبات"
                value={formatCount(summary?.orderCount ?? 0)}
                delta={growth.orders}
              />
              <TimeStat
                label="مقارنة بالفترة السابقة"
                value={
                  previous && previous.revenue > 0
                    ? formatMoney(previous.revenue, currency)
                    : 'لا توجد بيانات سابقة'
                }
                delta={growth.revenue}
                muted={!previous || previous.revenue === 0}
              />
            </div>

            {trend.length === 0 ? (
              <p className="px-5 py-10 text-xs text-ph-muted text-center">
                لا توجد بيانات اتجاه ضمن النطاق المحدد.
              </p>
            ) : (
              <div className="p-4 sm:p-5">
                <SalesLineChart
                  points={trend}
                  groupBy={groupBy}
                  currency={currency}
                  previousRevenue={previous?.revenue}
                />
              </div>
            )}
          </section>

          {/* 4 · Sales growth */}
          <section
            aria-labelledby="sales-growth-title"
            className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
              <h3
                id="sales-growth-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4 text-ph-brand" />
                نمو المبيعات
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-ph-border bg-ph-background/40 px-4 py-3">
                <p className="text-[11px] text-ph-muted leading-relaxed">
                  معادلة النمو:{' '}
                  <span className="font-mono font-bold text-ph-ink" dir="ltr">
                    ((مبيعات الفترة الحالية − مبيعات الفترة السابقة) ÷ مبيعات الفترة السابقة) × 100
                  </span>
                </p>
                <p className="text-[10px] text-ph-muted mt-1">
                  عند عدم وجود مبيعات في الفترة السابقة لا تُحتسب نسبة (تجنّباً للقسمة على صفر)،
                  وتُعرض الحالة «لا توجد بيانات سابقة».
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GrowthCard
                  title="نمو المبيعات"
                  current={summary?.revenue ?? 0}
                  prev={previous?.revenue ?? 0}
                  delta={growth.revenue}
                  currency={currency}
                  primary
                />
                <GrowthCard
                  title="نمو الطلبات"
                  current={summary?.orderCount ?? 0}
                  prev={previous?.orderCount ?? 0}
                  delta={growth.orders}
                />
                <GrowthCard
                  title="نمو الوحدات المبيعة"
                  current={summary?.unitsSold ?? 0}
                  prev={previous?.unitsSold ?? 0}
                  delta={growth.units}
                />
              </div>
            </div>
          </section>

          {/* 2 · Sales by category */}
          <section
            aria-labelledby="sales-by-category-title"
            className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="sales-by-category-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <PieChart className="h-4 w-4 text-ph-brand" />
                المبيعات حسب القسم
              </h3>
              <span className="text-[11px] text-ph-muted whitespace-nowrap">{activeCategoryName}</span>
            </div>

            {byCategory.length === 0 ? (
              <p className="px-5 py-10 text-xs text-ph-muted text-center">
                لا توجد مبيعات مصنّفة ضمن النطاق المحدد.
              </p>
            ) : (
              <CategoryBreakdown rows={byCategory} currency={currency} />
            )}
          </section>

          {/* 3 · Sales by product */}
          <section
            aria-labelledby="sales-by-product-title"
            className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="sales-by-product-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <Trophy className="h-4 w-4 text-ph-brand" />
                المبيعات حسب المنتج
              </h3>
              <span className="text-[11px] text-ph-muted whitespace-nowrap">
                مرتّبة حسب الإيراد · أعلى {PRODUCT_LIMIT} منتجاً
              </span>
            </div>
            <ProductRanking
              products={products}
              images={productImages}
              currency={currency}
              totalRevenue={ranking?.totals.revenue ?? summary?.revenue ?? 0}
            />
          </section>

          <p className="text-[10px] text-ph-muted text-center">
            البيانات محسوبة مباشرة من سجلات الطلبات والمخزون في قاعدة البيانات — آخر تحديث:{' '}
            {new Date(current.generatedAt).toLocaleString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </>
      )}
    </motion.section>
  );
};

/* ------------------------------------------------------------------ */
/* 1 · Sales over time — interactive line chart (inline SVG)            */
/* ------------------------------------------------------------------ */

interface SalesLineChartProps {
  points: AdminAnalyticsTrendPoint[];
  groupBy: AnalyticsGroupBy;
  currency: string;
  previousRevenue?: number;
}

const SalesLineChart: React.FC<SalesLineChartProps> = ({
  points,
  groupBy,
  currency,
  previousRevenue,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 960;
  const H = 320;
  // Y-axis on the right and time flowing right→left keeps the chart RTL-native.
  const padL = 16;
  const padR = 76;
  const padT = 20;
  const padB = 38;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const maxValue = useMemo(() => Math.max(0, ...points.map((p) => p.revenue)), [points]);
  const axisMax = useMemo(() => niceCeil(maxValue), [maxValue]);

  const xAt = useCallback(
    (i: number) => padL + innerW - (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1)),
    [n, padL, innerW],
  );
  const yAt = useCallback(
    (value: number) => padT + innerH - (axisMax <= 0 ? 0 : (value / axisMax) * innerH),
    [padT, innerH, axisMax],
  );

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p.revenue).toFixed(2)}`)
        .join(' '),
    [points, xAt, yAt],
  );
  const areaPath = useMemo(
    () =>
      n === 0
        ? ''
        : `${linePath} L${xAt(n - 1).toFixed(2)},${(padT + innerH).toFixed(2)} L${xAt(0).toFixed(
            2,
          )},${(padT + innerH).toFixed(2)} Z`,
    [linePath, n, xAt, padT, innerH],
  );

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.max(1, Math.ceil(n / 8));

  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const vx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i += 1) {
      const dist = Math.abs(xAt(i) - vx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHover(best);
  };

  const active = hover != null ? points[hover] : null;
  const activeX = hover != null ? xAt(hover) : 0;
  const activeY = active ? yAt(active.revenue) : 0;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-pan-y select-none"
        role="img"
        aria-label="مخطط خطي لاتجاه المبيعات عبر الزمن"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels (right side) */}
        {gridLevels.map((level) => {
          const value = axisMax * level;
          const y = yAt(value);
          return (
            <g key={level}>
              <line
                x1={padL}
                y1={y}
                x2={padL + innerW}
                y2={y}
                stroke="rgb(226 232 240)"
                strokeWidth={1}
                strokeDasharray={level === 0 ? undefined : '4 6'}
              />
              <text
                x={padL + innerW + 8}
                y={y + 3.5}
                textAnchor="start"
                className="fill-slate-400"
                style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
              >
                {formatMoney(value, currency)}
              </text>
            </g>
          );
        })}

        {/* Area + line */}
        {n > 0 && <path d={areaPath} fill="url(#salesArea)" />}
        {n > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="rgb(37 99 235)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Hover guide */}
        {active && (
          <>
            <line
              x1={activeX}
              y1={padT}
              x2={activeX}
              y2={padT + innerH}
              stroke="rgb(148 163 184)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle cx={activeX} cy={activeY} r={5.5} fill="rgb(37 99 235)" stroke="#fff" strokeWidth={2} />
          </>
        )}

        {/* Points (visible dots; enlarged on hover) */}
        {points.map((p, i) => (
          <circle
            key={p.key}
            cx={xAt(i)}
            cy={yAt(p.revenue)}
            r={hover === i ? 5.5 : 2.5}
            fill={hover === i ? 'rgb(37 99 235)' : '#fff'}
            stroke="rgb(37 99 235)"
            strokeWidth={1.5}
            className="transition-all"
          />
        ))}

        {/* X labels */}
        {points.map((p, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={`x-${p.key}`}
              x={xAt(i)}
              y={H - 12}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: 10.5, fontWeight: 700 }}
            >
              {formatTrendLabel(p.key, groupBy)}
            </text>
          ) : null,
        )}
      </svg>

      {/* Interactive tooltip */}
      {active && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[120%] rounded-xl border border-ph-border bg-ph-ink px-3 py-2 text-white shadow-lg"
          style={{ left: `${(activeX / W) * 100}%`, top: `${(activeY / H) * 100}%` }}
          dir="rtl"
        >
          <p className="text-[10px] font-bold text-white/70 whitespace-nowrap">
            {formatTrendLabel(active.key, groupBy)}
          </p>
          <p className="text-xs font-black font-mono whitespace-nowrap">
            {formatMoney(active.revenue, currency)}
          </p>
          <p className="text-[10px] text-white/70 whitespace-nowrap">
            {formatCount(active.orderCount)} طلب
          </p>
        </div>
      )}

      {/* Legend / footnote */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ph-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-blue-600" />
          إيراد الطلبات السارية (₪)
        </span>
        <span>
          الذروة: {formatMoney(maxValue, currency)}
          {previousRevenue != null && previousRevenue > 0
            ? ` · الفترة السابقة: ${formatMoney(previousRevenue, currency)}`
            : ''}
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 2 · Sales by category                                                */
/* ------------------------------------------------------------------ */

const CategoryBreakdown: React.FC<{
  rows: AdminAnalyticsSalesResult['byCategory'];
  currency: string;
}> = ({ rows, currency }) => {
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <div className="p-4 sm:p-5 space-y-3">
      <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-ph-muted">
        <span className="col-span-4">القسم</span>
        <span className="col-span-3 text-center">الإيراد</span>
        <span className="col-span-2 text-center">الوحدات</span>
        <span className="col-span-1 text-center">الحصة</span>
        <span className="col-span-2 text-center">النسبة من الإجمالي</span>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => {
          const widthPct = (row.revenue / maxRevenue) * 100;
          const sharePct = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
          return (
            <li
              key={row.categoryId}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-2xl border border-ph-border bg-white px-3 py-2.5 hover:bg-ph-background/40 transition-colors"
            >
              <div className="col-span-4 min-w-0">
                <p className="text-xs font-black text-ph-ink truncate">{row.nameAr}</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-ph-background overflow-hidden">
                  <div
                    className="h-full rounded-full bg-ph-brand"
                    style={{ width: `${Math.max(widthPct, 2)}%` }}
                  />
                </div>
              </div>
              <span className="col-span-3 text-xs font-mono font-bold text-ph-ink text-center">
                {formatMoney(row.revenue, currency)}
              </span>
              <span className="col-span-2 text-xs font-mono text-ph-muted text-center">
                {formatCount(row.unitsSold)}
              </span>
              <span className="col-span-1 text-[11px] font-mono text-ph-muted text-center">
                {row.share.toFixed(1)}%
              </span>
              <span className="col-span-2 text-[11px] font-bold text-ph-ink text-center">
                {sharePct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ph-background/50 px-3 py-2 text-[11px]">
        <span className="font-bold text-ph-muted">إجمالي الأقسام المعروضة</span>
        <span className="font-mono font-black text-ph-ink">{formatMoney(totalRevenue, currency)}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 3 · Sales by product                                                 */
/* ------------------------------------------------------------------ */

const ProductRanking: React.FC<{
  products: AdminAnalyticsBestSellingResult['products'];
  images: Record<string, string>;
  currency: string;
  totalRevenue: number;
}> = ({ products, images, currency, totalRevenue }) => {
  if (products.length === 0) {
    return (
      <p className="px-5 py-10 text-xs text-ph-muted text-center">
        لا توجد مبيعات منتجات ضمن النطاق المحدد.
      </p>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-2 text-[10px] font-bold text-ph-muted">
        <span className="col-span-1 text-center">#</span>
        <span className="col-span-4">المنتج</span>
        <span className="col-span-2 text-center">SKU</span>
        <span className="col-span-1 text-center">الوحدات</span>
        <span className="col-span-2 text-center">الإيراد</span>
        <span className="col-span-2 text-center">الربح الإجمالي</span>
      </div>

      <ul className="divide-y divide-ph-border">
        {products.map((product, index) => {
          const image = images[product.productId];
          const revenueShare = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
          return (
            <li
              key={product.productId}
              className="grid grid-cols-12 gap-2 items-center py-3 hover:bg-ph-background/40 rounded-xl px-2 transition-colors"
            >
              <span className="col-span-2 md:col-span-1 text-center text-xs font-black text-ph-muted">
                {index + 1}
              </span>

              <div className="col-span-10 md:col-span-4 flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ph-border bg-ph-background">
                  {image ? (
                    <img
                      src={image}
                      alt={product.nameAr}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-4 w-4 text-ph-muted" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-ph-ink truncate">{product.nameAr}</p>
                  <p className="text-[10px] text-ph-muted truncate">
                    {product.categoryNameAr || 'غير مصنّف'}
                    {revenueShare > 0 ? ` · ${revenueShare.toFixed(1)}% من الإيراد` : ''}
                  </p>
                  <p className="md:hidden text-[10px] font-mono text-ph-muted mt-0.5">
                    {product.sku || '—'} · {formatCount(product.unitsSold)} وحدة ·{' '}
                    {formatMoney(product.revenue, currency)}
                  </p>
                </div>
              </div>

              <span className="hidden md:block md:col-span-2 text-[11px] font-mono text-ph-muted text-center truncate">
                {product.sku || '—'}
              </span>
              <span className="hidden md:block md:col-span-1 text-xs font-mono text-ph-ink text-center">
                {formatCount(product.unitsSold)}
              </span>
              <span className="hidden md:block md:col-span-2 text-xs font-mono font-bold text-ph-ink text-center">
                {formatMoney(product.revenue, currency)}
              </span>
              {product.profit == null ? (
                <span
                  className="hidden md:block md:col-span-2 text-[10px] font-bold text-center text-ph-muted"
                  title="تكلفة هذا المنتج غير مسجّلة، فلا يُحتسب ربح"
                >
                  الربح غير متوفر
                </span>
              ) : (
                <span
                  className={`hidden md:block md:col-span-2 text-xs font-mono font-bold text-center ${
                    product.profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {formatMoney(product.profit, currency)}
                  <span className="block text-[10px] font-normal text-ph-muted">
                    هامش {formatPct(product.marginPct, 1)}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ph-background/50 px-3 py-2 text-[11px]">
        <span className="font-bold text-ph-muted">
          إجمالي إيراد المعروضين ({products.length} منتج)
        </span>
        <span className="font-mono font-black text-ph-ink">{formatMoney(totalRevenue, currency)}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

const TimeStat: React.FC<{
  label: string;
  value: string;
  delta: MetricDelta;
  muted?: boolean;
}> = ({ label, value, delta, muted }) => (
  <div className="px-5 py-3.5">
    <p className="text-[10px] font-bold text-ph-muted">{label}</p>
    <div className="mt-1 flex items-center gap-2 flex-wrap">
      <span className={`text-sm font-black font-mono ${muted ? 'text-ph-muted' : 'text-ph-ink'}`}>
        {value}
      </span>
      {!muted && <DeltaBadge delta={delta} />}
    </div>
  </div>
);

const GrowthCard: React.FC<{
  title: string;
  current: number;
  prev: number;
  delta: MetricDelta;
  currency?: string;
  primary?: boolean;
}> = ({ title, current, prev, delta, currency, primary }) => {
  const fmt = currency ? (v: number) => formatMoney(v, currency) : formatCount;
  const tone =
    delta.dir === 'up'
      ? 'border-emerald-200 bg-emerald-50/50'
      : delta.dir === 'down'
        ? 'border-red-200 bg-red-50/50'
        : 'border-ph-border bg-white';

  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${tone}`}>
      <p className="text-[11px] font-bold text-ph-muted mb-2">{title}</p>
      <p
        className={`font-black font-mono ${
          primary ? 'text-2xl' : 'text-xl'
        } ${
          delta.dir === 'up'
            ? 'text-emerald-700'
            : delta.dir === 'down'
              ? 'text-red-700'
              : 'text-ph-ink'
        }`}
      >
        {delta.noBaseline ? '—' : `${
          delta.dir === 'up' ? '+' : delta.dir === 'down' ? '' : ''
        }${formatPct(delta.pct)}`}
      </p>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {delta.noBaseline ? (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            لا توجد بيانات سابقة
          </span>
        ) : (
          <DeltaBadge delta={delta} />
        )}
      </div>
      <p className="text-[10px] text-ph-muted mt-2 font-mono" dir="ltr">
        {fmt(current)} ← {fmt(prev)}
      </p>
    </div>
  );
};

type KpiTone = 'brand' | 'sky' | 'emerald' | 'indigo' | 'teal' | 'amber';

interface KpiCardModel {
  key: string;
  icon: React.ReactNode;
  tone: KpiTone;
  label: string;
  tooltip: string;
  value: string;
  sub?: string;
  delta?: MetricDelta;
  /** Marks a live snapshot (no period comparison). */
  snapshot?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

const KPI_TONES: Record<KpiTone, { box: string; icon: string; value: string }> = {
  brand: { box: 'border-ph-border bg-white', icon: 'text-ph-brand bg-ph-brand/10', value: 'text-ph-ink' },
  sky: { box: 'border-sky-200 bg-sky-50/50', icon: 'text-sky-700 bg-sky-100', value: 'text-sky-800' },
  emerald: { box: 'border-emerald-200 bg-emerald-50/50', icon: 'text-emerald-700 bg-emerald-100', value: 'text-emerald-800' },
  indigo: { box: 'border-indigo-200 bg-indigo-50/50', icon: 'text-indigo-700 bg-indigo-100', value: 'text-indigo-800' },
  teal: { box: 'border-teal-200 bg-teal-50/50', icon: 'text-teal-700 bg-teal-100', value: 'text-teal-800' },
  amber: { box: 'border-amber-200 bg-amber-50/50', icon: 'text-amber-700 bg-amber-100', value: 'text-amber-800' },
};

const KpiCard: React.FC<{ card: KpiCardModel; compareLabel: string }> = ({ card, compareLabel }) => {
  const tone = KPI_TONES[card.tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${tone.box}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ph-muted leading-snug">
          {card.label}
          <Tooltip text={card.tooltip} />
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${tone.icon}`}>
          {card.icon}
        </span>
      </div>

      {card.loading ? (
        <div className="space-y-2 py-0.5">
          <div className="ph-skeleton h-6 w-28 rounded-md" />
          <div className="ph-skeleton h-3 w-20 rounded-md" />
        </div>
      ) : card.error ? (
        <div className="space-y-1.5">
          <p className="text-xl font-black font-mono text-ph-muted">—</p>
          <button
            type="button"
            onClick={() => card.onRetry?.()}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            {card.error} — إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <p className={`text-xl font-black font-mono ${tone.value}`}>{card.value}</p>

          {card.snapshot ? (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              <Warehouse className="h-3 w-3" />
              لقطة حالية — لا تتأثر بفلتر التاريخ
            </span>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <DeltaBadge delta={card.delta} />
              <span className="text-[10px] text-ph-muted">مقارنة بـ {compareLabel}</span>
            </div>
          )}

          {card.sub && <span className="text-[10px] text-ph-muted mt-1 block">{card.sub}</span>}
        </>
      )}
    </div>
  );
};

const DeltaBadge: React.FC<{ delta?: MetricDelta }> = ({ delta }) => {
  if (!delta || delta.dir === 'none') {
    return <span className="text-[10px] font-bold text-ph-muted">—</span>;
  }

  if (delta.noBaseline) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
        <ArrowUpRight className="h-3 w-3" />
        جديد
      </span>
    );
  }

  const isUp = delta.dir === 'up';
  const isFlat = delta.dir === 'flat';
  const cls = isFlat
    ? 'text-slate-600 bg-slate-100'
    : isUp
      ? 'text-emerald-700 bg-emerald-100'
      : 'text-red-700 bg-red-100';
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md ${cls}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(delta.pct ?? 0).toFixed(1)}%
    </span>
  );
};

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="group relative inline-flex" tabIndex={0} aria-label={text}>
    <Info className="h-3.5 w-3.5 text-ph-muted cursor-help" />
    <span
      role="tooltip"
      className="pointer-events-none absolute top-full right-0 z-30 mt-2 w-60 rounded-xl border border-ph-border bg-ph-ink px-3 py-2 text-[10px] font-medium leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
    >
      {text}
    </span>
  </span>
);

function KpiSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="ph-skeleton h-3 w-24 rounded-md" />
            <div className="ph-skeleton h-7 w-7 rounded-lg" />
          </div>
          <div className="ph-skeleton h-6 w-32 rounded-md mb-2" />
          <div className="ph-skeleton h-3 w-24 rounded-md" />
        </div>
      ))}
      <span className="sr-only">جارٍ تحميل تحليلات المبيعات…</span>
    </div>
  );
}
