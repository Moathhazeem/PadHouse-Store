import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapCatalogProduct } from './product.mapper';

const CATALOG_INCLUDE = {
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  variants: { include: { inventory: true } },
  reviews: { select: { rating: true } },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

async findAll(query: {
    category?: string;
    search?: string;
    featured?: boolean;
    compatibility?: string;
  }) {
    const conditions: any[] = [{ isActive: true }];

    if (query.category && query.category !== 'all') {
      conditions.push({
        OR: [
          { categoryId: query.category },
          { category: { slug: query.category } },
        ],
      });
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      conditions.push({
        OR: [
          { nameAr: { contains: search } },
          { nameEn: { contains: search } },
          { descriptionAr: { contains: search } },
          { sku: { contains: search } },
        ],
      });
    }

    if (query.featured !== undefined) {
      conditions.push({ isFeatured: query.featured });
    }

    const items = await this.prisma.product.findMany({
      where: { AND: conditions },
      include: CATALOG_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    const compatibleItems = query.compatibility
      ? items.filter((product) => {
          try {
            const verifiedModels: unknown = JSON.parse(product.ipadCompatibility);
            return Array.isArray(verifiedModels) && verifiedModels.includes(query.compatibility);
          } catch {
            return false;
          }
        })
      : items;

    return compatibleItems.map(mapCatalogProduct);
  }

  async findOne(idOrSku: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSku }, { sku: idOrSku }] },
      include: {
        ...CATALOG_INCLUDE,
        reviews: {
          include: {
            customerProfile: { include: { user: { select: { fullName: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    return {
      ...mapCatalogProduct(product),
      reviews: product.reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        isVerifiedPurchase: review.isVerifiedPurchase,
        createdAt: review.createdAt,
        customerName: review.customerProfile?.user?.fullName || 'عميل بادهاوس',
      })),
    };
  }

  /** Distinct list of iPad models referenced by verified product records. */
  async getIpadModels() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { ipadCompatibility: true, categoryId: true },
    });

    const modelSet = new Set<string>();
    for (const product of products) {
      try {
        const parsed = JSON.parse(product.ipadCompatibility);
        if (Array.isArray(parsed)) {
          parsed.forEach((model: string) => modelSet.add(model));
        } else {
          modelSet.add(String(product.ipadCompatibility));
        }
      } catch {
        if (product.ipadCompatibility) modelSet.add(String(product.ipadCompatibility));
      }
    }

    return Array.from(modelSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }
}
