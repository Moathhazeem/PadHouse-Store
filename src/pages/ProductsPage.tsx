import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, ArrowUpDown, Check, PackageSearch, PenLine, Smartphone, Keyboard, BriefcaseBusiness, Cable, Shield } from 'lucide-react';
import { Product } from '../types';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { Button, EmptyState } from '../components/ui';

interface ProductsPageProps {
  products: Product[];
  selectedCategory: string;
  wishlistIds: string[];
  searchQuery?: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectCategory: (catId: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  selectedCategory,
  wishlistIds,
  searchQuery = '',
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onSelectCategory,
}) => {
  const [internalSearch, setInternalSearch] = useState(searchQuery);
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'rating'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<number>(200);
  const [minimumRating, setMinimumRating] = useState(0);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        const matchCategory =
          selectedCategory === 'all' || p.categories.includes(selectedCategory);

        // Search query filter
        const q = internalSearch.trim().toLowerCase();
        const matchSearch =
          q === '' ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.compatibility.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);

        // In Stock filter
        const matchStock = !inStockOnly || p.stock > 0;

        // Price filter
        const matchPrice = p.price <= priceRange;

        return matchCategory && matchSearch && matchStock && matchPrice && p.rating >= minimumRating;
      })
      .sort((a, b) => {
        if (sortBy === 'price_low') return a.price - b.price;
        if (sortBy === 'price_high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // featured/default
      });
  }, [products, selectedCategory, internalSearch, inStockOnly, priceRange, minimumRating, sortBy]);

  const activeCategoryTitle =
    OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'جميع المنتجات';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2" aria-label="تصفية حسب القسم">
        {OFFICIAL_CATEGORIES.map((cat) => {
          const Icon = ({cat_pens: PenLine, cat_cases: Smartphone, cat_keyboards: Keyboard, cat_stands: BriefcaseBusiness, cat_chargers: Cable, cat_others: Shield, all: PackageSearch} as Record<string, React.ElementType>)[cat.id] || PackageSearch;
          return <button key={cat.id} onClick={() => onSelectCategory(cat.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${selectedCategory === cat.id ? 'border-ph-brand bg-ph-brand text-white' : 'border-ph-border bg-white text-ph-ink hover:border-ph-brand'}`}><Icon className="h-4 w-4" strokeWidth={1.7}/>{cat.name}</button>;
        })}
      </div>
      {/* Top Breadcrumb & Heading */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ph-border pb-5">
        <div>
          <span className="text-xs text-ph-muted font-medium">الرئيسية / المتجر</span>
          <h1 className="text-2xl sm:text-3xl font-black text-ph-ink mt-1">
            {activeCategoryTitle}
          </h1>
          <p className="text-xs text-ph-muted mt-1">
            عرض {filteredProducts.length} منتج متوافق مع أجهزة الآيباد
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-ph-muted font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            ترتيب حسب:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-ph-border text-xs font-semibold text-ph-ink rounded-xl px-3 py-2 focus:outline-none focus:border-ph-brand"
          >
            <option value="featured">المميز والأكثر ملائمة</option>
            <option value="price_low">السعر: من الأقل للأعلى</option>
            <option value="price_high">السعر: من الأعلى للأقل</option>
            <option value="rating">الأعلى تقييماً</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-ph-border space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-ph-border">
              <span className="text-xs font-bold text-ph-ink flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-ph-brand" />
                تصفية المنتجات
              </span>
              {(selectedCategory !== 'all' || internalSearch || inStockOnly || priceRange < 200 || minimumRating > 0) && (
                <button
                  onClick={() => {
                    onSelectCategory('all');
                    setInternalSearch('');
                    setInStockOnly(false);
                    setPriceRange(200);
                    setMinimumRating(0);
                  }}
                  className="text-[11px] font-semibold text-ph-brand hover:underline"
                >
                  إعادة ضبط
                </button>
              )}
            </div>

            <div>
              <label htmlFor="minimum-rating" className="text-xs font-bold text-ph-ink block mb-2">الحد الأدنى للتقييم</label>
              <select id="minimum-rating" value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))} className="w-full rounded-xl border border-ph-border bg-white px-3 py-2 text-xs text-ph-ink focus:border-ph-brand">
                <option value={0}>كل التقييمات</option><option value={4}>4 نجوم فأعلى</option><option value={3}>3 نجوم فأعلى</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <span className="text-xs font-bold text-ph-ink block mb-2">الأقسام المعتمدة</span>
              <div className="space-y-1">
                {OFFICIAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-ph-brand text-white shadow-xs'
                        : 'text-ph-muted hover:bg-white hover:text-ph-ink'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {selectedCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="pt-2 border-t border-ph-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ph-ink">السعر الأقصى:</span>
                <span className="text-xs font-black text-ph-brand">{priceRange} ₪</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-ph-brand cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ph-muted mt-1">
                <span>10 ₪</span>
                <span>200 ₪</span>
              </div>
            </div>

            {/* In Stock Only Switch */}
            <div className="pt-2 border-t border-ph-border">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ph-ink">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-ph-brand focus:ring-ph-brand"
                />
                <span>القطع المتوفرة بالمخزون فقط</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="h-10 w-10" strokeWidth={1.5} />}
              title="لا توجد منتجات مطابقة"
              description="جرّب تعديل البحث أو خيارات التصفية للعثور على ما تبحث عنه."
              action={
                <Button
                  onClick={() => {
                    onSelectCategory('all');
                    setInternalSearch('');
                    setInStockOnly(false);
                    setPriceRange(200);
                  }}
                >
                  عرض كل المنتجات
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((prod, index) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isWishlisted={wishlistIds.includes(prod.id)}
                  onSelect={onSelectProduct}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  revealDelay={(index % 8) * 45}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

