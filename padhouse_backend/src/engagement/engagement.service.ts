import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapCatalogProduct } from '../products/product.mapper';
import { BackInStockDto } from './dto/engagement.dto';

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  variants: { include: { inventory: true } },
  reviews: { select: { rating: true } },
};

@Injectable()
export class EngagementService {
  constructor(private prisma: PrismaService) {}

  private async resolveProduct(idOrSku: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSku }, { sku: idOrSku }] },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return product;
  }

  // ─── Wishlist ────────────────────────────────────────────────────────────

  async getWishlist(profileId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { customerProfileId: profileId },
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => mapCatalogProduct(item.product));
  }

  async addToWishlist(profileId: string, productId: string) {
    const product = await this.resolveProduct(productId);
    await this.prisma.wishlistItem.upsert({
      where: {
        customerProfileId_productId: {
          customerProfileId: profileId,
          productId: product.id,
        },
      },
      update: {},
      create: { customerProfileId: profileId, productId: product.id },
    });
    return this.getWishlist(profileId);
  }

  async removeFromWishlist(profileId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: productId }, { sku: productId }] },
    });
    if (product) {
      await this.prisma.wishlistItem.deleteMany({
        where: { customerProfileId: profileId, productId: product.id },
      });
    }
    return this.getWishlist(profileId);
  }

  // ─── Recently Viewed ─────────────────────────────────────────────────────

  async recordView(profileId: string, productId: string) {
    const product = await this.resolveProduct(productId);
    await this.prisma.recentlyViewed.upsert({
      where: {
        customerProfileId_productId: {
          customerProfileId: profileId,
          productId: product.id,
        },
      },
      update: { viewedAt: new Date() },
      create: { customerProfileId: profileId, productId: product.id },
    });

    // Keep only the 20 most recent entries per customer.
    const all = await this.prisma.recentlyViewed.findMany({
      where: { customerProfileId: profileId },
      orderBy: { viewedAt: 'desc' },
      select: { id: true },
    });
    if (all.length > 20) {
      const stale = all.slice(20).map((r) => r.id);
      await this.prisma.recentlyViewed.deleteMany({ where: { id: { in: stale } } });
    }

    return { recorded: true };
  }

  async getRecentlyViewed(profileId: string, limit = 12) {
    const items = await this.prisma.recentlyViewed.findMany({
      where: { customerProfileId: profileId },
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { viewedAt: 'desc' },
      take: limit,
    });
    return items.map((item) => mapCatalogProduct(item.product));
  }

  // ─── Back-in-stock alerts ────────────────────────────────────────────────

  async subscribeToBackInStock(profileId: string | undefined, dto: BackInStockDto) {
    const product = await this.resolveProduct(dto.productId);
    if (product.isActive === false) {
      throw new BadRequestException('المنتج غير متاح');
    }

    const existing = await this.prisma.backInStockAlert.findFirst({
      where: {
        productId: product.id,
        variantId: dto.variantId ?? null,
        ...(profileId ? { customerProfileId: profileId } : { email: dto.email ?? null }),
      },
    });
    if (existing) {
      return { subscribed: true, message: 'أنت مسجل مسبقاً لتنبيه توفر هذا المنتج', alertId: existing.id };
    }

    const alert = await this.prisma.backInStockAlert.create({
      data: {
        productId: product.id,
        variantId: dto.variantId ?? null,
        customerProfileId: profileId ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
      },
    });
    return {
      subscribed: true,
      message: 'سنقوم بإشعارك فور توفر المنتج مرة أخرى',
      alertId: alert.id,
    };
  }

  async getMyAlerts(profileId: string) {
    const alerts = await this.prisma.backInStockAlert.findMany({
      where: { customerProfileId: profileId },
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });
    return alerts.map((alert) => ({
      id: alert.id,
      isNotified: alert.isNotified,
      createdAt: alert.createdAt,
      product: mapCatalogProduct(alert.product),
    }));
  }

  async removeAlert(profileId: string, alertId: string) {
    await this.prisma.backInStockAlert.deleteMany({
      where: { id: alertId, customerProfileId: profileId },
    });
    return { removed: true };
  }
}
