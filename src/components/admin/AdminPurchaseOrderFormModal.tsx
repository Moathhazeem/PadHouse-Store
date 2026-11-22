import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Product } from '../../types';
import {
  adminFetchProductsApi,
  adminFetchSuppliersApi,
  type AdminPurchaseOrderDetails,
  type AdminPurchaseOrderFormData,
  type AdminSupplier,
} from '../../services/adminApi';
import { computeDraftLine, computeDraftTotals, formatMoney } from './purchaseOrderUtils';

export interface AdminPurchaseOrderFormModalProps {
  mode: 'add' | 'edit';
  /** Present when editing an existing DRAFT order. */
  initial?: AdminPurchaseOrderDetails | null;
  onSave: (data: AdminPurchaseOrderFormData, id?: string) => Promise<void>;
  onClose: () => void;
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

interface DraftLine {
  /** Stable row key (client-side only). */
  key: string;
  productId: string;
  orderedQuantity: number;
  unitCost: number;
  discountRate: number;
  taxRate: number;
}

const CURRENCIES = ['ILS', 'USD', 'EUR', 'JOD'];

const EMPTY_HEADER = {
  supplierId: '',
  currency: 'ILS',
  paymentTerms: '',
  orderDate: new Date().toISOString().slice(0, 10),
  expectedAt: '',
  notes: '',
  shippingCost: 0,
};

let rowSeq = 0;
const nextKey = () => `row-${Date.now()}-${rowSeq++}`;

const toDateInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const emptyLine = (): DraftLine => ({
  key: nextKey(),
  productId: '',
  orderedQuantity: 1,
  unitCost: 0,
  discountRate: 0,
  taxRate: 0,
});

export const AdminPurchaseOrderFormModal: React.FC<AdminPurchaseOrderFormModalProps> = ({
  mode,
  initial,
  onSave,
  onClose,
  onToast,
}) => {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  const [header, setHeader] = useState(() => ({
    ...EMPTY_HEADER,
    supplierId: initial?.supplier?.id ?? '',
    currency: initial?.currency ?? 'ILS',
    paymentTerms: initial?.paymentTerms ?? '',
    orderDate: toDateInput(initial?.orderDate) || EMPTY_HEADER.orderDate,
    expectedAt: toDateInput(initial?.expectedAt),
    notes: initial?.notes ?? '',
    shippingCost: initial?.shippingCost ?? 0,
  }));

  const [lines, setLines] = useState<DraftLine[]>(() =>
    initial && initial.items.length > 0
      ? initial.items.map((item) => ({
          key: nextKey(),
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          unitCost: item.unitCost,
          discountRate: item.discountRate,
          taxRate: item.taxRate,
        }))
      : [emptyLine()],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load reference data (suppliers + existing catalog products) ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      setRefLoading(true);
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          adminFetchSuppliersApi(),
          adminFetchProductsApi(),
        ]);
        if (!alive) return;
        setSuppliers(suppliersRes.items.filter((s) => s.isActive));
        setProducts(productsRes);
      } catch (err: any) {
        if (!alive) return;
        onToast?.(err?.message || 'تعذر تحميل الموردين أو المنتجات', 'err');
      } finally {
        if (alive) setRefLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onToast]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  /** Product ids already used on other rows (prevents duplicates in the picker). */
  const usedProductIds = useMemo(
    () => new Set(lines.map((l) => l.productId).filter(Boolean)),
    [lines],
  );

  const totals = useMemo(
    () =>
      computeDraftTotals(
        lines.map((l) => ({
          productId: l.productId,
          orderedQuantity: l.orderedQuantity,
          unitCost: l.unitCost,
          discountRate: l.discountRate,
          taxRate: l.taxRate,
        })),
        header.shippingCost,
      ),
    [lines, header.shippingCost],
  );

  const setHeaderField = (field: keyof typeof header, value: any) =>
    setHeader((prev) => ({ ...prev, [field]: value }));

  const patchLine = useCallback((key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));

  /** Selecting a product on a row snapshots its identity for display only. */
  const selectProduct = (key: string, productId: string) => {
    patchLine(key, { productId });
  };

  const validate = (): string | null => {
    if (!header.supplierId) return 'يجب اختيار المورد';
    if (lines.length === 0) return 'يجب إضافة بند واحد على الأقل';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.productId) return `يجب اختيار منتج في البند رقم ${i + 1}`;
      if (!Number.isInteger(Number(l.orderedQuantity)) || Number(l.orderedQuantity) < 1) {
        return `الكمية المطلوبة في البند رقم ${i + 1} يجب أن تكون عدداً صحيحاً ≥ 1`;
      }
      if (Number(l.unitCost) < 0 || Number.isNaN(Number(l.unitCost))) {
        return `تكلفة الوحدة في البند رقم ${i + 1} غير صالحة`;
      }
      if (Number(l.discountRate) < 0 || Number(l.discountRate) > 100) {
        return `نسبة الخصم في البند رقم ${i + 1} يجب أن تكون بين 0 و 100`;
      }
      if (Number(l.taxRate) < 0 || Number(l.taxRate) > 100) {
        return `نسبة الضريبة في البند رقم ${i + 1} يجب أن تكون بين 0 و 100`;
      }
    }
    const ids = lines.map((l) => l.productId);
    if (new Set(ids).size !== ids.length) {
      return 'لا يمكن تكرار نفس المنتج في أكثر من بند';
    }
    if (Number(header.shippingCost) < 0) return 'تكلفة الشحن لا يمكن أن تكون سالبة';
    if (header.expectedAt && header.orderDate && header.expectedAt < header.orderDate) {
      return 'تاريخ التسليم المتوقع لا يمكن أن يسبق تاريخ الطلب';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    try {
      const payload: AdminPurchaseOrderFormData = {
        supplierId: header.supplierId,
        currency: header.currency,
        paymentTerms: header.paymentTerms.trim() || undefined,
        orderDate: header.orderDate || undefined,
        expectedAt: header.expectedAt || undefined,
        notes: header.notes.trim() || undefined,
        shippingCost: Number(header.shippingCost) || 0,
        items: lines.map((l) => ({
          productId: l.productId,
          orderedQuantity: Number(l.orderedQuantity),
          unitCost: Number(l.unitCost),
          discountRate: Number(l.discountRate) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
      };
      await onSave(payload, initial?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ أمر الشراء');
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
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-ph-border bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ph-brand/10 text-ph-brand">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ph-ink">
                {mode === 'add' ? 'إنشاء أمر شراء جديد' : 'تعديل مسودة أمر الشراء'}
              </h2>
              <p className="text-[11px] text-ph-muted">
                {mode === 'add'
                  ? 'سيتم توليد رقم أمر الشراء تلقائياً بصيغة PO-YYYY-NNNN'
                  : `أمر الشراء ${initial?.orderNumber ?? ''} — التعديل متاح للمسودات فقط`}
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
          {refLoading && (
            <div className="flex items-center gap-2 rounded-xl bg-ph-background border border-ph-border p-3 text-xs font-bold text-ph-muted">
              <Loader2 className="h-4 w-4 animate-spin text-ph-brand" />
              <span>جارٍ تحميل الموردين والمنتجات…</span>
            </div>
          )}

          {/* General information */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-ph-brand">المعلومات العامة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-ph-ink mb-1.5">المورد *</label>
                <select
                  value={header.supplierId}
                  onChange={(e) => setHeaderField('supplierId', e.target.value)}
                  className="ph-input text-sm w-full"
                  required
                >
                  <option value="">— اختر المورد —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.company ? ` — ${s.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ph-ink mb-1.5">العملة</label>
                <select
                  value={header.currency}
                  onChange={(e) => setHeaderField('currency', e.target.value)}
                  className="ph-input text-sm w-full"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ph-ink mb-1.5">شروط الدفع</label>
                <input
                  value={header.paymentTerms}
                  onChange={(e) => setHeaderField('paymentTerms', e.target.value)}
                  className="ph-input text-sm w-full"
                  placeholder="Net 30 / دفع فوري"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ph-ink mb-1.5">تاريخ الطلب</label>
                <input
                  type="date"
                  value={header.orderDate}
                  onChange={(e) => setHeaderField('orderDate', e.target.value)}
                  className="ph-input text-sm w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ph-ink mb-1.5">
                  تاريخ التسليم المتوقع
                </label>
                <input
                  type="date"
                  value={header.expectedAt}
                  onChange={(e) => setHeaderField('expectedAt', e.target.value)}
                  className="ph-input text-sm w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ph-ink mb-1.5">تكلفة الشحن</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={header.shippingCost}
                  onChange={(e) => setHeaderField('shippingCost', e.target.value)}
                  className="ph-input text-sm w-full font-mono"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ph-ink mb-1.5">ملاحظات</label>
              <textarea
                value={header.notes}
                onChange={(e) => setHeaderField('notes', e.target.value)}
                rows={2}
                className="ph-input text-sm w-full leading-relaxed"
                placeholder="ملاحظات عامة على أمر الشراء..."
              />
            </div>
          </section>

          {/* Line items */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-ph-brand">بنود أمر الشراء</h3>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs font-bold text-ph-brand hover:text-ph-brand-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة بند</span>
              </button>
            </div>

            <div className="rounded-2xl border border-ph-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse min-w-[900px]">
                  <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
                    <tr>
                      <th className="px-3 py-2.5 font-bold min-w-[200px]">المنتج</th>
                      <th className="px-3 py-2.5 font-bold text-center w-20">الرمز</th>
                      <th className="px-3 py-2.5 font-bold text-center w-24">الكمية *</th>
                      <th className="px-3 py-2.5 font-bold text-center w-28">تكلفة الوحدة *</th>
                      <th className="px-3 py-2.5 font-bold text-center w-20">خصم %</th>
                      <th className="px-3 py-2.5 font-bold text-center w-20">ضريبة %</th>
                      <th className="px-3 py-2.5 font-bold text-center w-28">الإجمالي</th>
                      <th className="px-3 py-2.5 font-bold text-center w-14">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ph-border">
                    {lines.map((line, idx) => {
                      const product = productById.get(line.productId);
                      const money = computeDraftLine({
                        productId: line.productId,
                        orderedQuantity: line.orderedQuantity,
                        unitCost: line.unitCost,
                        discountRate: line.discountRate,
                        taxRate: line.taxRate,
                      });
                      return (
                        <tr key={line.key} className="align-top">
                          <td className="px-3 py-2.5">
                            <select
                              value={line.productId}
                              onChange={(e) => selectProduct(line.key, e.target.value)}
                              className="ph-input text-xs w-full"
                            >
                              <option value="">— اختر منتجاً موجوداً —</option>
                              {products.map((p) => {
                                const disabled =
                                  usedProductIds.has(p.id) && p.id !== line.productId;
                                return (
                                  <option key={p.id} value={p.id} disabled={disabled}>
                                    {(p.nameAr || p.name) + (disabled ? ' (مُضاف مسبقاً)' : '')}
                                  </option>
                                );
                              })}
                            </select>
                            <p className="text-[10px] text-ph-muted mt-1 font-mono">
                              {product ? `المخزون الحالي: ${product.stock}` : `البند ${idx + 1}`}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-ph-muted">
                            {product?.sku ?? '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={1}
                              step="1"
                              value={line.orderedQuantity}
                              onChange={(e) =>
                                patchLine(line.key, { orderedQuantity: Number(e.target.value) })
                              }
                              className="ph-input text-xs w-full text-center font-mono"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.unitCost}
                              onChange={(e) =>
                                patchLine(line.key, { unitCost: Number(e.target.value) })
                              }
                              className="ph-input text-xs w-full text-center font-mono"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={line.discountRate}
                              onChange={(e) =>
                                patchLine(line.key, { discountRate: Number(e.target.value) })
                              }
                              className="ph-input text-xs w-full text-center font-mono"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={line.taxRate}
                              onChange={(e) =>
                                patchLine(line.key, { taxRate: Number(e.target.value) })
                              }
                              className="ph-input text-xs w-full text-center font-mono"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-ph-ink whitespace-nowrap">
                            {formatMoney(money.lineSubtotal, header.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(line.key)}
                              disabled={lines.length === 1}
                              className="p-1.5 rounded-lg text-ph-muted hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30"
                              aria-label={`حذف البند ${idx + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Financial summary */}
          <section className="rounded-2xl border border-ph-border bg-ph-background/50 p-4">
            <h3 className="text-xs font-black text-ph-ink mb-3">الملخص المالي</h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              <SummaryCell label="المجموع الفرعي" value={formatMoney(totals.subtotal, header.currency)} />
              <SummaryCell
                label="إجمالي الخصومات"
                value={`- ${formatMoney(totals.discountTotal, header.currency)}`}
                tone="red"
              />
              <SummaryCell
                label="إجمالي الضرائب"
                value={formatMoney(totals.taxTotal, header.currency)}
              />
              <SummaryCell
                label="تكلفة الشحن"
                value={formatMoney(totals.shippingCost, header.currency)}
              />
              <SummaryCell
                label="الإجمالي النهائي"
                value={formatMoney(totals.grandTotal, header.currency)}
                tone="brand"
              />
            </dl>
          </section>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-ph-border">
            <button
              type="submit"
              disabled={busy || refLoading}
              className="flex-1 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm active:scale-98"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{mode === 'add' ? 'إنشاء أمر الشراء' : 'حفظ التعديلات'}</span>
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

function SummaryCell({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'red' | 'brand';
}) {
  const valueClass =
    tone === 'brand'
      ? 'text-ph-brand text-base'
      : tone === 'red'
      ? 'text-red-600'
      : 'text-ph-ink';
  return (
    <div className="bg-white rounded-xl border border-ph-border px-3 py-2.5">
      <dt className="text-[10px] font-bold text-ph-muted mb-1">{label}</dt>
      <dd className={`font-mono font-black ${valueClass}`} dir="ltr">
        {value}
      </dd>
    </div>
  );
}
