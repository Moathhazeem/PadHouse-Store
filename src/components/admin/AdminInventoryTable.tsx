import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Filter,
  Loader2,
  PackageCheck,
  PackageOpen,
  PackageX,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { Product } from '../../types';

export type StockStatus = 'out_of_stock' | 'low_stock' | 'healthy';

export function calculateStockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return 'out_of_stock';
  const min = (product as any).minStock ?? product.minThreshold ?? 5;
  if (product.stock < min) return 'low_stock';
  return 'healthy';
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  if (status === 'out_of_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-black text-red-700 shadow-2xs">
        <XCircle className="h-3 w-3" />
        <span>نفد المخزون</span>
      </span>
    );
  }
  if (status === 'low_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs">
        <AlertTriangle className="h-3 w-3" />
        <span>مخزون منخفض</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
      <CheckCircle2 className="h-3 w-3" />
      <span>متوفر وسليم</span>
    </span>
  );
}

export interface AdminInventoryTableProps {
  products: Product[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'low' | 'out' | 'healthy';
  onFilterChange: (filter: 'all' | 'low' | 'out' | 'healthy') => void;
  onRefresh: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onQuickRestock: (product: Product) => void;
}

export const AdminInventoryTable: React.FC<AdminInventoryTableProps> = ({
  products,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onFilterChange,
  onRefresh,
  onEdit,
  onDelete,
  onQuickRestock,
}) => {
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    const status = calculateStockStatus(p);
    const matchFilter =
      statusFilter === 'all' ||
      (statusFilter === 'low' && status === 'low_stock') ||
      (statusFilter === 'out' && status === 'out_of_stock') ||
      (statusFilter === 'healthy' && status === 'healthy');

    return matchSearch && matchFilter;
  });

  const totalCount = products.length;
  const outCount = products.filter((p) => calculateStockStatus(p) === 'out_of_stock').length;
  const lowCount = products.filter((p) => calculateStockStatus(p) === 'low_stock').length;
  const healthyCount = products.filter((p) => calculateStockStatus(p) === 'healthy').length;

  return (
    <div className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden" dir="rtl">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 border-b border-ph-border p-4 bg-white">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ph-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو رمز SKU..."
            className="ph-input w-full pr-10 text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-ph-brand text-white shadow-xs'
                : 'bg-ph-background text-ph-muted hover:bg-slate-200'
            }`}
          >
            الكل ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('low')}
            className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
              statusFilter === 'low'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            منخفض ({lowCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('out')}
            className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
              statusFilter === 'out'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
            }`}
          >
            نفد ({outCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('healthy')}
            className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
              statusFilter === 'healthy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            متوفر ({healthyCount})
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors disabled:opacity-50"
            title="تحديث الجدول"
            aria-label="تحديث الجدول"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-ph-brand' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead className="bg-ph-background border-b border-ph-border text-ph-muted">
            <tr>
              <th className="px-4 py-3.5 font-bold">المنتج</th>
              <th className="px-4 py-3.5 font-bold font-mono">SKU</th>
              <th className="px-4 py-3.5 font-bold text-center">المخزون الحالي</th>
              <th className="px-4 py-3.5 font-bold text-center text-amber-800">الحد الأدنى (minStock)</th>
              <th className="px-4 py-3.5 font-bold text-center text-emerald-800">الحد الأقصى (maxStock)</th>
              <th className="px-4 py-3.5 font-bold text-center">حالة المخزون</th>
              <th className="px-4 py-3.5 font-bold text-center">السعر</th>
              <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ph-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-ph-muted">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-ph-brand" />
                  <p className="text-xs font-bold">جارٍ تحميل بيانات المنتجات والمخزون…</p>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-ph-muted">
                  <PackageOpen className="h-9 w-9 mx-auto mb-2 text-ph-border" />
                  <p className="text-xs font-bold">لا توجد منتجات مطابقة لخيارات البحث أو الفلترة</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const status = calculateStockStatus(p);
                const minStock = (p as any).minStock ?? p.minThreshold ?? 5;
                const maxStock = (p as any).maxStock ?? 100;
                const fillRatio =
                  maxStock > 0 ? Math.min(100, Math.max(0, (p.stock / maxStock) * 100)) : 0;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-ph-background/80 transition-colors ${
                      status === 'out_of_stock'
                        ? 'bg-red-50/30'
                        : status === 'low_stock'
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 max-w-[240px]">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-10 w-10 rounded-xl object-contain border border-ph-border bg-white p-1 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                            <PackageOpen className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-ph-ink line-clamp-1 leading-snug" title={p.name}>
                            {p.name}
                          </p>
                          <span className="text-[10px] text-ph-muted truncate block">
                            {p.compatibility}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 font-mono text-ph-ink font-semibold">{p.sku}</td>

                    {/* Current Stock */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-mono text-sm font-black ${
                          status === 'out_of_stock'
                            ? 'text-red-600'
                            : status === 'low_stock'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {p.stock}
                      </span>
                      {/* Mini visual fill gauge */}
                      <div className="mt-1.5 h-1.5 w-16 mx-auto overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            status === 'out_of_stock'
                              ? 'bg-red-500'
                              : status === 'low_stock'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fillRatio}%` }}
                        />
                      </div>
                    </td>

                    {/* minStock */}
                    <td className="px-4 py-3 text-center font-mono font-bold text-amber-800">
                      {minStock}
                    </td>

                    {/* maxStock */}
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-800">
                      {maxStock}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 text-center">
                      <StockStatusBadge status={status} />
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-center font-bold text-ph-ink">
                      <span className="font-mono">{p.price}</span> ₪
                      {p.originalPrice > p.price && (
                        <span className="block text-[10px] text-ph-muted line-through font-mono">
                          {p.originalPrice} ₪
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onQuickRestock(p)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 transition-colors"
                          title="إعادة تخزين سريع"
                          aria-label={`إعادة تخزين ${p.name}`}
                        >
                          <PackageCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-ph-brand hover:text-white text-ph-ink transition-colors"
                          title="تعديل المنتج والمخزون"
                          aria-label={`تعديل ${p.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-ph-muted transition-colors"
                          title="حذف المنتج"
                          aria-label={`حذف ${p.name}`}
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

      {/* Summary Footer Bar */}
      {!loading && products.length > 0 && (
        <div className="border-t border-ph-border bg-ph-background/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-ph-muted">
            <span>
              إجمالي الأصناف: <strong className="text-ph-ink font-mono">{totalCount}</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-700">
              متوفر: <strong className="font-mono">{healthyCount}</strong>
            </span>
            <span>•</span>
            <span className="text-amber-700">
              مخزون منخفض: <strong className="font-mono">{lowCount}</strong>
            </span>
            <span>•</span>
            <span className="text-red-700">
              نفد المخزون: <strong className="font-mono">{outCount}</strong>
            </span>
          </div>

          <span className="text-[11px] text-ph-muted">
            يتم تحديث رصيد المخزون وحسابات التنبيه تلقائياً عبر NestJS Inventory Service
          </span>
        </div>
      )}
    </div>
  );
};
