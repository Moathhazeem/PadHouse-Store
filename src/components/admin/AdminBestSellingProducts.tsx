/**
 * AdminBestSellingProducts.tsx — Best-Selling Products section (Part 5).
 *
 * A dedicated ranking surface backed entirely by the existing Analytics module
 * (`GET /analytics/best-selling-products`) — nothing here is mocked. The backend
 * aggregates the live `Order` / `OrderItem` / `Inventory` tables, so every figure
 * obeys the same business rules the rest of the dashboard uses:
 *
 *  - cancelled orders never contribute to a sale (they are filtered in SQL);
 *  - refunds happen only through cancellation, so refunded orders are excluded
 *    and their units are restocked rather than counted as sold;
 *  - each order line is summed once per product (no duplicate order items);
 *  - revenue is the money actually charged on the line (`OrderItem.totalPrice`);
 *  - profit uses the product's recorded cost (weighted-average `Inventory.costPrice`)
 *    and is reported as «غير متوفر» when that cost was never captured, so no
 *    profit is fabricated.
 *
 * Two ranking modes are offered (units sold / net revenue), each re-queried
 * server-side so switching modes actually re-orders the list. A Top-N selector
 * (5 / 10 / 20), a date-range filter and a category filter scope the ranking.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Calendar,
  Filter,
  Hash,
  ImageOff,
  Info,
  Package,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchAnalyticsBestSellingProductsApi,
  adminFetchCategoriesApi,
  type AdminAnalyticsBestSellingResult,
  type AdminAnalyticsRankedProductRow,
  type AdminCategoryOption,
} from '../../services/adminApi';
import { formatMoney } from './purchaseOrderUtils';
import {
  RANGE_PRESETS,
  formatCount,
  formatPct,
  formatRangeLabel,
  rangeForPreset,
  toISODate,
  type RangePreset,
} from './analyticsRangeUtils';

export interface AdminBestSellingProductsProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

/** The two ranking modes required by the section. */
type RankingMode = 'unitsSold' | 'revenue';

const RANKING_MODES: { key: RankingMode; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    key: 'unitsSold',
    label: 'حسب الكمية المبيعة',
    hint: 'ترتيب المنتجات تنازلياً حسب إجمالي عدد الوحدات المبيعة',
    icon: <Hash className="h-3.5 w-3.5" />,
  },
  {
    key: 'revenue',
    label: 'حسب الإيراد',
    hint: 'ترتيب المنتجات تنازلياً حسب صافي إيراد المبيعات',
    icon: <Banknote className="h-3.5 w-3.5" />,
  },
];

const TOP_N_OPTIONS = [5, 10, 20] as const;
type TopN = (typeof TOP_N_OPTIONS)[number];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const AdminBestSellingProducts: React.FC<AdminBestSellingProductsProps> = ({ onToast }) => {
  // Keep the latest toast callback in a ref so the fetch effect never re-runs
  // just because the parent recreated the callback.
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const [data, setData] = useState<AdminAnalyticsBestSellingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<RankingMode>('unitsSold');
  const [topN, setTopN] = useState<TopN>(10);
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');

  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);

  const { startDate, endDate } = useMemo(
    () => rangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  /* Category filter options — loaded once; they change far less often than the
     ranking itself. */
  useEffect(() => {
    let active = true;
    adminFetchCategoriesApi()
      .catch(() => [] as AdminCategoryOption[])
      .then((cats) => {
        if (active) setCategories(cats);
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchAnalyticsBestSellingProductsApi({
        startDate,
        endDate,
        categoryId: categoryId || undefined,
        sortBy: mode,
        limit: topN,
        page: 1,
      });
      setData(result);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب المنتجات الأكثر مبيعاً من الخادم';
      setData(null);
      setError(message);
      onToastRef.current?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryId, mode, topN]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectPreset = (next: RangePreset) => {
    setPreset(next);
    if (next !== 'custom') {
      setCustomFrom('');
      setCustomTo('');
    }
  };

  const currency = data?.currency?.code ?? 'ILS';
  const products = data?.products ?? [];
  const isRevenueMode = mode === 'revenue';
  const activeCategoryName = categories.find((c) => c.id === categoryId)?.nameAr ?? 'كل الأقسام';
  const hasData = products.length > 0;
  const knownCostCount = products.filter((p) => p.costKnown).length;
  const metricLabel = isRevenueMode ? 'الإيراد' : 'الوحدات';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="admin-best-selling-title"
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-best-selling-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <Trophy className="h-4 w-4 text-ph-brand" />
            المنتجات الأكثر مبيعاً
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5 max-w-3xl">
            ترتيب مباشر من سجلات الطلبات الفعلية على الخادم. الطلبات الملغاة والمسترجَعة مستبعدة،
            وكل بند طلب يُحتسب مرة واحدة. الربح محسوب من تكلفة المنتج المسجّلة فعلياً، ويظهر
            «غير متوفر» عندما لا تكون التكلفة معروفة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
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
            {formatRangeLabel(startDate, endDate)} · {activeCategoryName} · Top {topN}
          </span>
        </div>

        {/* Ranking mode + Top-N */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-ph-muted">طريقة الترتيب</span>
            <div
              role="group"
              aria-label="طريقة الترتيب"
              className="inline-flex rounded-xl border border-ph-border bg-ph-background p-1"
            >
              {RANKING_MODES.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMode(opt.key)}
                  aria-pressed={mode === opt.key}
                  title={opt.hint}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    mode === opt.key
                      ? 'bg-ph-brand text-white shadow-xs'
                      : 'text-ph-muted hover:text-ph-ink'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-ph-muted">عدد المنتجات</span>
            <div className="inline-flex rounded-xl border border-ph-border bg-ph-background p-1">
              {TOP_N_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTopN(n)}
                  aria-pressed={topN === n}
                  className={`text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-colors ${
                    topN === n ? 'bg-ph-ink text-white shadow-xs' : 'text-ph-muted hover:text-ph-ink'
                  }`}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 lg:mr-auto">
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
              <p className="text-xs font-black">تعذر تحميل قائمة الأكثر مبيعاً</p>
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

      {/* Loading skeleton (first load) */}
      {loading && !data ? (
        <RankingSkeleton rows={topN} />
      ) : !data ? null : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryStat
              icon={<Banknote className="h-4 w-4" />}
              label="إجمالي إيراد المعروضين"
              value={formatMoney(data.totals.revenue, currency)}
              tone="brand"
            />
            <SummaryStat
              icon={<Package className="h-4 w-4" />}
              label="إجمالي الوحدات المعروضة"
              value={`${formatCount(data.totals.unitsSold)} وحدة`}
              tone="amber"
            />
            <SummaryStat
              icon={<BarChart3 className="h-4 w-4" />}
              label="منتجات بتكلفة مسجّلة"
              value={`${knownCostCount} من ${products.length}`}
              tone="emerald"
            />
          </div>

          {/* Ranking */}
          <section
            aria-labelledby="best-selling-ranking-title"
            aria-busy={loading}
            className={`rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="best-selling-ranking-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <Trophy className="h-4 w-4 text-ph-brand" />
                الترتيب {isRevenueMode ? 'حسب الإيراد' : 'حسب الكمية المبيعة'}
              </h3>
              <span className="text-[11px] text-ph-muted whitespace-nowrap">
                {products.length} منتج · أعلى {topN}
              </span>
            </div>

            {!hasData ? (
              <div className="flex items-start gap-3 m-4 rounded-2xl border border-dashed border-ph-border bg-ph-background/30 px-4 py-5">
                <Package className="h-4 w-4 text-ph-border mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-ph-ink">لا توجد مبيعات ضمن النطاق المحدد</p>
                  <p className="text-[11px] text-ph-muted mt-0.5">
                    لم تُسجَّل أي مبيعات منتجات في هذه الفترة
                    {categoryId ? ' لهذا القسم' : ''}. جرّب توسيع النطاق الزمني أو اختيار قسم آخر.
                  </p>
                </div>
              </div>
            ) : (
              <RankingTable
                products={products}
                currency={currency}
                metric={mode}
                metricLabel={metricLabel}
              />
            )}

            {hasData && (
              <div className="border-t border-ph-border px-5 py-3 flex flex-wrap items-center gap-2 text-[11px] text-ph-muted bg-ph-background/30">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {knownCostCount < products.length
                    ? `يظهر «الربح غير متوفر» للمنتجات التي لم تُسجَّل تكلفتها (${products.length - knownCostCount} منتج). `
                    : ''}
                  لا يُحتسب أي ربح تقديري، والترتيب يعتمد على {metricLabel} الفعلي للمبيعات.
                </span>
              </div>
            )}
          </section>
        </>
      )}
    </motion.section>
  );
};

/* ------------------------------------------------------------------ */
/* Ranking table                                                       */
/* ------------------------------------------------------------------ */

const RankingTable: React.FC<{
  products: AdminAnalyticsRankedProductRow[];
  currency: string;
  metric: RankingMode;
  metricLabel: string;
}> = ({ products, currency, metric, metricLabel }) => (
  <div className="p-3 sm:p-4">
    {/* Desktop header */}
    <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-2 text-[10px] font-bold text-ph-muted">
      <span className="col-span-1 text-center">#</span>
      <span className="col-span-4">المنتج</span>
      <span className="col-span-2 text-center">SKU</span>
      <span className="col-span-1 text-center">الوحدات</span>
      <span className="col-span-2 text-center">الإيراد</span>
      <span className="col-span-2 text-center">الربح والهامش</span>
    </div>

    <ul className="divide-y divide-ph-border">
      {products.map((product, index) => (
        <li
          key={product.productId}
          className="grid grid-cols-12 gap-2 items-center py-3 px-2 rounded-xl hover:bg-ph-background/40 transition-colors"
        >
          {/* Rank indicator */}
          <div className="col-span-2 md:col-span-1 flex justify-center">
            <RankBadge rank={index + 1} />
          </div>

          {/* Product */}
          <div className="col-span-10 md:col-span-4 flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ph-border bg-ph-background">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
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
              </p>
              {/* Metric share bar — shows the product's weight in the active ranking */}
              <div className="mt-1 h-1 w-28 max-w-full overflow-hidden rounded-full bg-ph-background">
                <span
                  className="block h-full rounded-full bg-ph-brand/70"
                  style={{ width: `${Math.min(100, Math.max(0, product.share))}%` }}
                />
              </div>
              {/* Mobile detail line */}
              <p className="md:hidden text-[10px] font-mono text-ph-muted mt-1">
                {product.sku || '—'} · {formatCount(product.unitsSold)} وحدة ·{' '}
                {formatMoney(product.revenue, currency)}
              </p>
            </div>
          </div>

          {/* SKU */}
          <span className="hidden md:block md:col-span-2 text-[11px] font-mono text-ph-muted text-center truncate">
            {product.sku || '—'}
          </span>

          {/* Units */}
          <span
            className={`hidden md:block md:col-span-1 text-center text-xs font-mono ${
              metric === 'unitsSold' ? 'font-black text-ph-ink' : 'text-ph-muted'
            }`}
          >
            {formatCount(product.unitsSold)}
          </span>

          {/* Revenue */}
          <span
            className={`hidden md:block md:col-span-2 text-center text-xs font-mono ${
              metric === 'revenue' ? 'font-black text-ph-ink' : 'text-ph-muted'
            }`}
          >
            {formatMoney(product.revenue, currency)}
          </span>

          {/* Profit + margin */}
          <div className="hidden md:block md:col-span-2 text-center">
            {product.profit == null ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-ph-muted"
                title="تكلفة هذا المنتج غير مسجّلة، فلا يُحتسب ربح"
              >
                <AlertTriangle className="h-3 w-3" />
                غير متوفر
              </span>
            ) : (
              <>
                <span
                  className={`block text-xs font-mono font-bold ${
                    product.profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {formatMoney(product.profit, currency)}
                </span>
                <MarginPill marginPct={product.marginPct} />
              </>
            )}
          </div>

          {/* Mobile stat grid */}
          <div className="col-span-12 md:hidden grid grid-cols-2 gap-2 mt-2">
            <MobileStat
              label="الوحدات المبيعة"
              value={`${formatCount(product.unitsSold)} وحدة`}
              highlight={metric === 'unitsSold'}
            />
            <MobileStat
              label="الإيراد"
              value={formatMoney(product.revenue, currency)}
              highlight={metric === 'revenue'}
            />
            <MobileStat
              label="الربح الإجمالي"
              value={product.profit == null ? 'غير متوفر' : formatMoney(product.profit, currency)}
            />
            <MobileStat
              label="هامش الربح"
              value={product.profit == null ? '—' : formatPct(product.marginPct, 1)}
            />
          </div>
        </li>
      ))}
    </ul>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ph-background/50 px-3 py-2 text-[11px]">
      <span className="font-bold text-ph-muted">
        مرتب حسب {metricLabel} · {products.length} منتج معروض
      </span>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

/** Medal-style indicator for the top three, plain number for the rest. */
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-2 ring-amber-300">
        <Trophy className="h-4 w-4" />
      </span>
    );
  }
  if (rank <= 3) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-black text-xs ring-2 ring-slate-300">
        {rank}
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center text-xs font-black text-ph-muted">
      {rank}
    </span>
  );
};

/** Profit-margin indicator, toned by how healthy the margin is. */
const MarginPill: React.FC<{ marginPct: number | null }> = ({ marginPct }) => {
  if (marginPct == null) {
    return <span className="mt-1 inline-block text-[10px] text-ph-muted">هامش —</span>;
  }
  const tone =
    marginPct >= 30
      ? 'bg-emerald-100 text-emerald-700'
      : marginPct >= 10
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-700';
  return (
    <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${tone}`}>
      <BarChart3 className="h-3 w-3" />
      هامش {formatPct(marginPct, 1)}
    </span>
  );
};

const MobileStat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div
    className={`rounded-xl border px-3 py-2 ${
      highlight ? 'border-ph-brand/40 bg-ph-brand/5' : 'border-ph-border bg-white'
    }`}
  >
    <p className="text-[10px] font-bold text-ph-muted">{label}</p>
    <p className="text-xs font-mono font-black text-ph-ink mt-0.5">{value}</p>
  </div>
);

const TONE_BOX: Record<string, string> = {
  brand: 'border-ph-brand/30 bg-ph-brand/5',
  amber: 'border-amber-200 bg-amber-50',
  emerald: 'border-emerald-200 bg-emerald-50',
};

const TONE_ICON: Record<string, string> = {
  brand: 'bg-ph-brand/15 text-ph-brand',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
};

const SummaryStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'brand' | 'amber' | 'emerald';
}> = ({ icon, label, value, tone }) => (
  <div className={`rounded-2xl border p-4 shadow-2xs ${TONE_BOX[tone]}`}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <span className="text-[11px] font-bold text-ph-muted leading-snug">{label}</span>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${TONE_ICON[tone]}`}>
        {icon}
      </span>
    </div>
    <p className="text-lg font-black font-mono text-ph-ink">{value}</p>
  </div>
);

function RankingSkeleton({ rows }: { rows: number }) {
  return (
    <div
      className="rounded-3xl border border-ph-border bg-white shadow-sm p-4 sm:p-5"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="ph-skeleton h-8 w-8 rounded-full" />
            <div className="ph-skeleton h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="ph-skeleton h-3 w-40 rounded-md" />
              <div className="ph-skeleton h-2.5 w-24 rounded-md" />
            </div>
            <div className="ph-skeleton h-3 w-16 rounded-md hidden sm:block" />
            <div className="ph-skeleton h-3 w-20 rounded-md hidden sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ تحميل قائمة المنتجات الأكثر مبيعاً…</span>
    </div>
  );
}
