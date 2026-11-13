import React, { useEffect, useState } from 'react';
import {
  Heart,
  ShoppingBag,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Info,
  Check,
  Plus,
  Minus,
  BellRing,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { AppUser, Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import {
  addRecentlyViewedApi,
  createReviewApi,
  createStockAlertApi,
  fetchFbtApi,
  fetchReviewsApi,
  mapBackendProduct,
  type ReviewSummary,
} from '../services/api';

interface ProductDetailsPageProps {
  product: Product;
  allProducts: Product[];
  wishlistIds: string[];
  onAddToCart: (product: Product, color?: string, qty?: number) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigate: (page: string) => void;
  currentUser: AppUser | null;
}

const SUPPORT_WHATSAPP = '970599000000';

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({
  product,
  allProducts,
  wishlistIds,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct,
  onNavigate,
  currentUser,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0] || 'افتراضي');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');

  // Verified compatibility (never guessed — comes from the backend product record)
  const compatibilityList = product.compatibilityList || [];

  // Reviews (real backend records)
  const [reviewData, setReviewData] = useState<ReviewSummary>({ reviews: [], averageRating: 0, total: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Frequently bought together (derived from real orders)
  const [fbt, setFbt] = useState<Product[]>([]);

  // Back-in-stock alert
  const [alertEmail, setAlertEmail] = useState(currentUser?.email || '');
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const isWishlisted = wishlistIds.includes(product.id);
  const discountPercent =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  // Related products from same category
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.categories.some((c) => product.categories.includes(c)))
    .slice(0, 4);

  useEffect(() => {
    setSelectedColor(product.colors[0] || 'افتراضي');
    setQuantity(1);
    setActiveImageIndex(0);
    setReviewMessage(null);
    setAlertMessage(null);
  }, [product.id]);

  // Track "recently viewed" on the shared backend
  useEffect(() => {
    if (currentUser) {
      addRecentlyViewedApi(product.id);
    }
  }, [product.id, currentUser]);

  // Load real reviews + frequently bought together
  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    fetchReviewsApi(product.id)
      .then((data) => {
        if (!cancelled) setReviewData(data);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    fetchFbtApi(product.id)
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setFbt(list.map(mapBackendProduct).filter((p) => p.id !== product.id).slice(0, 3));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onNavigate('login');
      return;
    }
    setReviewBusy(true);
    setReviewMessage(null);
    try {
      await createReviewApi({ productId: product.id, rating: reviewRating, comment: reviewComment });
      setReviewMessage('تم نشر تقييمك بنجاح. شكراً لك!');
      setReviewComment('');
      const data = await fetchReviewsApi(product.id);
      setReviewData(data);
    } catch (err: any) {
      setReviewMessage(err?.message || 'تعذر إرسال التقييم');
    } finally {
      setReviewBusy(false);
    }
  };

  const subscribeStockAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail.trim()) return;
    setAlertBusy(true);
    setAlertMessage(null);
    try {
      await createStockAlertApi(product.id, alertEmail.trim());
      setAlertMessage('سنرسل لك إشعاراً فور توفر هذا المنتج مجدداً.');
    } catch (err: any) {
      setAlertMessage(err?.message || 'تعذر تسجيل التنبيه');
    } finally {
      setAlertBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => onNavigate('home')} className="hover:text-[#0F172A]">الرئيسية</button>
        <span>/</span>
        <button onClick={() => onNavigate('products')} className="hover:text-[#0F172A]">المنتجات</button>
        <span>/</span>
        <span className="text-slate-600 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Gallery Column (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative w-full aspect-square rounded-3xl bg-[#F8FAFC] border border-slate-100 p-8 flex items-center justify-center overflow-hidden">
            {discountPercent > 0 && (
              <span className="absolute top-4 right-4 bg-[#2EC4B6] text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
                خصم {discountPercent}%
              </span>
            )}
            <img
              src={images[activeImageIndex] || product.image}
              alt={product.name}
              onError={handleImageError}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-2xl bg-[#F8FAFC] p-2 border-2 transition-all shrink-0 ${
                    activeImageIndex === idx ? 'border-[#2EC4B6] shadow-sm' : 'border-transparent hover:border-slate-200'
                  }`}
                >
                  <img src={img} alt="صورة مصغرة" onError={handleImageError} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions Column (6 cols) */}
        <div className="lg:col-span-6 space-y-6 text-right">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-[#2EC4B6]">
              {product.compatibility}
            </span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {product.stock > 0 ? `متوفر بالمخزون (${product.stock} قطعة)` : 'نفدت الكمية'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-snug">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{(reviewData.averageRating || product.rating || 0).toFixed(1)}</span>
              <span className="text-slate-400">({reviewData.total || product.reviewsCount} تقييم حقيقي)</span>
            </div>
            <span>•</span>
            <span>رمز المنتج (SKU): <strong className="text-slate-700">{product.sku}</strong></span>
          </div>

          {/* Price Box */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-slate-100 flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0F172A]">{product.price}</span>
                <span className="text-sm font-bold text-[#0F172A]">شيكل (₪)</span>
              </div>
              {product.originalPrice > product.price && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 line-through">{product.originalPrice} ₪</span>
                  <span className="text-xs text-[#2EC4B6] font-bold">توفير {product.originalPrice - product.price} ₪</span>
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500 font-medium">شامل ضريبة القيمة المضافة</span>
          </div>

          {/* Colors Selection */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0F172A] block">
                اللون / المظهر المتاح: <span className="text-[#2EC4B6] font-semibold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedColor === color
                        ? 'border-[#2EC4B6] bg-[#2EC4B6]/10 text-[#0F172A]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Cart Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-sm text-[#0F172A]">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => onAddToCart(product, selectedColor, quantity)}
                disabled={product.stock <= 0}
                className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  product.stock > 0
                    ? 'bg-[#0F172A] hover:bg-[#2EC4B6] text-white active:scale-98'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-[#2EC4B6]" />
                <span>{product.stock > 0 ? 'إضافة إلى سلة المشتريات' : 'المنتج غير متوفر حالياً'}</span>
              </button>

              <button
                onClick={() => onToggleWishlist(product.id)}
                className={`p-3 rounded-xl border transition-all ${
                  isWishlisted
                    ? 'border-rose-200 bg-rose-50 text-rose-500'
                    : 'border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                }`}
                title="أضف للمفضلة"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Back-in-stock alert (only when out of stock) */}
          {product.stock <= 0 && (
            <form
              onSubmit={subscribeStockAlert}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 text-right"
            >
              <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
                <BellRing className="w-4 h-4" />
                <span>أعلمني عند توفر هذا المنتج</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="بريدك الإلكتروني"
                  className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400 text-left dir-ltr"
                />
                <button
                  type="submit"
                  disabled={alertBusy}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
                >
                  {alertBusy ? 'جارٍ التسجيل…' : 'تنبيهي'}
                </button>
              </div>
              {alertMessage && <p className="text-[11px] text-amber-800">{alertMessage}</p>}
            </form>
          )}

          {/* Verified iPad compatibility */}
          {compatibilityList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#2EC4B6]" />
                متوافق مع الموديلات التالية (توافق مؤكد من سجل المنتج):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {compatibilityList.map((model) => (
                  <span
                    key={model}
                    className="bg-[#F1F5F9] text-[#334155] text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-right">
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-[#2EC4B6] shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <strong className="block text-[#0F172A]">توصيل سريع</strong>
                <span className="text-slate-500">24-48 ساعة لجميع المدن</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2EC4B6] shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <strong className="block text-[#0F172A]">ضمان معتمد</strong>
                <span className="text-slate-500">{product.warranty || 'استبدال فوري 12 شهر'}</span>
              </div>
            </div>

            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`استفسار عن: ${product.name}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 hover:opacity-80 transition-opacity"
            >
              <MessageCircle className="w-4 h-4 text-[#2EC4B6] shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <strong className="block text-[#0F172A]">استفسر عبر واتساب</strong>
                <span className="text-slate-500">دعم فوري من فريق بادهاوس</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together */}
      {fbt.length > 0 && (
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-black text-[#0F172A] mb-2 text-right">يُشترى معه عادةً</h2>
          <p className="text-xs text-slate-500 mb-6 text-right">
            بناءً على طلبات حقيقية تم تسليمها من متجر بادهاوس
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {fbt.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isWishlisted={wishlistIds.includes(p.id)}
                onSelect={onSelectProduct}
                onAddToCart={() => onAddToCart(p)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Description, Technical Specs, Reviews */}
      <div className="border-t border-slate-200 pt-8">
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('desc')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'desc' ? 'border-[#2EC4B6] text-[#2EC4B6]' : 'border-transparent text-slate-500 hover:text-[#0F172A]'
            }`}
          >
            الوصف الكامل والمميزات
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'specs' ? 'border-[#2EC4B6] text-[#2EC4B6]' : 'border-transparent text-slate-500 hover:text-[#0F172A]'
            }`}
          >
            المواصفات الفنية والتوافق
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'reviews' ? 'border-[#2EC4B6] text-[#0F172A]' : 'border-transparent text-slate-500 hover:text-[#0F172A]'
            }`}
          >
            آراء المشترين ({reviewData.total || product.reviewsCount})
          </button>
        </div>

        <div className="py-6">
          {activeTab === 'desc' && (
            <div className="space-y-4 max-w-3xl text-right">
              <p className="text-sm text-slate-700 leading-relaxed">
                {product.description}
              </p>
              {product.features && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-[#0F172A]">أبرز المزايا والخصائص:</h4>
                  <ul className="space-y-1.5">
                    {product.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-[#2EC4B6] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl text-right">
              <table className="w-full text-xs text-slate-700 border border-slate-200 rounded-xl overflow-hidden">
                <tbody>
                  <tr className="border-b border-slate-100 bg-[#F8FAFC]">
                    <td className="p-3 font-bold text-[#0F172A] w-1/3">التوافق مع أجهزة الآيباد:</td>
                    <td className="p-3 text-[#2EC4B6] font-semibold">{product.compatibility}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-3 font-bold text-[#0F172A]">الضمان المعتمد:</td>
                    <td className="p-3">{product.warranty || 'ضمان استبدال مباشر ضد عيوب الصناعة'}</td>
                  </tr>
                  {product.specs &&
                    Object.entries(product.specs).map(([key, value], idx) => (
                      <tr key={idx} className="border-b border-slate-100 odd:bg-[#F8FAFC]">
                        <td className="p-3 font-bold text-[#0F172A]">{key}:</td>
                        <td className="p-3">{value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {compatibilityList.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#2EC4B6]" />
                    قائمة الموديلات المتوافقة المؤكدة:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {compatibilityList.map((m) => (
                      <span key={m} className="bg-[#F1F5F9] text-[#334155] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-5 max-w-3xl text-right">
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-[#0F172A]">
                    {(reviewData.averageRating || product.rating || 0).toFixed(1)} / 5
                  </span>
                  <p className="text-xs text-slate-500">
                    بناءً على {reviewData.total || product.reviewsCount} تقييم مسجل في النظام
                  </p>
                </div>
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
              </div>

              {/* Real reviews list */}
              {reviewsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ تحميل التقييمات…</span>
                </div>
              ) : reviewData.reviews.length === 0 ? (
                <p className="text-xs text-slate-500">
                  لا توجد تقييمات منشورة لهذا المنتج بعد. كن أول من يشارك تجربته.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviewData.reviews.map((r: any) => (
                    <div key={r.id} className="bg-white border border-slate-100 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">{r.customerName || 'عميل بادهاوس'}</span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>}
                      <span className="text-[10px] text-slate-400 block">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : ''}
                        {r.verifiedPurchase ? ' • مشترٍ موثّق' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add review */}
              <form onSubmit={submitReview} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A]">شارك تجربتك مع هذا المنتج</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">التقييم:</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setReviewRating(n)}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-5 h-5 ${n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="اكتب ملاحظاتك عن جودة المنتج وتجربتك معه…"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2EC4B6]"
                />
                {reviewMessage && <p className="text-[11px] text-[#2EC4B6] font-semibold">{reviewMessage}</p>}
                <button
                  type="submit"
                  disabled={reviewBusy}
                  className="bg-[#0F172A] hover:bg-[#2EC4B6] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  {reviewBusy ? 'جارٍ الإرسال…' : currentUser ? 'نشر التقييم' : 'سجّل الدخول لتقييم المنتج'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-black text-[#0F172A] mb-6 text-right">منتجات مشابهة قد تناسبك</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isWishlisted={wishlistIds.includes(p.id)}
                onSelect={onSelectProduct}
                onAddToCart={() => onAddToCart(p)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
