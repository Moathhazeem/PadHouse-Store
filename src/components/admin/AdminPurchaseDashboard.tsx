import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingCart,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchProductsApi,
  adminFetchPurchaseOrdersApi,
  adminFetchSuppliersApi,
  type AdminPurchaseOrderListItem,
  type AdminPurchaseOrderListResult,
  type AdminSupplierListResult,
} from '../../services/adminApi';
import type { Product } from '../../types';
import { calculateStockStatus } from './AdminInventoryTable';
import {
  PO_STATUS_META,
  aggregateBySupplier,
  countByStatus,
  formatDate,
  formatMoney,
  isCommittedOrder,
  sortByCreatedDesc,
  sumGrandTotal,
  type PurchaseSection,
} from './purchaseOrderUtils';

export interface AdminPurchaseDashboardProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
  /** Lets the dashboard jump to another Purchase Management section. */
  onNavigate?: (section: PurchaseSection) => void;
}

const EMPTY_ORDERS: AdminPurchaseOrderListResult = {
  items: [],
  total: 0,
  byStatus: {},
  totalValue: 0,
};

const EMPTY_SUPPLIERS: AdminSupplierListResult = {
  items: [],
  total: 0,
  active: 0,
  inactive: 0,
  totalPurchaseValue: 0,
};

export const AdminPurchaseDashboard: React.FC<AdminPurchaseDashboardProps> = ({
  onToast,
  onNavigate,
}) => {
  const [orders, setOrders] = useState<AdminPurchaseOrderListResult>(EMPTY_ORDERS);
  const [suppliers, setSuppliers] = useState<AdminSupplierListResult>(EMPTY_SUPPLIERS);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        adminFetchPurchaseOrdersApi(),
        adminFetchSuppliersApi(),
        adminFetchProductsApi(),
      ]);
      setOrders(ordersRes);
      setSuppliers(suppliersRes);
      setProducts(productsRes);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب بيانات لوحة المشتريات من الخادم';
      setOrders(EMPTY_ORDERS);
      setSuppliers(EMPTY_SUPPLIERS);
      setProducts([]);
      setError(message);
      onToast?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => countByStatus(orders.items, orders.byStatus),
    [orders.items, orders.byStatus],
  );
  const committedValue = useMemo(
    () => sumGrandTotal(orders.items, isCommittedOrder),
    [orders.items],
  );
  const recentOrders = useMemo(
    () => sortByCreatedDesc(orders.items).slice(0, 6),
    [orders.items],
  );
  const pendingApprovals = useMemo(
    () => sortByCreatedDesc(orders.items.filter((po) => po.status === 'PENDING_APPROVAL')),
    [orders.items],
  );
  const topSuppliers = useMemo(
    () => aggregateBySupplier(orders.items).slice(0, 5),
    [orders.items],
  );
  const lowStockProducts = useMemo(
    () => products.filter((p) => calculateStockStatus(p) !== 'healthy'),
    [products],
  );
  const maxSupplierValue = topSuppliers[0]?.total ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ph-muted" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-ph-brand" />
        <span className="text-sm font-bold">جارٍ تحميل لوحة المشتريات…</span>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="admin-purchase-dashboard-title"
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-purchase-dashboard-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4 text-ph-brand" />
            لوحة المشتريات
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            نظرة شاملة على أوامر الشراء، الاعتمادات المعلّقة، أفضل الموردين، والأصناف التي تحتاج توريداً
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('purchase-orders')}
          className="flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>إنشاء أمر شراء</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black">تعذر تحميل لوحة المشتريات</p>
              <p className="text-[11px] text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="shrink-0 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="إجمالي أوامر الشراء"
          value={String(orders.total)}
          hint="مسجلة في النظام"
          icon={<ShoppingCart className="h-4 w-4 text-ph-brand" />}
        />
        <StatCard
          label="بانتظار الموافقة"
          value={String(counts.PENDING_APPROVAL)}
          hint="تحتاج اعتماداً"
          tone="amber"
          icon={<Clock className="h-4 w-4" />}
          onClick={() => onNavigate?.('purchase-orders')}
        />
        <StatCard
          label="قيمة المشتريات"
          value={formatMoney(committedValue, 'ILS')}
          hint="بدون الأوامر الملغاة"
          icon={<Wallet className="h-4 w-4 text-ph-brand" />}
        />
        <StatCard
          label="موردون نشطون"
          value={`${suppliers.active} / ${suppliers.total}`}
          hint="نشط من إجمالي الموردين"
          icon={<Truck className="h-4 w-4 text-ph-brand" />}
          onClick={() => onNavigate?.('suppliers')}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniStat
          label="مسودات"
          value={counts.DRAFT}
          className={PO_STATUS_META.DRAFT.className}
        />
        <MiniStat
          label="معتمد"
          value={counts.APPROVED}
          className={PO_STATUS_META.APPROVED.className}
        />
        <MiniStat
          label="مُرسل للمورد"
          value={counts.SENT}
          className={PO_STATUS_META.SENT.className}
        />
        <MiniStat
          label="مستلم جزئياً"
          value={counts.PARTIALLY_RECEIVED}
          className={PO_STATUS_META.PARTIALLY_RECEIVED.className}
        />
        <MiniStat
          label="مستلم بالكامل"
          value={counts.RECEIVED}
          className={PO_STATUS_META.RECEIVED.className}
        />
      </div>

      {orders.total === 0 && !error ? (
        <EmptyState
          icon={<ShoppingCart className="h-9 w-9 mx-auto mb-2 text-ph-border" />}
          title="لا توجد أوامر شراء بعد"
          description="ابدأ بإنشاء أول أمر شراء لتفعيل لوحة المشتريات والتحليلات."
          actionLabel="إنشاء أمر شراء"
          onAction={() => onNavigate?.('purchase-orders')}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Recent orders */}
          <div className="xl:col-span-2 rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
            <PanelHeader
              title="أحدث أوامر الشراء"
              icon={<ClipboardList className="h-4 w-4 text-ph-brand" />}
              action={
                <button
                  type="button"
                  onClick={() => onNavigate?.('purchase-orders')}
                  className="text-[11px] font-bold text-ph-brand hover:text-ph-brand-hover"
                >
                  عرض الكل
                </button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse min-w-[560px]">
                <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">رقم الأمر</th>
                    <th className="px-4 py-3 font-bold">المورد</th>
                    <th className="px-4 py-3 font-bold text-center">الحالة</th>
                    <th className="px-4 py-3 font-bold text-center">التسليم المتوقع</th>
                    <th className="px-4 py-3 font-bold text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ph-border">
                  {recentOrders.map((po) => (
                    <OrderRow key={po.id} po={po} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-5">
            {/* Pending approvals */}
            <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
              <PanelHeader
                title="اعتمادات معلّقة"
                icon={<Clock className="h-4 w-4 text-amber-600" />}
                action={
                  <span className="text-[11px] font-mono font-black text-amber-700">
                    {pendingApprovals.length}
                  </span>
                }
              />
              {pendingApprovals.length === 0 ? (
                <p className="px-5 py-6 text-xs text-ph-muted flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  لا توجد أوامر بانتظار الموافقة حالياً.
                </p>
              ) : (
                <ul className="divide-y divide-ph-border">
                  {pendingApprovals.slice(0, 5).map((po) => (
                    <li key={po.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-black text-ph-ink">
                          {po.orderNumber}
                        </p>
                        <p className="text-[11px] text-ph-muted truncate">
                          {po.supplier?.name ?? '—'}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-ph-ink whitespace-nowrap">
                        {formatMoney(po.grandTotal, po.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top suppliers */}
            <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
              <PanelHeader
                title="أعلى الموردين بالقيمة"
                icon={<Truck className="h-4 w-4 text-ph-brand" />}
                action={
                  <button
                    type="button"
                    onClick={() => onNavigate?.('suppliers')}
                    className="text-[11px] font-bold text-ph-brand hover:text-ph-brand-hover"
                  >
                    إدارة
                  </button>
                }
              />
              {topSuppliers.length === 0 ? (
                <p className="px-5 py-6 text-xs text-ph-muted">لا توجد مشتريات مسجّلة بعد.</p>
              ) : (
                <ul className="p-4 space-y-3">
                  {topSuppliers.map((s) => {
                    const pct = maxSupplierValue > 0 ? (s.total / maxSupplierValue) * 100 : 0;
                    return (
                      <li key={s.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-ph-ink truncate">{s.name}</span>
                          <span className="font-mono font-bold text-ph-ink whitespace-nowrap">
                            {formatMoney(s.total, 'ILS')}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-ph-background overflow-hidden">
                          <div
                            className="h-full rounded-full bg-ph-brand"
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-ph-muted">
                          {s.orders} أمر شراء
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products needing purchase */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        <PanelHeader
          title="أصناف تحتاج توريداً (مخزون منخفض أو نافد)"
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          action={
            <span className="text-[11px] font-mono font-black text-amber-700">
              {lowStockProducts.length}
            </span>
          }
        />
        {lowStockProducts.length === 0 ? (
          <p className="px-5 py-6 text-xs text-ph-muted flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            جميع الأصناف ضمن مستويات المخزون الآمنة.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse min-w-[560px]">
              <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">الصنف</th>
                  <th className="px-4 py-3 font-bold text-center">الرمز</th>
                  <th className="px-4 py-3 font-bold text-center">المخزون الحالي</th>
                  <th className="px-4 py-3 font-bold text-center">الحد الأدنى</th>
                  <th className="px-4 py-3 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ph-border">
                {lowStockProducts.slice(0, 8).map((p) => {
                  const status = calculateStockStatus(p);
                  const min = (p as any).minStock ?? p.minThreshold ?? 5;
                  return (
                    <tr key={p.id} className="hover:bg-ph-background/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-ph-ink line-clamp-1">
                        {p.nameAr || p.name}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-ph-muted">{p.sku}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink">
                        {p.stock}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-ph-muted">{min}</td>
                      <td className="px-4 py-3 text-center">
                        {status === 'out_of_stock' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-black text-red-700">
                            <XCircle className="h-3 w-3" />
                            نفد المخزون
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            مخزون منخفض
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt shortcut */}
      {(counts.APPROVED > 0 || counts.SENT > 0 || counts.PARTIALLY_RECEIVED > 0) && (
        <div className="rounded-3xl border border-teal-200 bg-teal-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shrink-0">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-teal-900">أوامر بانتظار استلام البضائع</p>
              <p className="text-[11px] text-teal-800 mt-0.5">
                {counts.APPROVED + counts.SENT + counts.PARTIALLY_RECEIVED} أمر شراء جاهز لتسجيل
                استلام الكميات وتحديث المخزون.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('goods-receipts')}
            className="shrink-0 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            <PackageCheck className="h-4 w-4" />
            <span>الانتقال إلى الاستلام</span>
          </button>
        </div>
      )}
    </motion.section>
  );
};

/* ── Small presentational helpers ── */

function PanelHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex items-center justify-between gap-3">
      <h3 className="text-sm font-black text-ph-ink flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

function OrderRow({ po }: { po: AdminPurchaseOrderListItem }) {
  const meta = PO_STATUS_META[po.status];
  return (
    <tr className="hover:bg-ph-background/70 transition-colors">
      <td className="px-4 py-3 font-mono font-bold text-ph-ink">{po.orderNumber}</td>
      <td className="px-4 py-3">
        <div className="min-w-0 max-w-[180px]">
          <p className="font-bold text-ph-ink line-clamp-1 leading-snug">
            {po.supplier?.name ?? '—'}
          </p>
          {po.supplier?.company && (
            <span className="text-[10px] text-ph-muted truncate block">{po.supplier.company}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}
        >
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-ph-muted">{formatDate(po.expectedAt)}</td>
      <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink whitespace-nowrap">
        {formatMoney(po.grandTotal, po.currency)}
      </td>
    </tr>
  );
}

const TONE_STYLES: Record<string, { wrap: string; value: string; label: string }> = {
  default: { wrap: 'border-ph-border bg-white', value: 'text-ph-ink', label: 'text-ph-muted' },
  amber: {
    wrap: 'border-amber-200 bg-amber-50/60',
    value: 'text-amber-800',
    label: 'text-amber-800',
  },
};

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'default' | 'amber';
  onClick?: () => void;
}) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.default;
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border p-4 shadow-2xs text-right ${styles.wrap} ${
        onClick ? 'transition-colors hover:border-ph-brand/40 cursor-pointer' : ''
      }`}
    >
      <div className={`flex items-center justify-between mb-2 ${styles.label}`}>
        <span className="text-xs font-bold">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-black font-mono ${styles.value}`}>{value}</p>
      {hint && <span className={`text-[10px] mt-1 block ${styles.label}`}>{hint}</span>}
    </Comp>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 shadow-2xs ${className}`}>
      <p className="text-[11px] font-bold mb-1">{label}</p>
      <p className="text-xl font-black font-mono">{value}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-ph-border bg-white px-6 py-14 text-center">
      {icon}
      <p className="text-sm font-black text-ph-ink">{title}</p>
      <p className="text-xs text-ph-muted mt-1 max-w-sm mx-auto">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
      >
        <Plus className="h-4 w-4" />
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}
