import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  adminFetchOrdersApi,
  adminUpdateOrderTrackingApi,
  adminEnableOrderCrisisApi,
  adminResolveOrderCrisisApi,
  type AdminOrder,
} from '../../services/adminApi';
import { ORDER_STATUS_FALLBACK } from '../../services/api';

/** Red accent reserved for the reusable "Urgent Crisis" state. */
const CRISIS_RED = '#EF4444';

function formatEtaMinutes(minutes?: number | null): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ساعة و${rest} دقيقة` : `${hours} ساعة`;
}

const statusLabel = (code: string) =>
  ORDER_STATUS_FALLBACK.find((s) => s.status === code)?.labelAr || code;

export interface AdminOrdersPanelProps {
  onToast?: (message: string, type?: 'ok' | 'err') => void;
}

export const AdminOrdersPanel: React.FC<AdminOrdersPanelProps> = ({ onToast }) => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchOrdersApi();
      setOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'تعذر جلب الطلبات من الخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const crisisCount = orders.filter((o) => o.isUrgentCrisis).length;

  const closeModal = (refresh?: boolean) => {
    setActiveOrder(null);
    if (refresh) loadOrders();
  };

  return (
    <section aria-labelledby="admin-orders-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="admin-orders-title" className="text-base font-black text-ph-ink">
            تتبع الطلبات والوقت المتوقع (ETA)
          </h2>
          {crisisCount > 0 && (
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-black text-white"
              style={{ backgroundColor: CRISIS_RED }}
            >
              {crisisCount} أزمة طارئة
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-ph-border px-3 py-1.5 text-xs font-bold text-ph-ink hover:bg-ph-background disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-ph-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ تحميل الطلبات...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-ph-border bg-white p-8 text-center text-xs text-ph-muted">
          لا توجد طلبات لعرضها حتى الآن.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders.map((order) => {
            const eta = order.manualEtaMinutes ?? order.autoEtaMinutes ?? null;
            const etaLabel = formatEtaMinutes(eta);
            return (
              <div
                key={order.id}
                className="rounded-2xl border bg-white p-4 shadow-2xs space-y-3"
                style={order.isUrgentCrisis ? { borderColor: `${CRISIS_RED}66` } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-black text-ph-ink">{order.orderNumber}</p>
                    <p className="text-[11px] text-ph-muted mt-0.5">
                      {order.user?.fullName || 'عميل'} • {order.shippingAddress?.city || '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-ph-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-ph-brand">
                      {statusLabel(order.status)}
                    </span>
                    {order.isUrgentCrisis && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black text-white"
                        style={{ backgroundColor: CRISIS_RED }}
                      >
                        <AlertOctagon className="h-3 w-3" />
                        أزمة طارئة
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-ph-background p-2">
                    <span className="flex items-center justify-center gap-1 text-[10px] text-ph-muted">
                      <Navigation className="h-3 w-3" /> الموقع
                    </span>
                    <p className="text-[11px] font-bold text-ph-ink mt-0.5 line-clamp-1">
                      {order.courierLocation || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-ph-background p-2">
                    <span className="flex items-center justify-center gap-1 text-[10px] text-ph-muted">
                      <MapPin className="h-3 w-3" /> الوجهة
                    </span>
                    <p className="text-[11px] font-bold text-ph-ink mt-0.5 line-clamp-1">
                      {order.destinationLocation || order.shippingAddress?.city || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-ph-background p-2">
                    <span className="flex items-center justify-center gap-1 text-[10px] text-ph-muted">
                      <Clock className="h-3 w-3" /> الوصول
                    </span>
                    <p
                      className="text-[11px] font-black mt-0.5"
                      style={{ color: order.isUrgentCrisis ? CRISIS_RED : undefined }}
                    >
                      {order.isUrgentCrisis ? 'موقوف' : etaLabel || 'قيد الحساب'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveOrder(order)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-ph-border py-2 text-xs font-bold text-ph-ink hover:bg-ph-background transition-colors"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>إدارة الموقع / الوقت / الأزمة</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeOrder && (
        <AdminOrderTrackingModal
          order={activeOrder}
          onToast={onToast}
          onClose={closeModal}
        />
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Tracking + Urgent Crisis modal                                       */
/* ------------------------------------------------------------------ */

interface AdminOrderTrackingModalProps {
  order: AdminOrder;
  onToast?: (message: string, type?: 'ok' | 'err') => void;
  onClose: (refresh?: boolean) => void;
}

const AdminOrderTrackingModal: React.FC<AdminOrderTrackingModalProps> = ({
  order,
  onToast,
  onClose,
}) => {
  const [courierLocation, setCourierLocation] = useState(order.courierLocation || '');
  const [destinationLocation, setDestinationLocation] = useState(
    order.destinationLocation || order.shippingAddress?.city || '',
  );
  const [manualEta, setManualEta] = useState<string>(
    order.manualEtaMinutes ? String(order.manualEtaMinutes) : '',
  );
  /** Single free-text field reused as the crisis reason / tracking note. */
  const [reason, setReason] = useState(order.crisisReason || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveTracking = async () => {
    setBusy(true);
    setError(null);
    try {
      const manualEtaMinutes = manualEta.trim() ? parseInt(manualEta, 10) : undefined;
      await adminUpdateOrderTrackingApi(order.id, {
        courierLocation: courierLocation.trim() || undefined,
        destinationLocation: destinationLocation.trim() || undefined,
        manualEtaMinutes:
          manualEtaMinutes && manualEtaMinutes > 0 ? manualEtaMinutes : undefined,
        notes: reason.trim() || undefined,
      });
      onToast?.('تم تحديث الموقع والوقت المتوقع للوصول');
      onClose(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث بيانات التتبع');
    } finally {
      setBusy(false);
    }
  };

  const handleEnableCrisis = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminEnableOrderCrisisApi(order.id, {
        crisisType: 'CHECKPOINT',
        crisisReason: reason.trim() || undefined,
        notes: reason.trim() || undefined,
      });
      onToast?.('تم تفعيل حالة الأزمة الطارئة وإشعار العميل');
      onClose(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر تفعيل حالة الأزمة');
    } finally {
      setBusy(false);
    }
  };

  const handleResolveCrisis = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminResolveOrderCrisisApi(order.id, reason.trim() || undefined);
      onToast?.('تم إنهاء الأزمة واستئناف التوصيل مع حساب وقت جديد');
      onClose(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر إنهاء حالة الأزمة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
      onClick={() => onClose()}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ph-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ph-brand/10 text-ph-brand">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-black text-ph-ink text-sm">إدارة تتبع الطلب</h3>
              <p className="font-mono text-[11px] text-ph-muted">{order.orderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="p-1.5 rounded-xl text-ph-muted hover:bg-ph-background hover:text-ph-ink transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {order.isUrgentCrisis && (
          <div
            className="mb-4 flex items-start gap-2 rounded-2xl border-2 p-3 text-xs"
            style={{ borderColor: `${CRISIS_RED}66`, backgroundColor: `${CRISIS_RED}14` }}
          >
            <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: CRISIS_RED }} />
            <div>
              <p className="font-black" style={{ color: CRISIS_RED }}>
                الطلب حالياً في حالة أزمة طارئة
              </p>
              <p className="text-[11px]" style={{ color: '#B91C1C' }}>
                {order.crisisReason || 'نقطة تفتيش / تأخير طارئ'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              موقع المندوب الحالي (نص)
            </label>
            <input
              type="text"
              value={courierLocation}
              onChange={(e) => setCourierLocation(e.target.value)}
              placeholder="مثال: نقطة تفتيش حوارة - قرب نابلس"
              className="ph-input w-full text-sm"
            />
            <p className="mt-1 text-[10px] text-ph-muted">
              اكتب اسم مدينة معروفة ليُحتسب الوقت تلقائياً، أو أدخل إحداثيات لاحقاً عند ربط GPS.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">وجهة التسليم (نص)</label>
            <input
              type="text"
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
              placeholder="مثال: رام الله والبيرة"
              className="ph-input w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              مدة تقديرية يدوية (دقائق) — اختياري
            </label>
            <input
              type="number"
              min={1}
              value={manualEta}
              onChange={(e) => setManualEta(e.target.value)}
              placeholder="اتركه فارغاً لحساب متوسط تلقائي حسب المسافة"
              className="ph-input w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ph-ink mb-1.5">
              سبب الأزمة / ملاحظة (اختياري)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: إغلاق نقطة تفتيش حوارة بين نابلس ورام الله"
              className="ph-input w-full text-sm"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveTracking}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              <span>حفظ الموقع وإشعار العميل بالوقت المتوقع</span>
            </button>

            {order.isUrgentCrisis ? (
              <button
                type="button"
                onClick={handleResolveCrisis}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-60"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>إنهاء الأزمة واستئناف التوصيل (حساب وقت جديد)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnableCrisis}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-60"
                style={{ backgroundColor: CRISIS_RED }}
              >
                <AlertOctagon className="h-4 w-4" />
                <span>تفعيل حالة "أزمة طارئة" وإشعار العميل فوراً</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
