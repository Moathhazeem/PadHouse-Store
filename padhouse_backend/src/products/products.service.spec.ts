import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let notificationsService: any;

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    notificationsService = {
      checkAndCreateLowStockNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('should throw BadRequestException if minStock < 0', async () => {
      await expect(
        service.create({
          sku: 'SKU1',
          nameAr: 'منتج',
          nameEn: 'Product',
          descriptionAr: 'وصف',
          descriptionEn: 'Desc',
          categoryId: 'cat1',
          basePrice: 50,
          minStock: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if maxStock < minStock', async () => {
      await expect(
        service.create({
          sku: 'SKU1',
          nameAr: 'منتج',
          nameEn: 'Product',
          descriptionAr: 'وصف',
          descriptionEn: 'Desc',
          categoryId: 'cat1',
          basePrice: 50,
          minStock: 20,
          maxStock: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create product and trigger notification when stock < minStock', async () => {
      const createdProduct = {
        id: 'p-1',
        sku: 'SKU1',
        nameAr: 'منتج منخفض',
        nameEn: 'Low Product',
        stock: 2,
        minStock: 5,
        maxStock: 50,
        basePrice: 50,
        images: [],
        variants: [],
        reviews: [],
      };
      prisma.product.create.mockResolvedValue(createdProduct);

      const result = await service.create({
        sku: 'SKU1',
        nameAr: 'منتج منخفض',
        nameEn: 'Low Product',
        descriptionAr: 'وصف',
        descriptionEn: 'Desc',
        categoryId: 'cat1',
        basePrice: 50,
        stock: 2,
        minStock: 5,
        maxStock: 50,
      });

      expect(prisma.product.create).toHaveBeenCalled();
      expect(notificationsService.checkAndCreateLowStockNotification).toHaveBeenCalledWith({
        productId: 'p-1',
        productNameAr: 'منتج منخفض',
        stock: 2,
        minStock: 5,
      });
      expect(result.stock).toBe(2);
    });

    it('should create product and NOT trigger notification when stock >= minStock', async () => {
      const createdProduct = {
        id: 'p-2',
        sku: 'SKU2',
        nameAr: 'منتج متوفر',
        nameEn: 'In Stock Product',
        stock: 20,
        minStock: 5,
        maxStock: 50,
        basePrice: 50,
        images: [],
        variants: [],
        reviews: [],
      };
      prisma.product.create.mockResolvedValue(createdProduct);

      await service.create({
        sku: 'SKU2',
        nameAr: 'منتج متوفر',
        nameEn: 'In Stock Product',
        descriptionAr: 'وصف',
        descriptionEn: 'Desc',
        categoryId: 'cat1',
        basePrice: 50,
        stock: 20,
        minStock: 5,
        maxStock: 50,
      });

      expect(notificationsService.checkAndCreateLowStockNotification).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should validate minStock and maxStock against existing values', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p-1',
        minStock: 10,
        maxStock: 50,
      });

      await expect(
        service.update('p-1', { maxStock: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trigger notification on update if updated stock < minStock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p-1',
        nameAr: 'منتج',
        stock: 10,
        minStock: 5,
        maxStock: 50,
      });
      prisma.product.update.mockResolvedValue({
        id: 'p-1',
        nameAr: 'منتج',
        stock: 3,
        minStock: 5,
        maxStock: 50,
        images: [],
        variants: [],
        reviews: [],
      });

      await service.update('p-1', { stock: 3 });

      expect(notificationsService.checkAndCreateLowStockNotification).toHaveBeenCalledWith({
        productId: 'p-1',
        productNameAr: 'منتج',
        stock: 3,
        minStock: 5,
      });
    });
  });

  describe('updateStock', () => {
    it('should throw BadRequestException if newStock < 0', async () => {
      await expect(service.updateStock('p-1', -5)).rejects.toThrow(BadRequestException);
    });

    it('should update stock and trigger notification if stock < minStock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p-1',
        nameAr: 'كفر',
        stock: 10,
        minStock: 5,
      });
      prisma.product.update.mockResolvedValue({
        id: 'p-1',
        nameAr: 'كفر',
        stock: 2,
        minStock: 5,
      });

      await service.updateStock('p-1', 2);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { stock: 2 },
      });
      expect(notificationsService.checkAndCreateLowStockNotification).toHaveBeenCalledWith(
        {
          productId: 'p-1',
          productNameAr: 'كفر',
          stock: 2,
          minStock: 5,
        },
        undefined,
      );
    });
  });
});
