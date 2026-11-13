import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapCatalogProduct } from '../products/product.mapper';

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  variants: { include: { inventory: true } },
  reviews: { select: { rating: true } },
};

/** Setup groups used by the "Build Your iPad Setup" experience. */
const SETUP_GROUPS = [
  { slug: 'cat_pens', labelAr: 'القلم والكتابة' },
  { slug: 'cat_cases', labelAr: 'الحافظة والحماية' },
  { slug: 'cat_keyboards', labelAr: 'لوحة المفاتيح' },
  { slug: 'cat_stands', labelAr: 'الحامل والمسند' },
  { slug: 'cat_chargers', labelAr: 'الشاحن والكابلات' },
];

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  private async resolveProduct(idOrSku: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSku }, { sku: idOrSku }] },
    });
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return product;
  }

  async getRelated(productId: string, limit = 8) {
    const product = await this.resolveProduct(productId);
    const items = await this.prisma.product.findMany({
      where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
      include: PRODUCT_INCLUDE,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapCatalogProduct);
  }

  async getFrequentlyBoughtTogether(productId: string, limit = 4) {
    const product = await this.resolveProduct(productId);

    // Verified co-purchase signal: products appearing in the same orders.
    const orderItems = await this.prisma.orderItem.findMany({
      where: { productId: product.id },
      select: { orderId: true },
    });
    const orderIds = orderItems.map((o) => o.orderId);

    let coProducts: Array<{ productId: string; count: number }> = [];
    if (orderIds.length > 0) {
      const co = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { orderId: { in: orderIds }, productId: { not: product.id } },
        _count: { productId: true },
      });
      coProducts = co
        .map((c) => ({ productId: c.productId, count: c._count.productId }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }

    if (coProducts.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: coProducts.map((c) => c.productId) }, isActive: true },
        include: PRODUCT_INCLUDE,
      });
      const order = new Map(coProducts.map((c, index) => [c.productId, index]));
      return products
        .map(mapCatalogProduct)
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    // Fallback: same category, ignoring products already covered above.
    const fallback = await this.prisma.product.findMany({
      where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
      include: PRODUCT_INCLUDE,
      take: limit,
    });
    return fallback.map(mapCatalogProduct);
  }

  async getForYou(profileId: string | undefined, limit = 8) {
    if (profileId) {
      const [views, wishlist] = await Promise.all([
        this.prisma.recentlyViewed.findMany({
          where: { customerProfileId: profileId },
          orderBy: { viewedAt: 'desc' },
          take: 10,
          include: { product: { select: { categoryId: true, id: true } } },
        }),
        this.prisma.wishlistItem.findMany({
          where: { customerProfileId: profileId },
          include: { product: { select: { categoryId: true, id: true } } },
        }),
      ]);

      const categoryIds = new Set<string>();
      const excludeIds = new Set<string>();
      views.forEach((v) => {
        categoryIds.add(v.product.categoryId);
        excludeIds.add(v.product.id);
      });
      wishlist.forEach((w) => {
        categoryIds.add(w.product.categoryId);
        excludeIds.add(w.product.id);
      });

      if (categoryIds.size > 0) {
        const items = await this.prisma.product.findMany({
          where: {
            isActive: true,
            categoryId: { in: Array.from(categoryIds) },
            id: { notIn: Array.from(excludeIds) },
          },
          include: PRODUCT_INCLUDE,
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        if (items.length > 0) {
          return items.map(mapCatalogProduct);
        }
      }
    }

    const featured = await this.prisma.product.findMany({
      where: { isActive: true },
      include: PRODUCT_INCLUDE,
      take: limit,
      orderBy: { isFeatured: 'desc' },
    });
    return featured.map(mapCatalogProduct);
  }

  /**
   * "Build Your iPad Setup" — returns, for the exact selected iPad model,
   * only accessories whose verified compatibility records include that model.
   */
  async getIpadSetup(model: string) {
    if (!model || !model.trim()) {
      throw new NotFoundException('يرجى اختيار موديل iPad أولاً');
    }
    const selected = model.trim();

    const compatible = await this.prisma.product.findMany({
      where: { isActive: true, ipadCompatibility: { contains: selected } },
      include: PRODUCT_INCLUDE,
    });

    const exact = compatible.filter((p) => {
      try {
        const parsed = JSON.parse(p.ipadCompatibility);
        return Array.isArray(parsed)
          ? parsed.some((m: string) => m.trim() === selected)
          : String(p.ipadCompatibility).trim() === selected;
      } catch {
        return String(p.ipadCompatibility).trim() === selected;
      }
    });

    const groups = SETUP_GROUPS.map((group) => {
      const items = exact
        .filter((p) => p.category.slug === group.slug)
        .map(mapCatalogProduct);
      return {
        slug: group.slug,
        labelAr: group.labelAr,
        products: items,
      };
    });

    const availableSlugs = new Set(groups.map((g) => g.slug));
    const otherProducts = exact
      .filter((p) => !availableSlugs.has(p.category.slug))
      .map(mapCatalogProduct);

    return {
      model: selected,
      totalCompatible: exact.length,
      groups: groups.filter((g) => g.products.length > 0),
      others: otherProducts,
    };
  }
}
