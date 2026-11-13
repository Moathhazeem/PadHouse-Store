import React, { useEffect, useMemo, useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ShieldCheck,
  Truck,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Gift,
  Tag,
  AlertCircle,
  RotateCcw,
  Wallet,
  X,
} from 'lucide-react';
import { AppUser, CartItem, Order } from '../types';
import {
  applyCouponApi,
  removeCouponApi,
  createOrderApi,
  fetchCartApi,
  fetchDeliveryQuoteApi,
  fetchGovernoratesApi,
  fetchPaymentMethodsApi,
  fetchPoliciesApi,
  fetchGiftCardBalanceApi,
  validatePhoneApi,
  backendOrderToOrder,
  type BackendCart,
  type CouponApplyResult,
  type Governorate,
  type PaymentMethodInfo,
  type StorePolicies,
} from '../services/api';

interface CartAndCheckoutPageProps {
  cart: CartItem[];
  currentUser: AppUser | null;
  products: any[];
  onUpdateQty: (productId: string, color: string, delta: number) => void | Promise<void>;
  onRemoveItem: (productId: string, color: string) => void | Promise<void>;
  onClearCart: () => void | Promise<void>;
  onOrderPlaced: (order: Order) => void | Promise<void>;
  onCartRefreshed: (cart: BackendCart | null) => void;
  onNavigate: (page: string, params?: any) => void;
}

export const CartAndCheckoutPage: React.FC<CartAndCheckoutPageProps> = ({
  cart,
  currentUser,
  products,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
  onCartRefreshed,
  onNavigate,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');

  // Delivery data straight from the shared backend (Palestinian market)
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [policies, setPolicies] = useState<StorePolicies | null>(null);

  // Form
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [street, setStreet] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Delivery quote (رسوم التوصيل)
  const [quote, setQuote] = useState<{ available: boolean; fee: number; etaDays?: string; message?: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Coupons
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [coupon, setCoupon] = useState<CouponApplyResult | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Gift card
  const [giftCardInput, setGiftCardInput] = useState('');
  const [giftCard, setGiftCard] = useState<{ valid: boolean; balance?: number; message?: string } | null>(null);
  const [giftCardBusy, setGiftCardBusy] = useState(false);

  // Submission
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // City list derived from the backend governorates
  const cityOptions = useMemo(() => {
    const fromApi = governorates.flatMap((g) => g.cities.map((c) => ({ name: c.name, fee: c.fee, governorate: g.nameAr })));
    return fromApi;
  }, [governorates]);

  useEffect(() => {
    setName((prev) => prev || currentUser?.name || '');
    setPhone((prev) => prev || currentUser?.phone || '');
  }, [currentUser]);

  // Load delivery / payment / policy configuration once
  useEffect(() => {
    fetchGovernoratesApi()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setGovernorates(list);
          setCity((prev) => {
            if (prev) return prev;
            const first = list[0]?.cities?.[0]?.name;
            return first || prev;
          });
        }
      })
      .catch(() => {});

    fetchPaymentMethodsApi()
      .then((list) => {
        const enabled = (list || []).filter((m) => m.enabled);
        setPaymentMethods(enabled);
        // Only ever preselect a payment method the store actually supports.
        setPaymentMethod((prev) => prev || enabled[0]?.id || '');
      })
      .catch(() => {});

    fetchPoliciesApi()
      .then((p) => setPolicies(p))
      .catch(() => {});
  }, []);

  // Quote the delivery fee whenever the city changes (رسوم التوصيل)
  useEffect(() => {
    if (!city || cart.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    fetchDeliveryQuoteApi(city)
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote({ available: false, fee: 0, message: 'منطقة التوصيل غير مغطاة حالياً' });
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, cart.length]);

  const subtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const discount = coupon?.discount || 0;
  const baseDelivery = quote?.available ? quote.fee : 0;
  const deliveryFee = cart.length === 0 ? 0 : coupon?.freeShipping ? 0 : baseDelivery;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const outOfStockLines = cart.filter(
    (i) =>
      i.availableStock !== undefined && i.availableStock !== null && i.quantity > i.availableStock,
  );

  /* ----------------------------- Coupons ---------------------------- */

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCodeInput.trim();
    if (!code) return;
    if (!currentUser) {
      setCouponError('يرجى تسجيل الدخول لتطبيق كود الخصم');
      return;
    }
    setCouponBusy(true);
    try {
      const res = await applyCouponApi(code);
      setCoupon(res);
      setCouponCodeInput('');
      onCartRefreshed(await fetchCartApi());
    } catch (err: any) {
      setCoupon(null);
      setCouponError(err?.message || 'كود الخصم غير صالح');
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError(null);
    setCouponBusy(true);
    try {
      await removeCouponApi();
      setCoupon(null);
      onCartRefreshed(await fetchCartApi());
    } catch (err: any) {
      setCouponError(err?.message || 'تعذر إزالة كود الخصم');
    } finally {
      setCouponBusy(false);
    }
  };

  /* ---------------------------- Gift card --------------------------- */

  const handleCheckGiftCard = async () => {
    const code = giftCardInput.trim();
    if (!code) return;
    setGiftCardBusy(true);
    try {
      const res = await fetchGiftCardBalanceApi(code);
      setGiftCard(res);
    } catch (err: any) {
      setGiftCard({ valid: false, message: err?.message || 'بطاقة الهدايا غير صالحة' });
    } finally {
      setGiftCardBusy(false);
    }
  };

  /* --------------------------- Place order -------------------------- */

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPhoneError(null);

    if (!currentUser) {
      setErrorMsg('يرجى تسجيل الدخول لإتمام الطلب');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('سلتك فارغة');
      return;
    }
    if (!city.trim() || !street.trim()) {
      setErrorMsg('يرجى إكمال بيانات التوصيل (المدينة والعنوان)');
      return;
    }
    if (!paymentMethod) {
      setErrorMsg('يرجى اختيار طريقة الدفع');
      return;
    }
    if (quote && !quote.available) {
      setErrorMsg('منطقة التوصيل المختارة غير مغطاة حالياً');
      return;
    }

    // Palestinian phone verification (التحقق من أرقام الهواتف الفلسطينية)
    if (phone.trim()) {
      try {
        const check = await validatePhoneApi(phone.trim());
        if (!check.valid) {
          setPhoneError(check.message || 'يرجى إدخال رقم هاتف فلسطيني صحيح');
          return;
        }
      } catch {
        /* backend re-validates on order creation */
      }
    } else {
      setPhoneError('رقم الهاتف مطلوب لتأكيد الطلب');
      return;
    }

    setPlacing(true);
    try {
      const created = await createOrderApi({
        city: city.trim(),
        street: street.trim(),
        phone: phone.trim() || undefined,
        paymentMethod,
        couponCode: coupon?.couponCode || undefined,
        giftCardCode: giftCard?.valid ? giftCardInput.trim() : undefined,
        customerNotes: notes.trim() || undefined,
      });
      const order = backendOrderToOrder(created, products);
      setPlacedOrder(order);
      await onOrderPlaced(order);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إنشاء الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setPlacing(false);
    }
  };

  /* ------------------------------ Success --------------------------- */

  if (step === 'success' && placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-right">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#2EC4B6]/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-[#2EC4B6]" />
          </div>
          <h1 className="text-2xl font-black text-[#0F172A]">تم استلام طلبك بنجاح</h1>
          <p className="text-xs text-slate-500">
            رقم الطلب <span className="font-mono font-bold text-[#0F172A]">{placedOrder.orderNumber || placedOrder.id}</span>
          </p>
          <div className="bg-[#F8FAFC] rounded-2xl p-4 text-xs text-slate-600 space-y-1.5 text-right">
            <div className="flex justify-between"><span>المجموع الفرعي</span><span className="font-bold">{placedOrder.subtotal} ₪</span></div>
            <div className="flex justify-between"><span>رسوم التوصيل</span><span className="font-bold">{placedOrder.shipping} ₪</span></div>
            {!!placedOrder.discount && (
              <div className="flex justify-between text-[#2EC4B6]"><span>الخصم</span><span className="font-bold">-{placedOrder.discount} ₪</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5 text-sm font-black text-[#0F172A]"><span>الإجمالي</span><span>{placedOrder.total} ₪</span></div>
          </div>
          <p className="text-xs text-slate-500">
            الحالة الحالية: <span className="font-bold text-[#0F172A]">{placedOrder.status}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => onNavigate('tracking', { orderId: placedOrder.orderNumber || placedOrder.id })}
              className="flex-1 bg-[#0F172A] hover:bg-[#2EC4B6] text-white py-3 rounded-xl font-bold text-xs transition-colors"
            >
              تتبع الطلب
            </button>
            <button
              onClick={() => onNavigate('products')}
              className="flex-1 bg-white border border-slate-200 text-[#0F172A] py-3 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              مواصلة التسوق
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------- Empty cart --------------------------- */

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-right">
        <div className="bg-[#F8FAFC] rounded-3xl p-12 text-center border border-slate-100 space-y-4">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-black text-[#0F172A]">سلة التسوق فارغة</h2>
          <p className="text-xs text-slate-500">لم تقم بإضافة أي منتجات بعد، ابدأ بتصفح ملحقات الآيباد.</p>
          <button
            onClick={() => onNavigate('products')}
            className="bg-[#2EC4B6] text-white text-xs font-bold px-5 py-2.5 rounded-xl"
          >
            استكشف المنتجات
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------- Cart ----------------------------- */

  const renderCartStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {outOfStockLines.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>بعض القطع تجاوزت الكمية المتاحة في المخزون. يرجى تعديل الكميات قبل إتمام الطلب.</span>
          </div>
        )}
        {cart.map((item) => (
          <div
            key={`${item.product.id}-${item.selectedColor}`}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4"
          >
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-20 h-20 rounded-xl object-cover bg-slate-50"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0F172A] truncate">{item.product.name}</h3>
                  {item.selectedColor && (
                    <span className="text-[11px] text-slate-400">اللون: {item.selectedColor}</span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveItem(item.product.id, item.selectedColor)}
                  className="text-slate-300 hover:text-rose-500 transition-colors"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-1">
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.selectedColor, -1)}
                    className="p-1.5 text-slate-500 hover:text-[#0F172A]"
                    aria-label="تقليل"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.selectedColor, 1)}
                    className="p-1.5 text-slate-500 hover:text-[#0F172A]"
                    aria-label="زيادة"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-sm font-black text-[#0F172A]">
                  {item.product.price * item.quantity} ₪
                </span>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => onClearCart()}
          className="text-xs text-slate-400 hover:text-rose-500 font-bold"
        >
          تفريغ السلة بالكامل
        </button>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-4 sticky top-24">
          <h3 className="text-sm font-black text-[#0F172A]">ملخص السلة</h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between"><span>المجموع الفرعي</span><span className="font-bold">{subtotal} ₪</span></div>
            <div className="flex justify-between"><span>رسوم التوصيل</span><span className="font-bold">{cart.length ? 'يُحسب عند تحديد المدينة' : '0 ₪'}</span></div>
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-black text-[#0F172A]">
            <span>الإجمالي التقديري</span><span>{subtotal} ₪</span>
          </div>
          <button
            onClick={() => setStep('checkout')}
            disabled={outOfStockLines.length > 0}
            className="w-full bg-[#0F172A] hover:bg-[#2EC4B6] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>متابعة إتمام الطلب</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />
            <span>دفع آمن ومشفّر</span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ----------------------------- Checkout --------------------------- */

  const renderCheckoutStep = () => (
    <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {!currentUser && (
          <div className="p-4 bg-[#0F172A] text-white rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-bold">تحتاج إلى تسجيل الدخول لإتمام الطلب</p>
              <p className="text-white/70 mt-0.5">سلة مشترياتك محفوظة وتُزامن مع حسابك تلقائياً.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="bg-[#2EC4B6] text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0"
            >
              تسجيل الدخول
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl">{errorMsg}</div>
        )}

        {/* Delivery info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#2EC4B6]" /> بيانات التوصيل
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white"
                placeholder="الاسم كما سيظهر على الشحنة"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">رقم الهاتف *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white text-left dir-ltr"
                placeholder="0599123456"
              />
              {phoneError && <p className="text-[11px] text-rose-500 mt-1">{phoneError}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">المحافظة / المدينة *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white"
              >
                <option value="">اختر المدينة</option>
                {cityOptions.map((c) => (
                  <option key={`${c.governorate}-${c.name}`} value={c.name}>
                    {c.name} — {c.governorate} (توصيل {c.fee} ₪)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">العنوان التفصيلي *</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white"
                placeholder="الشارع، رقم المبنى، علامة مميزة"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">ملاحظات على الطلب (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white resize-none"
              placeholder="أي تعليمات خاصة للتوصيل"
            />
          </div>
        </div>

        {/* Payment methods — only what the store actually supports */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#2EC4B6]" /> طريقة الدفع
          </h3>
          {paymentMethods.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل طرق الدفع المتاحة…
            </div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === m.id ? 'border-[#2EC4B6] bg-[#2EC4B6]/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="mt-0.5 accent-[#2EC4B6]"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-[#0F172A]">{m.nameAr}</p>
                    {m.description && <p className="text-slate-500 mt-0.5">{m.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Coupon + Gift card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#2EC4B6]" /> كود الخصم
            </h3>
            {coupon ? (
              <div className="flex items-center justify-between bg-[#2EC4B6]/10 rounded-xl px-3 py-2.5">
                <div className="text-xs">
                  <p className="font-bold text-[#0F172A]">{coupon.couponCode}</p>
                  <p className="text-[#2EC4B6]">
                    {coupon.discount > 0 ? `خصم ${coupon.discount} ₪` : ''}
                    {coupon.freeShipping ? ' + توصيل مجاني' : ''}
                  </p>
                </div>
                <button type="button" onClick={handleRemoveCoupon} className="text-slate-400 hover:text-rose-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  disabled={!currentUser}
                  className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white disabled:opacity-60"
                  placeholder={currentUser ? 'مثال: PADHOUSE10' : 'سجّل الدخول أولاً'}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={!currentUser || couponBusy}
                  className="bg-[#0F172A] hover:bg-[#2EC4B6] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {couponBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'تطبيق'}
                </button>
              </div>
            )}
            {couponError && <p className="text-[11px] text-rose-500">{couponError}</p>}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#2EC4B6]" /> بطاقة الهدايا
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={giftCardInput}
                onChange={(e) => setGiftCardInput(e.target.value)}
                className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#2EC4B6] focus:bg-white"
                placeholder="أدخل كود البطاقة"
              />
              <button
                type="button"
                onClick={handleCheckGiftCard}
                disabled={giftCardBusy}
                className="bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {giftCardBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'تحقق'}
              </button>
            </div>
            {giftCard && (
              <p className={`text-[11px] ${giftCard.valid ? 'text-[#2EC4B6]' : 'text-rose-500'}`}>
                {giftCard.valid
                  ? `رصيد متاح: ${giftCard.balance} ₪ — يُخصم عند تأكيد الطلب`
                  : giftCard.message || 'البطاقة غير صالحة'}
              </p>
            )}
          </div>
        </div>

        {/* Policies (سياسات الاستبدال والاسترجاع والضمان) */}
        {policies && (
          <div className="bg-[#F8FAFC] rounded-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-[#2EC4B6]" /> سياسات المتجر
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-bold text-[#0F172A] mb-1">{policies.exchange.titleAr}</p>
                <p className="text-slate-500 leading-relaxed">{policies.exchange.summaryAr}</p>
              </div>
              <div>
                <p className="font-bold text-[#0F172A] mb-1">{policies.return.titleAr}</p>
                <p className="text-slate-500 leading-relaxed">{policies.return.summaryAr}</p>
              </div>
              <div>
                <p className="font-bold text-[#0F172A] mb-1">{policies.warranty.titleAr}</p>
                <p className="text-slate-500 leading-relaxed">{policies.warranty.summaryAr}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('refund_policy')}
              className="text-[11px] font-bold text-[#2EC4B6] hover:underline"
            >
              اقرأ السياسات كاملة
            </button>
          </div>
        )}
      </div>

      {/* Order summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-4 sticky top-24">
          <h3 className="text-sm font-black text-[#0F172A]">ملخص الطلب</h3>
          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={`${item.product.id}-${item.selectedColor}`} className="flex justify-between items-start gap-2 text-xs">
                <span className="text-slate-600 leading-snug">
                  {item.product.name}
                  {item.selectedColor ? ` (${item.selectedColor})` : ''} × {item.quantity}
                </span>
                <span className="font-bold text-[#0F172A] shrink-0">{item.product.price * item.quantity} ₪</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between"><span>المجموع الفرعي</span><span className="font-bold">{subtotal} ₪</span></div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> رسوم التوصيل</span>
              <span className="font-bold">
                {quoteLoading ? 'جارٍ الحساب…' : deliveryFee === 0 && coupon?.freeShipping ? 'مجاني' : `${deliveryFee} ₪`}
              </span>
            </div>
            {quote?.etaDays && (
              <div className="flex justify-between text-slate-400"><span>مدة التوصيل المتوقعة</span><span>{quote.etaDays} يوم</span></div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-[#2EC4B6]"><span>الخصم</span><span className="font-bold">-{discount} ₪</span></div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-[#0F172A]">
            <span>الإجمالي</span><span>{total} ₪</span>
          </div>
          <button
            type="submit"
            disabled={placing || !currentUser}
            className="w-full bg-[#0F172A] hover:bg-[#2EC4B6] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{placing ? 'جارٍ تأكيد الطلب…' : 'تأكيد الطلب'}</span>
          </button>
          <button
            type="button"
            onClick={() => setStep('cart')}
            className="w-full text-xs font-bold text-slate-500 hover:text-[#0F172A]"
          >
            العودة إلى السلة
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-right space-y-6">
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">
            {step === 'cart' ? 'سلة التسوق' : 'إتمام الطلب'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'cart'
              ? 'راجع القطع المختارة قبل إتمام عملية الشراء'
              : 'أكمل بيانات التوصيل واختر طريقة الدفع المناسبة'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className={`px-3 py-1 rounded-full ${step === 'cart' ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-500'}`}>
            1. السلة
          </span>
          <span className={`px-3 py-1 rounded-full ${step === 'checkout' ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-500'}`}>
            2. الدفع
          </span>
        </div>
      </div>

      {step === 'cart' ? renderCartStep() : renderCheckoutStep()}
    </div>
  );
};
