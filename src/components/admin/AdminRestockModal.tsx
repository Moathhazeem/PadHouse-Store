import React, { useState } from 'react';
import { Loader2, PackageCheck, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { AdminNotification, AdminNotificationProduct } from '../../services/adminApi';

export interface AdminRestockTarget {
  id: string;
  nameAr: string;
  sku: string;
  stock: number;
  minStock?: number;
  maxStock?: number;
  notificationId?: string;
}

export interface AdminRestockModalProps {
  target: AdminRestockTarget;
  onConfirm: (target: AdminRestockTarget, addQty: number, notes: string) => Promise<void>;
  onClose: () => void;
}

export const AdminRestockModal: React.FC<AdminRestockModalProps> = ({
  target,
  onConfirm,
  onClose,
}) => {
  const currentStock = target.stock ?? 0;
  const minStock = target.minStock ?? 5;
  const maxStock = target.maxStock ?? 100;
  const suggested = Math.max(1, maxStock - currentStock);

  const [addQty, setAddQty] = useState<number>(suggested);
  const [notes, setNotes] = useState<string>('توريد جديد لتغطية نقص المخزون');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultingStock = currentStock + (Number.isNaN(addQty) ? 0 : addQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addQty <= 0) {
      setError('يجب إضافة قطعة واحدة على الأقل');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(target, addQty, notes);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر إتمام عملية إعادة التخزين');
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
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ph-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <PackageCheck className="h-4 w-4" />
            </div>
            <h3 className="font-black text-ph-ink text-base">إعادة تخزين سريع</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product snapshot */}
        <div className="mb-5 rounded-2xl bg-ph-background border border-ph-border p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-ph-ink line-clamp-1">{target.nameAr}</span>
            <span className="font-mono text-ph-muted text-[11px]">{target.sku}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-ph-border/60">
            <div>
              <span className="block text-[10px] text-ph-muted">المخزون الحالي</span>
              <strong className={currentStock <= 0 ? 'text-red-600 font-black' : 'text-amber-600 font-bold'}>
                {currentStock}
              </strong>
            </div>
            <div>
              <span className="block text-[10px] text-ph-muted">الحد الأدنى</span>
              <strong className="text-slate-700 font-bold">{minStock}</strong>
            </div>
            <div>
              <span className="block text-[10px] text-ph-muted">الحد الأقصى</span>
              <strong className="text-emerald-700 font-bold">{maxStock}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              الكمية المراد إضافتها (قطعة) *
            </label>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 0))}
              className="ph-input w-full text-base font-bold font-mono"
              required
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ph-muted bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 border border-emerald-200">
              <span>المخزون الجديد بعد التوريد:</span>
              <span className="font-mono font-black text-sm">{resultingStock} قطعة</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              ملاحظة / سبب حركة المخزون
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="ph-input w-full text-sm"
              placeholder="مثال: فاتورة توريد رقم 104..."
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy || addQty <= 0}
              className="flex-1 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              <span>تأكيد الإضافة ({addQty} قطعة)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-5 py-3 rounded-xl border border-ph-border text-ph-ink font-bold hover:bg-ph-background transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
