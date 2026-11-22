import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  PackageCheck,
  PackageX,
  RefreshCw,
  Search,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchPurchaseOrderApi,
  adminFetchPurchaseOrdersApi,
  adminReceivePurchaseOrderApi,
  type AdminPurchaseOrderDetails,
  type AdminPurchaseOrderListItem,
  type AdminReceiveLineInput,
} from '../../services/adminApi';
import { AdminReceivePurchaseOrderModal } from './AdminReceivePurchaseOrderModal';
import {
  PO_RECEIVABLE_STATUSES,
  PO_STATUS_META,
  formatDate,
  poStatusLabel,
  sortByCreatedDesc,
} from './purchaseOrderUtils';

export interface AdminGoodsReceiptPanelProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
  /** Opens the full purchase-order view (handled by the parent panel). */
  onOpenOrder?: (orderId: string) => void;
}

interface ReceiptTotals {
  ordered: number;
  received: number;
  remaining: number;
  progress: number;
}

/** Rolls a loaded order's lines up into receipt progress totals. */
function receiptTotals(details?: AdminPurchaseOrderDetails | null): ReceiptTotals | null {
  if (!details) return null;
  let ordered = 0;
  let received = 0;
  let remaining = 0;
  for (const item of details.items) {
    ordered += item.orderedQuantity;
    received += item.receivedQuantity;
    remaining += item.remainingQuantity;
  }
  const progress = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
  return { ordered, received, remaining, progress };
}

export const AdminGoodsReceiptPanel: React.FC<AdminGoodsReceiptPanelProps> = ({
  onToast,
  onOpenOrder,
}) => {
  const [orders, setOrders] = useState<AdminPurchaseOrderListItem[]>([]);
  const [details, setDetails] = useState<Record<string, AdminPurchaseOrderDetails>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchPurchaseOrdersApi();
      setOrders(result.items);

      // Fetch line-level details for every receivable order so remaining
      // quantities can be shown without opening each order individually.
      const receivable = result.items.filter((o) =>
        PO_RECEIVABLE_STATUSES.includes(o.status),
      );
      const fetched = await Promise.all(
        receivable.map((o) =>
          adminFetchPurchaseOrderApi(o.id).catch(() => null as AdminPurchaseOrderDetails | null),
        ),
      );
      const map: Record<string, AdminPurchaseOrderDetails> = {};
      fetched.forEach((d) => {
        if (d) map[d.id] = d;
      });
      setDetails(map);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب أوامر الشراء القابلة للاستلام من الخادم';
      setOrders([]);
      setDetails({});
      setError(message);
      onToast?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const sorted = sortByCreatedDesc(orders);
    const query = search.trim().toLowerCase();
    return sorted.filter((po) => {
      if (!showAll && !PO_RECEIVABLE_STATUSES.includes(po.status)) return false;
      if (!query) return true;
      return (
        po.orderNumber.toLowerCase().includes(query) ||
        (po.supplier?.name ?? '').toLowerCase().includes(query) ||
        (po.supplier?.company ?? '').toLowerCase().includes(query)
      );
    });
  }, [orders, search, showAll]);

  const stats = useMemo(() => {
    const receivable = orders.filter((o) => PO_RECEIVABLE_STATUSES.includes(o.status));
    let awaiting = 0;
    let partial = 0;
    let remainingUnits = 0;
    for (const po of receivable) {
      const t = receiptTotals(details[po.id]);
      if (!t) continue;
      if (t.received === 0) awaiting += 1;
      else partial += 1;
      remainingUnits += t.remaining;
    }
    const received = orders.filter((o) => o.status === 'RECEIVED').length;
    return { receivable: receivable.length, awaiting, partial, remainingUnits, received };
  }, [orders, details]);

  const activeOrder = activeOrderId ? details[activeOrderId] ?? null : null;

  const handleConfirmReceipt = async (payload: {
    items: AdminReceiveLineInput[];
    notes?: string;
  }) => {
    if (!activeOrderId) return;
    const updated = await adminReceivePurchaseOrderApi(activeOrderId, payload);
    onToast?.(`تم تسجيل الاستلام — الحالة الآن «${poStatusLabel(updated.status)}»`);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ph-muted" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-ph-brand" />
        <span className="text-sm font-bold">جارٍ تحميل الاستلامات…</span>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="admin-goods-receipt-title"
      className="space-y-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-goods-receipt-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <PackageCheck className="h-4 w-4 text-teal-600" />
            استلام البضائع
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            تسجيل الكميات المستلمة فعلياً لكل أمر شراء. تأكيد الاستلام يزيد المخزون ويسجّل حركة
            مخزون مرتبطة بالأمر.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors disabled:opacity-50 text-xs font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-ph-brand' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">أوامر قابلة للاستلام</span>
            <PackageCheck className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-ph-ink font-mono">{stats.receivable}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">لم يبدأ استلامها</span>
            <PackageX className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 font-mono">{stats.awaiting}</p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-teal-800 mb-2">
            <span className="text-xs font-bold">استلام جزئي</span>
            <PackageCheck className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 font-mono">{stats.partial}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold">مستلم بالكامل</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono">{stats.received}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 border-b border-ph-border p-4">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ph-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم أمر الشراء أو اسم المورد..."
              className="ph-input w-full pr-10 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap border ${
              showAll
                ? 'bg-ph-brand text-white border-ph-brand shadow-xs'
                : 'bg-ph-background text-ph-muted border-ph-border hover:bg-slate-200'
            }`}
          >
            {showAll ? 'عرض القابلة للاستلام فقط' : 'عرض كل الأوامر'}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse min-w-[900px]">
            <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
              <tr>
                <th className="px-4 py-3.5 font-bold">رقم الأمر</th>
                <th className="px-4 py-3.5 font-bold">المورد</th>
                <th className="px-4 py-3.5 font-bold text-center">حالة الأمر</th>
                <th className="px-4 py-3.5 font-bold text-center">حالة الاستلام</th>
                <th className="px-4 py-3.5 font-bold text-center">المطلوب</th>
                <th className="px-4 py-3.5 font-bold text-center">المستلم</th>
                <th className="px-4 py-3.5 font-bold text-center">المتبقي</th>
                <th className="px-4 py-3.5 font-bold text-center">التسليم المتوقع</th>
                <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ph-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-ph-muted">
                    <PackageCheck className="h-9 w-9 mx-auto mb-2 text-ph-border" />
                    <p className="text-xs font-bold">
                      {showAll
                        ? 'لا توجد أوامر شراء مطابقة للبحث'
                        : 'لا توجد أوامر شراء قابلة للاستلام حالياً'}
                    </p>
                    {!showAll && (
                      <p className="text-[11px] text-ph-muted mt-1">
                        تظهر هنا الأوامر المعتمدة أو المُرسلة أو المستلمة جزئياً.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((po) => {
                  const t = receiptTotals(details[po.id]);
                  const meta = PO_STATUS_META[po.status];
                  const receivable = PO_RECEIVABLE_STATUSES.includes(po.status);
                  return (
                    <tr key={po.id} className="hover:bg-ph-background/80 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenOrder?.(po.id)}
                          disabled={!onOpenOrder}
                          className="font-mono font-bold text-ph-brand hover:underline disabled:no-underline disabled:cursor-default"
                        >
                          {po.orderNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 max-w-[180px]">
                          <p className="font-bold text-ph-ink line-clamp-1 leading-snug">
                            {po.supplier?.name ?? '—'}
                          </p>
                          {po.supplier?.company && (
                            <span className="text-[10px] text-ph-muted truncate block">
                              {po.supplier.company}
                            </span>
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
                      <td className="px-4 py-3 text-center">
                        <ReceiptStatusBadge status={po.status} totals={t} />
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-ph-ink">
                        {t ? t.ordered : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-teal-700">
                        {t ? t.received : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">
                        {t ? t.remaining : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-ph-muted">
                        {formatDate(po.expectedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveOrderId(po.id)}
                            disabled={!receivable || !details[po.id]}
                            title={
                              receivable
                                ? 'تسجيل استلام كميات'
                                : `لا يمكن الاستلام في حالة «${meta.label}»`
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-100 disabled:text-ph-muted text-white font-bold px-3 py-1.5 text-[11px] transition-colors"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>تسجيل استلام</span>
                          </button>
                          {onOpenOrder && (
                            <button
                              type="button"
                              onClick={() => onOpenOrder(po.id)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-ph-brand hover:text-white text-ph-ink transition-colors"
                              title="عرض تفاصيل أمر الشراء"
                              aria-label={`عرض تفاصيل ${po.orderNumber}`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="border-t border-ph-border bg-ph-background/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-ph-muted">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                المعروض: <strong className="text-ph-ink font-mono">{rows.length}</strong>
              </span>
              <span>•</span>
              <span>
                إجمالي الوحدات المتبقية:{' '}
                <strong className="text-amber-700 font-mono">{stats.remainingUnits}</strong>
              </span>
            </div>
            <span className="text-[11px]">مصدر البيانات: PostgreSQL عبر NestJS Purchase Orders API</span>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black">تعذر تحميل بيانات الاستلام</p>
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

      {/* Receipt entry modal (the explicit confirmation step) */}
      {activeOrder && (
        <AdminReceivePurchaseOrderModal
          order={activeOrder}
          onConfirm={handleConfirmReceipt}
          onClose={() => setActiveOrderId(null)}
          onToast={onToast}
        />
      )}
    </motion.section>
  );
};

/* ── Receipt status is distinct from the order status badge ── */
function ReceiptStatusBadge({
  status,
  totals,
}: {
  status: AdminPurchaseOrderListItem['status'];
  totals: ReceiptTotals | null;
}) {
  if (!totals) {
    if (status === 'RECEIVED') {
      return <Chip tone="emerald" label="مكتمل الاستلام" pct={100} />;
    }
    if (status === 'CANCELLED') {
      return <Chip tone="red" label="ملغى" />;
    }
    return <span className="text-[11px] text-ph-muted">غير متاح</span>;
  }

  if (totals.remaining === 0) {
    return <Chip tone="emerald" label="مكتمل الاستلام" pct={100} />;
  }
  if (totals.received > 0) {
    return <Chip tone="teal" label="استلام جزئي" pct={totals.progress} />;
  }
  return <Chip tone="slate" label="لم يبدأ الاستلام" pct={0} />;
}

const CHIP_TONES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

const BAR_TONES: Record<string, string> = {
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-400',
  red: 'bg-red-500',
};

function Chip({ tone, label, pct }: { tone: string; label: string; pct?: number }) {
  return (
    <div className="inline-flex flex-col items-center gap-1 min-w-[110px]">
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${CHIP_TONES[tone]}`}
      >
        {label}
      </span>
      {pct != null && (
        <div className="h-1 w-full max-w-[110px] rounded-full bg-ph-border overflow-hidden">
          <div
            className={`h-full rounded-full ${BAR_TONES[tone]}`}
            style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
