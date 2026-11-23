import { Prisma } from '@prisma/client';
import { ForecastingDashboardService } from './forecasting-dashboard.service';

describe('ForecastingDashboardService accuracy', () => {
  const makeService = (pending: any[] = [], evaluated: any[] = []) => {
    const prisma = {
      forecastProductResult: {
        findMany: jest.fn()
          .mockResolvedValueOnce(pending)
          .mockResolvedValueOnce(evaluated),
        update: jest.fn(),
      },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ForecastingDashboardService(prisma as any, {} as any, {} as any);
    return { service, prisma };
  };

  it('uses Prisma database-null filters and reports unavailable metrics without evaluated history', async () => {
    const { service, prisma } = makeService();

    const result = await service.accuracy({ limit: 20, offset: 0 } as any);

    expect(prisma.forecastProductResult.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ evaluationResults: { equals: Prisma.DbNull } }),
    }));
    expect(prisma.forecastProductResult.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ evaluationResults: { not: Prisma.DbNull } }),
    }));
    expect(result.products).toEqual({ data: [], total: 0, limit: 20, offset: 0 });
    expect(result.algorithms).toEqual([]);
  });

  it('keeps zero actual demand as a valid evaluation but leaves percentage accuracy unavailable', async () => {
    const row = {
      id: 'forecast-result-1',
      productId: 'product-1',
      algorithm: 'MOVING_AVERAGE',
      evaluationResults: { forecastedDemand: 3, actualDemand: 0 },
    };
    const { service } = makeService([], [
      row,
      { ...row, id: 'forecast-result-null', evaluationResults: { forecastedDemand: null, actualDemand: 0 } },
      { ...row, id: 'forecast-result-invalid', evaluationResults: { forecastedDemand: 'NaN', actualDemand: 1 } },
    ]);
    const prisma = (service as any).prisma;
    prisma.product.findMany.mockResolvedValue([{ id: 'product-1', sku: 'SKU-1', nameAr: 'Product' }]);

    const result = await service.accuracy({ limit: 20, offset: 0 } as any);

    expect(result.products.data[0]).toMatchObject({
      sampleCount: 1,
      mae: 3,
      rmse: 3,
      wape: null,
      accuracy: null,
      evaluatedPeriods: 1,
    });
  });
});
