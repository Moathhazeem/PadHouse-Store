import { ForecastingService } from './forecasting.service';

describe('ForecastingService', () => {
  const generatedRun = { id: 'run-1', generatedAt: new Date() };
  let prisma: any;
  let service: ForecastingService;

  beforeEach(() => {
    const product = {
      id: '00000000-0000-4000-8000-000000000001', sku: 'SKU-1', nameAr: 'منتج',
      categoryId: '00000000-0000-4000-8000-000000000002', category: { nameAr: 'تصنيف' },
      createdAt: new Date(Date.now() - 45 * 86_400_000), stock: 5, minStock: 2,
      variants: [{ inventory: { id: 'inventory-1', currentStock: 5, minThreshold: 2 } }],
    };
    const tx = {
      demandForecastRun: { create: jest.fn(async () => generatedRun) },
      demandForecast: { createMany: jest.fn(async () => ({ count: 1 })) },
      forecastProductResult: { createMany: jest.fn(async () => ({ count: 90 })) },
    };
    prisma = {
      product: { findMany: jest.fn(async () => [product]) },
      orderItem: { findMany: jest.fn(async () => []) },
      inventoryMovement: { findMany: jest.fn(async () => []) },
      $transaction: jest.fn(async (callback) => callback(tx)),
      demandForecastRun: { findMany: jest.fn(), findUnique: jest.fn() },
      forecastConfiguration: { findUnique: jest.fn(async () => null) },
    };
    service = new ForecastingService(prisma);
  });

  it('persists an explicit insufficient-data result without fabricated horizons', async () => {
    const result = await service.generate({ historyDays: 90 });
    expect(result.insufficientDataCount).toBe(1);
    expect(result.products[0].status).toBe('INSUFFICIENT_DATA');
    expect(result.products[0].horizons).toEqual([]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('forecasts eligible products from actual order lines and returns all requested horizons', async () => {
    prisma.orderItem.findMany
      .mockResolvedValueOnce(Array.from({ length: 8 }, (_, index) => ({
        productId: '00000000-0000-4000-8000-000000000001', quantity: 2,
        order: { createdAt: new Date(Date.now() - (30 - index * 3) * 86_400_000) },
      })))
      .mockResolvedValueOnce([]);
    const result = await service.generate({ historyDays: 90 });
    const product = result.products[0];
    expect(product.status).toBe('FORECASTED');
    expect(product.horizons.map((item: any) => item.days)).toEqual([7, 14, 30, 60, 90]);
    expect(product.dataQuality.stockAvailability).toBe('UNKNOWN');
    expect(product.dailyForecast).toHaveLength(90);
  });
});
