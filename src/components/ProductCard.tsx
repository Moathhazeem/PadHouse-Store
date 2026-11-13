import React from 'react';
import { Heart, ShoppingBag, Star, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onSelect,
  onAddToCart,
  onToggleWishlist,
}) => {
  const discountPercent =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:border-slate-200 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Top Media & Badges */}
      <div className="relative w-full aspect-square bg-[#F8FAFC] overflow-hidden">
        {/* Badges: Discount & Stock */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5 items-end">
          {discountPercent > 0 && (
            <span className="bg-[#2EC4B6] text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
              خصم {discountPercent}%
            </span>
          )}
          {product.stock <= 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              نفدت الكمية
            </span>
          )}
          {product.stock > 0 && product.stock <= product.minThreshold && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              المتبقي {product.stock} فقط!
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          className={`absolute top-2.5 left-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-xs ${
            isWishlisted
              ? 'bg-rose-50 text-rose-500'
              : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white'
          }`}
          title="أضف للمفضلة"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Product Image */}
        <div
          onClick={() => onSelect(product)}
          className="w-full h-full cursor-pointer overflow-hidden flex items-center justify-center p-4"
        >
          <img
            src={product.image}
            alt={product.name}
            onError={handleImageError}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Compatibility Tag */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-semibold text-[#2EC4B6] truncate max-w-[170px]">
              {product.compatibility}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onSelect(product)}
            className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug cursor-pointer group-hover:text-[#2EC4B6] transition-colors mb-2 text-right"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Available Colors Indicator */}
          {product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[10px] text-slate-400 font-medium">الألوان:</span>
              <div className="flex items-center gap-1">
                {product.colors.slice(0, 3).map((col, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                  >
                    {col}
                  </span>
                ))}
                {product.colors.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-bold">
                    +{product.colors.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pricing and Cart Action */}
        <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-2 mt-2">
          <div className="flex flex-col text-right">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-[#0F172A]">
                {product.price}
              </span>
              <span className="text-xs font-bold text-[#0F172A]">₪</span>
            </div>
            {product.originalPrice > product.price && (
              <span className="text-[11px] text-slate-400 line-through">
                {product.originalPrice} ₪
              </span>
            )}
          </div>

          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock <= 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              product.stock > 0
                ? 'bg-[#0F172A] text-white hover:bg-[#2EC4B6] hover:text-white shadow-xs active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.stock > 0 ? 'أضف للسلة' : 'غير متوفر'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

