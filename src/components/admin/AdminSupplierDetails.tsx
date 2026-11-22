import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Edit2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingCart,
  Truck,
  User,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchSupplierApi,
  type AdminSupplierDetails as AdminSupplierDetailsData,
  type AdminSupplierStatus,
} from '../../services/adminApi';

export interface AdminSupplierDetailsProps {
  supplierId: string;
  onBack: () => void;
  onEdit: (supplier: AdminSupplierDetailsData) => void;
  onToggleStatus: (supplier: AdminSupplierDetailsData) => void;
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

const PO_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'مسودة', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  ORDERED: { label: 'قيد الطلب', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  RECEIVED: { label: 'تم الاستلام', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'ملغاة', className: 'bg-red-100 text-red-700 border-red-200' },
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (value: number) =>
  `${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₪`;

export const AdminSupplierDetails: React.FC<AdminSupplierDetailsProps> = ({
  supplierId,
  onBack,
  onEdit,
  onToggleStatus,
  onToast,
}) => {
  const [supplier, setSupplier] = useState<AdminSupplierDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchSupplierApi(supplierId);
      setSupplier(data);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب بيانات المورد';
      setError(message);
      onToast?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [supplierId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ph-muted" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-ph-brand" />
        <span className="text-sm font-bold">جارٍ تحميل بيانات المورد…</span>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center space-y-3" dir="rtl">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
        <p className="text-sm font-bold text-red-800">{error || 'المورد غير موجود'}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>إعادة المحاولة</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="border border-ph-border text-ph-ink font-bold px-4 py-2 rounded-xl text-xs hover:bg-ph-background"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  const history = supplier.purchaseHistory ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors"
            aria-label="العودة إلى قائمة الموردين"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ph-brand/10 text-ph-brand">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-ph-ink">{supplier.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-black border ${
                  supplier.isActive
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {supplier.isActive ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            {supplier.company && (
              <p className="text-xs text-ph-muted mt-0.5">{supplier.company}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStatus(supplier)}
            className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors border ${
              supplier.isActive
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            {supplier.isActive ? 'تعطيل المورد' : 'تفعيل المورد'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(supplier)}
            className="flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            <Edit2 className="h-4 w-4" />
            <span>تعديل</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">إجمالي قيمة المشتريات</span>
            <Wallet className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-2xl font-black text-ph-ink font-mono">
            {formatMoney(supplier.totalPurchaseValue)}
          </p>
          <span className="text-[10px] text-ph-muted mt-1 block">مجموع الطلبات غير الملغاة</span>
        </div>

        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">عدد طلبات الشراء</span>
            <ShoppingCart className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-2xl font-black text-ph-ink font-mono">
            {supplier.purchaseOrdersCount}
          </p>
          <span className="text-[10px] text-ph-muted mt-1 block">كل الطلبات المرتبطة</span>
        </div>

        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">آخر عملية شراء</span>
            <Calendar className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-base font-black text-ph-ink">
            {formatDate(supplier.lastPurchaseAt)}
          </p>
          <span className="text-[10px] text-ph-muted mt-1 block">تاريخ أحدث طلب</span>
        </div>
      </div>

      {/* Contact information */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
          <h2 className="text-sm font-black text-ph-ink flex items-center gap-2">
            <User className="h-4 w-4 text-ph-brand" />
            معلومات التواصل
          </h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ph-border">
          <InfoCell icon={<User className="h-4 w-4" />} label="جهة الاتصال" value={supplier.contactName} />
          <InfoCell
            icon={<Phone className="h-4 w-4" />}
            label="رقم الهاتف"
            value={supplier.phone}
            dir="ltr"
          />
          <InfoCell
            icon={<Mail className="h-4 w-4" />}
            label="البريد الإلكتروني"
            value={supplier.email}
            dir="ltr"
          />
          <InfoCell icon={<Building2 className="h-4 w-4" />} label="الشركة" value={supplier.company} />
          <InfoCell icon={<MapPin className="h-4 w-4" />} label="المدينة" value={supplier.city} />
          <InfoCell icon={<MapPin className="h-4 w-4" />} label="العنوان" value={supplier.address} />
        </dl>
        {supplier.notes && (
          <div className="border-t border-ph-border px-5 py-4">
            <p className="text-[11px] font-bold text-ph-muted mb-1">ملاحظات</p>
            <p className="text-xs text-ph-ink leading-relaxed">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* Purchase history */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex items-center justify-between">
          <h2 className="text-sm font-black text-ph-ink flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-ph-brand" />
            سجل المشتريات
          </h2>
          <span className="text-xs text-ph-muted">
            عدد السجلات: <strong className="font-mono text-ph-ink">{history.length}</strong>
          </span>
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-ph-muted">
            لا توجد طلبات شراء لهذا المورد حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                <tr>
                  <th className="px-4 py-3 font-bold font-mono">رقم الطلب</th>
                  <th className="px-4 py-3 font-bold text-center">الحالة</th>
                  <th className="px-4 py-3 font-bold text-center">القيمة الإجمالية</th>
                  <th className="px-4 py-3 font-bold text-center">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 font-bold text-center">تاريخ الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ph-border">
                {history.map((po) => {
                  const meta = PO_STATUS_LABELS[po.status] ?? {
                    label: po.status,
                    className: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  return (
                    <tr key={po.id} className="hover:bg-ph-background/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-ph-ink">
                        {po.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink">
                        {formatMoney(po.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center text-ph-muted">
                        {formatDate(po.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center text-ph-muted">
                        {formatDate(po.receivedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function InfoCell({
  icon,
  label,
  value,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="flex items-center gap-1.5 text-[11px] font-bold text-ph-muted mb-1">
        <span className="text-ph-brand">{icon}</span>
        {label}
      </dt>
      <dd className="text-xs font-bold text-ph-ink break-words" dir={dir}>
        {value || '—'}
      </dd>
    </div>
  );
}

export type { AdminSupplierStatus };
