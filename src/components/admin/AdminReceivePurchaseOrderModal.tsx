import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { AdminPurchaseOrderDetails, AdminReceiveLineInput } from '../../services/adminApi';

export interface AdminReceivePurchaseOrderModalProps {
  order: AdminPurchaseOrderDetails;
  onConfirm: (payload: { items: AdminReceiveLineInput[]; notes?: string }) => Promise<void>;
  onClose: () => void;
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

/**
 * Records the quantity received in THIS receipt (a positive delta per line).
 * Only lines with a quantity greater than zero are submitted, and no line may
 * exceed its remaining quantity. Confirming increases product stock, writes an
 * inventory movement, and advances the order to partially/fully received.
 */
export const AdminReceivePurchaseOrderModal: React.FC<AdminReceivePurchaseOrderModalProps> = ({
  order,
  onConfirm,
  onClose,
}) => {
  const [rows, setRows] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((item) => [item.id, 0])),
  );
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outstanding = useMemo(
    () => order.items.filter((i) => i.remainingQuantity > 0),
    [order.items],
  );

  const setRow = (itemId: string, value: number) =>
    setRows((prev) => ({ ...prev, [itemId]: value }));

  const receiveAll = () =>
    setRows(Object.fromEntries(order.items.map((item) => [item.id, item.remainingQuantity])));

  const validate = (): { error: string | null; lines: AdminReceiveLineInput[] } => {
    const lines: AdminReceiveLineInput[] = [];
    for (const item of order.items) {
      const value = Number(rows[item.id] ?? 0);
      if (!Number.isInteger(value)) {
        return { error: `الكمية المستلمة للبند «${item.productName}» يجب أن تكون عدداً صحيحاً`, lines };
      }
      if (value < 0) {
        return { error: `الكمية المستلمة للبند «${item.productName}» لا يمكن أن تكون سالبة`, lines };
      }
      if (value > item.remainingQuantity) {
        return {
          error: `الكمية المستلمة للبند «${item.productName}» تتجاوز الكمية المتبقية (${item.remainingQuantity})`,
          lines,
        };
      }
      if (value > 0) {
        lines.push({ itemId: item.id, quantityReceived: value });
      }
    }
    if (lines.length === 0) {
      return { error: 'لم يتم إدخال أي كمية مستلمة', lines };
    }
    return { error: null, lines };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error: validationError, lines } = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    try {
      await onConfirm({ items: lines, notes: notes.trim() || undefined });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الاستلام');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
      onClick={onClose}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ph-border bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ph-ink">تسجيل استلام كميات</h2>
              <p className="text-[11px] text-ph-muted">
                أمر الشراء <span className="font-mono">{order.orderNumber}</span> — أدخل الكمية
                المستلمة فعلياً في هذه العملية لكل بند
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-ph-muted">
              بنود متبقية للاستلام: <strong className="text-ph-ink font-mono">{outstanding.length}</strong>
            </p>
            <button
              type="button"
              onClick={receiveAll}
              className="text-xs font-bold text-ph-brand hover:text-ph-brand-hover"
            >
              استلام كامل للكميات المتبقية
            </button>
          </div>

          <div className="rounded-2xl border border-ph-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse min-w-[640px]">
                <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">المنتج</th>
                    <th className="px-3 py-2.5 font-bold text-center">الرمز</th>
                    <th className="px-3 py-2.5 font-bold text-center">المطلوب</th>
                    <th className="px-3 py-2.5 font-bold text-center">المستلم سابقاً</th>
                    <th className="px-3 py-2.5 font-bold text-center">المتبقي</th>
                    <th className="px-3 py-2.5 font-bold text-center w-32">المستلم الآن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ph-border">
                  {order.items.map((item) => {
                    const value = Number(rows[item.id] ?? 0);
                    const invalid = value < 0 || value > item.remainingQuantity;
                    const done = item.remainingQuantity <= 0;
                    return (
                      <tr key={item.id} className={done ? 'opacity-60' : undefined}>
                        <td className="px-3 py-2.5 font-bold text-ph-ink">{item.productName}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-ph-muted">
                          {item.sku}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">{item.orderedQuantity}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-ph-muted">
                          {item.receivedQuantity}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-amber-700">
                          {item.remainingQuantity}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min={0}
                            max={item.remainingQuantity}
                            step="1"
                            value={rows[item.id]}
                            disabled={done}
                            onChange={(e) => setRow(item.id, Number(e.target.value))}
                            aria-invalid={invalid}
                            className="ph-input text-xs w-full text-center font-mono disabled:bg-ph-background"
                            dir="ltr"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">ملاحظات الاستلام</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="ph-input text-sm w-full leading-relaxed"
              placeholder="ملاحظات حول عملية الاستلام..."
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[11px] text-emerald-800">
            <PackageCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              تأكيد الاستلام يزيد مخزون المنتجات بالكميات المستلمة فعلياً، ويسجّل حركة مخزون مرتبطة
              بأمر الشراء ورقم الاستلام، ثم يحدّث حالة أمر الشراء.
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-ph-border">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>تأكيد الاستلام</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-6 py-3 rounded-xl border border-ph-border text-ph-ink font-bold hover:bg-ph-background transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
