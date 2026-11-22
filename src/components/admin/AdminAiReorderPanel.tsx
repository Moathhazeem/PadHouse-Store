import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wand2,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  adminCreateAiDraftPurchaseOrderApi,
  adminFetchAiReorderSuggestionsApi,
  type AdminAiDraftPurchaseOrderResult,
  type AdminAiReorderAnalysisResult,
  type AdminAiReorderPriority,
  type AdminAiReorderSuggestion,
  type AdminAiReorderSupplierOption,
} from '../../services/adminApi';
import { PO_STATUS_META, formatDateTime, formatMoney } from './purchaseOrderUtils';

export interface AdminAiReorderPanelProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
  /** Opens a generated draft in the Purchase Orders section for manual review. */
  onOpenOrder?: (orderId: string) => void;
}

const WINDOW_OPTIONS = [7, 14, 30, 60, 90];

const PRIORITY_META: Record<AdminAiReorderPriority, { label: string; className: string }> = {
  HIGH: { label: 'أولوية عالية', className: 'bg-red-100 text-red-700 border-red-200' },
  MEDIUM: { label: 'أولوية متوسطة', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  LOW: { label: 'أولوية منخفضة', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

/**
 * Purchase-management AI panel.
 *
 * This is NOT a separate assistant — it calls the two admin endpoints hosted on
 * the existing PadHouse `/ai` module. Everything shown here is derived from real
 * database records; the panel only *displays* the analysis and *requests* DRAFT
 * purchase orders. Approval, sending and goods receipt stay manual actions in
 * the Purchase Orders / Goods Receipt sections, and both server and client
 * refuse to auto-execute any of them.
 */
export const AdminAiReorderPanel: React.FC<AdminAiReorderPanelProps> = ({
  onToast,
  onOpenOrder,
}) => {
  const [windowDays, setWindowDays] = useState(30);
  const [analysis, setAnalysis] = useState<AdminAiReorderAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Product ids the admin wants included when drafting (defaults to all). */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [supplierOverride, setSupplierOverride] = useState('');
  const [requestMessage, setRequestMessage] = useState('أنشئ أمر شراء للمنتجات التي تحتاج إعادة توريد');
  const [expectedAt, setExpectedAt] = useState('');
  const [showCovered, setShowCovered] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<AdminAiDraftPurchaseOrderResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchAiReorderSuggestionsApi({ windowDays });
      setAnalysis(result);
      setSelected(new Set(result.suggestions.map((s) => s.productId)));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'تعذر جلب اقتراحات إعادة التوريد');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    load();
  }, [load]);

  /** Existing suppliers referenced by the analysis (never invented on the client). */
  const supplierOptions = useMemo<AdminAiReorderSupplierOption[]>(() => {
    const map = new Map<string, AdminAiReorderSupplierOption>();
    for (const suggestion of analysis?.suggestions ?? []) {
      for (const candidate of suggestion.supplierCandidates) {
        if (!map.has(candidate.id)) map.set(candidate.id, candidate);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [analysis]);

  const toggleSelected = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectedSuggestions = useMemo(
    () => (analysis?.suggestions ?? []).filter((s) => selected.has(s.productId)),
    [analysis, selected],
  );

  const selectedEstimatedCost = useMemo(
    () => selectedSuggestions.reduce((sum, s) => sum + s.estimatedLineCost, 0),
    [selectedSuggestions],
  );

  const handleCreateDraft = async () => {
    setConfirmOpen(false);
    setDrafting(true);
    try {
      const result = await adminCreateAiDraftPurchaseOrderApi({
        message: requestMessage.trim() || undefined,
        windowDays,
        productIds: selected.size ? [...selected] : undefined,
        supplierId: supplierOverride || undefined,
        expectedAt: expectedAt || undefined,
      });
      setDraftResult(result);
      if (result.drafts.length) {
        onToast?.(`تم إنشاء ${result.drafts.length} مسودة أمر شراء بانتظار مراجعتك`);
      } else {
        onToast?.('لم يتم إنشاء أي مسودة — راجع التفاصيل أدناه', 'err');
      }
      await load();
    } catch (err: any) {
      onToast?.(err?.message || 'تعذر إنشاء مسودة أمر الشراء', 'err');
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-ph-border bg-white p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ph-brand/10 text-ph-brand shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-ph-ink">مساعد المشتريات الذكي</h2>
                <span className="rounded-md bg-ph-brand/10 text-ph-brand px-2 py-0.5 text-[10px] font-bold">
                  داخل المساعد الحالي
                </span>
              </div>
              <p className="text-xs text-ph-muted mt-1 leading-relaxed max-w-2xl">
                تحليل حقيقي لأرصدة المخزون والحد الأدنى والأقصى ومتوسط المبيعات وأوامر الشراء القائمة
                والكميات المستحقة، مع اقتراح الكميات والموردين. لا يُعتمد أو يُرسل أي أمر شراء تلقائياً.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-ph-muted">نافذة المبيعات</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="rounded-xl border border-ph-border bg-white px-3 py-2 text-xs font-bold text-ph-ink focus:border-ph-brand focus:outline-none"
            >
              {WINDOW_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} يوماً
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-ph-brand hover:bg-ph-brand-hover disabled:opacity-50 text-white px-4 py-2 text-xs font-bold transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تشغيل التحليل</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Error / Loading ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black">تعذر إكمال التحليل</p>
            <p className="text-[11px] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && !analysis ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-ph-border bg-white py-16 text-ph-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs font-bold">جارٍ تحليل بيانات المخزون والمشتريات…</span>
        </div>
      ) : analysis ? (
        <>
          {/* ── Summary ── */}
          <div className="rounded-3xl border border-ph-brand/20 bg-ph-brand/5 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-ph-brand mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-ph-ink leading-relaxed whitespace-pre-line">
                  {analysis.summary}
                </p>
                <p className="text-[10px] text-ph-muted mt-2">
                  آخر تحديث: {formatDateTime(analysis.generatedAt)} · نافذة {analysis.windowDays} يوماً
                </p>
              </div>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi label="منتجات محللة" value={analysis.kpis.productsAnalyzed} tone="neutral" />
            <Kpi label="تحتاج إعادة توريد" value={analysis.kpis.productsNeedingRestock} tone="amber" />
            <Kpi label="نافدة بالكامل" value={analysis.kpis.outOfStockCount} tone="red" />
            <Kpi
              label="مغطاة بكميات قادمة"
              value={analysis.kpis.productsCoveredByInbound}
              tone="emerald"
            />
            <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-ph-muted">التكلفة التقديرية</span>
              <p className="text-lg font-black text-ph-ink font-mono mt-1 truncate">
                {formatMoney(analysis.kpis.estimatedTotalCost, analysis.kpis.currency)}
              </p>
              <span className="text-[10px] text-ph-muted mt-1 block">لكل التوصيات المعروضة</span>
            </div>
          </div>

          {/* ── Suggestions ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-ph-ink flex items-center gap-2">
                <PackageSearch className="h-4 w-4 text-ph-brand" />
                المنتجات التي تحتاج إعادة توريد
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      selected.size === analysis.suggestions.length
                        ? new Set()
                        : new Set(analysis.suggestions.map((s) => s.productId)),
                    )
                  }
                  className="text-[11px] font-bold text-ph-brand hover:underline"
                >
                  {selected.size === analysis.suggestions.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>
            </div>

            {analysis.suggestions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p className="text-xs font-bold">
                  لا توجد منتجات تحتاج إعادة توريد حالياً ضمن النافذة المحددة.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysis.suggestions.map((s) => (
                  <SuggestionCard
                    key={s.productId}
                    suggestion={s}
                    checked={selected.has(s.productId)}
                    onToggle={() => toggleSelected(s.productId)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Covered (dedupe evidence) ── */}
          {analysis.covered.length > 0 && (
            <section className="rounded-3xl border border-ph-border bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCovered((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right hover:bg-ph-background/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-black text-ph-ink">
                    منتجات منخفضة ولكنها مغطاة بكميات قادمة ({analysis.covered.length})
                  </span>
                </span>
                <span className="text-[11px] font-bold text-ph-muted">
                  {showCovered ? 'إخفاء' : 'عرض'}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {showCovered && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-ph-border"
                  >
                    <ul className="divide-y divide-ph-border">
                      {analysis.covered.map((c) => (
                        <li key={c.productId} className="px-5 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-ph-ink">
                              {c.nameAr}{' '}
                              <span className="font-mono text-[10px] text-ph-muted">({c.sku})</span>
                            </span>
                            <span className="text-[10px] text-ph-muted">
                              مخزون {c.currentStock} / حد أدنى {c.minStock} · قادم{' '}
                              <strong className="text-emerald-700">{c.inboundQuantity}</strong>
                            </span>
                          </div>
                          <p className="text-[11px] text-ph-muted mt-1">{c.note}</p>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* ── Draft creation ── */}
          <section className="rounded-3xl border border-ph-border bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-ph-ink">إنشاء مسودة أمر شراء</h3>
                <p className="text-[11px] text-ph-muted mt-0.5 leading-relaxed">
                  يتم إنشاء <strong>مسودة</strong> فقط. الاعتماد والإرسال وتسجيل استلام البضائع تبقى خطوات
                  يدوية من صلاحية المدير.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-ph-muted">طلب المدير (اختياري)</label>
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ph-border px-3 py-2 text-xs text-ph-ink focus:border-ph-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ph-muted">
                  تثبيت مورد واحد (اختياري)
                </label>
                <select
                  value={supplierOverride}
                  onChange={(e) => setSupplierOverride(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ph-border bg-white px-3 py-2 text-xs font-bold text-ph-ink focus:border-ph-brand focus:outline-none"
                >
                  <option value="">حسب المورد المقترح لكل منتج</option>
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      {supplier.company ? ` — ${supplier.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-ph-muted">
                  تاريخ التسليم المتوقع (اختياري)
                </label>
                <input
                  type="date"
                  value={expectedAt}
                  onChange={(e) => setExpectedAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ph-border px-3 py-2 text-xs text-ph-ink focus:border-ph-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-ph-border pt-4">
              <p className="text-[11px] text-ph-muted">
                المحدد: <strong className="text-ph-ink font-mono">{selectedSuggestions.length}</strong>{' '}
                منتجاً · التكلفة التقديرية{' '}
                <strong className="text-ph-ink font-mono">
                  {formatMoney(selectedEstimatedCost, analysis.kpis.currency)}
                </strong>
              </p>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={drafting || selectedSuggestions.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                title="ينشئ مسودة بحالة (مسودة) فقط"
              >
                {drafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
                )}
                <span>إنشاء مسودة أمر شراء</span>
              </button>
            </div>
          </section>

          {/* ── Draft results ── */}
          {draftResult && (
            <section className="space-y-3">
              <h3 className="text-sm font-black text-ph-ink flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-ph-brand" />
                المسودات الجاهزة للمراجعة
              </h3>

              {draftResult.reply && (
                <div className="rounded-2xl border border-ph-border bg-ph-background/60 px-4 py-3">
                  <p className="text-xs text-ph-ink whitespace-pre-line leading-relaxed">
                    {draftResult.reply}
                  </p>
                </div>
              )}

              {draftResult.drafts.length === 0 ? (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold">
                    لم يتم إنشاء أي مسودة. راجع البنود المتجاهلة أدناه.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftResult.drafts.map((draft) => {
                    const meta = PO_STATUS_META[draft.status];
                    return (
                      <div
                        key={draft.id}
                        className="rounded-3xl border border-ph-border bg-white p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-ph-ink">
                              {draft.orderNumber}
                            </span>
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${meta?.className ?? ''}`}
                            >
                              {meta?.label ?? draft.status}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-ph-ink font-mono">
                            {formatMoney(draft.grandTotal, draft.currency)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ph-muted">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" />
                            {draft.supplier?.name ?? '—'}
                            {draft.supplier?.company ? ` (${draft.supplier.company})` : ''}
                          </span>
                          <span>عدد البنود: {draft.itemsCount}</span>
                          {draft.expectedAt && <span>التسليم المتوقع: {formatDateTime(draft.expectedAt)}</span>}
                        </div>

                        <ul className="divide-y divide-ph-border rounded-2xl border border-ph-border">
                          {draft.items.map((item) => (
                            <li
                              key={item.productId}
                              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                            >
                              <span className="text-xs font-bold text-ph-ink">
                                {item.productName}{' '}
                                <span className="font-mono text-[10px] text-ph-muted">({item.sku})</span>
                              </span>
                              <span className="flex items-center gap-3 text-[11px] text-ph-muted">
                                <span>
                                  الكمية <strong className="text-ph-ink font-mono">{item.orderedQuantity}</strong>
                                </span>
                                {item.needsPricing ? (
                                  <span className="rounded-md bg-red-100 text-red-700 px-1.5 py-0.5 font-bold">
                                    يحتاج تسعيراً
                                  </span>
                                ) : (
                                  <span className="font-mono">
                                    {formatMoney(item.lineSubtotal, draft.currency)}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] text-ph-muted">
                            مسودة فقط — لم تُعتمد ولم تُرسل. يرجى مراجعتها ثم اعتمادها يدوياً.
                          </p>
                          {onOpenOrder && (
                            <button
                              type="button"
                              onClick={() => onOpenOrder(draft.id)}
                              className="rounded-xl border border-ph-brand/40 bg-ph-brand/5 text-ph-brand px-3 py-1.5 text-[11px] font-bold hover:bg-ph-brand/10 transition-colors"
                            >
                              مراجعة في أوامر الشراء
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {draftResult.skipped.length > 0 && (
                <div className="rounded-2xl border border-ph-border bg-white px-4 py-3">
                  <p className="text-[11px] font-black text-ph-muted mb-2">
                    بنود متجاهلة ({draftResult.skipped.length})
                  </p>
                  <ul className="space-y-1">
                    {draftResult.skipped.map((skip) => (
                      <li key={skip.productId} className="text-[11px] text-ph-muted">
                        • {skip.nameAr} — {skip.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      ) : null}

      {/* ── Explicit authorization confirmation ── */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ph-ink">تأكيد إنشاء المسودة</h3>
                  <p className="text-[11px] text-ph-muted">صلاحية المدير مطلوبة لهذا الإجراء</p>
                </div>
              </div>
              <p className="text-xs text-ph-ink leading-relaxed">
                سيتم إنشاء مسودة أمر شراء لـ{' '}
                <strong className="font-mono">{selectedSuggestions.length}</strong> منتجاً
                {supplierOverride
                  ? ' على المورد المحدد'
                  : ' موزّعة حسب المورد المقترح لكل منتج'}
                . لن يتم اعتماد أو إرسال أو استلام أي شيء تلقائياً.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 text-xs transition-colors"
                >
                  نعم، أنشئ المسودة
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-xl border border-ph-border text-ph-ink font-bold py-2.5 text-xs hover:bg-ph-background transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

type KpiTone = 'neutral' | 'amber' | 'red' | 'emerald';

const Kpi: React.FC<{ label: string; value: number; tone: KpiTone }> = ({
  label,
  value,
  tone,
}) => {
  const tones: Record<KpiTone, string> = {
    neutral: 'border-ph-border bg-white text-ph-ink',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-800',
    red: 'border-red-200 bg-red-50/60 text-red-800',
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-800',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${tones[tone]}`}>
      <span className="text-[11px] font-bold opacity-80">{label}</span>
      <p className="text-2xl font-black font-mono mt-1">{value}</p>
    </div>
  );
};

const SuggestionCard: React.FC<{
  suggestion: AdminAiReorderSuggestion;
  checked: boolean;
  onToggle: () => void;
}> = ({ suggestion: s, checked, onToggle }) => {
  const priority = PRIORITY_META[s.priority];
  return (
    <div
      className={`rounded-3xl border bg-white p-4 shadow-2xs transition-colors ${
        checked ? 'border-ph-brand/40' : 'border-ph-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 accent-ph-brand cursor-pointer"
          aria-label={`تضمين ${s.nameAr}`}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-black text-ph-ink truncate">{s.nameAr}</span>
              <span className="font-mono text-[10px] text-ph-muted shrink-0">({s.sku})</span>
              {s.category && (
                <span className="rounded-md bg-ph-background px-1.5 py-0.5 text-[10px] font-bold text-ph-muted">
                  {s.category}
                </span>
              )}
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${priority.className}`}>
              {priority.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Metric label="المخزون الحالي" value={s.currentStock} />
            <Metric label="الحد الأدنى" value={s.minStock} />
            <Metric label="الحد الأقصى" value={s.maxStock} />
            <Metric label="كمية قادمة" value={s.inboundQuantity} tone="emerald" />
            <Metric label="المتوقع بعد التوريد" value={s.projectedStock} />
            <Metric label="متوسط البيع اليومي" value={s.avgDailySales} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-2xl border border-ph-brand/30 bg-ph-brand/5 px-3 py-2">
              <span className="text-[10px] font-bold text-ph-muted">الكمية المقترحة</span>
              <p className="text-lg font-black text-ph-brand font-mono">{s.suggestedQuantity}</p>
            </div>
            <div className="rounded-2xl border border-ph-border px-3 py-2">
              <span className="text-[10px] font-bold text-ph-muted">تكلفة الوحدة (تقديرية)</span>
              <p className="text-lg font-black text-ph-ink font-mono">
                {s.needsPricing ? '—' : formatMoney(s.suggestedUnitCost)}
              </p>
              {s.needsPricing && (
                <span className="text-[10px] font-bold text-red-600">يحتاج تسعيراً يدوياً</span>
              )}
            </div>
            <div className="rounded-2xl border border-ph-border px-3 py-2">
              <span className="text-[10px] font-bold text-ph-muted">تكلفة السطر (تقديرية)</span>
              <p className="text-lg font-black text-ph-ink font-mono">
                {formatMoney(s.estimatedLineCost)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-ph-muted leading-relaxed">{s.reason}</p>

          {/* Suppliers */}
          <div className="rounded-2xl border border-ph-border bg-ph-background/40 p-3">
            <p className="text-[11px] font-black text-ph-muted mb-2 flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              الموردون المقترحون
            </p>
            {s.supplierCandidates.length === 0 ? (
              <p className="text-[11px] text-ph-muted">
                لا يوجد مورد مسجّل لهذا المنتج — أضف مورداً لإنشاء أمر شراء.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {s.supplierCandidates.map((supplier) => (
                  <li
                    key={supplier.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="flex items-center gap-2">
                      {supplier.isPreferred && (
                        <span className="rounded-md bg-ph-brand/10 text-ph-brand px-1.5 py-0.5 text-[9px] font-bold">
                          مفضّل
                        </span>
                      )}
                      <span className="font-bold text-ph-ink">{supplier.name}</span>
                      {supplier.company && <span className="text-ph-muted">— {supplier.company}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-ph-muted">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          supplier.source === 'HISTORY'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {supplier.source === 'HISTORY' ? 'سجل شراء' : 'مقترح من السجل'}
                      </span>
                      {supplier.purchaseOrdersCount > 0 && (
                        <span className="font-mono">{supplier.purchaseOrdersCount} أمر</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; tone?: 'neutral' | 'emerald' }> = ({
  label,
  value,
  tone = 'neutral',
}) => (
  <div className="rounded-xl border border-ph-border px-2.5 py-1.5">
    <span className="text-[10px] font-bold text-ph-muted block truncate">{label}</span>
    <span
      className={`text-sm font-black font-mono ${tone === 'emerald' ? 'text-emerald-700' : 'text-ph-ink'}`}
    >
      {value}
    </span>
  </div>
);
