import React, { useState, useMemo } from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, Search, ChevronDown, Check } from 'lucide-react';
import { Product } from '../types';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';

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

        return matchCategory && matchSearch && matchStock && matchPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price_low') return a.price - b.price;
        if (sortBy === 'price_high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // featured/default
      });
  }, [products, selectedCategory, internalSearch, inStockOnly, priceRange, sortBy]);

  const activeCategoryTitle =
    OFFICIAL_CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'جميع المنتجات';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Breadcrumb & Heading */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-xs text-slate-400 font-medium">الرئيسية / المتجر</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1">
            {activeCategoryTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            عرض {filteredProducts.length} منتج متوافق مع أجهزة الآيباد
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            ترتيب حسب:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 text-xs font-semibold text-[#0F172A] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2EC4B6]"
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
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#2EC4B6]" />
                تصفية المنتجات
              </span>
              {(selectedCategory !== 'all' || internalSearch || inStockOnly || priceRange < 200) && (
                <button
                  onClick={() => {
                    onSelectCategory('all');
                    setInternalSearch('');
                    setInStockOnly(false);
                    setPriceRange(200);
                  }}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  إعادة ضبط
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <span className="text-xs font-bold text-[#0F172A] block mb-2">الأقسام المعتمدة</span>
              <div className="space-y-1">
                {OFFICIAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-[#2EC4B6] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:text-[#0F172A]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {selectedCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0F172A]">السعر الأقصى:</span>
                <span className="text-xs font-black text-[#2EC4B6]">{priceRange} ₪</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#2EC4B6] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>10 ₪</span>
                <span>200 ₪</span>
              </div>
            </div>

            {/* In Stock Only Switch */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-[#2EC4B6] focus:ring-[#2EC4B6]"
                />
                <span>القطع المتوفرة بالمخزون فقط</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-[#F8FAFC] rounded-2xl p-12 text-center border border-slate-100 space-y-3">
              <p className="text-sm font-bold text-[#0F172A]">لا توجد منتجات مطابقة لخيارات التصفية</p>
              <p className="text-xs text-slate-400">جرب تعديل خيارات البحث أو إعادة ضبط الفلاتر</p>
              <button
                onClick={() => {
                  onSelectCategory('all');
                  setInternalSearch('');
                  setInStockOnly(false);
                  setPriceRange(200);
                }}
                className="mt-2 bg-[#2EC4B6] text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                عرض كل المنتجات
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isWishlisted={wishlistIds.includes(prod.id)}
                  onSelect={onSelectProduct}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

