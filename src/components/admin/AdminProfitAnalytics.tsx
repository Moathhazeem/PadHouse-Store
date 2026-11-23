/**
 * AdminProfitAnalytics.tsx — Gross Profit Analytics section (Part 6).
 *
 * Every figure is aggregated server-side by the Analytics module over the live
 * `Order` / `OrderItem` / `GoodsReceipt` / `GoodsReceiptItem` / `Inventory`
 * tables — nothing here is mocked or estimated on the client:
 *  - `/analytics/profit` → the Gross Sales → Net Sales → Gross Profit chain,
 *    the period trend, the discount/refund split and data-quality signals;
 *  - `/categories`       → filter options.
 *
 * The financial chain is fixed and transparent:
 *   Net Sales      = Gross Sales − Discounts − Refunds
 *   COGS           = Σ actual historical cost of the units sold
 *   Gross Profit   = Net Sales − COGS
 *   Gross Margin % = (Gross Profit ÷ Net Sales) × 100   (zero-denominator safe)
 *
 * Costing: COGS is resolved from *historical purchase cost records* — the
 * goods-receipt weighted average as of each sale — never from today's product
 * purchase cost. Sold units that have no purchase history before the sale are
 * NOT silently priced: they surface as a data-quality warning and shrink the
 * cost-coverage figure so an incomplete total stays distinguishable from an
 * accurate one.
 *
 * This is a **gross** profit figure. Salaries, marketing, operating and other
 * overhead costs are deliberately out of scope and never subtracted here.
 *
 * Period-over-period comparison is derived by requesting the previous
 * equivalent window from the same endpoint; a zero previous period never yields
 * a percentage (no divide-by-zero) — it is surfaced as «لا توجد بيانات سابقة».
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Calendar,
  Filter,
  Info,
  Minus,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchAnalyticsProfitApi,
  adminFetchCategoriesApi,
  type AdminCategoryOption,
  type AdminProfitAnalyticsResult,
  type AdminProfitSummary,
  type AdminProfitTrendPoint,
  type AnalyticsGroupBy,
} from '../../services/adminApi';
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

export interface AdminProfitAnalyticsProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

/* ------------------------------------------------------------------ */
/* Trend grouping selector                                             */
/* ------------------------------------------------------------------ */

type GroupByMode = 'auto' | AnalyticsGroupBy;
type CompleteProfitTrendPoint = AdminProfitTrendPoint & { grossProfit: number; marginPct: number };

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
  if (groupBy === 'week') {
    return `أسبوع ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;
  }
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
};

/* ------------------------------------------------------------------ */
/* Growth math (zero-denominator safe)                                 */
/* ------------------------------------------------------------------ */

interface MetricDelta {
  pct: number | null;
  dir: 'up' | 'down' | 'flat' | 'none';
  noBaseline: boolean;
}

/** Percentage change vs the previous window; a zero base yields `noBaseline`. */
function growthRate(current: number, previous: number): MetricDelta {
  if (!previous || previous === 0) {
    return { pct: null, dir: current > 0 ? 'up' : 'none', noBaseline: current > 0 };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir, noBaseline: false };
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export const AdminProfitAnalytics: React.FC<AdminProfitAnalyticsProps> = ({ onToast }) => {
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);

  const [preset, setPreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('auto');
  const [categoryId, setCategoryId] = useState('');

  const [current, setCurrent] = useState<AdminProfitAnalyticsResult | null>(null);
  const [previous, setPrevious] = useState<AdminProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  /* Resolve the active window from the preset (custom overrides). */
  const { startDate, endDate } = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      const start = customFrom <= customTo ? customFrom : customTo;
      const end = customFrom <= customTo ? customTo : customFrom;
      return { startDate: start, endDate: end };
    }
    return rangeForPreset(preset, customFrom, customTo);
  }, [preset, customFrom, customTo]);

  const prevWindow = useMemo(() => previousRange(startDate, endDate), [startDate, endDate]);

  const autoGroupBy = useMemo(() => groupByForWindow(startDate, endDate), [startDate, endDate]);
  const groupBy: AnalyticsGroupBy = groupByMode === 'auto' ? autoGroupBy : groupByMode;

  useEffect(() => {
    let active = true;
    adminFetchCategoriesApi()
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const scoped = categoryId || undefined;
    try {
      const [cur, prev] = await Promise.all([
        adminFetchAnalyticsProfitApi({ startDate, endDate, categoryId: scoped, groupBy }),
        adminFetchAnalyticsProfitApi({
          startDate: prevWindow.startDate,
          endDate: prevWindow.endDate,
          categoryId: scoped,
          groupBy,
        }),
      ]);
      setCurrent(cur);
      setPrevious(prev.summary);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب تحليلات الربح من الخادم';
      setCurrent(null);
      setPrevious(null);
      setError(message);
      onToastRef.current?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy, categoryId, prevWindow.startDate, prevWindow.endDate]);

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

  const currency = current?.currency?.code ?? 'ILS';
  const summary = current?.summary;
  const breakdown = current?.breakdown;
  const trend = current?.trend ?? [];
  const completeTrend = useMemo(
    () =>
      trend.filter(
        (point): point is CompleteProfitTrendPoint =>
          point.grossProfit !== null && point.marginPct !== null,
      ),
    [trend],
  );
  const quality = current?.dataQuality;
  const costBasis = current?.costBasis;
  const hasData = !!summary && summary.unitsSold > 0;
  const prevRangeLabel = formatRangeLabel(prevWindow.startDate, prevWindow.endDate);

  /* Growth card models — the growth rate drives both the badges and the panel. */
  const growth = useMemo(() => {
    const g = (cur?: number, prev?: number) => growthRate(cur ?? 0, prev ?? 0);
    return {
      grossSales: g(summary?.grossSales, previous?.grossSales),
      discounts: g(summary?.discounts, previous?.discounts),
      refunds: g(summary?.refunds, previous?.refunds),
      netSales: g(summary?.netSales, previous?.netSales),
      cogs: g(summary?.cogs, previous?.cogs),
      grossProfit: g(summary?.grossProfit ?? 0, previous?.grossProfit ?? 0),
    };
  }, [summary, previous]);

  /** Margin moves in percentage points, not a growth rate. */
  const marginPointDelta =
    summary?.grossProfitMarginPct != null && previous?.grossProfitMarginPct != null
      ? summary.grossProfitMarginPct - previous.grossProfitMarginPct
      : null;

  const cards: KpiCardModel[] = useMemo(
    () => [
      {
        key: 'gross-sales',
        icon: <Banknote className="h-4 w-4" />,
        tone: 'brand',
        label: 'المبيعات الإجمالية',
        tooltip:
          'مجموع قيمة بنود الطلبات قبل الخصومات والمرتجعات (مجموع OrderItem.totalPrice للأصناف البائعة). يشمل الطلبات المُرجَعة قبل خصمها.',
        value: formatMoney(summary?.grossSales ?? 0, currency),
        delta: growth.grossSales,
      },
      {
        key: 'discounts',
        icon: <Tag className="h-4 w-4" />,
        tone: 'amber',
        label: 'الخصومات',
        tooltip:
          'إجمالي الخصومات = خصومات الكوبونات + رصيد بطاقات الهدايا المستخدم على الطلبات خلال الفترة. تُطرَح في معادلة صافي المبيعات.',
        value: formatMoney(summary?.discounts ?? 0, currency),
        delta: growth.discounts,
        invert: true,
      },
      {
        key: 'refunds',
        icon: <RotateCcw className="h-4 w-4" />,
        tone: 'rose',
        label: 'المرتجعات',
        tooltip:
          'قيمة الطلبات المُرجَعة (الملغاة مع رد المبلغ) خلال الفترة. تُستخدَم ضمن معادلة صافي المبيعات، فالطلب المُرجَع يُحتسب في الإجمالي أولاً ثم يُخصَم هنا.',
        value: formatMoney(summary?.refunds ?? 0, currency),
        delta: growth.refunds,
        invert: true,
      },
      {
        key: 'net-sales',
        icon: <Wallet className="h-4 w-4" />,
        tone: 'sky',
        label: 'صافي المبيعات',
        tooltip: 'صافي المبيعات = المبيعات الإجمالية − الخصومات − المرتجعات.',
        value: formatMoney(summary?.netSales ?? 0, currency),
        delta: growth.netSales,
      },
      {
        key: 'cogs',
        icon: <Package className="h-4 w-4" />,
        tone: 'indigo',
        label: 'تكلفة البضاعة المبيعة',
        tooltip:
          'مجموع التكلفة الفعلية للوحدات المبيعة، محسوبة بالمتوسط المرجّح التاريخي من سجلات استلام البضائع وقت البيع — وليس بالتكلفة الحالية للمنتج.',
        value: summary?.uncostedUnits ? 'غير مكتمل' : formatMoney(summary?.cogs ?? 0, currency),
        delta: growth.cogs,
        sub:
          summary && summary.unitsSold > 0
            ? `تكلفة مسجلة لـ ${formatCount(summary.unitsSold - summary.uncostedUnits)} من ${formatCount(summary.unitsSold)} وحدة · متوسط الوحدة المسعرة ${formatMoney(summary.averageUnitCost, currency)}`
            : undefined,
      },
      {
        key: 'gross-profit',
        icon: <TrendingUp className="h-4 w-4" />,
        tone: 'emerald',
        label: 'الربح الإجمالي',
        tooltip:
          'الربح الإجمالي = صافي المبيعات − تكلفة البضاعة المبيعة. لا يشمل الرواتب أو التسويق أو المصاريف التشغيلية.',
        value: summary?.grossProfit == null ? 'غير مكتمل' : formatMoney(summary.grossProfit, currency),
        delta: summary?.grossProfit == null ? undefined : growth.grossProfit,
      },
      {
        key: 'margin',
        icon: <Percent className="h-4 w-4" />,
        tone: 'teal',
        label: 'هامش الربح الإجمالي',
        tooltip:
          'هامش الربح الإجمالي = (الربح الإجمالي ÷ صافي المبيعات) × 100. عند انعدام صافي المبيعات لا تُحتسب النسبة (تجنّباً للقسمة على صفر).',
        value: summary?.grossProfitMarginPct == null ? 'غير مكتمل' : formatPct(summary.grossProfitMarginPct, 1),
        footnote:
          marginPointDelta != null
            ? `${
                marginPointDelta > 0 ? '+' : ''
              }${marginPointDelta.toFixed(1)} نقطة عن الفترة السابقة`
            : undefined,
      },
    ],
    [summary, growth, currency, marginPointDelta],
  );

  const activeCategoryName = categories.find((c) => c.id === categoryId)?.nameAr ?? 'كل الأقسام';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="admin-profit-analytics-title"
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-profit-analytics-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4 text-ph-brand" />
            تحليلات الأرباح
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            صافي المبيعات والربح الإجمالي محسوبان مباشرة من سجلات الطلبات، والتكلفة مأخوذة من
            سجلات الشراء التاريخية وقت البيع.
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
              <p className="text-xs font-black">تعذر تحميل تحليلات الأرباح</p>
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
                  لم تُسجَّل أي وحدات مبيعة ضمن النطاق المحدد
                  {categoryId ? ' لهذا القسم' : ''}، فلا يمكن احتساب ربح. جرّب توسيع النطاق الزمني.
                </p>
              </div>
            </div>
          )}

          {/* KPI cards */}
          <div
            aria-busy={loading}
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {cards.map((card) => (
              <KpiCard key={card.key} card={card} compareLabel={prevRangeLabel} />
            ))}
          </div>

          {/* Formula transparency */}
          {summary && <FormulaPanel summary={summary} currency={currency} costComplete={quality?.isComplete ?? false} />}

          {/* Data quality warnings */}
          {quality && <DataQualityPanel quality={quality} currency={currency} />}

          {/* 1 · Revenue vs COGS */}
          <section
            aria-labelledby="profit-revenue-cogs-title"
            className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="profit-revenue-cogs-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4 text-ph-brand" />
                الإيراد مقابل تكلفة البضاعة المبيعة
              </h3>
              <span className="text-[11px] text-ph-muted whitespace-nowrap">
                {trend.length} نقطة · {GROUP_BY_LABEL[groupBy]}
              </span>
            </div>
            {trend.length === 0 ? (
              <p className="px-5 py-10 text-xs text-ph-muted text-center">
                لا توجد بيانات ضمن النطاق المحدد.
              </p>
            ) : (
              <div className="p-4 sm:p-5">
                <RevenueVsCogsChart points={trend} groupBy={groupBy} currency={currency} />
              </div>
            )}
          </section>

          {/* 2 · Gross profit trend */}
          <section
            aria-labelledby="profit-trend-title"
            className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="profit-trend-title"
                className="text-sm font-black text-ph-ink flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                اتجاه الربح الإجمالي
              </h3>
              <span className="text-[11px] text-ph-muted whitespace-nowrap">
                صافي المبيعات − تكلفة البضاعة المبيعة
              </span>
            </div>
            {trend.length === 0 ? (
              <p className="px-5 py-10 text-xs text-ph-muted text-center">
                لا توجد بيانات ربح ضمن النطاق المحدد.
              </p>
            ) : (
              <div className="p-4 sm:p-5">
                {quality?.isComplete ? (
                  <GrossProfitTrendChart points={completeTrend} groupBy={groupBy} currency={currency} />
                ) : (
                  <p className="text-xs text-amber-700 text-center py-6">
                    اتجاه الربح والهامش غير متاح لأن تكلفة بعض الوحدات غير مسجلة.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* 3 · Profit margin visualization */}
          {summary && quality?.isComplete && (
            <section
              aria-labelledby="profit-margin-title"
              className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
            >
              <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
                <h3
                  id="profit-margin-title"
                  className="text-sm font-black text-ph-ink flex items-center gap-2"
                >
                  <Percent className="h-4 w-4 text-ph-brand" />
                  هامش الربح الإجمالي
                </h3>
              </div>
              <div className="p-5">
                <MarginVisualization
                  summary={summary}
                  trend={completeTrend}
                  groupBy={groupBy}
                  previousMargin={previous?.grossProfitMarginPct ?? null}
                />
              </div>
            </section>
          )}

          {/* 4 · Discounts & refunds breakdown */}
          {breakdown && summary && (
            <section
              aria-labelledby="profit-discounts-refunds-title"
              className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
            >
              <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
                <h3
                  id="profit-discounts-refunds-title"
                  className="text-sm font-black text-ph-ink flex items-center gap-2"
                >
                  <Receipt className="h-4 w-4 text-ph-brand" />
                  تفصيل الخصومات والمرتجعات
                </h3>
              </div>
              <DiscountsRefundsBreakdown
                breakdown={breakdown}
                grossSales={summary.grossSales}
                currency={currency}
              />
            </section>
          )}

          <p className="text-[10px] text-ph-muted text-center">
            البيانات محسوبة مباشرة من سجلات الطلبات والشراء في قاعدة البيانات — آخر تحديث:{' '}
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
/* Formula transparency panel                                          */
/* ------------------------------------------------------------------ */

const FormulaPanel: React.FC<{ summary: AdminProfitSummary; currency: string; costComplete: boolean }> = ({
  summary,
  currency,
  costComplete,
}) => {
  const rows: { formula: string; result: string; note?: string }[] = [
    {
      formula: 'صافي المبيعات = المبيعات الإجمالية − الخصومات − المرتجعات',
      result: formatMoney(summary.netSales, currency),
      note: `${formatMoney(summary.grossSales, currency)} − ${formatMoney(
        summary.discounts,
        currency,
      )} − ${formatMoney(summary.refunds, currency)}`,
    },
    {
      formula: 'تكلفة البضاعة المبيعة = مجموع التكلفة الفعلية للوحدات المبيعة',
      result: costComplete ? formatMoney(summary.cogs, currency) : 'غير مكتمل',
      note: `${formatCount(summary.unitsSold - summary.uncostedUnits)} من ${formatCount(summary.unitsSold)} وحدة بتكلفة مسجلة · متوسط الوحدة المسعرة ${formatMoney(summary.averageUnitCost, currency)}`,
    },
    {
      formula: 'الربح الإجمالي = صافي المبيعات − تكلفة البضاعة المبيعة',
      result: summary.grossProfit == null ? 'غير مكتمل' : formatMoney(summary.grossProfit, currency),
    },
    {
      formula: 'هامش الربح الإجمالي = (الربح الإجمالي ÷ صافي المبيعات) × 100',
      result: summary.grossProfitMarginPct == null ? 'غير مكتمل' : formatPct(summary.grossProfitMarginPct, 1),
    },
  ];

  return (
    <section
      aria-labelledby="profit-formula-title"
      className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
    >
      <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex flex-wrap items-center justify-between gap-2">
        <h3
          id="profit-formula-title"
          className="text-sm font-black text-ph-ink flex items-center gap-2"
        >
          <BadgeDollarSign className="h-4 w-4 text-ph-brand" />
          المعادلات المالية المستخدمة
        </h3>
        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          ربح إجمالي — لا يشمل الرواتب أو التسويق أو المصاريف التشغيلية
        </span>
      </div>
      <ul className="divide-y divide-ph-border">
        {rows.map((row) => (
          <li
            key={row.formula}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-ph-ink">{row.formula}</p>
              {row.note && (
                <p className="text-[10px] text-ph-muted font-mono mt-0.5" dir="ltr">
                  {row.note}
                </p>
              )}
            </div>
            <span className="text-sm font-black font-mono text-ph-ink whitespace-nowrap">
              {row.result}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-5 py-3 text-[10px] text-ph-muted border-t border-ph-border">
        الصافي هنا هو صافي المبيعات (بعد الخصومات والمرتجعات)، وليس صافي الربح. لا تُحتسب أي مصاريف
        تشغيلية أو غير مباشرة ضمن هذه الشاشة.
      </p>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Data quality panel                                                  */
/* ------------------------------------------------------------------ */

const DataQualityPanel: React.FC<{
  quality: AdminProfitAnalyticsResult['dataQuality'];
  currency: string;
}> = ({ quality }) => {
  const complete = quality.isComplete;

  return (
    <section
      aria-labelledby="profit-quality-title"
      className={`rounded-3xl border shadow-sm overflow-hidden ${
        complete ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-300 bg-amber-50/60'
      }`}
    >
      <div
        className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b ${
          complete ? 'border-emerald-200' : 'border-amber-300'
        }`}
      >
        <h3
          id="profit-quality-title"
          className="text-sm font-black text-ph-ink flex items-center gap-2"
        >
          {complete ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          جودة بيانات التكلفة
        </h3>
        <span
          className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
            complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
          }`}
        >
          تغطية التكلفة {formatPct(quality.costCoveragePct, 1)}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <ul className="space-y-1.5">
          {quality.notes.map((note, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed text-ph-ink">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ph-muted" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QualityStat label="وحدات مبيعة" value={formatCount(quality.unitsSold)} />
          <QualityStat label="وحدات بتكلفة تاريخية" value={formatCount(quality.unitsWithHistory)} />
          <QualityStat
            label="وحدات بلا تكلفة تاريخية"
            value={formatCount(quality.uncostedUnits)}
            alert={quality.uncostedUnits > 0}
          />
          <QualityStat
            label="عدد المنتجات المتأثرة"
            value={formatCount(quality.affectedProducts.length)}
            alert={quality.affectedProducts.length > 0}
          />
        </div>

        {quality.affectedProducts.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-amber-300 bg-white">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-amber-50/70 text-[10px] font-bold text-ph-muted">
                  <th className="px-3 py-2 font-bold">المنتج</th>
                  <th className="px-3 py-2 font-bold text-center">SKU</th>
                  <th className="px-3 py-2 font-bold text-center">وحدات مبيعة</th>
                  <th className="px-3 py-2 font-bold text-center">وحدات بلا تكلفة تاريخية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ph-border">
                {quality.affectedProducts.map((product) => (
                  <tr key={product.productId}>
                    <td className="px-3 py-2 font-bold text-ph-ink">{product.nameAr}</td>
                    <td className="px-3 py-2 text-center font-mono text-ph-muted">
                      {product.sku || '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-ph-ink">
                      {formatCount(product.unitsSold)}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-black text-amber-700">
                      {formatCount(product.uncostedUnits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] text-ph-muted leading-relaxed">
          التكلفة تُحسب بالمتوسط المرجّح التاريخي من سجلات استلام البضائع قبل لحظة البيع، وبنفس
          طريقة تقييم المخزون المعتمدة في النظام. للوحدات التي لا تسبقها أي عملية شراء يُستخدم
          احتياطياً متوسط تكلفة المخزون الحالي، وتظهر هنا كتحذير بدلاً من إخفائها — لذا تكون
          النتائج الناقصة واضحة ومنفصلة عن النتائج الدقيقة.
        </p>
      </div>
    </section>
  );
};

const QualityStat: React.FC<{ label: string; value: string; alert?: boolean }> = ({
  label,
  value,
  alert,
}) => (
  <div className="rounded-2xl border border-ph-border bg-white px-3 py-2.5">
    <p className="text-[10px] font-bold text-ph-muted">{label}</p>
    <p className={`text-base font-black font-mono mt-0.5 ${alert ? 'text-amber-700' : 'text-ph-ink'}`}>
      {value}
    </p>
  </div>
);

/* ------------------------------------------------------------------ */
/* 1 · Revenue vs COGS — grouped bar chart (inline SVG, RTL)           */
/* ------------------------------------------------------------------ */

const RevenueVsCogsChart: React.FC<{
  points: AdminProfitTrendPoint[];
  groupBy: AnalyticsGroupBy;
  currency: string;
}> = ({ points, groupBy, currency }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 960;
  const H = 340;
  // Y-axis on the right and time flowing right→left keeps the chart RTL-native.
  const padL = 16;
  const padR = 76;
  const padT = 20;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const maxValue = useMemo(
    () => Math.max(0, ...points.map((p) => Math.max(p.netSales, p.cogs))),
    [points],
  );
  const axisMax = useMemo(() => niceCeil(maxValue), [maxValue]);

  const slotW = n > 0 ? innerW / n : innerW;
  const barW = Math.max(3, Math.min(26, slotW * 0.28));

  /* Slot centres, right→left. */
  const centerAt = useCallback(
    (i: number) => padL + innerW - (i + 0.5) * slotW,
    [padL, innerW, slotW],
  );
  const yAt = useCallback(
    (value: number) => padT + innerH - (axisMax <= 0 ? 0 : (value / axisMax) * innerH),
    [padT, innerH, axisMax],
  );

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.max(1, Math.ceil(n / 10));

  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const vx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i += 1) {
      const dist = Math.abs(centerAt(i) - vx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHover(best);
  };

  const active = hover != null ? points[hover] : null;
  const activeX = hover != null ? centerAt(hover) : 0;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-pan-y select-none"
        role="img"
        aria-label="مخطط أعمدة يقارن الإيراد بتكلفة البضاعة المبيعة عبر الزمن"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
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

        {/* Bars: revenue (blue) then COGS (rose), revenue is the outer bar */}
        {points.map((p, i) => {
          const isActive = hover === i;
          const c = centerAt(i);
          const revY = yAt(p.netSales);
          const cogsY = yAt(p.cogs);
          return (
            <g key={p.key} opacity={hover == null || isActive ? 1 : 0.45}>
              <rect
                x={c - barW - 1.5}
                y={revY}
                width={barW}
                height={Math.max(0, padT + innerH - revY)}
                rx={2}
                fill="rgb(37 99 235)"
              />
              <rect
                x={c + 1.5}
                y={cogsY}
                width={barW}
                height={Math.max(0, padT + innerH - cogsY)}
                rx={2}
                fill="rgb(244 63 94)"
              />
            </g>
          );
        })}

        {/* Hover guide */}
        {active && (
          <line
            x1={activeX}
            y1={padT}
            x2={activeX}
            y2={padT + innerH}
            stroke="rgb(148 163 184)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        {/* X labels */}
        {points.map((p, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={`x-${p.key}`}
              x={centerAt(i)}
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
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[110%] rounded-xl border border-ph-border bg-ph-ink px-3 py-2 text-white shadow-lg"
          style={{ left: `${(activeX / W) * 100}%`, top: `${(padT / H) * 100}%` }}
          dir="rtl"
        >
          <p className="text-[10px] font-bold text-white/70 whitespace-nowrap">
            {formatTrendLabel(active.key, groupBy)}
          </p>
          <p className="text-xs font-black font-mono whitespace-nowrap text-sky-300">
            إيراد {formatMoney(active.netSales, currency)}
          </p>
          <p className="text-xs font-black font-mono whitespace-nowrap text-rose-300">
            تكلفة {formatMoney(active.cogs, currency)}
          </p>
          <p className="text-[10px] text-white/70 whitespace-nowrap">
            ربح {active.grossProfit == null ? 'غير مكتمل' : formatMoney(active.grossProfit, currency)}
          </p>
        </div>
      )}

      {/* Legend / footnote */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ph-muted">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-blue-600" />
            صافي المبيعات
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-rose-500" />
            تكلفة البضاعة المبيعة
          </span>
        </span>
        <span>الذروة: {formatMoney(maxValue, currency)}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 2 · Gross profit trend — area line chart (inline SVG, RTL)          */
/* ------------------------------------------------------------------ */

const GrossProfitTrendChart: React.FC<{
  points: CompleteProfitTrendPoint[];
  groupBy: AnalyticsGroupBy;
  currency: string;
}> = ({ points, groupBy, currency }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 960;
  const H = 300;
  const padL = 16;
  const padR = 76;
  const padT = 20;
  const padB = 38;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = points.length;

  const maxValue = useMemo(() => Math.max(0, ...points.map((p) => p.grossProfit)), [points]);
  const minValue = useMemo(() => Math.min(0, ...points.map((p) => p.grossProfit)), [points]);
  const axisMax = useMemo(() => niceCeil(maxValue), [maxValue]);
  const axisMin = useMemo(() => (minValue < 0 ? -niceCeil(Math.abs(minValue)) : 0), [minValue]);
  const span = axisMax - axisMin;

  const xAt = useCallback(
    (i: number) => padL + innerW - (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1)),
    [n, padL, innerW],
  );
  const yAt = useCallback(
    (value: number) => padT + innerH - (span <= 0 ? 0 : ((value - axisMin) / span) * innerH),
    [padT, innerH, span, axisMin],
  );

  const linePath = useMemo(
    () =>
      points
        .map(
          (p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p.grossProfit).toFixed(2)}`,
        )
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
  const activeY = active ? yAt(active.grossProfit) : 0;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-pan-y select-none"
        role="img"
        aria-label="مخطط خطي لاتجاه الربح الإجمالي عبر الزمن"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels (right side) */}
        {gridLevels.map((level) => {
          const value = axisMin + span * level;
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

        {/* Zero baseline when profit dips negative */}
        {axisMin < 0 && (
          <line
            x1={padL}
            y1={yAt(0)}
            x2={padL + innerW}
            y2={yAt(0)}
            stroke="rgb(203 213 225)"
            strokeWidth={1.5}
          />
        )}

        {/* Area + line */}
        {n > 0 && <path d={areaPath} fill="url(#profitArea)" />}
        {n > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="rgb(16 185 129)"
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
            <circle
              cx={activeX}
              cy={activeY}
              r={5.5}
              fill="rgb(16 185 129)"
              stroke="#fff"
              strokeWidth={2}
            />
          </>
        )}

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={p.key}
            cx={xAt(i)}
            cy={yAt(p.grossProfit)}
            r={hover === i ? 5.5 : 2.5}
            fill={hover === i ? 'rgb(16 185 129)' : '#fff'}
            stroke="rgb(16 185 129)"
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
            {formatMoney(active.grossProfit, currency)}
          </p>
          <p className="text-[10px] text-white/70 whitespace-nowrap">
            هامش {formatPct(active.marginPct, 1)}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ph-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-emerald-500" />
          الربح الإجمالي
        </span>
        <span>
          الأعلى: {formatMoney(maxValue, currency)}
          {minValue < 0 ? ` · الأدنى: ${formatMoney(minValue, currency)}` : ''}
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 3 · Profit margin visualization                                     */
/* ------------------------------------------------------------------ */

const MarginVisualization: React.FC<{
  summary: AdminProfitSummary;
  trend: CompleteProfitTrendPoint[];
  groupBy: AnalyticsGroupBy;
  previousMargin: number | null;
}> = ({ summary, trend, groupBy, previousMargin }) => {
  const margin = summary.grossProfitMarginPct ?? 0;
  /* Clamp the gauge to [0, 100] for display only; the label keeps the true value. */
  const clamped = Math.max(0, Math.min(100, margin));
  const pointDelta = previousMargin != null ? margin - previousMargin : null;
  const hasNegative = trend.some((p) => p.grossProfit < 0);

  return (
    <div className="space-y-5">
      {/* Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-black font-mono ${
              margin < 0 ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {formatPct(margin, 1)}
          </span>
          <span className="text-[11px] font-bold text-ph-muted">هامش إجمالي للفترة</span>
        </div>
        {pointDelta != null && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg self-start ${
              pointDelta > 0.05
                ? 'text-emerald-700 bg-emerald-100'
                : pointDelta < -0.05
                  ? 'text-red-700 bg-red-100'
                  : 'text-slate-600 bg-slate-100'
            }`}
          >
            {pointDelta > 0.05 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : pointDelta < -0.05 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {`${pointDelta > 0 ? '+' : ''}${pointDelta.toFixed(1)} نقطة عن الفترة السابقة`}
          </span>
        )}
      </div>

      <div>
        <div className="relative h-4 w-full rounded-full overflow-hidden bg-gradient-to-l from-emerald-500 via-amber-300 to-red-400">
          <div
            className="absolute top-0 h-full w-1 bg-ph-ink shadow-md"
            style={{ left: `${clamped}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-ph-muted font-mono" dir="ltr">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Per-period margin bars */}
      {trend.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-ph-muted">
            هامش الربح لكل {GROUP_BY_LABEL[groupBy].replace('ي', '')} · {trend.length} نقطة
          </p>
          <ul className="space-y-1.5">
            {trend.map((point) => {
              const width = Math.max(0, Math.min(100, Math.abs(point.marginPct)));
              const negative = point.marginPct < 0;
              return (
                <li key={point.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[10px] font-bold text-ph-muted truncate">
                    {formatTrendLabel(point.key, groupBy)}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-ph-background overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        negative ? 'bg-red-500' : point.marginPct >= 30 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(width, point.marginPct === 0 ? 0 : 1.5)}%` }}
                    />
                  </div>
                  <span
                    className={`w-14 shrink-0 text-right text-[11px] font-mono font-bold ${
                      negative ? 'text-red-600' : 'text-ph-ink'
                    }`}
                  >
                    {formatPct(point.marginPct, 1)}
                  </span>
                </li>
              );
            })}
          </ul>
          {hasNegative && (
            <p className="text-[10px] text-red-600">
              تظهر فترات بهامش سالب عندما تتجاوز تكلفة البضاعة المبيعة صافي مبيعات تلك الفترة.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 4 · Discounts & refunds breakdown                                   */
/* ------------------------------------------------------------------ */

const DiscountsRefundsBreakdown: React.FC<{
  breakdown: AdminProfitAnalyticsResult['breakdown'];
  grossSales: number;
  currency: string;
}> = ({ breakdown, grossSales, currency }) => {
  const rows = [
    {
      key: 'coupon',
      label: 'خصومات الكوبونات',
      value: breakdown.discounts.coupon,
      color: 'bg-amber-400',
    },
    {
      key: 'gift-card',
      label: 'رصيد بطاقات الهدايا',
      value: breakdown.discounts.giftCard,
      color: 'bg-orange-400',
    },
    {
      key: 'refunds',
      label: `المرتجعات (${formatCount(breakdown.refunds.orderCount)} طلب)`,
      value: breakdown.refunds.total,
      color: 'bg-rose-400',
    },
  ];
  const maxRow = Math.max(1, ...rows.map((r) => r.value));
  const totalDeduction = breakdown.discounts.total + breakdown.refunds.total;

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile
          label="إجمالي الخصومات"
          value={formatMoney(breakdown.discounts.total, currency)}
          share={breakdown.discounts.sharePct}
        />
        <SummaryTile
          label="إجمالي المرتجعات"
          value={formatMoney(breakdown.refunds.total, currency)}
          share={breakdown.refunds.sharePct}
        />
      </div>

      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-ph-ink">{row.label}</span>
              <span className="font-mono font-bold text-ph-ink">
                {formatMoney(row.value, currency)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-ph-background overflow-hidden">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${Math.max((row.value / maxRow) * 100, row.value > 0 ? 2 : 0)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ph-background/50 px-3 py-2 text-[11px]">
        <span className="font-bold text-ph-muted">
          إجمالي ما خُصم من المبيعات الإجمالية
          {grossSales > 0 ? ` (${formatPct((totalDeduction / grossSales) * 100, 1)} من المبيعات الإجمالية)` : ''}
        </span>
        <span className="font-mono font-black text-ph-ink">
          {formatMoney(totalDeduction, currency)}
        </span>
      </div>

      <p className="text-[10px] text-ph-muted leading-relaxed">
        الشحن المبلَّغ عنه خلال الفترة:{' '}
        <span className="font-mono font-bold text-ph-ink">{formatMoney(breakdown.shipping, currency)}</span>{' '}
        — يُعرَض للاكتمال فقط ولا يدخل في معادلة الربح الإجمالي.
      </p>
    </div>
  );
};

const SummaryTile: React.FC<{ label: string; value: string; share: number }> = ({
  label,
  value,
  share,
}) => (
  <div className="rounded-2xl border border-ph-border bg-white px-4 py-3">
    <p className="text-[10px] font-bold text-ph-muted">{label}</p>
    <p className="text-lg font-black font-mono text-ph-ink mt-0.5">{value}</p>
    <p className="text-[10px] text-ph-muted mt-0.5">{formatPct(share, 1)} من المبيعات الإجمالية</p>
  </div>
);

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

type KpiTone = 'brand' | 'sky' | 'emerald' | 'indigo' | 'teal' | 'amber' | 'rose';

interface KpiCardModel {
  key: string;
  icon: React.ReactNode;
  tone: KpiTone;
  label: string;
  tooltip: string;
  value: string;
  sub?: string;
  footnote?: string;
  delta?: MetricDelta;
  /** Inverts the delta colouring (a rise is bad, e.g. discounts/refunds). */
  invert?: boolean;
}

const KPI_TONES: Record<KpiTone, { box: string; icon: string; value: string }> = {
  brand: { box: 'border-ph-border bg-white', icon: 'text-ph-brand bg-ph-brand/10', value: 'text-ph-ink' },
  sky: { box: 'border-sky-200 bg-sky-50/50', icon: 'text-sky-700 bg-sky-100', value: 'text-sky-800' },
  emerald: {
    box: 'border-emerald-200 bg-emerald-50/50',
    icon: 'text-emerald-700 bg-emerald-100',
    value: 'text-emerald-800',
  },
  indigo: {
    box: 'border-indigo-200 bg-indigo-50/50',
    icon: 'text-indigo-700 bg-indigo-100',
    value: 'text-indigo-800',
  },
  teal: { box: 'border-teal-200 bg-teal-50/50', icon: 'text-teal-700 bg-teal-100', value: 'text-teal-800' },
  amber: {
    box: 'border-amber-200 bg-amber-50/50',
    icon: 'text-amber-700 bg-amber-100',
    value: 'text-amber-800',
  },
  rose: { box: 'border-rose-200 bg-rose-50/50', icon: 'text-rose-700 bg-rose-100', value: 'text-rose-800' },
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

      <p className={`text-xl font-black font-mono ${tone.value}`}>{card.value}</p>

      {card.footnote ? (
        <p className="mt-1.5 text-[10px] font-bold text-ph-muted">{card.footnote}</p>
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <DeltaBadge delta={card.delta} invert={card.invert} />
          <span className="text-[10px] text-ph-muted">مقارنة بـ {compareLabel}</span>
        </div>
      )}

      {card.sub && <span className="text-[10px] text-ph-muted mt-1 block">{card.sub}</span>}
    </div>
  );
};

const DeltaBadge: React.FC<{ delta?: MetricDelta; invert?: boolean }> = ({ delta, invert }) => {
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

  const isFlat = delta.dir === 'flat';
  const isUp = delta.dir === 'up';
  /* A rise is only "good" when the metric is not invert-friendly. */
  const positive = invert ? !isUp : isUp;
  const cls = isFlat
    ? 'text-slate-600 bg-slate-100'
    : positive
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
      className="pointer-events-none absolute top-full right-0 z-30 mt-2 w-64 rounded-xl border border-ph-border bg-ph-ink px-3 py-2 text-[10px] font-medium leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
    >
      {text}
    </span>
  </span>
);

function KpiSkeletonGrid() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: 7 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="ph-skeleton h-3 w-24 rounded-md" />
            <div className="ph-skeleton h-7 w-7 rounded-lg" />
          </div>
          <div className="ph-skeleton h-6 w-32 rounded-md mb-2" />
          <div className="ph-skeleton h-3 w-24 rounded-md" />
        </div>
      ))}
      <span className="sr-only">جارٍ تحميل تحليلات الأرباح…</span>
    </div>
  );
}
