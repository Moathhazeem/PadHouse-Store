import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Loader2,
  PackageCheck,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { AdminProductFormData } from '../../services/adminApi';

export interface AdminProductFormModalProps {
  mode: 'add' | 'edit';
  initial?: Partial<AdminProductFormData> & { id?: string };
  onSave: (data: AdminProductFormData, id?: string) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM: AdminProductFormData = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  sku: '',
  categoryId: '',
  basePrice: 0,
  salePrice: undefined,
  stock: 0,
  minStock: 5,
  maxStock: 100,
  ipadCompatibility: [],
  warrantyMonths: 12,
  isFeatured: false,
  isActive: true,
};

export const AdminProductFormModal: React.FC<AdminProductFormModalProps> = ({
  mode,
  initial,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<AdminProductFormData>({
    ...EMPTY_FORM,
    ...initial,
    stock: initial?.stock ?? 0,
    minStock: initial?.minStock ?? 5,
    maxStock: initial?.maxStock ?? 100,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compatInput, setCompatInput] = useState(
    (initial?.ipadCompatibility ?? []).join('، '),
  );

  const set = (field: keyof AdminProductFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const currentStock = form.stock ?? 0;
  const currentMin = form.minStock ?? 5;
  const currentMax = form.maxStock ?? 100;

  // Stock status calculation
  const stockStatus =
    currentStock <= 0
      ? 'out_of_stock'
      : currentStock < currentMin
      ? 'low_stock'
      : 'healthy';

  const stockPercentage =
    currentMax > 0 ? Math.min(100, Math.max(0, (currentStock / currentMax) * 100)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nameAr.trim()) return setError('اسم المنتج بالعربية مطلوب');
    if (!form.sku.trim()) return setError('رمز المنتج (SKU) مطلوب');
    if (form.basePrice < 0) return setError('السعر الأساسي يجب أن يكون 0 أو أكثر');
    if ((form.stock ?? 0) < 0) return setError('الكمية في المخزون لا يمكن أن تكون سالبة');
    if ((form.minStock ?? 0) < 0) return setError('الحد الأدنى لا يمكن أن يكون سالباً');
    if ((form.maxStock ?? 0) <= 0) return setError('الحد الأقصى يجب أن يكون أكبر من 0');
    if ((form.minStock ?? 0) > (form.maxStock ?? 0)) {
      return setError('الحد الأدنى للتنبيه (minStock) يجب أن يكون أصغر من الحد الأقصى (maxStock)');
    }

    setBusy(true);
    try {
      const payload: AdminProductFormData = {
        ...form,
        stock: Number(form.stock ?? 0),
        minStock: Number(form.minStock ?? 5),
        maxStock: Number(form.maxStock ?? 100),
        ipadCompatibility: compatInput
          .split(/[،,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await onSave(payload, (initial as any)?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ بيانات المنتج');
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
        {/* Sticky modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ph-border bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ph-brand/10 text-ph-brand">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ph-ink">
                {mode === 'add' ? 'إضافة منتج جديد' : 'تعديل بيانات المنتج والمخزون'}
              </h2>
              <p className="text-[11px] text-ph-muted">
                تحديد الكميات وحدود إعادة الطلب (minStock & maxStock)
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1 — Arabic & English names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                الاسم بالعربية *
              </label>
              <input
                value={form.nameAr}
                onChange={(e) => set('nameAr', e.target.value)}
                className="ph-input text-sm w-full"
                placeholder="كفر حماية ذكي مع حامل قلم..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                الاسم بالإنجليزية
              </label>
              <input
                value={form.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                className="ph-input text-sm w-full font-sans"
                placeholder="Smart Folio Case with Pencil Slot..."
                dir="ltr"
              />
            </div>
          </div>

          {/* Row 2 — SKU & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                رمز المنتج (SKU) *
              </label>
              <input
                value={form.sku}
                onChange={(e) => set('sku', e.target.value.toUpperCase().trim())}
                className="ph-input text-sm w-full font-mono uppercase"
                placeholder="PH-CASE-AIR11"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                معرف الفئة (categoryId)
              </label>
              <input
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="ph-input text-sm w-full font-mono text-xs"
                placeholder="معرف الفئة في قاعدة البيانات"
                dir="ltr"
              />
            </div>
          </div>

          {/* Row 3 — Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                السعر الأساسي (₪) *
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.basePrice}
                onChange={(e) => set('basePrice', Number(e.target.value))}
                className="ph-input text-sm w-full font-bold font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">
                سعر التخفيض (₪) — اختياري
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.salePrice ?? ''}
                onChange={(e) =>
                  set(
                    'salePrice',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                className="ph-input text-sm w-full font-bold font-mono"
                placeholder="اتركه فارغاً إن لم يكن هناك خصم"
              />
            </div>
          </div>

          {/* ═══ REQUIREMENT 1: INVENTORY & STOCK THRESHOLDS ═══ */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-900 flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-amber-700" />
                إعدادات مستويات المخزون (Inventory & Thresholds)
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  stockStatus === 'out_of_stock'
                    ? 'bg-red-200 text-red-800'
                    : stockStatus === 'low_stock'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {stockStatus === 'out_of_stock'
                  ? 'نفد المخزون'
                  : stockStatus === 'low_stock'
                  ? 'مخزون منخفض'
                  : 'مخزون سليم'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* stock */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <label className="block text-xs font-bold text-ph-ink mb-1">
                  الكمية الحالية (stock) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.stock ?? 0}
                  onChange={(e) => set('stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="ph-input text-sm w-full font-mono font-bold"
                  required
                />
                <p className="text-[10px] text-ph-muted mt-1">الرصيد الفعلي المتوفر للبيع</p>
              </div>

              {/* minStock */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  الحد الأدنى (minStock) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.minStock ?? 5}
                  onChange={(e) => set('minStock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="ph-input text-sm w-full font-mono font-bold text-amber-900"
                  required
                />
                <p className="text-[10px] text-amber-700 font-semibold mt-1">
                  إطلاق إشعار عندما stock &lt; minStock
                </p>
              </div>

              {/* maxStock */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  الحد الأقصى (maxStock) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxStock ?? 100}
                  onChange={(e) => set('maxStock', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="ph-input text-sm w-full font-mono font-bold text-emerald-900"
                  required
                />
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  سعة التخزين المستهدفة
                </p>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-ph-ink">
                <span>نسبة التخزين الحالية: {stockPercentage.toFixed(0)}%</span>
                <span className="text-ph-muted">
                  {currentStock} / {currentMax} قطعة
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stockStatus === 'out_of_stock'
                      ? 'bg-red-500'
                      : stockStatus === 'low_stock'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              الوصف بالعربية
            </label>
            <textarea
              value={form.descriptionAr}
              onChange={(e) => set('descriptionAr', e.target.value)}
              rows={3}
              className="ph-input text-sm w-full leading-relaxed"
              placeholder="وصف تفصيلي لميزات ومواصفات المنتج..."
            />
          </div>

          {/* Compatibility */}
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              أجهزة iPad المتوافقة (افصل بينها بـ «،» أو فاصلة)
            </label>
            <textarea
              value={compatInput}
              onChange={(e) => setCompatInput(e.target.value)}
              rows={2}
              className="ph-input text-sm w-full"
              placeholder="iPad Pro 11 (M4)، iPad Air 11 (M2)، iPad 10th Gen..."
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6 text-xs font-bold text-ph-ink pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isFeatured ?? false}
                onChange={(e) => set('isFeatured', e.target.checked)}
                className="h-4 w-4 rounded border-ph-border text-ph-brand focus:ring-ph-brand"
              />
              <span>منتج مميز (يظهر في القسم الرئيسي)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => set('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-ph-border text-ph-brand focus:ring-ph-brand"
              />
              <span>نشط ومتاح للعملاء</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
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
              <span>{mode === 'add' ? 'إضافة المنتج إلى المستودع' : 'حفظ التعديلات'}</span>
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
