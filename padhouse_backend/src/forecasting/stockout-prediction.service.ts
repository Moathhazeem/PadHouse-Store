import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ForecastingQueryDto } from './dto/forecasting-query.dto';
import { predictStockout } from './stockout.util';

const DEFAULT_THRESHOLDS = { criticalDays: 2, highRiskDays: 7, mediumRiskDays: 14 };

@Injectable()
export class StockoutPredictionService {
  constructor(private readonly prisma: PrismaService) {}

  async predictions(query: ForecastingQueryDto) {
    const run = await this.prisma.demandForecastRun.findFirst({ orderBy: { generatedAt: 'desc' } });
    if (!run) return { data: [], total: 0, limit: query.limit, offset: query.offset };
    const config = await this.prisma.forecastConfiguration.findUnique({ where: { id: 'default' } });
    const where = { runId: run.id, ...(query.productId ? { productId: query.productId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search ? { OR: [{ sku: { contains: query.search, mode: 'insensitive' as const } }, { productName: { contains: query.search, mode: 'insensitive' as const } }] } : {}) };
    const forecasts = await this.prisma.demandForecast.findMany({ where, orderBy: { sku: 'asc' } });
    const ids = forecasts.map((row) => row.productId);
    const products = ids.length ? await this.prisma.product.findMany({ where: { id: { in: ids } }, include: {
      variants: { include: { inventory: true } },
      purchaseOrderItems: { where: { purchaseOrder: { status: { in: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'] } } },
        include: { purchaseOrder: { include: { supplier: true } } } },
    } }) : [];
    const productById = new Map(products.map((p) => [p.id, p]));
    const threshold = { criticalDays: config?.stockoutCriticalDays ?? DEFAULT_THRESHOLDS.criticalDays,
      highRiskDays: config?.stockoutHighRiskDays ?? DEFAULT_THRESHOLDS.highRiskDays,
      mediumRiskDays: config?.stockoutMediumRiskDays ?? DEFAULT_THRESHOLDS.mediumRiskDays };
    const data = forecasts.map((forecast) => {
      const product = productById.get(forecast.productId)!;
      const inventories = product.variants.flatMap((variant) => variant.inventory ? [variant.inventory] : []);
      const onHandStock = inventories.reduce((sum, row) => sum + row.currentStock, 0);
      // Orders consume stock at fulfillment in this system; no separate reservation ledger exists.
      const reservedStock = 0;
      const availableStock = onHandStock - reservedStock;
      const incoming = product.purchaseOrderItems.flatMap((line) => {
        const quantity = Math.max(0, line.orderedQuantity - line.receivedQuantity);
        if (!quantity) return [];
        const expectedAt = line.purchaseOrder.expectedAt ?? (line.purchaseOrder.supplier.leadTimeDays
          ? new Date(line.purchaseOrder.orderDate.getTime() + line.purchaseOrder.supplier.leadTimeDays * 86400000) : null);
        return expectedAt ? [{ quantity, expectedAt }] : [];
      });
      const metrics = asObject(forecast.metrics);
      const demand = forecast.status === 'FORECASTED' && Array.isArray(forecast.dailyForecast)
        ? (forecast.dailyForecast as Array<{ date: string; expectedUnits: number }>).map((point) => ({ date: point.date, expectedUnits: point.expectedUnits })) : [];
      const prediction = predictStockout({ availableStock, demand, incoming, generatedAt: forecast.generatedAt,
        confidence: typeof metrics.confidence === 'number' ? metrics.confidence : null, thresholds: threshold });
      return { productId: forecast.productId, productName: forecast.productName, sku: forecast.sku,
        currentOnHandStock: onHandStock, reservedStock, availableStock,
        expectedIncomingStock: incoming.reduce((sum, row) => sum + row.quantity, 0), incomingDeliveries: incoming,
        averageDailyDemand: prediction.averageDailyDemand, estimatedStockoutDate: prediction.estimatedStockoutDate,
        remainingDays: prediction.remainingDays, riskLevel: prediction.riskLevel, stockoutStatus: prediction.stockoutStatus,
        forecastConfidence: prediction.stockoutStatus === 'INSUFFICIENT_DATA' ? null : (typeof metrics.confidence === 'number' ? metrics.confidence : null),
        supplierLeadTimeDays: Math.max(0, ...product.purchaseOrderItems.map((line) => line.purchaseOrder.supplier.leadTimeDays ?? 0)),
        forecastStatus: forecast.status };
    }).filter((row) => row.stockoutStatus === 'CONFIRMED' || row.stockoutStatus === 'INSUFFICIENT_DATA'
      || row.stockoutStatus === 'BEYOND_FORECAST_HORIZON' || row.stockoutStatus === 'ESTIMATED');
    return { data: data.slice(query.offset, query.offset + query.limit), total: data.length,
      limit: query.limit, offset: query.offset, runId: run.id, generatedAt: run.generatedAt };
  }
}

function asObject(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
