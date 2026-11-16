import React, { useState } from 'react';
import { Heart, PackageOpen, ShoppingBag, Star } from 'lucide-react';
import type { Product } from '../types';
import { Button, CompatibilityBadge, useScrollReveal } from './ui';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  revealDelay?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onSelect,
  onAddToCart,
  onToggleWishlist,
  revealDelay = 0,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const reveal = useScrollReveal<HTMLElement>(revealDelay);
  const discountPercent =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <article ref={reveal.ref} style={reveal.style} className={`${reveal.className} ph-product-card group flex flex-col`}>
      <div className="ph-product-media">
        <div className="absolute end-2.5 top-2.5 z-10 flex flex-col items-end gap-1.5">
          {discountPercent > 0 && (
            <span className="rounded-full bg-ph-brand px-2 py-1 text-[11px] font-bold text-white">
              خصم {discountPercent}%
            </span>
          )}
          {product.stock <= 0 && (
            <span className="rounded-full bg-ph-error px-2 py-1 text-[10px] font-bold text-white">
              نفدت الكمية
            </span>
          )}
          {product.stock > 0 && product.stock <= product.minThreshold && (
            <span className="rounded-full bg-ph-warning px-2 py-1 text-[10px] font-bold text-white">
              المتبقي {product.stock} فقط
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          className={`absolute start-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ph-border bg-white shadow-sm transition-colors hover:text-ph-error focus-visible:outline-offset-2 ${
            isWishlisted ? 'text-ph-error' : 'text-ph-muted'
          }`}
          aria-label={isWishlisted ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          aria-pressed={isWishlisted}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onSelect(product)}
          className="flex h-full w-full items-center justify-center p-2 text-center focus-visible:outline-offset-[-3px]"
          aria-label={`عرض ${product.name}`}
        >
          {imageFailed || !product.image ? (
            <span className="flex h-full w-full items-center justify-center text-ph-muted" aria-hidden="true">
              <PackageOpen className="h-12 w-12" strokeWidth={1.25} />
            </span>
          ) : (
            <img
              src={product.image}
              alt={product.name}
              onError={() => setImageFailed(true)}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.035]"
            />
          )}
        </button>
      </div>

      <div className="ph-product-content">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => onSelect(product)} className="ph-product-title min-w-0 flex-1 text-right hover:text-ph-accent" title={product.name} dir="auto">{product.name}</button>
            <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ph-ink" aria-label={`التقييم ${product.rating} من 5`}>
              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
              <span className="ph-ltr">{product.rating.toFixed(1)}</span>
              <span className="text-ph-muted font-normal">({product.reviewsCount})</span>
            </div>
          </div>
          <div className="mb-2 flex justify-end"><CompatibilityBadge><span className="truncate" dir="auto">{product.compatibility}</span></CompatibilityBadge></div>

          {product.colors?.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 text-[11px] text-ph-muted">الألوان:</span>
              {product.colors.slice(0, 3).map((color, index) => (
                <span key={`${color}-${index}`} className="truncate rounded-md bg-ph-background px-1.5 py-0.5 text-[10px] font-medium text-ph-muted">
                  {color}
                </span>
              ))}
              {product.colors.length > 3 && (
                <span className="shrink-0 text-[10px] font-bold text-ph-muted">+{product.colors.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="ph-product-footer">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 font-black text-ph-ink">
              <span className="ph-ltr text-base">{product.price}</span>
              <span className="text-xs">₪</span>
            </div>
            {product.originalPrice > product.price && (
              <span className="ph-ltr block text-xs text-ph-muted line-through">{product.originalPrice} ₪</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => onAddToCart(product)}
            disabled={product.stock <= 0}
            className="shrink-0"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span>{product.stock > 0 ? 'أضف للسلة' : 'غير متوفر'}</span>
          </Button>
        </div>
      </div>
    </article>
  );
};
