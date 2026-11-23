import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalyticsCacheService } from '../analytics/analytics-cache.service';

/**
 * Phase 0 (Stock Unification) tests.
 *
 * These exercise the centralized stock primitive against an in-memory database
 * whose `$transaction` mock snapshots state and restores it on failure, so the
 * rollback behaviour of real Prisma transactions can be asserted.
 */
describe('InventoryService (Phase 0 stock unification)', () => {
  let service: InventoryService;
  let notificationsService: any;

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  let db: {
    inventory: Record<string, any>;
    products: Record<string, any>;
    movements: any[];
  };
  let tx: any;
  let failMovementCreate = false;

  const freshDb = () => ({
    inventory: {
      'inv-1': {
        id: 'inv-1',
        variantId: 'var-1',
        currentStock: 10,
        costPrice: 10,
        minThreshold: 5,
        lastRestockDate: null,
        updatedAt: new Date('2026-01-01'),
        variant: { productId: 'prod-1' },
      },
      'inv-2': {
        id: 'inv-2',
        variantId: 'var-2',
        currentStock: 4,
        costPrice: 8,
        minThreshold: 5,
        lastRestockDate: null,
        updatedAt: new Date('2026-01-01'),
        variant: { productId: 'prod-1' },
      },
    },
    products: {
      'prod-1': { id: 'prod-1', nameAr: 'منتج تجريبي', stock: 14, minStock: 5 },
    },
    movements: [] as any[],
  });

  beforeEach(async () => {
    db = freshDb();
    failMovementCreate = false;

    tx = {
      inventory: {
        findUnique: jest.fn(async ({ where }: any) => {
          const record = Object.values(db.inventory).find(
            (inv: any) => inv.variantId === where.variantId,
          ) as any;
          return record ? clone(record) : null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.inventory[where.id];
          Object.assign(record, data);
          return clone(record);
        }),
        aggregate: jest.fn(async ({ where }: any) => {
          const productId = where.variant.productId;
          const total = Object.values(db.inventory)
            .filter((inv: any) => inv.variant.productId === productId)
            .reduce((sum: number, inv: any) => sum + inv.currentStock, 0);
          return { _sum: { currentStock: total } };
        }),
      },
      inventoryMovement: {
        create: jest.fn(async ({ data }: any) => {
          if (failMovementCreate) throw new Error('movement write failed');
          db.movements.push(clone(data));
          return clone(data);
        }),
      },
      product: {
        update: jest.fn(async ({ where, data }: any) => {
          Object.assign(db.products[where.id], data);
          const product = db.products[where.id];
          return {
            id: product.id,
            nameAr: product.nameAr,
            stock: product.stock,
            minStock: product.minStock,
          };
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const product = db.products[where.id];
          if (!product) return null;
          const variants = Object.values(db.inventory)
            .filter((inv: any) => inv.variant.productId === where.id)
            .map((inv: any) => ({
              id: inv.variantId,
              productId: where.id,
              inventory: clone(inv),
            }));
          return { ...clone(product), variants };
        }),
      },
    };

    const prisma: any = {
      $transaction: jest.fn(async (cb: any) => {
        const snapshot = clone(db);
        try {
          return await cb(tx);
        } catch (error) {
          db = snapshot; // simulate transaction rollback
          throw error;
        }
      }),
      inventory: { findMany: jest.fn(async () => []) },
    };

    notificationsService = {
      checkAndCreateLowStockNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        AnalyticsCacheService,
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('existing manual stock adjustment (absolute)', () => {
    it('records a RESTOCK movement and raises product stock when increased', async () => {
      const result = await service.updateStock('var-1', { quantity: 15 } as any, 'actor-1');

      expect(result.currentStock).toBe(15);
      expect(db.inventory['inv-1'].currentStock).toBe(15);
      expect(db.movements).toHaveLength(1);
      expect(db.movements[0]).toMatchObject({
        inventoryId: 'inv-1',
        quantity: 5,
        type: 'RESTOCK',
        actorId: 'actor-1',
      });
    });

    it('records a MANUAL_ADJUSTMENT movement when decreased and keeps both stock sources in sync', async () => {
      await service.updateStock('var-1', { quantity: 2 } as any, 'actor-1');

      expect(db.inventory['inv-1'].currentStock).toBe(2);
      expect(db.movements[0].type).toBe('MANUAL_ADJUSTMENT');
      expect(db.movements[0].quantity).toBe(-8);
      // Product.stock = sum of variants (2 + 4)
      expect(db.products['prod-1'].stock).toBe(6);
    });

    it('throws NotFoundException when the variant has no inventory record', async () => {
      await expect(
        service.updateStock('missing', { quantity: 1 } as any, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('order fulfillment / returns (signed delta)', () => {
    it('decrements stock for ORDER_FULFILLMENT and syncs product stock', async () => {
      await service.applyVariantDelta({
        variantId: 'var-1',
        delta: -3,
        type: 'ORDER_FULFILLMENT',
        actorId: 'user-1',
      });

      expect(db.inventory['inv-1'].currentStock).toBe(7);
      expect(db.movements[0]).toMatchObject({ quantity: -3, type: 'ORDER_FULFILLMENT' });
      expect(db.products['prod-1'].stock).toBe(11);
    });

    it('increments stock for RETURN_RESTOCK (order cancellation)', async () => {
      await service.applyVariantDelta({
        variantId: 'var-1',
        delta: 2,
        type: 'RETURN_RESTOCK',
      });

      expect(db.inventory['inv-1'].currentStock).toBe(12);
      expect(db.movements[0]).toMatchObject({ quantity: 2, type: 'RETURN_RESTOCK' });
    });

    it('writes a DAMAGED_WRITE_OFF movement', async () => {
      await service.applyVariantDelta({
        variantId: 'var-2',
        delta: -4,
        type: 'DAMAGED_WRITE_OFF',
      });

      expect(db.inventory['inv-2'].currentStock).toBe(0);
      expect(db.movements[0].type).toBe('DAMAGED_WRITE_OFF');
    });

    it('prevents negative stock and leaves the record untouched', async () => {
      await expect(
        service.applyVariantDelta({
          variantId: 'var-2',
          delta: -10,
          type: 'ORDER_FULFILLMENT',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(db.inventory['inv-2'].currentStock).toBe(4);
      expect(db.movements).toHaveLength(0);
    });

    it('allows negative stock only when explicitly opted in', async () => {
      await service.applyVariantDelta({
        variantId: 'var-2',
        delta: -10,
        type: 'MANUAL_ADJUSTMENT',
        allowNegative: true,
      });

      expect(db.inventory['inv-2'].currentStock).toBe(-6);
    });
  });

  describe('restocking with Weighted Average Cost', () => {
    it('blends the previous inventory value with the received units', async () => {
      // Existing: 10 units @ 10 = 100. Incoming: 10 units @ 20 = 200. WAC = 300/20 = 15.
      const result = await service.receiveStock({
        variantId: 'var-1',
        quantity: 10,
        unitCost: 20,
        reference: 'PO-0001',
        actorId: 'manager-1',
      });

      expect(result.currentStock).toBe(20);
      expect(Number(result.costPrice)).toBe(15);
      expect(db.movements[0]).toMatchObject({ quantity: 10, type: 'RESTOCK' });
      expect(db.movements[0].notes).toContain('[PO-0001]');
      expect(db.inventory['inv-1'].lastRestockDate).not.toBeNull();
      expect(db.products['prod-1'].stock).toBe(24);
    });

    it('adopts the unit cost as WAC when prior stock is zero', async () => {
      db.inventory['inv-1'].currentStock = 0;

      const result = await service.receiveStock({
        variantId: 'var-1',
        quantity: 5,
        unitCost: 12.345,
        actorId: 'manager-1',
      });

      expect(result.currentStock).toBe(5);
      expect(Number(result.costPrice)).toBe(12.35);
    });

    it('rejects a non-positive received quantity', async () => {
      await expect(
        service.receiveStock({ variantId: 'var-1', quantity: 0, unitCost: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid unit cost', async () => {
      await expect(
        service.receiveStock({ variantId: 'var-1', quantity: 5, unitCost: -1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('product / variant stock synchronization', () => {
    it('always rewrites Product.stock as the sum of its variant stocks', async () => {
      await service.applyVariantDelta({
        variantId: 'var-2',
        delta: 6,
        type: 'RESTOCK',
      });

      // var-1 = 10, var-2 = 10 -> 20
      expect(db.products['prod-1'].stock).toBe(20);
    });

    it('fires a low-stock notification when the aggregate drops below minStock', async () => {
      db.products['prod-1'].minStock = 20;

      await service.applyVariantDelta({
        variantId: 'var-1',
        delta: -1,
        type: 'ORDER_FULFILLMENT',
      });

      expect(
        notificationsService.checkAndCreateLowStockNotification,
      ).toHaveBeenCalledWith(
        { productId: 'prod-1', productNameAr: 'منتج تجريبي', stock: 13, minStock: 20 },
        tx,
      );
    });
  });

  describe('legacy product-level endpoint (setProductStock)', () => {
    it('adds the difference to the first variant when increasing', async () => {
      await service.setProductStock('prod-1', 20, 'actor-1');

      expect(db.inventory['inv-1'].currentStock).toBe(16); // 10 + (20 - 14)
      expect(db.inventory['inv-2'].currentStock).toBe(4);
      expect(db.products['prod-1'].stock).toBe(20);
    });

    it('drains variants in order when decreasing, never below zero', async () => {
      await service.setProductStock('prod-1', 5, 'actor-1');

      // total 14 -> 5 means removing 9: var-1 (10) -> 1, var-2 untouched (4)
      expect(db.inventory['inv-1'].currentStock).toBe(1);
      expect(db.inventory['inv-2'].currentStock).toBe(4);
      expect(db.products['prod-1'].stock).toBe(5);
    });

    it('rejects negative target stock', async () => {
      await expect(service.setProductStock('prod-1', -1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('transaction safety', () => {
    it('rolls back inventory changes when a later write fails in the transaction', async () => {
      failMovementCreate = true;

      await expect(
        service.applyVariantDelta({
          variantId: 'var-1',
          delta: -5,
          type: 'ORDER_FULFILLMENT',
        }),
      ).rejects.toThrow('movement write failed');

      // The stock write that happened before the failure was rolled back.
      expect(db.inventory['inv-1'].currentStock).toBe(10);
      expect(db.movements).toHaveLength(0);
    });

    it('enlists in a caller-provided transaction instead of opening a new one', async () => {
      const externalTx: any = {
        inventory: tx.inventory,
        inventoryMovement: tx.inventoryMovement,
        product: tx.product,
      };

      await service.applyVariantDelta(
        { variantId: 'var-1', delta: -1, type: 'ORDER_FULFILLMENT' },
        externalTx,
      );

      expect(db.inventory['inv-1'].currentStock).toBe(9);
    });
  });

  describe('existing inventory APIs', () => {
    it('getInventoryOverview returns an empty list when nothing is tracked', async () => {
      await expect(service.getInventoryOverview()).resolves.toEqual([]);
    });

    it('getLowStockAlerts filters the overview down to low-stock items', async () => {
      await expect(service.getLowStockAlerts()).resolves.toEqual([]);
    });
  });
});
