import { ReplenishmentService } from './replenishment.service';

describe('ReplenishmentService', () => {
  const forecast = {
    productId: 'p1', sku: 'SKU-1', productName: 'Case', status: 'FORECASTED',
    metrics: { coefficientOfVariation: 0.2 },
    dailyForecast: Array.from({ length: 90 }, (_, i) => ({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, expectedUnits: 2, lower: 1, upper: 3 })),
  };
  const product = { id: 'p1', stock: 10, maxStock: 100, variants: [] };
  const supplier = { id: 's1', name: 'Actual Supplier', leadTimeDays: 8 };

  function makeService(openOrderQuantity: number) {
    const prisma: any = {
      demandForecastRun: { findFirst: jest.fn().mockResolvedValue({ id: 'run1', generatedAt: new Date('2026-11-23') }) },
      forecastConfiguration: { findUnique: jest.fn().mockResolvedValue({ replenishmentPeriodDays: 30, safetyStockZScore: 1.65, safetyStockMethod: 'SERVICE_LEVEL', stockoutLeadDays: 14 }) },
      demandForecast: { findMany: jest.fn().mockResolvedValue([forecast]) },
      product: { findMany: jest.fn().mockResolvedValue([product]) },
      purchaseOrderItem: { findMany: jest.fn().mockResolvedValue(openOrderQuantity ? [{ productId: 'p1', orderedQuantity: openOrderQuantity + 2, receivedQuantity: 2, purchaseOrder: { supplierId: 's1', status: 'SENT' } }] : []) },
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
      supplier: { findMany: jest.fn().mockResolvedValue([supplier]) },
      replenishmentRecommendation: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)) },
    };
    return { service: new ReplenishmentService(prisma), prisma };
  }

  it('uses actual supplier lead time and subtracts remaining open purchase quantities', async () => {
    const { service, prisma } = makeService(12);
    const result = await service.recommendations({ limit: 25, offset: 0 });
    expect(result.data[0].reorderPoint).toBeGreaterThanOrEqual(16);
    expect(result.data[0].incomingQuantity).toBe(12);
    expect(result.data[0].suggestedSupplier).toBe('Actual Supplier');
    expect(result.data[0].suggestedQuantity).toBeLessThan(50);
    expect(prisma.replenishmentRecommendation.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not create a duplicate recommendation when open orders cover forecast demand', async () => {
    const { service, prisma } = makeService(80);
    const result = await service.recommendations({ limit: 25, offset: 0 });
    expect(result.data).toHaveLength(0);
    expect(prisma.replenishmentRecommendation.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ recommendedQuantity: 0, incomingQuantity: 80 }) }));
  });
});
