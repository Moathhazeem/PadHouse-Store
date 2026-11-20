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
  ChevronLeft,
  PenLine, BriefcaseBusiness, Keyboard, Smartphone, Cable, Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { useScrollReveal } from '../components/ui';

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
  const heroReveal = useScrollReveal<HTMLElement>();
  const categoriesReveal = useScrollReveal<HTMLElement>(80);
  // Best Sellers (e.g. pencil, paperfeel, keyboard cases)
  const bestSellers = products.filter(p => ['prod-01', 'prod-19', 'prod-07', 'prod-06'].includes(p.id));
  const newArrivals = products.filter(p => ['prod-10', 'prod-05', 'prod-13', 'prod-08'].includes(p.id));
  const specialOffers = products.filter(p => p.originalPrice > p.price).slice(0, 4);

  // Bundle: Pen + PaperFeel
  const penProduct = products.find(p => p.id === 'prod-01') || products[0];
  const paperProduct = products.find(p => p.id === 'prod-19') || products[1];

  // Trust badge stats data
  const trustStats = [
    { value: '21+', label: 'ملحق معتمد متوفر', color: 'text-ph-ink' },
    { value: '100%', label: 'توافق مع iPad', color: 'text-ph-ink' },
    { value: '12 شهر', label: 'ضمان استبدال مباشر', color: 'text-ph-brand' },
  ];

  return (
    <div className="w-full space-y-16 pb-12">
      {/* 1. Hero Section: Premium Modern Apple-Inspired */}
      <section ref={heroReveal.ref} style={heroReveal.style} className={`${heroReveal.className} relative overflow-hidden bg-white border-b border-ph-border py-12 md:py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content (RTL -> Right side in visual) */}
            <div className="lg:col-span-7 space-y-6 text-right">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-ph-border text-ph-ink border border-ph-border text-xs font-bold">
                <Sparkles className="w-4 h-4 text-ph-brand" />
                <span>الجيل الجديد لملحقات أجهزة Apple iPad في فلسطين</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-ph-ink tracking-tight leading-[1.25]">
                ارتقِ بتجربة الآيباد الخاصة بك إلى{' '}
                <span className="text-ph-brand">أقصى درجات الإنتاجية</span>
              </h1>

              <p className="text-ph-muted text-sm sm:text-base leading-relaxed max-w-xl">
                أقلام ذكية بدقة متناهية، كيبوردات مع تاتش باد تدعم إيماءات iPadOS المتعددة، شاشات ملمس الورق الطبيعي PaperFeel، وحوامل ألمنيوم صُممت لتناسب كل بيئات العمل والدراسة.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Main CTA button with hover/tap animation */}
                <motion.button
                  onClick={() => onNavigate('products')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-ph-brand hover:bg-ph-brand-hover text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 group"
                >
                  <span>تسوق جميع الملحقات (21 منتج)</span>
                  <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-1 transition-transform" />
                </motion.button>

                <button
                  onClick={() => {
                    const pen = products.find(p => p.id === 'prod-01');
                    if (pen) onSelectProduct(pen);
                  }}
                  className="bg-white hover:bg-white text-ph-ink border border-ph-border px-5 py-3.5 rounded-xl font-bold text-sm transition-all"
                >
                  اكتشف قلم بادهاوس الذكي
                </button>
              </div>

              {/* Mini Highlights — staggered whileInView */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-ph-border max-w-lg">
                {trustStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className={`block text-xl font-black ${stat.color}`}>{stat.value}</span>
                    <span className="text-xs text-ph-muted font-medium">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Media (Hero Product Showcase) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-md aspect-square rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(15,61,58,0.08)] border border-ph-border flex items-center justify-center">
                {/* Hero image with scale + fade entrance */}
                <motion.img
                  src="https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg"
                  alt="قلم بادهاوس الذكي"
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                />

                {/* Floating Product Highlight Tag — gentle float loop */}
                <motion.div
                  className="absolute bottom-6 left-6 right-6 bg-white backdrop-blur-md p-3.5 rounded-2xl border border-ph-border shadow-lg flex items-center justify-between"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div>
                    <span className="text-xs font-bold text-ph-ink block">PadHouse Pencil</span>
                    <span className="text-[11px] text-ph-muted">حساسية إمالة • رفض راحة اليد</span>
                  </div>
                  <div className="text-left">
                    <span className="text-base font-black text-ph-brand">120 ₪</span>
                    <span className="text-[10px] text-ph-muted line-through block">150 ₪</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Categories Grid */}
      <section ref={categoriesReveal.ref} style={categoriesReveal.style} className={`${categoriesReveal.className} ph-stagger-reveal max-w-7xl mx-auto px-4 sm:px-6`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-ph-ink">تصفح حسب القسم</h2>
            <p className="text-xs sm:text-sm text-ph-muted mt-1">اختر ملحقاتك المصنفة بعناية لأجهزة الآيباد</p>
          </div>
          <button
            onClick={() => onNavigate('categories')}
            className="text-xs font-bold text-ph-brand hover:text-ph-brand-hover flex items-center gap-1"
          >
            عرض الكل
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map((cat, index) => {
            return (
              <motion.button
                key={cat.id}
                onClick={() => onNavigate('products', { category: cat.id })}
                className="ph-stagger-item group p-4 rounded-2xl bg-white hover:bg-white border border-ph-border hover:border-ph-brand/40 hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center justify-center gap-3 cursor-pointer"
                style={{ '--ph-stagger-index': index } as React.CSSProperties}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-xs group-hover:bg-ph-brand text-ph-ink group-hover:text-white flex items-center justify-center transition-colors">
                  {({cat_pens: PenLine, cat_cases: Smartphone, cat_keyboards: Keyboard, cat_stands: BriefcaseBusiness, cat_chargers: Cable, cat_others: Shield} as Record<string, React.ElementType>)[cat.id] && React.createElement(({cat_pens: PenLine, cat_cases: Smartphone, cat_keyboards: Keyboard, cat_stands: BriefcaseBusiness, cat_chargers: Cable, cat_others: Shield} as Record<string, React.ElementType>)[cat.id], {className: 'h-6 w-6', strokeWidth: 1.6})}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ph-ink group-hover:text-ph-brand transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-ph-muted mt-0.5 block">
                    ملحقات متوافقة
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 3. Best Sellers Carousel / Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ph-brand"></span>
              <h2 className="text-xl sm:text-2xl font-black text-ph-ink">الأكثر طلباً ومبيعاً</h2>
            </div>
            <p className="text-xs sm:text-sm text-ph-muted mt-1">المنتجات الأكثر مراجعة واقتناء من طلاب ومصممي فلسطين</p>
          </motion.div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-ph-brand hover:text-ph-brand-hover flex items-center gap-1"
          >
            مشاهدة جميع المنتجات
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestSellers.map((prod, index) => (
            <ProductCard
              key={prod.id}
              product={prod}
              isWishlisted={wishlistIds.includes(prod.id)}
              onSelect={onSelectProduct}
              onAddToCart={() => onAddToCart(prod)}
              onToggleWishlist={onToggleWishlist}
              revealDelay={index * 55}
            />
          ))}
        </div>
      </section>

      {/* 4. Product Bundle & "Frequently Bought Together" Promo */}
      {penProduct && paperProduct && <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="rounded-3xl bg-gradient-to-l from-[#0F3D3A] via-[#1CA89E] to-[#1CA89E] text-white p-6 sm:p-10 border border-ph-border shadow-xl overflow-hidden relative"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs text-xs font-bold">
                حزمة الطالب والمصمم المتكاملة (وفر 40 ₪)
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                قلم بادهاوس الذكي + شاشة الورق PaperFeel الأصلية
              </h2>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg">
                احصل على أفضل تجربة تدوين ملاحظات ورسم رقمي بملمس مطابق تماماً للورق الحقيقي، مع قلم ذكي بدقة بكسل فائقة ودعم راحة اليد.
              </p>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl font-black text-white">150 ₪</span>
                <span className="text-base text-white/80 line-through">190 ₪</span>
                <span className="text-xs font-semibold text-white/90 bg-white/15 px-2 py-0.5 rounded-md">توصيل مجاني لكافة المدن</span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    onAddToCart(penProduct);
                    onAddToCart(paperProduct);
                    onNavigate('cart');
                  }}
                  className="bg-white hover:bg-white/95 text-ph-ink font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 hover:shadow-lg"
                >
                  أضف الحزمة معاً إلى السلة
                </button>
                <button
                  onClick={() => onSelectProduct(penProduct)}
                  className="text-xs text-white/90 hover:text-white underline underline-offset-4"
                >
                  تفاصيل المنتجات
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex items-center justify-center gap-4">
              <div className="w-32 sm:w-40 aspect-square rounded-2xl bg-white p-3 shadow-md flex items-center justify-center transition-transform hover:scale-105 duration-300">
                <img src={penProduct.image} alt="قلم بادهاوس" className="max-h-full object-contain" />
              </div>
              <span className="text-3xl font-black text-white">+</span>
              <div className="w-32 sm:w-40 aspect-square rounded-2xl bg-white p-3 shadow-md flex items-center justify-center transition-transform hover:scale-105 duration-300">
                <img src={paperProduct.image} alt="شاشة PaperFeel" className="max-h-full object-contain" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>}

      {/* 5. Special Offers & Discounts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-ph-ink">العروض والخصومات الخاصة</h2>
            <p className="text-xs sm:text-sm text-ph-muted mt-1">توفير حقيقي مع ضمان الجودة والأداء</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {specialOffers.map((prod, index) => (
            <ProductCard
              key={prod.id}
              product={prod}
              isWishlisted={wishlistIds.includes(prod.id)}
              onSelect={onSelectProduct}
              onAddToCart={() => onAddToCart(prod)}
              onToggleWishlist={onToggleWishlist}
              revealDelay={index * 55}
            />
          ))}
        </div>
      </section>

      {/* 6. Customer Reviews / Social Proof */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-ph-brand uppercase tracking-wider">آراء عملاء بادهاوس</span>
          <h2 className="text-2xl font-black text-ph-ink mt-1">ماذا يقول مستخدمو آيباد في فلسطين؟</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-ph-border space-y-3 text-right">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
              ))}
            </div>
            <p className="text-xs text-ph-muted leading-relaxed">
              "قلم بادهاوس ممتاز جداً، استخدمه في المحاضرات وتدوين الملاحظات على GoodNotes وما في أي فرق عن قلم آبل الأصلي غير إنه سعره مناسب جداً. التوصيل لجامعة بيرزيت كان خلال يومين."
            </p>
            <div className="pt-2 border-t border-ph-border">
              <span className="block text-xs font-bold text-ph-ink">محمد الريماوي</span>
              <span className="text-[11px] text-ph-muted">طالب هندسة — رام الله</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-ph-border space-y-3 text-right">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
              ))}
            </div>
            <p className="text-xs text-ph-muted leading-relaxed">
              "شاشة PaperFeel مع كفر الكيبورد والتاتش باد حوّلوا الآيباد للابتوب حقيقي للشغل. الملمس الورقي مريح جداً للرسم والخطوط وما بيعمل انعكاس تحت الشمس."
            </p>
            <div className="pt-2 border-t border-ph-border">
              <span className="block text-xs font-bold text-ph-ink">لانا طه</span>
              <span className="text-[11px] text-ph-muted">مصممة جرافيك — نابلس</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-ph-border space-y-3 text-right">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
              ))}
            </div>
            <p className="text-xs text-ph-muted leading-relaxed">
              "ستاند كاكوسيجا 360 درجة صلب ومريح وما بيهتز أبداً مع الضغط. تعامل المتجر محترم جداً والتغليف فخم."
            </p>
            <div className="pt-2 border-t border-ph-border">
              <span className="block text-xs font-bold text-ph-ink">طارق الجعبري</span>
              <span className="text-[11px] text-ph-muted">الخليل</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Newsletter Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-white border border-ph-border p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-ph-brand">انضم لمجتمع بادهاوس</span>
          <h2 className="text-2xl font-black text-ph-ink">احصل على أحدث عروض ملحقات الآيباد أولاً بأول</h2>
          <p className="text-xs sm:text-sm text-ph-muted max-w-md mx-auto">
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
              className="w-full sm:w-auto flex-1 bg-white border border-ph-border rounded-xl px-4 py-2.5 text-xs text-ph-ink focus:outline-none focus:border-ph-brand"
            />
            <button
              type="submit"
              className="w-full sm:w-auto bg-ph-brand hover:bg-ph-brand-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              اشتراك الآن
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
