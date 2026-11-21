import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, LoaderCircle, PackageOpen, PackageSearch, Search, X } from 'lucide-react';
import type { Product } from '../types';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { fetchProductsApi } from '../services/api';

/* ------------------------------------------------------------------ */
/* Search helpers — pure, RTL/Arabic aware (1:1 character folding)     */
/* ------------------------------------------------------------------ */

const CATEGORY_NAME = new Map(OFFICIAL_CATEGORIES.map((c) => [c.id, c.name]));
const MAX_MATCHES = 6;
const MAX_SIMILAR = 2;
const DEBOUNCE_MS = 220;

/**
 * Normalises Arabic text for matching while keeping the string length
 * unchanged, so match indexes can be mapped back onto the original title.
 */
function fold(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه');
}

/** Human-readable primary category for a product (falls back to a generic label). */
function categoryLabel(product: Product): string {
  const first = (product.categories || []).map((id) => CATEGORY_NAME.get(id)).find(Boolean);
  return first || 'ملحقات آيباد';
}

/** Ranks a product against the query: exact name → prefix → partial → sku → category → specs. */
function scoreProduct(product: Product, query: string): number {
  const name = fold(product.nameAr || product.name || '');
  const nameEn = (product.nameEn || '').toLowerCase();
  const sku = (product.sku || '').toLowerCase();
  const category = fold(categoryLabel(product));
  const compatibility = fold(product.compatibility || '');
  const description = fold(product.description || '');

  if (name === query || nameEn === query) return 1000;
  if (name.startsWith(query) || nameEn.startsWith(query)) return 850;
  if (name.includes(query) || nameEn.includes(query)) return 700;
  if (sku.includes(query)) return 560;
  if (category.includes(query)) return 480;
  if (compatibility.includes(query)) return 400;
  if (description.includes(query)) return 320;
  return 0;
}

interface SearchHit {
  product: Product;
  similar: boolean;
}

/** Builds the ranked hit list: exact/partial matches first, then same-category suggestions. */
function buildHits(pool: Product[], foldedQuery: string): SearchHit[] {
  const scored = pool
    .map((product) => ({ product, score: scoreProduct(product, foldedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);

  const matched = scored.slice(0, MAX_MATCHES).map((entry) => ({
    product: entry.product,
    similar: false,
  }));

  const hits: SearchHit[] = [...matched];
  if (matched.length === 0) return hits;

  const used = new Set(matched.map((hit) => hit.product.id));
  const matchedCategories = new Set(matched.flatMap((hit) => hit.product.categories));
  const limit = matched.length + MAX_SIMILAR;

  for (const product of pool) {
    if (hits.length >= limit) break;
    if (used.has(product.id)) continue;
    if (!product.categories.some((c) => matchedCategories.has(c))) continue;
    used.add(product.id);
    hits.push({ product, similar: true });
  }

  return hits;
}

/* ------------------------------------------------------------------ */
/* Presentation primitives                                             */
/* ------------------------------------------------------------------ */

const Thumb: React.FC<{ product: Product }> = ({ product }) => {
  const [failed, setFailed] = useState(false);
  const src = product.image;

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ph-border bg-ph-surface-soft">
      {failed || !src ? (
        <PackageOpen className="h-5 w-5 text-ph-muted" strokeWidth={1.4} aria-hidden="true" />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
        />
      )}
    </span>
  );
};

/** Renders the product title with the matched substring subtly highlighted. */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const index = fold(text).indexOf(fold(trimmed));
  if (index < 0) return <>{text}</>;
  const end = index + trimmed.length;
  return (
    <>
      {text.slice(0, index)}
      <span className="rounded bg-ph-brand/15 px-0.5 text-ph-brand">{text.slice(index, end)}</span>
      {text.slice(end)}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Search bar                                                          */
/* ------------------------------------------------------------------ */

interface SearchBarProps {
  /** Full in-memory catalog used for instant ranking and similar-product suggestions. */
  products: Product[];
  /** Navigate straight to a product's detail view. */
  onSelectProduct: (product: Product) => void;
  /** Submit the query to the full search-results page. */
  onSubmit: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  products,
  onSelectProduct,
  onSubmit,
  placeholder = 'ابحث عن منتج...',
  className = '',
}) => {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = value.trim();

  /* Debounced search: prefer fresh backend records, fall back to the local catalog. */
  useEffect(() => {
    if (!query) {
      setHits([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setOpen(true);
    let cancelled = false;

    const timer = setTimeout(async () => {
      let pool = products;
      const remote = await fetchProductsApi({ search: query });
      if (Array.isArray(remote) && remote.length > 0) {
        const byId = new Map<string, Product>();
        [...products, ...remote].forEach((p) => byId.set(p.id, p));
        pool = Array.from(byId.values());
      }
      if (cancelled) return;
      setHits(buildHits(pool, fold(query)));
      setActiveIndex(-1);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, products]);

  /* Smooth click-outside dismissal. */
  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  /* Keep the keyboard-active option in view. */
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-hit-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectProduct = useCallback(
    (product: Product) => {
      setOpen(false);
      setActiveIndex(-1);
      onSelectProduct(product);
    },
    [onSelectProduct],
  );

  const submitSearch = useCallback(
    (next?: string) => {
      const q = (next ?? value).trim();
      if (!q) return;
      setOpen(false);
      setActiveIndex(-1);
      onSubmit(q);
    },
    [value, onSubmit],
  );

  const clear = () => {
    setValue('');
    setHits([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  /* Icon click / Enter: jump straight to the active (or first) matching product. */
  const goToBestMatch = useCallback(() => {
    if (hits.length) {
      const target = hits[activeIndex >= 0 ? activeIndex : 0];
      if (target) {
        selectProduct(target.product);
        return;
      }
    }
    submitSearch();
  }, [hits, activeIndex, selectProduct, submitSearch]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        if (query) setOpen(true);
        return;
      }
      if (hits.length) setActiveIndex((i) => (i + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open || !hits.length) return;
      setActiveIndex((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      goToBestMatch();
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`.trim()}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className="w-full"
      >
        <div
          className={`group flex h-11 w-full items-center gap-2 rounded-xl border bg-white ps-3 pe-2.5 transition-all duration-200 ${
            focused
              ? 'border-ph-brand ring-2 ring-ph-brand/20 shadow-[0_2px_10px_rgba(28,168,158,0.14)]'
              : 'border-ph-border shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-ph-brand/50 hover:shadow-[0_2px_8px_rgba(15,23,42,0.07)]'
          }`}
        >
          <button
            type="button"
            onClick={goToBestMatch}
            aria-label="بحث"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-ph-background focus-visible:bg-ph-background"
          >
            {loading ? (
              <LoaderCircle
                className="h-4 w-4 shrink-0 animate-spin text-ph-brand"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="h-4 w-4 shrink-0 text-ph-muted transition-colors group-focus-within:text-ph-brand"
                aria-hidden="true"
              />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              if (query) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            aria-controls="ph-search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `ph-search-option-${activeIndex}` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-ph-ink placeholder:font-normal placeholder:text-ph-muted focus:outline-none"
          />

          {value && (
            <button
              type="button"
              onClick={clear}
              aria-label="مسح البحث"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ph-muted transition-colors hover:bg-ph-background hover:text-ph-ink focus-visible:bg-ph-background"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {open && query && (
        <div className="ph-popover-enter absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-ph-border bg-white shadow-2xl">
          {loading && hits.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold text-ph-muted">
              <LoaderCircle className="h-4 w-4 animate-spin text-ph-brand" aria-hidden="true" />
              جارٍ البحث…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <PackageSearch className="mx-auto mb-2 h-7 w-7 text-ph-muted" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-xs font-bold text-ph-ink">لا توجد منتجات مطابقة</p>
              <p className="mt-1 text-[11px] text-ph-muted">
                جرّب كلمات مفتاحية أخرى مثل «قلم» أو «كفر» أو «كيبورد».
              </p>
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                id="ph-search-listbox"
                role="listbox"
                className="max-h-[min(60vh,380px)] overflow-y-auto py-1.5"
              >
                {hits.map((hit, index) => {
                  const showSimilarLabel = hit.similar && (index === 0 || !hits[index - 1].similar);
                  return (
                    <React.Fragment key={`${hit.product.id}-${index}`}>
                      {showSimilarLabel && (
                        <div className="flex items-center gap-2 px-3 pt-3 pb-1 text-[10px] font-bold text-ph-muted">
                          <span className="h-px flex-1 bg-ph-border" />
                          منتجات مشابهة
                          <span className="h-px flex-1 bg-ph-border" />
                        </div>
                      )}
                      <button
                        type="button"
                        id={`ph-search-option-${index}`}
                        data-hit-index={index}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectProduct(hit.product)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-right transition-colors ${
                          index === activeIndex ? 'bg-ph-brand/[0.07]' : 'hover:bg-ph-background'
                        }`}
                      >
                        <Thumb product={hit.product} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-ph-ink" dir="auto">
                            <Highlight text={hit.product.name} query={query} />
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ph-muted">
                            <span className="truncate">{categoryLabel(hit.product)}</span>
                            <span className="text-ph-border">•</span>
                            {hit.product.stock <= 0 ? (
                              <span className="shrink-0 font-semibold text-ph-error">نفذت الكمية</span>
                            ) : (
                              <span className="ph-ltr shrink-0 font-semibold text-ph-ink">
                                {hit.product.price} ₪
                              </span>
                            )}
                          </span>
                        </span>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-ph-muted" aria-hidden="true" />
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submitSearch()}
                className="w-full border-t border-ph-border px-3 py-2.5 text-center text-xs font-bold text-ph-brand transition-colors hover:bg-ph-brand/5"
              >
                عرض كل النتائج
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
