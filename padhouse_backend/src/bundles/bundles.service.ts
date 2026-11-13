import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapCatalogProduct } from '../products/product.mapper';
import { CreateBundleDto } from './dto/bundle.dto';

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  variants: { include: { inventory: true } },
  reviews: { select: { rating: true } },
};

@Injectable()
export class BundlesService {
  constructor(private prisma: PrismaService) {}

  private mapBundle(bundle: any) {
    const items = (bundle.items ?? []).map((item: any) => {
      const product = mapCatalogProduct(item.product);
      return {
        quantity: item.quantity,
        product,
        lineTotal: product.price * item.quantity,
      };
    });

    const originalTotal = items.reduce((acc: number, i: any) => acc + i.lineTotal, 0);
    const discountValue = Number(bundle.discountValue);
    let bundlePrice = originalTotal;
    if (bundle.discountType === 'PERCENT') {
      bundlePrice = originalTotal * (1 - discountValue / 100);
    } else if (bundle.discountType === 'FIXED') {
      bundlePrice = originalTotal - discountValue;
    }
    bundlePrice = Math.max(0, Math.round(bundlePrice * 100) / 100);

    const allInStock = items.every((i: any) => i.product.stock >= i.quantity);

    return {
      id: bundle.id,
      slug: bundle.slug,
      titleAr: bundle.titleAr,
      descriptionAr: bundle.descriptionAr,
      imageUrl: bundle.imageUrl,
      discountType: bundle.discountType,
      discountValue,
      originalTotal: Math.round(originalTotal * 100) / 100,
      bundlePrice,
      savings: Math.round((originalTotal - bundlePrice) * 100) / 100,
      allInStock,
      items: items.map((i: any) => ({
        quantity: i.quantity,
        lineTotal: i.lineTotal,
        product: i.product,
      })),
    };
  }

  async getBundles() {
    const bundles = await this.prisma.bundle.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: { product: { include: PRODUCT_INCLUDE } },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return bundles.map((b) => this.mapBundle(b));
  }

  async getBundleBySlug(slug: string) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { slug },
      include: {
        items: {
          include: { product: { include: PRODUCT_INCLUDE } },
        },
      },
    });
    if (!bundle) {
      throw new NotFoundException('العرض المجمع غير موجود');
    }
    return this.mapBundle(bundle);
  }

  /** Active flash sales with verified per-product discounted prices. */
  async getActiveFlashSales() {
    const now = new Date();
    const sales = await this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        items: {
          include: { product: { include: PRODUCT_INCLUDE } },
        },
      },
      orderBy: { endsAt: 'asc' },
    });

    return sales.map((sale) => ({
      id: sale.id,
      titleAr: sale.titleAr,
      discountPercent: sale.discountPercent,
      startsAt: sale.startsAt,
      endsAt: sale.endsAt,
      items: sale.items.map((item) => {
        const product = mapCatalogProduct(item.product);
        const flashPrice =
          Math.round(product.price * (1 - sale.discountPercent / 100) * 100) / 100;
        return {
          ...product,
          flashPrice,
          flashDiscountPercent: sale.discountPercent,
        };
      }),
    }));
  }

  async createBundle(dto: CreateBundleDto) {
    const items = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.prisma.product.findFirst({
          where: { OR: [{ id: item.productId }, { sku: item.productId }] },
        });
        if (!product) {
          throw new NotFoundException(`المنتج ${item.productId} غير موجود`);
        }
        return { productId: product.id, quantity: item.quantity };
      }),
    );

    return this.prisma.bundle.create({
      data: {
        slug: dto.slug,
        titleAr: dto.titleAr,
        descriptionAr: dto.descriptionAr,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        imageUrl: dto.imageUrl,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
        items: { create: items },
      },
      include: {
        items: { include: { product: { include: PRODUCT_INCLUDE } } },
      },
    });
  }
}
