import React from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  PackageCheck,
  PackageX,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AdminNotification } from '../../services/adminApi';

export interface AdminLowStockPanelProps {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
  onRestock: (notification: AdminNotification) => void;
  onRefresh: () => void;
  onClose?: () => void;
}

export const AdminLowStockPanel: React.FC<AdminLowStockPanelProps> = ({
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onRestock,
  onRefresh,
  onClose,
}) => {
  return (
    <section
      aria-labelledby="low-stock-heading"
      className="rounded-3xl border border-ph-border bg-white shadow-sm overflow-hidden"
      dir="rtl"
    >
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ph-border bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="low-stock-heading" className="text-sm font-black text-ph-ink">
                مركز إشعارات المخزون المنخفض
              </h2>
              {unreadCount > 0 ? (
                <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white shadow-2xs">
                  {unreadCount} جديد
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  مستقر
                </span>
              )}
            </div>
            <p className="text-[11px] text-ph-muted mt-0.5">
              تنبيهات فورية عند وصول المنتجات للحد الأدنى (minStock) أو نفادها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ph-border bg-white px-3 py-1.5 text-xs font-bold text-ph-brand hover:bg-ph-background hover:border-ph-brand transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-ph-border text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors disabled:opacity-50"
            title="تحديث الإشعارات"
            aria-label="تحديث الإشعارات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-ph-brand' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="max-h-[460px] overflow-y-auto divide-y divide-ph-border/70 scrollbar-thin">
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-ph-muted">
            <Loader2 className="h-6 w-6 animate-spin text-ph-brand" />
            <span className="font-semibold">جارٍ مزامنة إشعارات المخزون من الخادم…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <PackageCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-ph-ink">لا توجد تنبيهات نقص حالياً</p>
            <p className="text-xs text-ph-muted max-w-sm">
              جميع المنتجات في المستودع أعلى من الحد الأدنى للطلب ولم ينفد أي صنف.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map((n) => {
              const currentStock = n.product?.stock ?? 0;
              const minStock = n.product?.minStock ?? 5;
              const maxStock = n.product?.maxStock ?? 100;
              const isOutOfStock = currentStock <= 0;

              return (
                <motion.article
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-colors ${
                    n.isRead ? 'bg-white opacity-80' : 'bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Status icon badge */}
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-600'
                          : n.isRead
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isOutOfStock ? (
                        <PackageX className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-ph-ink">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="غير مقروء" />
                        )}
                        {isOutOfStock ? (
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                            نفد المخزون بالكامل
                          </span>
                        ) : (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            دون الحد الأدنى
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ph-muted leading-relaxed">
                        {n.message}
                      </p>

                      {/* Stock metrics pill comparison */}
                      {n.product && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-ph-border px-2.5 py-1 font-bold text-ph-ink shadow-2xs">
                            <Layers className="h-3 w-3 text-ph-muted" />
                            {n.product.nameAr}
                            <span className="text-ph-muted font-mono font-normal">
                              ({n.product.sku})
                            </span>
                          </span>

                          <span
                            className={`rounded-lg px-2.5 py-1 font-bold ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            المخزون الحالي: <strong>{currentStock}</strong>
                          </span>

                          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 font-bold text-slate-700">
                            الحد الأدنى: <strong>{minStock}</strong>
                          </span>

                          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-bold text-emerald-800">
                            المستهدف: <strong>{maxStock}</strong>
                          </span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-[10px] text-ph-muted pt-0.5">
                        <Clock className="h-3 w-3" />
                        <time dateTime={n.createdAt}>
                          {new Date(n.createdAt).toLocaleString('ar-EG', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(n.id)}
                        className="rounded-xl border border-ph-border bg-white px-3 py-2 text-xs font-bold text-ph-muted hover:text-ph-brand hover:border-ph-brand transition-colors"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                    {n.product && (
                      <button
                        type="button"
                        onClick={() => onRestock(n)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-ph-brand hover:bg-ph-brand-hover px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                      >
                        <PackageCheck className="h-4 w-4" />
                        <span>إعادة تخزين</span>
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};
