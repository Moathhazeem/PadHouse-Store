import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  adminCreatePurchaseOrderApi,
  adminDeletePurchaseOrderApi,
  adminFetchPurchaseOrderApi,
  adminFetchPurchaseOrdersApi,
  adminUpdatePurchaseOrderApi,
  type AdminPurchaseOrderDetails,
  type AdminPurchaseOrderFormData,
  type AdminPurchaseOrderListItem,
  type AdminPurchaseOrderListResult,
  type PurchaseOrderStatus,
} from '../../services/adminApi';
import { AdminPurchaseOrderFormModal } from './AdminPurchaseOrderFormModal';
import { AdminPurchaseOrderDetails as AdminPurchaseOrderDetailsView } from './AdminPurchaseOrderDetails';
import {
  PO_STATUS_META,
  PO_WORKFLOW,
  formatDate,
  formatMoney,
} from './purchaseOrderUtils';

export interface AdminPurchaseOrdersPanelProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
  /** Order id to auto-open in the details view (handoff from another purchase section). */
  initialOrderId?: string | null;
  /** Called after the initial order has been opened so the parent can clear it. */
  onInitialOrderConsumed?: () => void;
}

type StatusFilter = 'ALL' | PurchaseOrderStatus;

const EMPTY_RESULT: AdminPurchaseOrderListResult = {
  items: [],
  total: 0,
  byStatus: {},
  totalValue: 0,
};

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'الكل' },
  ...PO_WORKFLOW.map((s) => ({ key: s as StatusFilter, label: PO_STATUS_META[s].label })),
  { key: 'CANCELLED', label: PO_STATUS_META.CANCELLED.label },
];

export const AdminPurchaseOrdersPanel: React.FC<AdminPurchaseOrdersPanelProps> = ({
  onToast,
  initialOrderId,
  onInitialOrderConsumed,
}) => {
  const [result, setResult] = useState<AdminPurchaseOrderListResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [formModal, setFormModal] = useState<
    { mode: 'add' } | { mode: 'edit'; order: AdminPurchaseOrderDetails } | null
  >(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPurchaseOrderListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const load = useCallback(
    async (params?: { search?: string; status?: PurchaseOrderStatus }) => {
      setLoading(true);
      try {
        const data = await adminFetchPurchaseOrdersApi(params);
        setResult(data);
        setError(null);
      } catch (err: any) {
        const message = err?.message || 'تعذر جلب قائمة أوامر الشراء من الخادم';
        setResult(EMPTY_RESULT);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reload = useCallback(
    () =>
      load({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    [load, search, statusFilter],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      load({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, load]);

  /* Auto-open an order handed off from another purchase section. */
  useEffect(() => {
    if (!initialOrderId) return;
    setDetailsId(initialOrderId);
    onInitialOrderConsumed?.();
  }, [initialOrderId, onInitialOrderConsumed]);

  const handleSave = async (data: AdminPurchaseOrderFormData, id?: string) => {
    if (id) {
      const updated = await adminUpdatePurchaseOrderApi(id, data);
      onToast?.('تم تحديث مسودة أمر الشراء بنجاح');
      await reload();
      setDetailsId(updated.id);
      return;
    }
    const created = await adminCreatePurchaseOrderApi(data);
    onToast?.(`تم إنشاء أمر الشراء ${created.orderNumber} بنجاح`);
    await reload();
    setDetailsId(created.id);
  };

  /** Load full details before opening the edit-draft modal. */
  const openEdit = async (id: string) => {
    setEditLoadingId(id);
    try {
      const order = await adminFetchPurchaseOrderApi(id);
      setFormModal({ mode: 'edit', order });
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر تحميل بيانات المسودة', 'err');
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeletePurchaseOrderApi(deleteTarget.id);
      onToast?.('تم حذف مسودة أمر الشراء بنجاح');
      setDeleteTarget(null);
      await reload();
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر حذف أمر الشراء', 'err');
    } finally {
      setDeleting(false);
    }
  };

  const hasStatus = (status: PurchaseOrderStatus) => (result.byStatus[status] ?? 0) > 0;

  /* ── Details "page" ── */
  if (detailsId) {
    return (
      <AdminPurchaseOrderDetailsView
        orderId={detailsId}
        onBack={() => {
          setDetailsId(null);
          reload();
        }}
        onEdit={(order) => setFormModal({ mode: 'edit', order })}
        onToast={onToast}
      />
    );
  }

  return (
    <section aria-labelledby="admin-purchase-orders-title" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="admin-purchase-orders-title"
            className="text-base font-black text-ph-ink flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4 text-ph-brand" />
            أوامر الشراء
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            دورة حياة كاملة: مسودة ← بانتظار الموافقة ← معتمد ← مُرسل ← استلام — مع سجل تغييرات كامل
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({ mode: 'add' })}
          className="flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>إنشاء أمر شراء</span>
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">إجمالي الأوامر</span>
            <ShoppingCart className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-2xl font-black text-ph-ink font-mono">{result.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">بانتظار الموافقة</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 font-mono">
            {result.byStatus.PENDING_APPROVAL ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-sky-800 mb-2">
            <span className="text-xs font-bold">معتمد / مُرسل</span>
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-800 font-mono">
            {(result.byStatus.APPROVED ?? 0) + (result.byStatus.SENT ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-teal-800 mb-2">
            <span className="text-xs font-bold">قيد/تم الاستلام</span>
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 font-mono">
            {(result.byStatus.PARTIALLY_RECEIVED ?? 0) + (result.byStatus.RECEIVED ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">قيمة الأوامر</span>
            <Wallet className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-lg font-black text-ph-ink font-mono">
            {formatMoney(result.totalValue, 'ILS')}
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-ph-border p-4">
          <div className="flex flex-col sm:flex-row gap-3">
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
              onClick={reload}
              disabled={loading}
              className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors disabled:opacity-50"
              title="تحديث الجدول"
              aria-label="تحديث الجدول"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-ph-brand' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === opt.key
                    ? 'bg-ph-brand text-white shadow-xs'
                    : 'bg-ph-background text-ph-muted hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
              <tr>
                <th className="px-4 py-3.5 font-bold">رقم الأمر</th>
                <th className="px-4 py-3.5 font-bold">المورد</th>
                <th className="px-4 py-3.5 font-bold text-center">الحالة</th>
                <th className="px-4 py-3.5 font-bold text-center">البنود</th>
                <th className="px-4 py-3.5 font-bold text-center">تاريخ الطلب</th>
                <th className="px-4 py-3.5 font-bold text-center">التسليم المتوقع</th>
                <th className="px-4 py-3.5 font-bold text-center">الإجمالي</th>
                <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ph-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-ph-muted">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-ph-brand" />
                    <p className="text-xs font-bold">جارٍ تحميل أوامر الشراء…</p>
                  </td>
                </tr>
              ) : result.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-ph-muted">
                    <ShoppingCart className="h-9 w-9 mx-auto mb-2 text-ph-border" />
                    <p className="text-xs font-bold">لا توجد أوامر شراء مطابقة للبحث أو الفلترة</p>
                  </td>
                </tr>
              ) : (
                result.items.map((po) => {
                  const meta = PO_STATUS_META[po.status];
                  const isDraft = po.status === 'DRAFT';
                  return (
                    <tr key={po.id} className="hover:bg-ph-background/80 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDetailsId(po.id)}
                          className="font-mono font-bold text-ph-brand hover:underline"
                        >
                          {po.orderNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 max-w-[200px]">
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
                      <td className="px-4 py-3 text-center font-mono text-ph-ink">{po.itemsCount}</td>
                      <td className="px-4 py-3 text-center text-ph-muted">
                        {formatDate(po.orderDate)}
                      </td>
                      <td className="px-4 py-3 text-center text-ph-muted">
                        {formatDate(po.expectedAt)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink whitespace-nowrap">
                        {formatMoney(po.grandTotal, po.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailsId(po.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-ph-brand hover:text-white text-ph-ink transition-colors"
                            title="عرض التفاصيل وإجراءات الاعتماد"
                            aria-label={`عرض تفاصيل ${po.orderNumber}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(po.id)}
                            disabled={!isDraft || editLoadingId === po.id}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-ph-brand hover:text-white text-ph-ink transition-colors disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-ph-ink"
                            title={isDraft ? 'تعديل المسودة' : 'التعديل متاح للمسودات فقط'}
                            aria-label={`تعديل ${po.orderNumber}`}
                          >
                            {editLoadingId === po.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Edit2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(po)}
                            disabled={!isDraft}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-ph-muted transition-colors disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-ph-muted"
                            title={isDraft ? 'حذف المسودة' : 'الحذف متاح للمسودات فقط'}
                            aria-label={`حذف ${po.orderNumber}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
        {!loading && result.items.length > 0 && (
          <div className="border-t border-ph-border bg-ph-background/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-ph-muted">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                النتائج: <strong className="text-ph-ink font-mono">{result.total}</strong>
              </span>
              {hasStatus('DRAFT') && (
                <>
                  <span>•</span>
                  <span>مسودات: <strong className="font-mono">{result.byStatus.DRAFT}</strong></span>
                </>
              )}
              {hasStatus('RECEIVED') && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700">
                    مستلمة: <strong className="font-mono">{result.byStatus.RECEIVED}</strong>
                  </span>
                </>
              )}
              {hasStatus('CANCELLED') && (
                <>
                  <span>•</span>
                  <span className="text-red-600">
                    ملغاة: <strong className="font-mono">{result.byStatus.CANCELLED}</strong>
                  </span>
                </>
              )}
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
              <p className="text-xs font-black">تعذر تحميل أوامر الشراء</p>
              <p className="text-[11px] text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="shrink-0 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Create / Edit draft modal */}
      {formModal && (
        <AdminPurchaseOrderFormModal
          mode={formModal.mode}
          initial={formModal.mode === 'edit' ? formModal.order : null}
          onSave={handleSave}
          onClose={() => setFormModal(null)}
          onToast={onToast}
        />
      )}

      {/* Delete draft confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="rounded-3xl bg-white p-6 shadow-2xl max-w-sm w-full text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-ph-ink">حذف مسودة أمر الشراء</h3>
            <p className="text-xs text-ph-muted leading-relaxed">
              هل أنت متأكد من حذف المسودة «{deleteTarget.orderNumber}»؟ لا يمكن التراجع عن هذا
              الإجراء. الحذف متاح للمسودات فقط.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>نعم، احذف المسودة</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 border border-ph-border text-ph-ink font-bold py-2.5 rounded-xl text-xs hover:bg-ph-background transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
