/**
 * Normalizes a Prisma product record into the shared catalog shape used by the
 * website and the Flutter app. All product-returning endpoints must use this
 * mapper so both clients can parse responses with a single model.
 */
export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  nameAr: string;
  nameEn: string;
  categories: string[];
  categoryId: string;
  price: number;
  originalPrice: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  minThreshold: number;
  compatibility: string;
  compatibilityList: string[];
  warrantyMonths: number;
  rating: number;
  reviewsCount: number;
  image: string;
  images: string[];
  description: string;
  colors: string[];
  variants: Array<{ id: string; sku: string; color: string; colorHex: string | null; stock: number }>;
}

export function mapCatalogProduct(product: any): CatalogProduct {
  let totalStock = 0;
  let minThreshold = 5;
  for (const variant of product.variants ?? []) {
    if (variant.inventory) {
      totalStock += variant.inventory.currentStock;
      minThreshold = variant.inventory.minThreshold;
    }
  }

  // ipadCompatibility is now a native PostgreSQL String[] array
  const parsedCompatibility: string[] = Array.isArray(product.ipadCompatibility)
    ? product.ipadCompatibility
    : [];

  const reviews = product.reviews ?? [];
  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0
      ? Math.round((reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsCount) * 10) / 10
      : 4.8;

  const images: string[] = (product.images ?? []).map((img: any) => img.url);

  return {
    id: product.id,
    sku: product.sku,
    name: product.nameAr,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    categories: product.category ? [product.category.slug] : [],
    categoryId: product.categoryId,
    price: Number(product.salePrice || product.basePrice),
    originalPrice: Number(product.basePrice),
    stock: product.stock !== undefined && product.stock !== null ? product.stock : totalStock,
    minStock: product.minStock ?? minThreshold,
    maxStock: product.maxStock ?? 100,
    minThreshold: product.minStock ?? minThreshold,
    compatibility: parsedCompatibility.join(', '),
    compatibilityList: parsedCompatibility,
    warrantyMonths: product.warrantyMonths ?? 0,
    rating: avgRating,
    reviewsCount,
    image: images[0] || '',
    images,
    description: product.descriptionAr,
    colors: (product.variants ?? []).map((v: any) => v.colorNameAr),
    variants: (product.variants ?? []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      color: v.colorNameAr,
      colorHex: v.colorHex ?? null,
      stock: v.inventory?.currentStock ?? 0,
    })),
  };
}
