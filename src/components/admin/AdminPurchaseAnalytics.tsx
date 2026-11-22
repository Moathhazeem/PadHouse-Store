import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchProductsApi,
  adminFetchPurchaseAnalyticsApi,
  adminFetchSuppliersApi,
  type AdminPurchaseAnalyticsResult,
  type AdminSupplier,
  type PurchaseOrderStatus,
} from '../../services/adminApi';
import type { Product } from '../../types';
import { PO_STATUS_META, PO_WORKFLOW, formatDate, formatMoney } from './purchaseOrderUtils';

export interface AdminPurchaseAnalyticsProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

type RangePreset = '30d' | '90d' | '12m' | 'all' | 'custom';

const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: '30d', label: 'آخر 30 يوماً' },
  { key: '90d', label: 'آخر 90 يوماً' },
  { key: '12m', label: 'آخر 12 شهراً' },
  { key: 'all', label: 'كل الفترات' },
];

/** From-date (ISO `YYYY-MM-DD`) and trailing month count for each preset. */
function presetConfig(preset: RangePreset): { from: string; months: number } {
  const d = new Date();
  if (preset === '30d') d.setDate(d.getDate() - 30);
  else if (preset === '90d') d.setDate(d.getDate() - 90);
  else if (preset === '12m') d.setMonth(d.getMonth() - 12);
  d.setHours(0, 0, 0, 0);
  const months = preset === '30d' ? 3 : preset === '90d' ? 4 : 12;
  return {
    from: preset === 'all' ? '' : d.toISOString().slice(0, 10),
    months,
  };
}

/** Latest month count allowed for the spending trend. */
const TOP_LIMIT = 10;

const formatMonthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });
};

export const AdminPurchaseAnalytics: React.FC<AdminPurchaseAnalyticsProps> = ({ onToast }) => {
  const [result, setResult] = useState<AdminPurchaseAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<RangePreset>('12m');
  const [from, setFrom] = useState<string>(() => presetConfig('12m').from);
  const [to, setTo] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [productId, setProductId] = useState<string>('');

  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Filter options are loaded once — they change far less than the analytics.
  useEffect(() => {
    let active = true;
    Promise.all([adminFetchSuppliersApi(), adminFetchProductsApi()])
      .then(([supplierRes, productRes]) => {
        if (!active) return;
        setSuppliers(supplierRes.items ?? []);
        setProducts(productRes ?? []);
      })
      .catch(() => {
        /* options are best-effort; analytics still renders without them */
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const months = presetConfig(preset).months;
      const data = await adminFetchPurchaseAnalyticsApi({
        from: from || undefined,
        to: to || undefined,
        supplierId: supplierId || undefined,
        status: status || undefined,
        productId: productId || undefined,
        topLimit: TOP_LIMIT,
        months,
      });
      setResult(data);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب بيانات تحليلات المشتريات من الخادم';
      setResult(null);
      setError(message);
      onToast?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [preset, from, to, supplierId, status, productId, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const choosePreset = (next: RangePreset) => {
    setPreset(next);
    if (next !== 'custom') {
      setFrom(presetConfig(next).from);
      setTo('');
    }
  };

  const resetFilters = () => {
    choosePreset('12m');
    setSupplierId('');
    setStatus('');
    setProductId('');
  };

  const kpis = result?.kpis;
  const statusRows = result?.statusDistribution ?? [];
  const monthly = result?.monthlySpending ?? [];
  const topSuppliers = result?.topSuppliers ?? [];
  const supplierPerformance = result?.supplierPerformance ?? [];
  const outstandingProducts = result?.outstandingByProduct ?? [];
  const recentOrders = result?.recentOrders ?? [];

  const maxMonthTotal = useMemo(
    () => Math.max(1, ...monthly.map((m) => m.total)),
    [monthly],
  );
  const maxStatusCount = useMemo(
    () => Math.max(1, ...statusRows.map((s) => s.count)),
    [statusRows],
  );
  const maxOutstanding = useMemo(
    () => Math.max(1, ...outstandingProducts.map((p) => p.outstandingQuantity)),
    [outstandingProducts],
  );

  const activeFilterCount =
    (from ? 1 : 0) + (to ? 1 : 0) + (supplierId ? 1 : 0) + (status ? 1 : 0) + (productId ? 1 : 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="admin-purchase-analytics-title"
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-purchase-analytics-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4 text-ph-brand" />
            تحليلات المشتريات
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            مؤشرات الإنفاق، الاتجاه الشهري، أداء الموردين والمتبقي من الكميات — محسوبة من أوامر
            الشراء الفعلية على الخادم
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
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-ph-ink flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-ph-brand" />
            الفلاتر
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold text-ph-brand bg-ph-brand/10 px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-bold text-ph-muted hover:text-ph-ink transition-colors"
          >
            إعادة ضبط
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="h-4 w-4 text-ph-muted" />
          {RANGE_PRESETS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => choosePreset(opt.key)}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-ph-muted">من تاريخ</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('custom');
              }}
              className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-ph-muted">إلى تاريخ</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('custom');
              }}
              className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-ph-muted">المورد</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
            >
              <option value="">كل الموردين</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.company ? ` — ${s.company}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-ph-muted">حالة الأمر</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
              className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
            >
              <option value="">كل الحالات</option>
              {[...PO_WORKFLOW, 'CANCELLED' as const].map((s) => (
                <option key={s} value={s}>
                  {PO_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-ph-muted">المنتج (الأوامر التي تحتويه)</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-9 rounded-xl border border-ph-border px-3 text-xs text-ph-ink bg-white focus:border-ph-brand focus:outline-none"
            >
              <option value="">كل المنتجات</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameAr || p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black">تعذر تحميل تحليلات المشتريات</p>
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

      {loading && !result ? (
        <div className="flex items-center justify-center gap-2 py-24 text-ph-muted">
          <Loader2 className="h-6 w-6 animate-spin text-ph-brand" />
          <span className="text-sm font-bold">جارٍ تحميل تحليلات المشتريات…</span>
        </div>
      ) : !result ? null : result.kpis.totalOrders === 0 && !error ? (
        <div className="rounded-3xl border border-dashed border-ph-border bg-white px-6 py-16 text-center">
          <BarChart3 className="h-9 w-9 mx-auto mb-2 text-ph-border" />
          <p className="text-sm font-black text-ph-ink">لا توجد بيانات مطابقة</p>
          <p className="text-xs text-ph-muted mt-1">
            جرّب توسيع نطاق التاريخ أو تغيير الفلاتر لعرض التحليلات.
          </p>
        </div>
      ) : kpis ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile
              icon={<ShoppingCart className="h-4 w-4" />}
              tone="brand"
              label="إجمالي أوامر الشراء"
              value={String(kpis.totalOrders)}
              hint="جميع الأوامر المطابقة"
            />
            <KpiTile
              icon={<Wallet className="h-4 w-4" />}
              tone="brand"
              label="إجمالي قيمة المشتريات"
              value={formatMoney(kpis.totalPurchaseAmount, 'ILS')}
              hint="بدون الأوامر الملغاة"
            />
            <KpiTile
              icon={<Clock className="h-4 w-4" />}
              tone="amber"
              label="أوامر بانتظار الموافقة"
              value={String(kpis.pendingApprovalOrders)}
              hint="تحتاج اعتماداً"
            />
            <KpiTile
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="sky"
              label="أوامر معتمدة"
              value={String(kpis.approvedOrders)}
              hint="بانتظار الإرسال/الاستلام"
            />
            <KpiTile
              icon={<Truck className="h-4 w-4" />}
              tone="teal"
              label="أوامر مستلمة جزئياً"
              value={String(kpis.partiallyReceivedOrders)}
              hint="لم تُستلم بالكامل"
            />
            <KpiTile
              icon={<PackageCheck className="h-4 w-4" />}
              tone="emerald"
              label="أوامر مكتملة"
              value={String(kpis.completedOrders)}
              hint="مستلمة بالكامل"
            />
            <KpiTile
              icon={<Boxes className="h-4 w-4" />}
              tone="indigo"
              label="إجمالي المنتجات المشتراة"
              value={String(kpis.totalProductsPurchased)}
              hint="وحدات مستلمة فعلياً"
            />
            <KpiTile
              icon={<AlertTriangle className="h-4 w-4" />}
              tone="red"
              label="كميات الشراء المتبقية"
              value={String(kpis.outstandingQuantity)}
              hint="لم تُستلم بعد على الأوامر السارية"
            />
          </div>

          {/* Monthly spending */}
          <Panel
            title="الإنفاق الشهري على المشتريات"
            icon={<TrendingUp className="h-4 w-4 text-ph-brand" />}
            aside={`آخر ${monthly.length} أشهر`}
          >
            <div className="p-5">
              <div className="flex items-end justify-between gap-2 h-48 overflow-x-auto">
                {monthly.map((m) => {
                  const heightPct = maxMonthTotal > 0 ? (m.total / maxMonthTotal) * 100 : 0;
                  return (
                    <div
                      key={m.key}
                      className="flex-1 min-w-[48px] flex flex-col items-center justify-end gap-1.5 h-full"
                    >
                      <span className="text-[10px] font-mono font-bold text-ph-ink whitespace-nowrap">
                        {m.total > 0 ? formatMoney(m.total, 'ILS') : '—'}
                      </span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-lg bg-ph-brand/80 hover:bg-ph-brand transition-colors"
                          style={{ height: `${Math.max(heightPct, m.total > 0 ? 4 : 0)}%` }}
                          title={`${formatMonthLabel(m.key)}: ${formatMoney(m.total, 'ILS')} (${m.orders} أمر)`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-ph-muted whitespace-nowrap">
                        {formatMonthLabel(m.key)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Status distribution + outstanding by product */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="توزيع حالات أوامر الشراء">
              <ul className="p-5 space-y-3.5">
                {statusRows.map((row) => {
                  const meta = PO_STATUS_META[row.status];
                  const pct = (row.count / maxStatusCount) * 100;
                  return (
                    <li key={row.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="flex items-center gap-1.5 font-bold text-ph-ink">
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-mono text-ph-muted">
                            {formatMoney(row.value, 'ILS')}
                          </span>
                          <strong className="font-mono text-ph-ink w-7 text-left">
                            {row.count}
                          </strong>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-ph-background overflow-hidden">
                        <div
                          className={`h-full rounded-full ${meta.dot}`}
                          style={{ width: `${Math.max(pct, row.count > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title="الكميات المتبقية حسب المنتج" aside={`${outstandingProducts.length} منتج`}>
              {outstandingProducts.length === 0 ? (
                <EmptyRow text="لا توجد كميات متبقية على الأوامر السارية." />
              ) : (
                <ul className="p-5 space-y-3.5">
                  {outstandingProducts.map((p) => {
                    const pct = (p.outstandingQuantity / maxOutstanding) * 100;
                    return (
                      <li key={p.productId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-bold text-ph-ink leading-snug truncate">
                            {p.productName}
                            <span className="text-[10px] font-mono text-ph-muted mr-2">
                              {p.sku}
                            </span>
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-ph-muted">
                              {p.receivedQuantity}/{p.orderedQuantity}
                            </span>
                            <strong className="font-mono text-amber-700 w-10 text-left">
                              {p.outstandingQuantity}
                            </strong>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-ph-background overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          {/* Top suppliers */}
          <Panel
            title="أعلى الموردين حسب قيمة المشتريات"
            icon={<Truck className="h-4 w-4 text-ph-brand" />}
            aside={`${topSuppliers.length} مورد`}
          >
            {topSuppliers.length === 0 ? (
              <EmptyRow text="لا توجد مشتريات سارية في هذه الفترة." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse min-w-[620px]">
                  <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                    <tr>
                      <th className="px-4 py-3 font-bold">#</th>
                      <th className="px-4 py-3 font-bold">المورد</th>
                      <th className="px-4 py-3 font-bold text-center">عدد الأوامر</th>
                      <th className="px-4 py-3 font-bold text-center">قيمة المشتريات</th>
                      <th className="px-4 py-3 font-bold">الحصة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ph-border">
                    {topSuppliers.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-ph-background/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-black text-ph-muted">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-ph-ink leading-snug">{s.name}</p>
                          {s.company && (
                            <span className="text-[10px] text-ph-muted">{s.company}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-ph-ink">{s.orders}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink whitespace-nowrap">
                          {formatMoney(s.total, 'ILS')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 min-w-[60px] rounded-full bg-ph-background overflow-hidden">
                              <div
                                className="h-full rounded-full bg-ph-brand"
                                style={{ width: `${Math.max(s.share, 2)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-ph-muted w-10 text-left">
                              {s.share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Supplier performance */}
          <Panel title="أداء الشراء حسب المورد" aside={`${supplierPerformance.length} مورد`}>
            {supplierPerformance.length === 0 ? (
              <EmptyRow text="لا توجد بيانات أداء موردين في هذه الفترة." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse min-w-[760px]">
                  <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                    <tr>
                      <th className="px-4 py-3 font-bold">المورد</th>
                      <th className="px-4 py-3 font-bold text-center">الأوامر</th>
                      <th className="px-4 py-3 font-bold text-center">قيمة المشتريات</th>
                      <th className="px-4 py-3 font-bold text-center">الأوامر المكتملة</th>
                      <th className="px-4 py-3 font-bold">نسبة الإكمال</th>
                      <th className="px-4 py-3 font-bold text-center">متوسط زمن التوريد</th>
                      <th className="px-4 py-3 font-bold text-center">كميات متبقية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ph-border">
                    {supplierPerformance.map((s) => (
                      <tr key={s.id} className="hover:bg-ph-background/70 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-ph-ink leading-snug">{s.name}</p>
                          {s.company && (
                            <span className="text-[10px] text-ph-muted">{s.company}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-ph-ink">{s.orders}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink whitespace-nowrap">
                          {formatMoney(s.total, 'ILS')}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-ph-ink">
                          {s.completedOrders}/{s.orders}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 min-w-[60px] rounded-full bg-ph-background overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.completionRate >= 70
                                    ? 'bg-emerald-500'
                                    : s.completionRate >= 40
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.max(s.completionRate, 2)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-ph-muted w-10 text-left">
                              {s.completionRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-ph-muted whitespace-nowrap">
                          {s.avgLeadTimeDays != null ? `${s.avgLeadTimeDays} يوم` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-amber-700">
                          {s.outstandingQuantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Recent orders */}
          <Panel title="أحدث أوامر الشراء" aside={`${recentOrders.length} أمر`}>
            {recentOrders.length === 0 ? (
              <EmptyRow text="لا توجد أوامر شراء مطابقة." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse min-w-[720px]">
                  <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                    <tr>
                      <th className="px-4 py-3 font-bold">رقم الأمر</th>
                      <th className="px-4 py-3 font-bold">المورد</th>
                      <th className="px-4 py-3 font-bold text-center">الحالة</th>
                      <th className="px-4 py-3 font-bold text-center">تاريخ الأمر</th>
                      <th className="px-4 py-3 font-bold text-center">البنود</th>
                      <th className="px-4 py-3 font-bold text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ph-border">
                    {recentOrders.map((po) => {
                      const meta = PO_STATUS_META[po.status];
                      return (
                        <tr key={po.id} className="hover:bg-ph-background/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-ph-ink whitespace-nowrap">
                            {po.orderNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-ph-ink leading-snug">
                              {po.supplierName ?? '—'}
                            </p>
                            {po.supplierCompany && (
                              <span className="text-[10px] text-ph-muted">
                                {po.supplierCompany}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.className}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-ph-muted whitespace-nowrap">
                            {formatDate(po.orderDate)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-ph-ink">
                            {po.itemsCount}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink whitespace-nowrap">
                            {formatMoney(po.grandTotal, po.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <p className="text-[10px] text-ph-muted text-center">
            البيانات محسوبة مباشرة من سجلات أوامر الشراء في قاعدة البيانات — آخر تحديث:{' '}
            {formatDate(result.generatedAt)}
          </p>
        </>
      ) : null}
    </motion.section>
  );
};

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

const KPI_TONES: Record<string, { box: string; icon: string; value: string }> = {
  brand: { box: 'border-ph-border bg-white', icon: 'text-ph-brand bg-ph-brand/10', value: 'text-ph-ink' },
  amber: { box: 'border-amber-200 bg-amber-50/50', icon: 'text-amber-700 bg-amber-100', value: 'text-amber-800' },
  sky: { box: 'border-sky-200 bg-sky-50/50', icon: 'text-sky-700 bg-sky-100', value: 'text-sky-800' },
  teal: { box: 'border-teal-200 bg-teal-50/50', icon: 'text-teal-700 bg-teal-100', value: 'text-teal-800' },
  emerald: { box: 'border-emerald-200 bg-emerald-50/50', icon: 'text-emerald-700 bg-emerald-100', value: 'text-emerald-800' },
  indigo: { box: 'border-indigo-200 bg-indigo-50/50', icon: 'text-indigo-700 bg-indigo-100', value: 'text-indigo-800' },
  red: { box: 'border-red-200 bg-red-50/50', icon: 'text-red-700 bg-red-100', value: 'text-red-700' },
};

function KpiTile({
  icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof KPI_TONES;
}) {
  const t = KPI_TONES[tone] ?? KPI_TONES.brand;
  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${t.box}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold text-ph-muted leading-snug">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${t.icon}`}>
          {icon}
        </span>
      </div>
      <p className={`text-xl font-black font-mono ${t.value}`}>{value}</p>
      {hint && <span className="text-[10px] text-ph-muted mt-1 block">{hint}</span>}
    </div>
  );
}

function Panel({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
      <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-ph-ink flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {aside && <span className="text-[11px] text-ph-muted whitespace-nowrap">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="px-5 py-6 text-xs text-ph-muted flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      {text}
    </p>
  );
}
