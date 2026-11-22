import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Eye,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react';
import {
  adminCreateSupplierApi,
  adminDeleteSupplierApi,
  adminFetchSuppliersApi,
  adminUpdateSupplierApi,
  adminUpdateSupplierStatusApi,
  type AdminSupplier,
  type AdminSupplierFormData,
  type AdminSupplierListResult,
  type AdminSupplierStatus,
} from '../../services/adminApi';
import { AdminSupplierFormModal } from './AdminSupplierFormModal';
import { AdminSupplierDetails } from './AdminSupplierDetails';

export interface AdminSuppliersPanelProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

type StatusFilter = 'ALL' | AdminSupplierStatus;

const EMPTY_RESULT: AdminSupplierListResult = {
  items: [],
  total: 0,
  active: 0,
  inactive: 0,
  totalPurchaseValue: 0,
};

const formatMoney = (value: number) =>
  `${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₪`;

export const AdminSuppliersPanel: React.FC<AdminSuppliersPanelProps> = ({ onToast }) => {
  const [result, setResult] = useState<AdminSupplierListResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [formModal, setFormModal] = useState<{ mode: 'add' | 'edit'; supplier?: AdminSupplier } | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<AdminSupplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const load = useCallback(
    async (params?: { search?: string; status?: AdminSupplierStatus }) => {
      setLoading(true);
      try {
        const data = await adminFetchSuppliersApi(params);
        setResult(data);
        setError(null);
      } catch (err: any) {
        const message = err?.message || 'تعذر جلب قائمة الموردين من الخادم';
        setResult(EMPTY_RESULT);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** Reload honouring the current filters. */
  const reload = useCallback(() => {
    return load({
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });
  }, [load, search, statusFilter]);

  /** Debounced server-side search / filter. */
  useEffect(() => {
    const timer = setTimeout(() => {
      load({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, load]);

  const handleSave = async (data: AdminSupplierFormData, id?: string) => {
    if (id) {
      await adminUpdateSupplierApi(id, data);
      onToast?.('تم تحديث بيانات المورد بنجاح');
    } else {
      await adminCreateSupplierApi(data);
      onToast?.('تمت إضافة المورد الجديد بنجاح');
    }
    await reload();
  };

  const handleDelete = async (supplier: AdminSupplier) => {
    setDeleting(true);
    try {
      await adminDeleteSupplierApi(supplier.id);
      onToast?.('تم حذف المورد بنجاح');
      setDeleteConfirm(null);
      await reload();
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر حذف المورد', 'err');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (supplier: AdminSupplier) => {
    try {
      const next: AdminSupplierStatus = supplier.isActive ? 'INACTIVE' : 'ACTIVE';
      await adminUpdateSupplierStatusApi(supplier.id, next);
      onToast?.(next === 'ACTIVE' ? 'تم تفعيل المورد' : 'تم تعطيل المورد');
      await reload();
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر تحديث حالة المورد', 'err');
    }
  };

  const activeCount = useMemo(
    () => result.items.filter((s) => s.isActive).length,
    [result.items],
  );
  const inactiveCount = useMemo(
    () => result.items.filter((s) => !s.isActive).length,
    [result.items],
  );

  /* ── Details "page" ── */
  if (detailsId) {
    return (
      <AdminSupplierDetails
        supplierId={detailsId}
        onBack={() => {
          setDetailsId(null);
          reload();
        }}
        onEdit={(supplier) => setFormModal({ mode: 'edit', supplier })}
        onToggleStatus={handleToggleStatus}
        onToast={onToast}
      />
    );
  }

  return (
    <section aria-labelledby="admin-suppliers-title" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="admin-suppliers-title" className="text-base font-black text-ph-ink flex items-center gap-2">
            <Truck className="h-4 w-4 text-ph-brand" />
            إدارة الموردين
          </h2>
          <p className="text-[11px] text-ph-muted mt-0.5">
            سجل الموردين، بيانات التواصل، الحالة، وإجمالي قيمة المشتريات لكل مورد
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({ mode: 'add' })}
          className="flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">إجمالي الموردين</span>
            <Truck className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-2xl font-black text-ph-ink font-mono">{result.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold">نشط</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-bold">غير نشط</span>
            <Power className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-700 font-mono">{inactiveCount}</p>
        </div>
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">قيمة المشتريات</span>
            <Wallet className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-lg font-black text-ph-ink font-mono">
            {formatMoney(result.totalPurchaseValue)}
          </p>
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
              placeholder="بحث بالاسم أو الشركة أو الهاتف أو البريد..."
              className="ph-input w-full pr-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {([
              { key: 'ALL', label: 'الكل' },
              { key: 'ACTIVE', label: 'نشط' },
              { key: 'INACTIVE', label: 'غير نشط' },
            ] as { key: StatusFilter; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
                  statusFilter === opt.key
                    ? opt.key === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : opt.key === 'INACTIVE'
                      ? 'bg-slate-600 text-white shadow-xs'
                      : 'bg-ph-brand text-white shadow-xs'
                    : 'bg-ph-background text-ph-muted hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="p-2 rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors disabled:opacity-50"
              title="تحديث الجدول"
              aria-label="تحديث الجدول"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-ph-brand' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
              <tr>
                <th className="px-4 py-3.5 font-bold">المورد</th>
                <th className="px-4 py-3.5 font-bold">معلومات التواصل</th>
                <th className="px-4 py-3.5 font-bold text-center">المدينة</th>
                <th className="px-4 py-3.5 font-bold text-center">الحالة</th>
                <th className="px-4 py-3.5 font-bold text-center">إجمالي المشتريات</th>
                <th className="px-4 py-3.5 font-bold text-center">الطلبات</th>
                <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ph-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-ph-muted">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-ph-brand" />
                    <p className="text-xs font-bold">جارٍ تحميل بيانات الموردين…</p>
                  </td>
                </tr>
              ) : result.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-ph-muted">
                    <Truck className="h-9 w-9 mx-auto mb-2 text-ph-border" />
                    <p className="text-xs font-bold">لا يوجد موردون مطابقون لخيارات البحث أو الفلترة</p>
                  </td>
                </tr>
              ) : (
                result.items.map((s) => (
                  <tr key={s.id} className="hover:bg-ph-background/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="min-w-0 max-w-[220px]">
                        <p className="font-bold text-ph-ink line-clamp-1 leading-snug">{s.name}</p>
                        {s.company && (
                          <span className="text-[10px] text-ph-muted truncate block">{s.company}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px] text-ph-muted space-y-0.5 leading-snug">
                        {s.contactName && (
                          <p className="text-ph-ink font-semibold">{s.contactName}</p>
                        )}
                        <p className="font-mono" dir="ltr">{s.phone}</p>
                        {s.email && (
                          <p className="font-mono truncate max-w-[200px]" dir="ltr">{s.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-ph-muted">{s.city || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${
                          s.isActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {s.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink">
                      {formatMoney(s.totalPurchaseValue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-ph-ink">
                        <ShoppingCart className="h-3.5 w-3.5 text-ph-muted" />
                        {s.purchaseOrdersCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailsId(s.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-ph-brand hover:text-white text-ph-ink transition-colors"
                          title="عرض التفاصيل وسجل المشتريات"
                          aria-label={`عرض تفاصيل ${s.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormModal({ mode: 'edit', supplier: s })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-ph-brand hover:text-white text-ph-ink transition-colors"
                          title="تعديل المورد"
                          aria-label={`تعديل ${s.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            s.isActive
                              ? 'bg-slate-100 text-ph-muted hover:bg-slate-600 hover:text-white'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                          }`}
                          title={s.isActive ? 'تعطيل المورد' : 'تفعيل المورد'}
                          aria-label={`${s.isActive ? 'تعطيل' : 'تفعيل'} ${s.name}`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(s)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-ph-muted transition-colors"
                          title="حذف المورد"
                          aria-label={`حذف ${s.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
              <span>•</span>
              <span className="text-emerald-700">
                نشط: <strong className="font-mono">{activeCount}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-700">
                غير نشط: <strong className="font-mono">{inactiveCount}</strong>
              </span>
            </div>
            <span className="text-[11px]">مصدر البيانات: PostgreSQL عبر NestJS Suppliers API</span>
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
              <p className="text-xs font-black">تعذر تحميل قائمة الموردين</p>
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

      {/* Add / Edit modal */}
      {formModal && (
        <AdminSupplierFormModal
          mode={formModal.mode}
          initial={
            formModal.supplier
              ? {
                  id: formModal.supplier.id,
                  name: formModal.supplier.name,
                  company: formModal.supplier.company ?? '',
                  contactName: formModal.supplier.contactName ?? '',
                  phone: formModal.supplier.phone,
                  email: formModal.supplier.email ?? '',
                  address: formModal.supplier.address ?? '',
                  city: formModal.supplier.city ?? '',
                  notes: formModal.supplier.notes ?? '',
                  status: formModal.supplier.status,
                }
              : undefined
          }
          onSave={handleSave}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="rounded-3xl bg-white p-6 shadow-2xl max-w-sm w-full text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-ph-ink">حذف المورد</h3>
            <p className="text-xs text-ph-muted leading-relaxed">
              هل أنت متأكد من حذف المورد «{deleteConfirm.name}»؟ لا يمكن حذف مورد مرتبط بطلبات شراء.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>نعم، احذف المورد</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
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
