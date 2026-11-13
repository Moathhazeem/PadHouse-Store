import React from 'react';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  Star,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { Product } from '../types';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';

interface HomePageProps {
  products: Product[];
  wishlistIds: string[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, color?: string, qty?: number) => void;
  onToggleWishlist: (productId: string) => void;
  onNavigate: (page: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  wishlistIds,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onNavigate,
}) => {
  // Best Sellers (e.g. pencil, paperfeel, keyboard cases)
  const bestSellers = products.filter(p => ['prod-01', 'prod-19', 'prod-07', 'prod-06'].includes(p.id));
  const newArrivals = products.filter(p => ['prod-10', 'prod-05', 'prod-13', 'prod-08'].includes(p.id));
  const specialOffers = products.filter(p => p.originalPrice > p.price).slice(0, 4);

  // Bundle: Pen + PaperFeel
  const penProduct = products.find(p => p.id === 'prod-01') || products[0];
  const paperProduct = products.find(p => p.id === 'prod-19') || products[1];

  return (
    <div className="w-full space-y-16 pb-12">
      {/* 1. Hero Section: Premium Modern Apple-Inspired */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] to-[#FFFFFF] border-b border-slate-100 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content (RTL -> Right side in visual) */}
            <div className="lg:col-span-7 space-y-6 text-right">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2EC4B6]/10 text-[#0F172A] border border-[#2EC4B6]/20 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-[#2EC4B6]" />
                <span>الجيل الجديد لملحقات أجهزة Apple iPad في فلسطين</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.25]">
                ارتقِ بتجربة الآيباد الخاصة بك إلى{' '}
                <span className="text-[#2EC4B6]">أقصى درجات الإنتاجية</span>
              </h1>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                أقلام ذكية بدقة متناهية، كيبوردات مع تاتش باد تدعم إيماءات iPadOS المتعددة، شاشات ملمس الورق الطبيعي PaperFeel، وحوامل ألمنيوم صُممت لتناسب كل بيئات العمل والدراسة.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('products')}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 group"
                >
                  <span>تسوق جميع الملحقات (21 منتج)</span>
                  <ChevronLeft className="w-4 h-4 text-[#2EC4B6] group-hover:-translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    const pen = products.find(p => p.id === 'prod-01');
                    if (pen) onSelectProduct(pen);
                  }}
                  className="bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-slate-200 px-5 py-3.5 rounded-xl font-bold text-sm transition-all"
                >
                  اكتشف قلم بادهاوس الذكي
                </button>
              </div>

              {/* Mini Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 max-w-lg">
                <div>
                  <span className="block text-xl font-black text-[#0F172A]">21+</span>
                  <span className="text-xs text-slate-500 font-medium">ملحق معتمد متوفر</span>
                </div>
                <div>
                  <span className="block text-xl font-black text-[#0F172A]">100%</span>
                  <span className="text-xs text-slate-500 font-medium">توافق مع iPad</span>
                </div>
                <div>
                  <span className="block text-xl font-black text-[#2EC4B6]">12 شهر</span>
                  <span className="text-xs text-slate-500 font-medium">ضمان استبدال مباشر</span>
                </div>
              </div>
            </div>

            {/* Right Media (Hero Product Showcase) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-md aspect-square rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-100 flex items-center justify-center">
                <img
                  src="https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg"
                  alt="قلم بادهاوس الذكي"
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                />

                {/* Floating Product Highlight Tag */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A] block">PadHouse Pencil</span>
                    <span className="text-[11px] text-slate-500">حساسية إمالة • رفض راحة اليد</span>
                  </div>
                  <div className="text-left">
                    <span className="text-base font-black text-[#2EC4B6]">120 ₪</span>
                    <span className="text-[10px] text-slate-400 line-through block">150 ₪</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]">تصفح حسب القسم</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">اختر ملحقاتك المصنفة بعناية لأجهزة الآيباد</p>
          </div>
          <button
            onClick={() => onNavigate('categories')}
            className="text-xs font-bold text-[#2EC4B6] hover:text-[#25a99d] flex items-center gap-1"
          >
            عرض الكل
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
            return (
              <button
                key={cat.id}
                onClick={() => onNavigate('products', { category: cat.id })}
                className="group p-4 rounded-2xl bg-[#F8FAFC] hover:bg-white border border-slate-100 hover:border-[#2EC4B6]/30 hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-xs group-hover:bg-[#2EC4B6] text-[#0F172A] group-hover:text-white flex items-center justify-center transition-colors">
                  <span className="font-bold text-sm">{cat.name.slice(0, 2)}</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] group-hover:text-[#2EC4B6] transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ملحقات متوافقة
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Best Sellers Carousel / Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2EC4B6]"></span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]">الأكثر طلباً ومبيعاً</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">المنتجات الأكثر مراجعة واقتناء من طلاب ومصممي فلسطين</p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-[#2EC4B6] hover:text-[#25a99d] flex items-center gap-1"
          >
            مشاهدة جميع المنتجات
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestSellers.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              isWishlisted={wishlistIds.includes(prod.id)}
              onSelect={onSelectProduct}
              onAddToCart={() => onAddToCart(prod)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 4. Product Bundle & "Frequently Bought Together" Promo */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#0F172A] text-white p-6 sm:p-10 border border-slate-800 shadow-xl overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-[#2EC4B6]/20 text-[#2EC4B6] text-xs font-bold">
                حزمة الطالب والمصمم المتكاملة (وفر 40 ₪)
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                قلم بادهاوس الذكي + شاشة الورق PaperFeel الأصلية
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                احصل على أفضل تجربة تدوين ملاحظات ورسم رقمي بملمس مطابق تماماً للورق الحقيقي، مع قلم ذكي بدقة بكسل فائقة ودعم راحة اليد.
              </p>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl font-black text-[#2EC4B6]">150 ₪</span>
                <span className="text-base text-slate-500 line-through">190 ₪</span>
                <span className="text-xs font-semibold text-emerald-400">توصيل مجاني لكافة المدن</span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    onAddToCart(penProduct);
                    onAddToCart(paperProduct);
                    onNavigate('cart');
                  }}
                  className="bg-[#2EC4B6] hover:bg-[#25a99d] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-md"
                >
                  أضف الحزمة معاً إلى السلة
                </button>
                <button
                  onClick={() => onSelectProduct(penProduct)}
                  className="text-xs text-slate-300 hover:text-white underline underline-offset-4"
                >
                  تفاصيل المنتجات
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex items-center justify-center gap-4">
              <div className="w-32 sm:w-40 aspect-square rounded-2xl bg-white p-3 shadow-md flex items-center justify-center">
                <img src={penProduct.image} alt="قلم بادهاوس" className="max-h-full object-contain" />
              </div>
              <span className="text-2xl font-bold text-[#2EC4B6]">+</span>
              <div className="w-32 sm:w-40 aspect-square rounded-2xl bg-white p-3 shadow-md flex items-center justify-center">
                <img src={paperProduct.image} alt="شاشة PaperFeel" className="max-h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Special Offers & Discounts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]">العروض والخصومات الخاصة</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">توفير حقيقي مع ضمان الجودة والأداء</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {specialOffers.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              isWishlisted={wishlistIds.includes(prod.id)}
              onSelect={onSelectProduct}
              onAddToCart={() => onAddToCart(prod)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 6. Customer Reviews / Social Proof */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#2EC4B6] uppercase tracking-wider">آراء عملاء بادهاوس</span>
          <h2 className="text-2xl font-black text-[#0F172A] mt-1">ماذا يقول مستخدمو آيباد في فلسطين؟</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100 space-y-3 text-right">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              "قلم بادهاوس ممتاز جداً، استخدمه في المحاضرات وتدوين الملاحظات على GoodNotes وما في أي فرق عن قلم آبل الأصلي غير إنه سعره مناسب جداً. التوصيل لجامعة بيرزيت كان خلال يومين."
            </p>
            <div className="pt-2 border-t border-slate-200">
              <span className="block text-xs font-bold text-[#0F172A]">محمد الريماوي</span>
              <span className="text-[11px] text-slate-400">طالب هندسة — رام الله</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100 space-y-3 text-right">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              "شاشة PaperFeel مع كفر الكيبورد والتاتش باد حوّلوا الآيباد للابتوب حقيقي للشغل. الملمس الورقي مريح جداً للرسم والخطوط وما بيعمل انعكاس تحت الشمس."
            </p>
            <div className="pt-2 border-t border-slate-200">
              <span className="block text-xs font-bold text-[#0F172A]">لانا طه</span>
              <span className="text-[11px] text-slate-400">مصممة جرافيك — نابلس</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100 space-y-3 text-right">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              "ستاند كاكوسيجا 360 درجة صلب ومريح وما بيهتز أبداً مع الضغط. تعامل المتجر محترم جداً والتغليف فخم."
            </p>
            <div className="pt-2 border-t border-slate-200">
              <span className="block text-xs font-bold text-[#0F172A]">طارق الجعبري</span>
              <span className="text-[11px] text-slate-400">الخليل</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Newsletter Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#F8FAFC] border border-slate-200 p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-[#2EC4B6]">انضم لمجتمع بادهاوس</span>
          <h2 className="text-2xl font-black text-[#0F172A]">احصل على أحدث عروض ملحقات الآيباد أولاً بأول</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            اشترك في نشرتنا البريدية لتصلك العروض الحصرية وخصومات الإطلاق على القطع الجديدة.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('شكراً لاشتراكك في نشرة بادهاوس البريدية!');
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto pt-2"
          >
            <input
              type="email"
              required
              placeholder="أدخل بريدك الإلكتروني..."
              className="w-full sm:w-auto flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2EC4B6]"
            />
            <button
              type="submit"
              className="w-full sm:w-auto bg-[#0F172A] hover:bg-[#2EC4B6] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              اشتراك الآن
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

