import React, { useEffect, useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Search,
  AlertCircle,
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 text-right">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A]">تتبع حالة الشحنة والطلب</h1>
        <p className="text-xs text-slate-500">
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
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6]"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[#0F172A] hover:bg-[#2EC4B6] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
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
            className="bg-[#2EC4B6] text-white font-bold px-3 py-1.5 rounded-lg shrink-0"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center text-xs text-rose-600 max-w-md mx-auto">
          {error}
        </div>
      )}

      {notFound && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-xs text-amber-700 max-w-md mx-auto">
          لم يتم العثور على طلب بهذا الرقم. تأكد من إدخال رقم الطلب بشكل صحيح.
        </div>
      )}

      {order && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] text-slate-400">رقم الطلب:</span>
              <h2 className="text-base font-black text-[#0F172A] font-mono">
                {order.orderNumber || order.id}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{order.date}</span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isCancelled ? 'bg-rose-100 text-rose-600' : 'bg-[#2EC4B6]/10 text-[#2EC4B6]'
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>

          {isCancelled ? (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs">
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
                        isPassed ? 'bg-[#2EC4B6] text-white' : 'bg-slate-100 text-slate-400'
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
                    <p className={`text-xs font-bold ${isPassed ? 'text-[#0F172A]' : 'text-slate-400'}`}>
                      {st.labelAr}
                    </p>
                    {stepDate(st.status) && (
                      <p className="text-[10px] text-slate-400">
                        {new Date(stepDate(st.status) as string).toLocaleString('ar-EG')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Order summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#2EC4B6]" /> محتويات الطلب
              </h3>
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-slate-600">
                  <span>
                    {it.product.name}
                    {it.color ? ` (${it.color})` : ''} × {it.quantity}
                  </span>
                  <span className="font-bold text-[#0F172A]">{it.price * it.quantity} ₪</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-[#0F172A]">
                <span>الإجمالي</span>
                <span>{order.total} ₪</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2EC4B6]" /> بيانات التوصيل والدفع
              </h3>
              <p className="text-xs text-slate-600">
                {order.customerName && <span className="block">{order.customerName}</span>}
                <span className="block">{order.city} — {order.address}</span>
                {order.customerPhone && <span className="block dir-ltr text-left">{order.customerPhone}</span>}
              </p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#2EC4B6]" />
                <span>طريقة الدفع: {order.paymentMethod}</span>
              </p>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                  `مرحباً، لدي استفسار بخصوص الطلب ${order.orderNumber || order.id}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2EC4B6] hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>استفسار عبر واتساب</span>
              </a>
            </div>
          </div>

          {/* Lifecycle reference */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
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
