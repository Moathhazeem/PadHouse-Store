import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForecastingQueryDto } from './dto/forecasting-query.dto';

const OPEN_STATUSES: PurchaseOrderStatus[] = [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIALLY_RECEIVED];

@Injectable()
export class ReplenishmentService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendations(query: ForecastingQueryDto) {
    const run = await this.prisma.demandForecastRun.findFirst({ orderBy: { generatedAt: 'desc' } });
    if (!run) return { data: [], total: 0, limit: query.limit, offset: query.offset };
    const config = await this.prisma.forecastConfiguration.findUnique({ where: { id: 'default' } });
    const forecasts = await this.prisma.demandForecast.findMany({
      where: { runId: run.id, ...(query.productId ? { productId: query.productId } : {}), ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.search ? { OR: [{ sku: { contains: query.search, mode: 'insensitive' } }, { productName: { contains: query.search, mode: 'insensitive' } }] } : {}) },
      orderBy: { sku: 'asc' },
    });
    const productIds = forecasts.map((row) => row.productId);
    const [products, purchaseItems, supplierHistory] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } }, include: { variants: { include: { inventory: true } } } }),
      this.prisma.purchaseOrderItem.findMany({ where: { productId: { in: productIds }, purchaseOrder: { status: { not: PurchaseOrderStatus.CANCELLED } } }, include: { purchaseOrder: { select: { supplierId: true, status: true } } } }),
      this.prisma.purchaseOrder.findMany({ where: { status: PurchaseOrderStatus.RECEIVED, receivedAt: { not: null } }, select: { supplierId: true, orderDate: true, receivedAt: true } }),
    ]);
    const suppliers = await this.prisma.supplier.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, leadTimeDays: true } });
    const productById = new Map(products.map((p) => [p.id, p]));
    const openByProduct = new Map<string, number>();
    const supplierScore = new Map<string, Map<string, number>>();
    for (const item of purchaseItems) {
      const scores = supplierScore.get(item.productId) ?? new Map<string, number>();
      scores.set(item.purchaseOrder.supplierId, (scores.get(item.purchaseOrder.supplierId) ?? 0) + 1);
      supplierScore.set(item.productId, scores);
      if (OPEN_STATUSES.includes(item.purchaseOrder.status)) openByProduct.set(item.productId, (openByProduct.get(item.productId) ?? 0) + Math.max(0, item.orderedQuantity - item.receivedQuantity));
    }

    const computed = await Promise.all(forecasts.map(async (forecast) => {
      const product = productById.get(forecast.productId);
      if (!product) return null;
      const details = this.daily(forecast.dailyForecast);
      const period = Math.min(config?.replenishmentPeriodDays ?? 30, details.length);
      const supplierId = this.bestSupplier(forecast.productId, supplierScore, suppliers);
      const supplier = suppliers.find((s) => s.id === supplierId);
      const observedLeadDays = supplier ? supplierHistory.filter((row) => row.supplierId === supplier.id && row.receivedAt)
        .map((row) => Math.max(0, (row.receivedAt!.getTime() - row.orderDate.getTime()) / 86400000)) : [];
      const leadDays = supplier?.leadTimeDays ?? (observedLeadDays.length ? mean(observedLeadDays) : config?.stockoutLeadDays ?? 14);
      const leadDemand = sum(details.slice(0, Math.min(Math.ceil(leadDays), details.length)));
      const forecastDemand = sum(details.slice(0, period));
      const avgDaily = details.length ? sum(details) / details.length : 0;
      const metrics = object(forecast.metrics);
      const cv = Number(metrics.coefficientOfVariation);
      const demandSd = Number.isFinite(cv) && cv >= 0 ? avgDaily * cv : null;
      const leadSd = observedLeadDays.length >= 2 ? stddev(observedLeadDays) : null;
      const enough = demandSd !== null && leadSd !== null && observedLeadDays.length >= 2;
      const z = config?.safetyStockZScore ?? 1.65;
      const calculatedSafety = enough ? Math.ceil(z * Math.sqrt(leadDays * demandSd! ** 2 + avgDaily ** 2 * leadSd! ** 2)) : 0;
      const existing = await this.prisma.replenishmentRecommendation.findUnique({ where: { productId: product.id }, select: { safetyStockOverride: true, quantityOverride: true } });
      const safety = existing?.safetyStockOverride ?? calculatedSafety;
      const reorderPoint = leadDemand + safety;
      const variantStock = product.variants.reduce((total, variant) => total + (variant.inventory?.currentStock ?? 0), 0);
      const stock = product.stock || variantStock;
      const incoming = openByProduct.get(product.id) ?? 0;
      const target = Math.max(0, Math.ceil(forecastDemand + safety - stock - incoming));
      const cap = Math.max(0, product.maxStock - stock - incoming);
      const recommended = existing?.quantityOverride ?? Math.min(target, cap);
      const stockoutDays = avgDaily > 0 ? stock / avgDaily : null;
      const qualityReason = object(forecast.metrics).reason;
      const limitations = [
        forecast.status !== 'FORECASTED' ? `Demand forecast is ${forecast.status}: ${qualityReason ?? 'insufficient sales history'}.` : null,
        !enough ? `Safety stock uncertainty: ${demandSd === null ? 'forecast demand variability is unavailable' : 'fewer than two completed supplier lead-time observations'}.` : null,
        !supplier ? 'No product-linked supplier history is available; configured stockout lead days used and no supplier is suggested.' : null,
      ].filter(Boolean);
      const limitation = limitations.length ? limitations.join(' ') : null;
      const reason = recommended === 0
        ? target > cap ? `Capped at maximum stock level (${product.maxStock}); ${incoming} units already incoming.` : `Available stock and open purchase orders cover forecast demand for ${period} days plus safety stock.`
        : `Forecast demand over ${period} days plus ${safety} safety-stock units exceeds available stock and ${incoming} incoming units${target > cap ? `; quantity capped to maximum stock level ${product.maxStock}` : ''}.`;
      const data = {
        runId: run.id, generatedAt: run.generatedAt, currentAvailableStock: stock, forecastedDemand: forecastDemand,
        leadTimeDemand: leadDemand, reorderPoint, safetyStock: safety, incomingQuantity: incoming,
        recommendedQuantity: recommended, supplierId: supplier?.id ?? null, supplierName: supplier?.name ?? null,
        estimatedStockoutAt: stockoutDays === null ? null : new Date(Date.now() + stockoutDays * 86400000),
        reason, limitation, calculation: { leadTimeDays: leadDays, demandVariabilityPerDay: demandSd, leadTimeVariabilityDays: leadSd, safetyStockMethod: config?.safetyStockMethod ?? 'SERVICE_LEVEL', safetyStockZScore: z, replenishmentPeriodDays: period, maxStock: product.maxStock, uncappedQuantity: target, forecastDaysAvailable: details.length },
      };
      await this.prisma.replenishmentRecommendation.upsert({ where: { productId: product.id }, create: { productId: product.id, ...data }, update: data });
      return { id: product.id, productId: product.id, sku: forecast.sku, productName: forecast.productName, currentAvailableStock: stock, currentStock: stock, forecastedDemand: forecastDemand, expectedDailyDemand: avgDaily, reorderPoint, safetyStock: safety, incomingQuantity: incoming, recommendedPurchaseQuantity: recommended, suggestedQuantity: recommended, suggestedSupplier: supplier?.name ?? null, supplierId: supplier?.id ?? null, estimatedStockoutDate: data.estimatedStockoutAt, riskDate: data.estimatedStockoutAt?.toISOString().slice(0, 10) ?? null, daysOfCover: stockoutDays, leadDays, reason, recommendationReason: reason, limitation, dataQualityStatus: forecast.status };
    }));
    const rows = computed.filter((row): row is NonNullable<typeof row> => row !== null && row.suggestedQuantity > 0);
    const dataQualityLimitations = computed.filter((row): row is NonNullable<typeof row> => row !== null && row.limitation !== null).map((row) => ({ productId: row.productId, sku: row.sku, productName: row.productName, limitation: row.limitation }));
    return { data: rows.slice(query.offset, query.offset + query.limit), total: rows.length, limit: query.limit, offset: query.offset, runId: run.id, dataQualityLimitations };
  }

  async override(productId: string, quantity: number, safetyStockOverride?: number) {
    if (!Number.isInteger(quantity) || quantity < 0) throw new BadRequestException('Quantity must be a non-negative integer.');
    const current = await this.prisma.replenishmentRecommendation.findUnique({ where: { productId } });
    if (!current) throw new NotFoundException('Replenishment recommendation not found.');
    return this.prisma.replenishmentRecommendation.update({ where: { productId }, data: { recommendedQuantity: quantity, quantityOverride: quantity, ...(safetyStockOverride === undefined ? {} : { safetyStockOverride, safetyStock: safetyStockOverride }), reason: `Administrator override: ${quantity} units recommended.` } });
  }

  private daily(value: unknown): number[] { return Array.isArray(value) ? value.map((day) => Math.max(0, Number(object(day).expectedUnits) || 0)) : []; }
  private bestSupplier(productId: string, scores: Map<string, Map<string, number>>, suppliers: Array<{ id: string; name: string; leadTimeDays: number | null }>) {
    const counts = scores.get(productId);
    if (!counts?.size) return null;
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).find((id) => suppliers.some((supplier) => supplier.id === id)) ?? null;
  }
}

function object(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function sum(values: number[]) { return values.reduce((total, value) => total + value, 0); }
function mean(values: number[]) { return sum(values) / values.length; }
function stddev(values: number[]) { const avg = mean(values); return Math.sqrt(mean(values.map((value) => (value - avg) ** 2))); }
