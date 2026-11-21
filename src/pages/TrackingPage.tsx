import React, { useEffect, useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Search,
  AlertCircle,
  AlertOctagon,
  Navigation,
  XCircle,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { AppUser, Order } from '../types';
import {
  backendOrderToOrder,
  fetchOrderApi,
  fetchOrderStatusesApi,
  ORDER_STATUS_FALLBACK,
  type OrderStatusInfo,
} from '../services/api';

interface TrackingPageProps {
  orders: Order[];
  currentUser: AppUser | null;
  initialOrderId?: string | null;
  onNavigate: (page: string, params?: any) => void;
}

const SUPPORT_WHATSAPP = '970599000000';

/** Red accent reserved for the reusable "Urgent Crisis" state. */
const CRISIS_RED = '#EF4444';

/** Formats an ETA in minutes into a friendly Arabic label. */
function formatEtaMinutes(minutes?: number | null): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ساعة و${rest} دقيقة` : `${hours} ساعة`;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({
  orders,
  currentUser,
  initialOrderId,
  onNavigate,
}) => {
  const [trackingNumber, setTrackingNumber] = useState(initialOrderId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [statuses, setStatuses] = useState<OrderStatusInfo[]>(ORDER_STATUS_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canonical lifecycle straight from the backend (shared with the mobile app)
  useEffect(() => {
    fetchOrderStatusesApi().then((list) => {
      if (Array.isArray(list) && list.length > 0) setStatuses(list);
    });
  }, []);

  const lookup = async (raw: string) => {
    const num = raw.trim();
    if (!num) return;
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      if (currentUser) {
        try {
          const backendOrder = await fetchOrderApi(num);
          setOrder(backendOrderToOrder(backendOrder, [], statuses));
          return;
        } catch {
          // fall through to the locally cached list
        }
      }
      const local = orders.find(
        (o) => (o.orderNumber || o.id).trim().toLowerCase() === num.toLowerCase(),
      );
      if (local) {
        setOrder(local);
      } else {
        setOrder(null);
        setNotFound(true);
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر جلب بيانات الطلب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      setTrackingNumber(initialOrderId);
      lookup(initialOrderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(trackingNumber);
  };

  const timeline = statuses.filter((s) => s.status !== 'CANCELLED');
  const currentStatus = order?.statusCode || '';
  const isCancelled = currentStatus === 'CANCELLED' || order?.status === 'ملغي';
  const currentIdx = timeline.findIndex((s) => s.status === currentStatus);
  const statusLabel = (code: string) =>
    statuses.find((s) => s.status === code)?.labelAr || code;
  const stepDate = (code: string) =>
    order?.statusHistory?.find((h) => h.status === code)?.createdAt;

  const isCrisis = Boolean(order?.isUrgentCrisis);
  const etaMinutes = order?.etaMinutes ?? null;
  const etaLabel = formatEtaMinutes(etaMinutes);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 text-right">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-ph-ink">تتبع حالة الشحنة والطلب</h1>
        <p className="text-xs text-ph-muted">
          أدخل رقم الطلب لمتابعة مسار شحنتك لحظة بلحظة مع مندوب التوصيل
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
        <input
          type="text"
          placeholder="أدخل رقم الطلب مثل: PH-2026-1042"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className="flex-1 bg-white border border-ph-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-ph-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-ph-brand hover:bg-ph-brand-hover disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>بحث</span>
        </button>
      </form>

      {!currentUser && (
        <div className="p-3 bg-[#0F172A] text-white rounded-2xl max-w-md mx-auto text-xs flex items-center justify-between gap-3">
          <span>سجّل الدخول لعرض وتتبع طلباتك المحفوظة على حسابك.</span>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-xs text-[#DC2626] font-medium max-w-md mx-auto">
          {error}
        </div>
      )}

      {notFound && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-xs text-amber-800 font-medium max-w-md mx-auto">
          لم يتم العثور على طلب بهذا الرقم. تأكد من إدخال رقم الطلب بشكل صحيح.
        </div>
      )}

      {order && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-ph-border shadow-xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ph-border">
            <div>
              <span className="text-[11px] text-ph-muted">رقم الطلب:</span>
              <h2 className="text-base font-black text-ph-ink font-mono">
                {order.orderNumber || order.id}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ph-muted">{order.date}</span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isCancelled ? 'bg-red-50 text-[#DC2626]' : 'bg-emerald-50 text-[#16A34A]'
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>

          {/* ── Urgent Crisis banner (red accent) ── */}
          {isCrisis && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-2xl border-2 text-right animate-pulse"
              style={{ borderColor: `${CRISIS_RED}66`, backgroundColor: `${CRISIS_RED}14` }}
            >
              <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5" style={{ color: CRISIS_RED }} />
              <div className="space-y-1">
                <p className="text-sm font-black" style={{ color: CRISIS_RED }}>
                  حالة أزمة طارئة — Urgent Crisis
                </p>
                <p className="text-xs font-medium" style={{ color: '#B91C1C' }}>
                  {order.crisisReason || 'نقطة تفتيش أو إغلاق طريق أو تأخير طارئ بين المدن.'}
                </p>
                <p className="text-[11px]" style={{ color: '#B91C1C' }}>
                  تم إيقاف العدّاد والوقت التقديري مؤقتاً حتى لا يعطيك تقديراً غير دقيق، وسنُشعرك فور
                  استئناف التوصيل وتحديث الوصول المتوقع.
                </p>
              </div>
            </div>
          )}

          {/* ── Live ETA + courier location (hidden during Urgent Crisis) ── */}
          {!isCrisis && !isCancelled && (etaLabel || order.courierLocation) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-ph-border bg-ph-background p-4">
                <div className="flex items-center gap-1.5 text-ph-muted mb-1.5">
                  <Navigation className="w-3.5 h-3.5 text-ph-brand" />
                  <span className="text-[11px] font-bold">موقع المندوب الحالي</span>
                </div>
                <p className="text-xs font-bold text-ph-ink">
                  {order.courierLocation || 'قيد التحديث'}
                </p>
              </div>
              <div className="rounded-2xl border border-ph-border bg-ph-background p-4">
                <div className="flex items-center gap-1.5 text-ph-muted mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ph-brand" />
                  <span className="text-[11px] font-bold">وجهة التسليم</span>
                </div>
                <p className="text-xs font-bold text-ph-ink">
                  {order.destinationLocation || order.city || '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-ph-brand/30 bg-ph-brand/5 p-4">
                <div className="flex items-center gap-1.5 text-ph-muted mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-ph-brand" />
                  <span className="text-[11px] font-bold">الوقت المتوقع للوصول (ETA)</span>
                </div>
                <p className="text-sm font-black text-ph-brand">
                  {etaLabel || 'قيد الحساب'}
                </p>
                {order.distanceKm !== null && order.distanceKm !== undefined && (
                  <p className="text-[10px] text-ph-muted mt-0.5">
                    المسافة التقديرية: {order.distanceKm} كم
                    {order.manualEtaMinutes ? ' (مدة يدوية)' : ' (متوسط تلقائي)'}
                  </p>
                )}
              </div>
            </div>
          )}

          {isCancelled ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-[#DC2626] text-xs font-medium">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>تم إلغاء هذا الطلب. للاستفسار يمكنك التواصل مع الدعم عبر واتساب.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
              {timeline.map((st, idx) => {
                const isDone = currentIdx >= 0 && idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isPassed = idx <= currentIdx;
                return (
                  <div key={st.status} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                        isPassed ? 'bg-ph-brand text-white' : 'bg-white text-ph-muted'
                      }`}
                    >
                      {isDone || (isCurrent && st.status === 'DELIVERED') ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isCurrent ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <Package className="w-5 h-5" />
                      )}
                    </div>
                    <p className={`text-xs font-bold ${isPassed ? 'text-ph-ink' : 'text-ph-muted'}`}>
                      {st.labelAr}
                    </p>
                    {stepDate(st.status) && (
                      <p className="text-[10px] text-ph-muted">
                        {new Date(stepDate(st.status) as string).toLocaleString('ar-EG')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Order summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-ph-border">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-ph-ink flex items-center gap-1.5">
                <Package className="w-4 h-4 text-ph-brand" /> محتويات الطلب
              </h3>
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-ph-muted">
                  <span>
                    {it.product.name}
                    {it.color ? ` (${it.color})` : ''} × {it.quantity}
                  </span>
                  <span className="font-bold text-ph-ink">{it.price * it.quantity} ₪</span>
                </div>
              ))}
              <div className="pt-2 border-t border-ph-border flex justify-between text-sm font-black text-ph-ink">
                <span>الإجمالي</span>
                <span>{order.total} ₪</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-ph-ink flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-ph-brand" /> بيانات التوصيل والدفع
              </h3>
              <p className="text-xs text-ph-muted">
                {order.customerName && <span className="block">{order.customerName}</span>}
                <span className="block">{order.city} — {order.address}</span>
                {order.customerPhone && <span className="block dir-ltr text-left">{order.customerPhone}</span>}
              </p>
              <p className="text-xs text-ph-muted flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-ph-brand" />
                <span>طريقة الدفع: {order.paymentMethod}</span>
              </p>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                  `مرحباً، لدي استفسار بخصوص الطلب ${order.orderNumber || order.id}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-ph-brand hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>استفسار عبر واتساب</span>
              </a>
            </div>
          </div>

          {/* Lifecycle reference */}
          <div className="pt-4 border-t border-ph-border">
            <p className="text-[11px] text-ph-muted flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                مراحل الطلب المعتمدة: {statuses.filter((s) => s.status !== 'CANCELLED').map((s) => s.labelAr).join(' • ')}
                {' '}• {statusLabel('CANCELLED')}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
