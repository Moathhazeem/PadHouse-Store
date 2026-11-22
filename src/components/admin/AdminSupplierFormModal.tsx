import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Truck, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { AdminSupplierFormData, AdminSupplierStatus } from '../../services/adminApi';

export interface AdminSupplierFormModalProps {
  mode: 'add' | 'edit';
  initial?: Partial<AdminSupplierFormData> & { id?: string };
  onSave: (data: AdminSupplierFormData, id?: string) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM: AdminSupplierFormData = {
  name: '',
  company: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  notes: '',
  status: 'ACTIVE',
};

/** Mirrors the backend rule: 7–15 digits after stripping separators. */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const AdminSupplierFormModal: React.FC<AdminSupplierFormModalProps> = ({
  mode,
  initial,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<AdminSupplierFormData>({
    ...EMPTY_FORM,
    ...initial,
    status: initial?.status ?? 'ACTIVE',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof AdminSupplierFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('اسم المورد مطلوب');
    if (!form.phone.trim()) return setError('رقم الهاتف مطلوب');
    if (!isValidPhone(form.phone)) {
      return setError('رقم الهاتف غير صالح (يجب أن يحتوي على 7 إلى 15 رقماً)');
    }
    if (form.email && form.email.trim() && !isValidEmail(form.email.trim())) {
      return setError('البريد الإلكتروني غير صالح');
    }

    setBusy(true);
    try {
      const payload: AdminSupplierFormData = {
        name: form.name.trim(),
        company: form.company?.trim() || undefined,
        contactName: form.contactName?.trim() || undefined,
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        city: form.city?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        status: form.status ?? 'ACTIVE',
      };
      await onSave(payload, (initial as any)?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ بيانات المورد');
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
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ph-border bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ph-brand/10 text-ph-brand">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ph-ink">
                {mode === 'add' ? 'إضافة مورد جديد' : 'تعديل بيانات المورد'}
              </h2>
              <p className="text-[11px] text-ph-muted">
                بيانات التواصل والحالة الخاصة بالمورد
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
          {/* Name & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                اسم المورد *
              </label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="ph-input text-sm w-full"
                placeholder="شركة التقنية للتوريدات"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                اسم الشركة
              </label>
              <input
                value={form.company ?? ''}
                onChange={(e) => set('company', e.target.value)}
                className="ph-input text-sm w-full"
                placeholder="Tech Supply Co."
              />
            </div>
          </div>

          {/* Contact person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                اسم جهة الاتصال
              </label>
              <input
                value={form.contactName ?? ''}
                onChange={(e) => set('contactName', e.target.value)}
                className="ph-input text-sm w-full"
                placeholder="أحمد خالد"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                رقم الهاتف *
              </label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="ph-input text-sm w-full font-mono"
                placeholder="0599123456"
                inputMode="tel"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Email & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                className="ph-input text-sm w-full font-sans"
                placeholder="sales@techsupply.ps"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">المدينة</label>
              <input
                value={form.city ?? ''}
                onChange={(e) => set('city', e.target.value)}
                className="ph-input text-sm w-full"
                placeholder="رام الله"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">العنوان</label>
            <input
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              className="ph-input text-sm w-full"
              placeholder="شارع الصناعة، المنطقة الصناعية"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">حالة المورد</label>
            <div className="flex gap-2">
              {(['ACTIVE', 'INACTIVE'] as AdminSupplierStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
                    form.status === s
                      ? s === 'ACTIVE'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 bg-slate-100 text-slate-700'
                      : 'border-ph-border bg-white text-ph-muted hover:bg-ph-background'
                  }`}
                >
                  {s === 'ACTIVE' ? 'نشط (Active)' : 'غير نشط (Inactive)'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">ملاحظات</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="ph-input text-sm w-full leading-relaxed"
              placeholder="مورد معتمد لملحقات الآيباد..."
            />
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
              className="flex-1 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm active:scale-98"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{mode === 'add' ? 'إضافة المورد' : 'حفظ التعديلات'}</span>
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
