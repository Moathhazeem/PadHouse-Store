import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  PackageCheck,
  RefreshCw,
  Send,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminApprovePurchaseOrderApi,
  adminCancelPurchaseOrderApi,
  adminDeletePurchaseOrderApi,
  adminFetchPurchaseOrderApi,
  adminReceivePurchaseOrderApi,
  adminRejectPurchaseOrderApi,
  adminSendPurchaseOrderApi,
  adminSubmitPurchaseOrderApi,
  type AdminPurchaseOrderDetails as AdminPurchaseOrderDetailsData,
  type AdminReceiveLineInput,
  type PurchaseOrderStatus,
} from '../../services/adminApi';
import {
  PO_STATUS_META,
  PO_WORKFLOW,
  formatDate,
  formatDateTime,
  formatMoney,
  poStatusLabel,
} from './purchaseOrderUtils';
import { AdminReceivePurchaseOrderModal } from './AdminReceivePurchaseOrderModal';

export interface AdminPurchaseOrderDetailsProps {
  orderId: string;
  onBack: () => void;
  onEdit: (order: AdminPurchaseOrderDetailsData) => void;
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

type ActionKind = 'submit' | 'approve' | 'reject' | 'send' | 'cancel';

const ACTION_META: Record<
  ActionKind,
  { title: string; description: string; confirmLabel: string; tone: 'brand' | 'emerald' | 'amber' | 'red'; placeholder: string }
> = {
  submit: {
    title: 'إرسال أمر الشراء للاعتماد',
    description: 'سيتم تحويل الأمر من مسودة إلى «بانتظار الموافقة». لن تتمكن من تعديل البنود بعد ذلك.',
    confirmLabel: 'إرسال للاعتماد',
    tone: 'brand',
    placeholder: 'ملاحظات (اختياري)...',
  },
  approve: {
    title: 'اعتماد أمر الشراء',
    description: 'سيتم اعتماد الأمر ليصبح قابلاً للإرسال للمورد واستلام المنتجات.',
    confirmLabel: 'اعتماد الأمر',
    tone: 'emerald',
    placeholder: 'ملاحظات الاعتماد (اختياري)...',
  },
  reject: {
    title: 'رفض أمر الشراء',
    description: 'سيتم إعادة الأمر إلى حالة المسودة ليتمكن مُنشئه من تعديله وإعادة إرساله.',
    confirmLabel: 'رفض وإعادة للمسودة',
    tone: 'amber',
    placeholder: 'سبب الرفض (اختياري)...',
  },
  send: {
    title: 'تعليم الأمر كمُرسل للمورد',
    description: 'سيتم تحويل الأمر من «معتمد» إلى «مُرسل للمورد».',
    confirmLabel: 'تعليم كمُرسل',
    tone: 'brand',
    placeholder: 'ملاحظات الإرسال (اختياري)...',
  },
  cancel: {
    title: 'إلغاء أمر الشراء',
    description: 'لا يمكن التراجع عن الإلغاء ولن يكون الأمر قابلاً لاستلام المنتجات بعد ذلك.',
    confirmLabel: 'تأكيد الإلغاء',
    tone: 'red',
    placeholder: 'سبب الإلغاء (اختياري)...',
  },
};

export const AdminPurchaseOrderDetails: React.FC<AdminPurchaseOrderDetailsProps> = ({
  orderId,
  onBack,
  onEdit,
  onToast,
}) => {
  const [order, setOrder] = useState<AdminPurchaseOrderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [action, setAction] = useState<{ kind: ActionKind; notes: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchPurchaseOrderApi(orderId);
      setOrder(data);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب تفاصيل أمر الشراء';
      setError(message);
      onToast?.(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [orderId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const can = (target: PurchaseOrderStatus) => order?.allowedTransitions?.includes(target) ?? false;

  const runAction = async () => {
    if (!order || !action) return;
    setBusy(true);
    try {
      const notes = action.notes.trim() || undefined;
      let updated: AdminPurchaseOrderDetailsData;
      switch (action.kind) {
        case 'submit':
          updated = await adminSubmitPurchaseOrderApi(order.id, notes);
          break;
        case 'approve':
          updated = await adminApprovePurchaseOrderApi(order.id, notes);
          break;
        case 'reject':
          updated = await adminRejectPurchaseOrderApi(order.id, notes);
          break;
        case 'send':
          updated = await adminSendPurchaseOrderApi(order.id, notes);
          break;
        case 'cancel':
          updated = await adminCancelPurchaseOrderApi(order.id, { reason: notes });
          break;
      }
      setOrder(updated);
      onToast?.(`تم تحديث حالة أمر الشراء إلى «${poStatusLabel(updated.status)}»`);
      setAction(null);
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر تنفيذ الإجراء', 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleReceive = async (payload: { items: AdminReceiveLineInput[]; notes?: string }) => {
    if (!order) return;
    const updated = await adminReceivePurchaseOrderApi(order.id, payload);
    setOrder(updated);
    onToast?.(`تم تسجيل الاستلام — الحالة الآن «${poStatusLabel(updated.status)}»`);
  };

  const handleDelete = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await adminDeletePurchaseOrderApi(order.id);
      onToast?.('تم حذف مسودة أمر الشراء');
      setDeleteOpen(false);
      onBack();
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر حذف أمر الشراء', 'err');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ph-muted" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-ph-brand" />
        <span className="text-sm font-bold">جارٍ تحميل تفاصيل أمر الشراء…</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center space-y-3" dir="rtl">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
        <p className="text-sm font-bold text-red-800">{error || 'أمر الشراء غير موجود'}</p>
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

  const statusMeta = PO_STATUS_META[order.status];
  const currentStepIndex = PO_WORKFLOW.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isDraft = order.status === 'DRAFT';

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
            aria-label="العودة إلى قائمة أوامر الشراء"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ph-brand/10 text-ph-brand">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-ph-ink font-mono">{order.orderNumber}</h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-ph-muted mt-0.5">
              المورد: <strong className="text-ph-ink">{order.supplier?.name ?? '—'}</strong>
              {order.supplier?.company ? ` — ${order.supplier.company}` : ''}
            </p>
          </div>
        </div>

        {/* Workflow actions — driven entirely by allowedTransitions from the backend */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isDraft && (
            <>
              <button
                type="button"
                onClick={() => onEdit(order)}
                className="flex items-center gap-1.5 border border-ph-border text-ph-ink font-bold px-3.5 py-2.5 rounded-xl text-xs hover:bg-ph-background transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>تعديل</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 border border-red-200 text-red-600 font-bold px-3.5 py-2.5 rounded-xl text-xs hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف</span>
              </button>
            </>
          )}

          {can('PENDING_APPROVAL') && (
            <button
              type="button"
              onClick={() => setAction({ kind: 'submit', notes: '' })}
              className="flex items-center gap-1.5 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>إرسال للاعتماد</span>
            </button>
          )}

          {can('APPROVED') && (
            <button
              type="button"
              onClick={() => setAction({ kind: 'approve', notes: '' })}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>اعتماد</span>
            </button>
          )}

          {can('SENT') && (
            <button
              type="button"
              onClick={() => setAction({ kind: 'send', notes: '' })}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>تعليم كمُرسل</span>
            </button>
          )}

          {(order.status === 'APPROVED' ||
            order.status === 'SENT' ||
            order.status === 'PARTIALLY_RECEIVED') && (
            <button
              type="button"
              onClick={() => setReceiveOpen(true)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              <PackageCheck className="h-4 w-4" />
              <span>استلام منتجات</span>
            </button>
          )}

          {can('DRAFT') && order.status === 'PENDING_APPROVAL' && (
            <button
              type="button"
              onClick={() => setAction({ kind: 'reject', notes: '' })}
              className="flex items-center gap-1.5 border border-amber-300 text-amber-800 font-bold px-3.5 py-2.5 rounded-xl text-xs hover:bg-amber-50 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>رفض</span>
            </button>
          )}

          {can('CANCELLED') && (
            <button
              type="button"
              onClick={() => setAction({ kind: 'cancel', notes: '' })}
              className="flex items-center gap-1.5 border border-red-200 text-red-600 font-bold px-3.5 py-2.5 rounded-xl text-xs hover:bg-red-50 transition-colors"
            >
              <Ban className="h-4 w-4" />
              <span>إلغاء</span>
            </button>
          )}
        </div>
      </div>

      {/* Workflow stepper */}
      <div className="rounded-3xl border border-ph-border bg-white p-5 shadow-sm">
        {isCancelled ? (
          <div className="flex items-center gap-2 text-red-700 text-sm font-bold">
            <Ban className="h-5 w-5" />
            <span>تم إلغاء أمر الشراء — لا يمكن استلام منتجات لهذا الأمر.</span>
          </div>
        ) : (
          <div className="flex items-center">
            {PO_WORKFLOW.map((step, idx) => {
              const done = currentStepIndex >= idx;
              const active = currentStepIndex === idx;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-black transition-colors ${
                        done
                          ? 'border-ph-brand bg-ph-brand text-white'
                          : 'border-ph-border bg-white text-ph-muted'
                      } ${active ? 'ring-4 ring-ph-brand/15' : ''}`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-bold whitespace-nowrap ${
                        done ? 'text-ph-ink' : 'text-ph-muted'
                      }`}
                    >
                      {PO_STATUS_META[step].label}
                    </span>
                  </div>
                  {idx < PO_WORKFLOW.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1.5 mb-4 rounded-full ${
                        currentStepIndex > idx ? 'bg-ph-brand' : 'bg-ph-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Header info + financial summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
            <h2 className="text-sm font-black text-ph-ink">المعلومات العامة</h2>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-ph-border">
            <InfoCell label="المورد" value={order.supplier?.name ?? '—'} />
            <InfoCell label="العملة" value={order.currency} dir="ltr" />
            <InfoCell label="شروط الدفع" value={order.paymentTerms || '—'} />
            <InfoCell label="تاريخ الطلب" value={formatDate(order.orderDate)} />
            <InfoCell label="التسليم المتوقع" value={formatDate(order.expectedAt)} />
            <InfoCell label="تاريخ الاستلام" value={formatDate(order.receivedAt)} />
            <InfoCell
              label="أنشأه"
              value={order.createdBy?.fullName ?? '—'}
            />
            <InfoCell label="عدد البنود" value={String(order.items.length)} />
            <InfoCell label="آخر تحديث" value={formatDateTime(order.updatedAt)} />
          </dl>
          {order.notes && (
            <div className="border-t border-ph-border px-5 py-4">
              <p className="text-[11px] font-bold text-ph-muted mb-1">ملاحظات</p>
              <p className="text-xs text-ph-ink leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
            <h2 className="text-sm font-black text-ph-ink">الملخص المالي</h2>
          </div>
          <div className="p-5 space-y-3 text-xs">
            <SummaryRow label="المجموع الفرعي" value={formatMoney(order.subtotal, order.currency)} />
            <SummaryRow
              label="إجمالي الخصومات"
              value={`- ${formatMoney(order.discountTotal, order.currency)}`}
              tone="red"
            />
            <SummaryRow label="إجمالي الضرائب" value={formatMoney(order.taxTotal, order.currency)} />
            <SummaryRow
              label="تكلفة الشحن"
              value={formatMoney(order.shippingCost, order.currency)}
            />
            <div className="border-t border-ph-border pt-3 flex items-center justify-between">
              <span className="font-black text-ph-ink">الإجمالي النهائي</span>
              <span className="font-mono font-black text-ph-brand text-base" dir="ltr">
                {formatMoney(order.grandTotal, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50">
          <h2 className="text-sm font-black text-ph-ink">بنود أمر الشراء</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse min-w-[900px]">
            <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
              <tr>
                <th className="px-4 py-3 font-bold">المنتج</th>
                <th className="px-4 py-3 font-bold text-center">الرمز</th>
                <th className="px-4 py-3 font-bold text-center">المطلوب</th>
                <th className="px-4 py-3 font-bold text-center">المستلم</th>
                <th className="px-4 py-3 font-bold text-center">المتبقي</th>
                <th className="px-4 py-3 font-bold text-center">تكلفة الوحدة</th>
                <th className="px-4 py-3 font-bold text-center">خصم %</th>
                <th className="px-4 py-3 font-bold text-center">ضريبة %</th>
                <th className="px-4 py-3 font-bold text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ph-border">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-ph-background/70 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-ph-ink leading-snug">{item.productName}</p>
                    {item.currentStock != null && (
                      <span className="text-[10px] text-ph-muted">
                        المخزون الحالي: <span className="font-mono">{item.currentStock}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-ph-muted">{item.sku}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.orderedQuantity}</td>
                  <td className="px-4 py-3 text-center font-mono text-teal-700">
                    {item.receivedQuantity}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-amber-700">
                    {item.remainingQuantity}
                  </td>
                  <td className="px-4 py-3 text-center font-mono" dir="ltr">
                    {formatMoney(item.unitCost, order.currency)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-ph-muted">
                    {item.discountRate}%
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-ph-muted">{item.taxRate}%</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-ph-ink whitespace-nowrap" dir="ltr">
                    {formatMoney(item.lineSubtotal, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods receipts history */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex items-center justify-between">
          <h2 className="text-sm font-black text-ph-ink flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-teal-600" />
            سجل الاستلامات
          </h2>
          <span className="text-xs text-ph-muted">
            عدد الاستلامات: <strong className="font-mono text-ph-ink">{order.receipts.length}</strong>
          </span>
        </div>
        {order.receipts.length === 0 ? (
          <p className="px-5 py-6 text-xs text-ph-muted">لم يتم تسجيل أي استلام لهذا الأمر بعد.</p>
        ) : (
          <ul className="divide-y divide-ph-border">
            {order.receipts.map((receipt) => (
              <li key={receipt.id} className="px-5 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-ph-ink">
                    {receipt.receiptNumber}
                  </span>
                  <span className="text-[10px] text-ph-muted font-mono">
                    {formatDateTime(receipt.receivedAt)}
                  </span>
                  <span className="text-[11px] text-ph-muted flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {receipt.receivedByName || 'النظام'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {receipt.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] text-teal-800"
                    >
                      {item.productName}: <span className="font-mono font-bold">+{item.quantityReceived}</span>
                    </span>
                  ))}
                </div>
                {receipt.notes && (
                  <p className="text-[11px] text-ph-ink mt-2 bg-ph-background rounded-lg px-2.5 py-1.5">
                    {receipt.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audit history */}
      <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-ph-border px-5 py-3.5 bg-ph-background/50 flex items-center justify-between">
          <h2 className="text-sm font-black text-ph-ink flex items-center gap-2">
            <Clock className="h-4 w-4 text-ph-brand" />
            سجل تغييرات الحالة
          </h2>
          <span className="text-xs text-ph-muted">
            عدد السجلات: <strong className="font-mono text-ph-ink">{order.statusHistory.length}</strong>
          </span>
        </div>
        <ol className="p-5 space-y-4">
          {order.statusHistory.map((entry, idx) => (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    PO_STATUS_META[entry.toStatus]?.dot ?? 'bg-slate-400'
                  }`}
                />
                {idx < order.statusHistory.length - 1 && (
                  <span className="w-px flex-1 bg-ph-border mt-1" />
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-ph-ink">
                    {entry.fromStatus
                      ? `${poStatusLabel(entry.fromStatus)} ← ${poStatusLabel(entry.toStatus)}`
                      : `إنشاء — ${poStatusLabel(entry.toStatus)}`}
                  </span>
                  <span className="text-[10px] text-ph-muted font-mono">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-ph-muted flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" />
                  {entry.actorName || 'النظام'}
                </p>
                {entry.notes && (
                  <p className="text-[11px] text-ph-ink mt-1 bg-ph-background rounded-lg px-2.5 py-1.5">
                    {entry.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Receive modal */}
      {receiveOpen && (
        <AdminReceivePurchaseOrderModal
          order={order}
          onConfirm={handleReceive}
          onClose={() => setReceiveOpen(false)}
          onToast={onToast}
        />
      )}

      {/* Workflow action confirm */}
      {action && (
        <ActionConfirmModal
          kind={action.kind}
          notes={action.notes}
          busy={busy}
          onNotesChange={(value) => setAction((prev) => (prev ? { ...prev, notes: value } : prev))}
          onConfirm={runAction}
          onClose={() => setAction(null)}
        />
      )}

      {/* Delete draft confirm */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
          onClick={() => !busy && setDeleteOpen(false)}
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
              هل أنت متأكد من حذف المسودة «{order.orderNumber}»؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>نعم، احذف المسودة</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={busy}
                className="flex-1 border border-ph-border text-ph-ink font-bold py-2.5 rounded-xl text-xs hover:bg-ph-background transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

function InfoCell({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-[11px] font-bold text-ph-muted mb-1">{label}</dt>
      <dd className="text-xs font-bold text-ph-ink break-words" dir={dir}>
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'red';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ph-muted font-bold">{label}</span>
      <span
        className={`font-mono font-bold ${tone === 'red' ? 'text-red-600' : 'text-ph-ink'}`}
        dir="ltr"
      >
        {value}
      </span>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  brand: 'bg-ph-brand hover:bg-ph-brand-hover text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  amber: 'bg-amber-600 hover:bg-amber-700 text-white',
  red: 'bg-red-600 hover:bg-red-700 text-white',
};

function ActionConfirmModal({
  kind,
  notes,
  busy,
  onNotesChange,
  onConfirm,
  onClose,
}: {
  kind: ActionKind;
  notes: string;
  busy: boolean;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const meta = ACTION_META[kind];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
      onClick={() => !busy && onClose()}
      dir="rtl"
    >
      <div
        className="rounded-3xl bg-white p-6 shadow-2xl max-w-md w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-black text-ph-ink">{meta.title}</h3>
        <p className="text-xs text-ph-muted leading-relaxed">{meta.description}</p>
        <div>
          <label className="block text-xs font-bold text-ph-ink mb-1.5">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            className="ph-input text-sm w-full leading-relaxed"
            placeholder={meta.placeholder}
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 ${TONE_CLASS[meta.tone]}`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{meta.confirmLabel}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-ph-border text-ph-ink font-bold py-2.5 rounded-xl text-xs hover:bg-ph-background transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
