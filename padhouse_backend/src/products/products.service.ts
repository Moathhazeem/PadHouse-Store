import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mapCatalogProduct } from './product.mapper';
import { CreateProductDto, UpdateProductDto } from './dto';

const CATALOG_INCLUDE = {
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  variants: { include: { inventory: true } },
  reviews: { select: { rating: true } },
};

const IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IMAGE_CACHE_MAX_ENTRIES = 48;
const imageCache = new Map<string, { image: { buffer: Buffer; contentType: string }; expiresAt: number }>();
const imageFetches = new Map<string, Promise<{ buffer: Buffer; contentType: string }>>();

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async fetchProductImage(sourceUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
    let imageUrl: URL;
    try {
      imageUrl = new URL(sourceUrl);
    } catch {
      throw new BadRequestException('رابط الصورة غير صالح');
    }

    if (
      imageUrl.protocol !== 'https:' ||
      !['padhouse.ps', 'www.padhouse.ps'].includes(imageUrl.hostname) ||
      (imageUrl.port !== '' && imageUrl.port !== '443') ||
      imageUrl.username !== '' ||
      imageUrl.password !== '' ||
      !imageUrl.pathname.startsWith('/wp-content/uploads/')
    ) {
      throw new BadRequestException('مصدر الصورة غير مسموح');
    }

    const cacheKey = imageUrl.toString();
    const cached = imageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      imageCache.delete(cacheKey);
      imageCache.set(cacheKey, cached);
      return cached.image;
    }
    if (cached) imageCache.delete(cacheKey);

    const inFlight = imageFetches.get(cacheKey);
    if (inFlight) return inFlight;

    const fetchPromise = (async () => {
      try {
        const response = await axios.get<ArrayBuffer>(cacheKey, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxRedirects: 0,
          maxContentLength: 8 * 1024 * 1024,
          headers: {
            Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
        });
        const contentType = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
        if (!['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
          throw new BadGatewayException('مصدر الصورة لم يُرجع ملف صورة صالحاً');
        }
        const image = { buffer: Buffer.from(response.data), contentType };
        imageCache.set(cacheKey, { image, expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
        if (imageCache.size > IMAGE_CACHE_MAX_ENTRIES) {
          const oldestKey = imageCache.keys().next().value;
          if (oldestKey) imageCache.delete(oldestKey);
        }
        return image;
      } catch (error) {
        if (error instanceof BadGatewayException) throw error;
        throw new BadGatewayException('تعذر تحميل الصورة من مصدرها');
      } finally {
        imageFetches.delete(cacheKey);
      }
    })();

    imageFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

async findAll(query: {
    category?: string;
    search?: string;
    featured?: boolean;
    compatibility?: string;
    includeInactive?: boolean;
  }) {
    const conditions: any[] = [];

    // The storefront only ever shows active products; the admin dashboard
    // passes includeInactive=true (role-checked in the controller) so that
    // deactivated products stay manageable.
    if (!query.includeInactive) {
      conditions.push({ isActive: true });
    }

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
          { nameAr: { contains: search, mode: 'insensitive' } },
          { nameEn: { contains: search, mode: 'insensitive' } },
          { descriptionAr: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.featured !== undefined) {
      conditions.push({ isFeatured: query.featured });
    }

    if (query.compatibility) {
      conditions.push({ ipadCompatibility: { has: query.compatibility } });
    }

    const items = await this.prisma.product.findMany({
      where: { AND: conditions },
      include: CATALOG_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    const compatibleItems = items;

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
      if (Array.isArray(product.ipadCompatibility)) {
        product.ipadCompatibility.forEach((model: string) => modelSet.add(model));
      }
    }

    return Array.from(modelSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }

  /**
   * Creates a new product and validates that minStock >= 0 and maxStock >= minStock.
   * If stock < minStock, automatically triggers a low-stock admin notification.
   */
  async create(dto: CreateProductDto) {
    if (dto.minStock !== undefined && dto.minStock < 0) {
      throw new BadRequestException('الحد الأدنى للمخزون يجب أن يكون صفراً أو أكثر (minStock >= 0)');
    }
    const minStock = dto.minStock ?? 5;
    const maxStock = dto.maxStock ?? 100;
    if (maxStock < minStock) {
      throw new BadRequestException(
        'الحد الأقصى للمخزون يجب أن يكون أكبر من أو يساوي الحد الأدنى (maxStock >= minStock)',
      );
    }

    const initialStock = dto.stock ?? 0;

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        categoryId: dto.categoryId,
        basePrice: dto.basePrice,
        salePrice: dto.salePrice ?? null,
        stock: initialStock,
        minStock,
        maxStock,
        ipadCompatibility: dto.ipadCompatibility ?? [],
        warrantyMonths: dto.warrantyMonths ?? 12,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
      },
      include: CATALOG_INCLUDE,
    });

    // Check low-stock trigger (stock < minStock)
    if (product.stock < product.minStock) {
      await this.notificationsService.checkAndCreateLowStockNotification({
        productId: product.id,
        productNameAr: product.nameAr,
        stock: product.stock,
        minStock: product.minStock,
      });
    }

    return mapCatalogProduct(product);
  }

  /**
   * Updates an existing product.
   * Validates minStock >= 0 and maxStock >= minStock against existing values.
   * If stock falls below minStock, automatically triggers a low-stock notification.
   */
  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('المنتج غير موجود');
    }

    const minStock = dto.minStock !== undefined ? dto.minStock : existing.minStock;
    const maxStock = dto.maxStock !== undefined ? dto.maxStock : existing.maxStock;

    if (minStock < 0) {
      throw new BadRequestException('الحد الأدنى للمخزون يجب أن يكون صفراً أو أكثر (minStock >= 0)');
    }
    if (maxStock < minStock) {
      throw new BadRequestException(
        'الحد الأقصى للمخزون يجب أن يكون أكبر من أو يساوي الحد الأدنى (maxStock >= minStock)',
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.sku ? { sku: dto.sku } : {}),
        ...(dto.nameAr ? { nameAr: dto.nameAr } : {}),
        ...(dto.nameEn ? { nameEn: dto.nameEn } : {}),
        ...(dto.descriptionAr ? { descriptionAr: dto.descriptionAr } : {}),
        ...(dto.descriptionEn ? { descriptionEn: dto.descriptionEn } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.maxStock !== undefined ? { maxStock: dto.maxStock } : {}),
        ...(dto.ipadCompatibility ? { ipadCompatibility: dto.ipadCompatibility } : {}),
        ...(dto.warrantyMonths !== undefined ? { warrantyMonths: dto.warrantyMonths } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: CATALOG_INCLUDE,
    });

    // Check low-stock trigger (stock < minStock)
    if (updated.stock < updated.minStock) {
      await this.notificationsService.checkAndCreateLowStockNotification({
        productId: updated.id,
        productNameAr: updated.nameAr,
        stock: updated.stock,
        minStock: updated.minStock,
      });
    }

    return mapCatalogProduct(updated);
  }

  /**
   * Directly updates stock for ERP inventory management.
   * Safe to call inside an existing transaction or standalone.
   */
  async updateStock(id: string, newStock: number, tx?: Prisma.TransactionClient) {
    if (newStock < 0) {
      throw new BadRequestException('لا يمكن أن يكون المخزون سالباً');
    }

    const client = tx || this.prisma;
    const existing = await client.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('المنتج غير موجود');
    }

    const updated = await client.product.update({
      where: { id },
      data: { stock: newStock },
    });

    if (updated.stock < updated.minStock) {
      await this.notificationsService.checkAndCreateLowStockNotification(
        {
          productId: updated.id,
          productNameAr: updated.nameAr,
          stock: updated.stock,
          minStock: updated.minStock,
        },
        tx,
      );
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return this.prisma.product.delete({ where: { id } });
  }
}
