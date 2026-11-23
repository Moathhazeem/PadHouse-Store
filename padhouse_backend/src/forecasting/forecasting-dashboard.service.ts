import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { CreatePurchaseOrderDto } from '../purchase-orders/dto/purchase-order.dto';
import { CreateBulkRecommendationPurchaseOrderDto, CreateRecommendationPurchaseOrderDto, ForecastConfigurationDto, ForecastingQueryDto } from './dto/forecasting-query.dto';
import { ReplenishmentService } from './replenishment.service';
import { errorMetrics } from './forecasting.util';

const MODEL_VERSION = 'demand-v1';
const DEFAULT_CONFIG = { id: 'default', historyDays: 730, movingAverageWindows: [7, 14, 30], defaultHorizonDays: 30, stockoutLeadDays: 14, overstockCoverDays: 90, stockoutCriticalDays: 2, stockoutHighRiskDays: 7, stockoutMediumRiskDays: 14, safetyStockMethod: 'SERVICE_LEVEL', safetyStockZScore: 1.65, replenishmentPeriodDays: 30, scheduledForecastingEnabled: false, scheduledForecastingTime: '02:00', lastScheduledForecastAt: null, alertStockoutDays: 7, alertAccuracyWapeThreshold: 0.35, alertOverstockDays: 120 };

@Injectable()
export class ForecastingDashboardService {
  private readonly logger = new Logger(ForecastingDashboardService.name);
  constructor(private readonly prisma: PrismaService, private readonly purchaseOrders: PurchaseOrdersService, private readonly replenishment: ReplenishmentService) {}

  async configuration() {
    return (await this.prisma.forecastConfiguration.findUnique({ where: { id: 'default' } })) ?? DEFAULT_CONFIG;
  }

  async updateConfiguration(dto: ForecastConfigurationDto, actorId: string) {
    if (dto.movingAverageWindows && (!dto.movingAverageWindows.length || dto.movingAverageWindows.some((n) => ![7, 14, 30].includes(n)))) throw new BadRequestException('movingAverageWindows must contain values from 7, 14, and 30.');
    const thresholds = { ...DEFAULT_CONFIG, ...await this.configuration(), ...dto };
    if (!(thresholds.stockoutCriticalDays < thresholds.stockoutHighRiskDays && thresholds.stockoutHighRiskDays < thresholds.stockoutMediumRiskDays)) throw new BadRequestException('Stockout thresholds must increase: critical < high risk < medium risk.');
    return this.prisma.forecastConfiguration.upsert({ where: { id: 'default' }, create: { ...DEFAULT_CONFIG, ...dto, updatedById: actorId }, update: { ...dto, updatedById: actorId } });
  }

  async overview() {
    const [run, config] = await Promise.all([this.latestRun(), this.configuration()]);
    if (!run) return { latestRun: null, generatedAt: null, productCount: 0, forecastedCount: 0, insufficientDataCount: 0, stockoutRiskCount: 0, overstockCount: 0, dataQuality: 'NO_FORECAST', configuration: config };
    const rows = await this.rowsForRun(run.id); const risks = await this.recommendationRows({ limit: 100, offset: 0 } as ForecastingQueryDto);
    return { latestRun: { id: run.id, generatedAt: run.generatedAt, historyDays: run.historyDays }, productCount: run.productCount,
      forecastedCount: rows.filter((r) => r.status === 'FORECASTED').length, insufficientDataCount: rows.filter((r) => r.status !== 'FORECASTED').length,
      stockoutRiskCount: risks.filter((r) => r.daysOfCover !== null && r.daysOfCover <= config.stockoutLeadDays).length,
      overstockCount: risks.filter((r) => r.daysOfCover !== null && r.daysOfCover > config.overstockCoverDays).length,
      dataQuality: 'ESTIMATED_FROM_ORDER_HISTORY', configuration: config };
  }
  async demand(query: ForecastingQueryDto) { return this.listForecasts(query); }
  async stockoutPredictions(query: ForecastingQueryDto) { return paginate((await this.recommendationRows(query)).filter((r) => r.daysOfCover !== null && r.daysOfCover <= r.leadDays), query); }
  async recommendations(query: ForecastingQueryDto) { return this.replenishment.recommendations(query); }
  async overstock(query: ForecastingQueryDto) {
    const config = await this.configuration();
    const base = (await this.recommendationRows(query)).filter((r) => r.daysOfCover !== null && r.daysOfCover > config.overstockCoverDays);
    if (!base.length) return paginate([], query);
    const ids = base.map((row) => row.productId);
    const [products, incomingItems, sales] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true, minStock: true, maxStock: true, basePrice: true, variants: { select: { inventory: { select: { currentStock: true, costPrice: true } } } } } }),
      this.prisma.purchaseOrderItem.findMany({ where: { productId: { in: ids }, purchaseOrder: { status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED'] } } }, select: { productId: true, orderedQuantity: true, receivedQuantity: true } }),
      this.prisma.orderItem.findMany({ where: { productId: { in: ids }, order: { createdAt: { gte: new Date(Date.now() - 90 * 86400000) } } }, select: { productId: true, quantity: true } }),
    ]);
    const productsById = new Map(products.map((product) => [product.id, product]));
    return paginate(base.map((row) => {
      const product = productsById.get(row.productId)!;
      const currentInventory = product.stock || product.variants.reduce((sum, variant) => sum + (variant.inventory?.currentStock ?? 0), 0);
      const incoming = incomingItems.filter((item) => item.productId === row.productId).reduce((sum, item) => sum + Math.max(0, item.orderedQuantity - item.receivedQuantity), 0);
      const historicalSales90Days = sales.filter((item) => item.productId === row.productId).reduce((sum, item) => sum + item.quantity, 0);
      const excessQuantity = Math.max(0, currentInventory - Math.max(product.maxStock, Math.ceil(row.expectedDailyDemand * config.overstockCoverDays)));
      const unitCost = product.variants.map((variant) => Number(variant.inventory?.costPrice)).find((cost) => Number.isFinite(cost) && cost > 0) ?? Number(product.basePrice);
      return { ...row, currentInventory, forecastedDemand: Math.round(row.expectedDailyDemand * config.overstockCoverDays), inventoryCoverageDays: row.daysOfCover, historicalSales90Days, productMovement: historicalSales90Days === 0 ? 'NO_MOVEMENT' : historicalSales90Days < 5 ? 'SLOW_MOVING' : 'MOVING', minStock: product.minStock, maxStock: product.maxStock, pendingPurchaseOrderQuantity: incoming, excessInventoryQuantity: excessQuantity, estimatedExcessInventoryValue: Math.round(excessQuantity * unitCost * 100) / 100, classification: excessQuantity > 0 ? 'OVERSTOCKED' : historicalSales90Days < 5 ? 'SLOW_MOVING' : 'HIGH_COVERAGE', suggestedActions: ['Reduce future purchase quantities', 'Delay replenishment', 'Create promotional campaigns', 'Offer product bundles', 'Review product pricing'], automationAllowed: false };
    }), query);
  }

  async trends(query: ForecastingQueryDto) {
    const from = new Date(Date.now() - 730 * 86_400_000);
    const products = await this.prisma.product.findMany({ where: { isActive: true, ...(query.productId ? { id: query.productId } : {}), ...(query.categoryId ? { categoryId: query.categoryId } : {}) }, select: { id: true, sku: true, nameAr: true, categoryId: true, createdAt: true, category: { select: { nameAr: true } } } });
    const ids = products.map((p) => p.id);
    const items = ids.length ? await this.prisma.orderItem.findMany({ where: { productId: { in: ids }, order: { createdAt: { gte: from, lte: new Date() }, status: { not: 'CANCELLED' }, paymentStatus: { not: 'REFUNDED' }, OR: [{ status: 'DELIVERED' }, { paymentStatus: 'PAID' }] } }, select: { productId: true, quantity: true, order: { select: { createdAt: true } } } }) : [];
    const grouped = new Map<string, Map<string, number>>();
    for (const item of items) { const day = item.order.createdAt.toISOString().slice(0, 10); const series = grouped.get(item.productId) ?? new Map<string, number>(); series.set(day, (series.get(day) ?? 0) + item.quantity); grouped.set(item.productId, series); }
    const daily = new Map<string, number>(); const weekly = new Map<string, number>(); const monthly = new Map<string, number>();
    const productRows = products.map((product) => {
      const sales = grouped.get(product.id) ?? new Map<string, number>(); let units = 0;
      for (const [date, quantity] of sales) { units += quantity; daily.set(date, (daily.get(date) ?? 0) + quantity); const d = new Date(`${date}T00:00:00Z`); const week = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(0, 10); weekly.set(week, (weekly.get(week) ?? 0) + quantity); const month = date.slice(0, 7); monthly.set(month, (monthly.get(month) ?? 0) + quantity); }
      const ageDays = Math.max(1, Math.floor((Date.now() - Math.max(from.getTime(), product.createdAt.getTime())) / 86_400_000));
      const dateKeys = [...sales.keys()].sort(); const recent = dateKeys.filter((d) => Date.now() - new Date(`${d}T00:00:00Z`).getTime() <= 28 * 86_400_000).reduce((s, d) => s + sales.get(d)!, 0); const previous = dateKeys.filter((d) => { const age = Date.now() - new Date(`${d}T00:00:00Z`).getTime(); return age > 28 * 86_400_000 && age <= 56 * 86_400_000; }).reduce((s, d) => s + sales.get(d)!, 0);
      const intermittent = sales.size > 0 && sales.size / ageDays < 0.1;
      return { productId: product.id, sku: product.sku, productName: product.nameAr, categoryId: product.categoryId, categoryName: product.category.nameAr, salesUnits: units, saleDays: sales.size, demandType: units === 0 ? 'NO_HISTORY' : intermittent ? 'INTERMITTENT' : 'REGULAR', trend: ageDays < 56 ? 'INSUFFICIENT_HISTORY' : recent > previous * 1.1 ? 'INCREASING' : recent < previous * 0.9 ? 'DECLINING' : 'STABLE', seasonalDemand: ageDays >= 730 ? this.seasonalLabel(sales) : 'INSUFFICIENT_HISTORY', dataQuality: { historyDays: ageDays, stockAvailability: 'UNKNOWN', confidence: ageDays >= 56 && !intermittent ? 'MEDIUM' : 'LOW', caveats: ['Historical inventory snapshots are unavailable; stockouts may censor demand.', 'Only paid or delivered non-cancelled orders are counted; partial returns are not available.'] } };
    });
    for (let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())); cursor <= new Date(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10); daily.set(date, daily.get(date) ?? 0);
      const monday = new Date(cursor); monday.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7)); const week = monday.toISOString().slice(0, 10); weekly.set(week, weekly.get(week) ?? 0);
      const month = date.slice(0, 7); monthly.set(month, monthly.get(month) ?? 0);
    }
    const categories = new Map<string, { name: string; units: number }>();
    for (const row of productRows) { const c = categories.get(row.categoryId) ?? { name: row.categoryName, units: 0 }; c.units += row.salesUnits; categories.set(row.categoryId, c); }
    return { period: { from, to: new Date() }, daily: seriesRows(daily), weekly: seriesRows(weekly), monthly: seriesRows(monthly), seasonalClaimsRequireDays: 730, categories: [...categories].map(([categoryId, v]) => ({ categoryId, categoryName: v.name, salesUnits: v.units })), products: paginate(productRows, query) };
  }

  async accuracy(query: ForecastingQueryDto) {
    const completed = await this.evaluateCompleted();
    const rows = await this.prisma.forecastProductResult.findMany({ where: { ...(query.productId ? { productId: query.productId } : {}), ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {}), evaluationResults: { not: null } }, orderBy: { forecastDate: 'desc' } });
    const byProduct = new Map<string, any[]>(); const byAlgorithm = new Map<string, any[]>();
    for (const row of rows) { const result = asObject(row.evaluationResults); const p = byProduct.get(row.productId) ?? []; p.push(result); byProduct.set(row.productId, p); const a = byAlgorithm.get(row.algorithm) ?? []; a.push(result); byAlgorithm.set(row.algorithm, a); }
    const summarize = (items: any[]) => { const valid = items.filter((x) => Number.isFinite(Number(x.forecastedDemand)) && Number.isFinite(Number(x.actualDemand))); return { ...errorMetrics(valid.map((x) => Number(x.forecastedDemand)), valid.map((x) => Number(x.actualDemand))), evaluatedPeriods: valid.length }; };
    const products = await this.prisma.product.findMany({ where: { id: { in: [...byProduct.keys()] } }, select: { id: true, sku: true, nameAr: true } });
    return { evaluatedNow: completed, products: paginate(products.map((p) => ({ productId: p.id, sku: p.sku, productName: p.nameAr, ...summarize(byProduct.get(p.id) ?? []) })), query), algorithms: [...byAlgorithm].map(([algorithm, values]) => ({ algorithm, ...summarize(values) })), note: 'Accuracy is shown only for completed, actually evaluated forecast periods.' };
  }

  async evaluateCompleted() {
    const today = new Date(); const cutoff = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const pending = await this.prisma.forecastProductResult.findMany({ where: { forecastDate: { lt: cutoff }, evaluationResults: null }, select: { id: true, productId: true, forecastDate: true, forecastedQuantity: true } });
    let evaluated = 0;
    for (const row of pending) {
      const start = new Date(row.forecastDate); const end = new Date(start.getTime() + 86_400_000);
      const actuals = await this.prisma.orderItem.findMany({ where: { productId: row.productId, order: { createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' }, paymentStatus: { not: 'REFUNDED' }, OR: [{ status: 'DELIVERED' }, { paymentStatus: 'PAID' }] } }, select: { quantity: true } });
      const actualDemand = actuals.reduce((sum, item) => sum + item.quantity, 0); const forecastedDemand = Number(row.forecastedQuantity);
      await this.prisma.forecastProductResult.update({ where: { id: row.id }, data: { evaluationResults: { forecastedDemand, actualDemand, forecastError: round(forecastedDemand - actualDemand), absoluteError: round(Math.abs(forecastedDemand - actualDemand)), evaluatedAt: new Date(), source: 'PAID_OR_DELIVERED_NON_CANCELLED_ORDERS' } } }); evaluated += 1;
    }
    return evaluated;
  }

  private seasonalLabel(sales: Map<string, number>) {
    const monthly = Array(12).fill(0); const counts = Array(12).fill(0);
    for (const [date, quantity] of sales) { const d = new Date(`${date}T00:00:00Z`); monthly[d.getUTCMonth()] += quantity; counts[d.getUTCMonth()] += 1; }
    const means = monthly.map((sum, i) => counts[i] ? sum / counts[i] : 0); const active = means.filter((v) => v > 0); if (active.length < 3) return 'INSUFFICIENT_SEASONAL_SIGNAL';
    const avg = active.reduce((a, b) => a + b, 0) / active.length; const peak = Math.max(...active); return peak >= avg * 1.5 ? 'RECURRING_MONTHLY_PATTERN' : 'NO_CLEAR_SEASONAL_PATTERN';
  }

  async product(productId: string) {
    const rows = await this.prisma.demandForecast.findMany({ where: { productId }, orderBy: { generatedAt: 'desc' }, take: 10 });
    if (!rows.length) throw new NotFoundException('No forecast found for product.');
    return { productId, data: rows.map((r) => ({ generatedAt: r.generatedAt, status: r.status, algorithm: r.selectedModel, metrics: r.metrics, horizons: r.horizons, dailyForecast: r.dailyForecast, dataQuality: r.dataQuality })) };
  }

  async createPurchaseOrder(productId: string, dto: CreateRecommendationPurchaseOrderDto, actor: { id: string; fullName: string }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } }); if (!product) throw new NotFoundException('Product not found.');
    const recommendation = (await this.replenishment.recommendations({ productId, limit: 1, offset: 0 } as ForecastingQueryDto)).data[0];
    if (!recommendation || recommendation.suggestedQuantity < 1) throw new BadRequestException('This product has no active replenishment recommendation.');
    const payload: CreatePurchaseOrderDto = { supplierId: dto.supplierId, notes: 'Forecast recommendation for ' + product.sku, items: [{ productId, orderedQuantity: recommendation.suggestedQuantity, unitCost: dto.unitCost }] };
    const purchaseOrder = await this.purchaseOrders.create(payload, actor);
    this.logger.log('Created draft PO ' + purchaseOrder.orderNumber + ' from forecast recommendation for ' + product.sku);
    return { recommendation: { productId, suggestedQuantity: recommendation.suggestedQuantity }, purchaseOrder };
  }

  async createPurchaseOrders(dto: CreateBulkRecommendationPurchaseOrderDto, actor: { id: string; fullName: string }) {
    if (dto.confirmed !== true) throw new BadRequestException('Administrator confirmation is required to create draft purchase orders.');
    const ids = [...new Set(dto.productIds)];
    if (ids.length !== dto.productIds.length) throw new BadRequestException('Duplicate product recommendations are not allowed.');
    const recommendations = await this.replenishment.recommendations({ limit: 100, offset: 0 } as ForecastingQueryDto);
    const selected = recommendations.data.filter((row) => ids.includes(row.productId));
    if (selected.length !== ids.length) throw new BadRequestException('One or more selected replenishment recommendations are no longer active.');
    const supplierIds = [...new Set(selected.map((row) => row.supplierId).filter(Boolean))] as string[];
    if (supplierIds.length !== selected.length) throw new BadRequestException('Every selected recommendation must have an active supplier.');
    const existing = await this.prisma.purchaseOrder.findMany({ where: { status: { not: 'CANCELLED' }, notes: { contains: '[forecast-recommendations:' } }, select: { notes: true } });
    const linked = new Set(existing.flatMap((order) => [...(order.notes ?? '').matchAll(/forecast-recommendations:([^\]]+)/g)].flatMap((match) => match[1].split(','))));
    if (ids.some((id) => linked.has(id))) throw new BadRequestException('A purchase order already exists for one or more selected recommendations.');
    const products = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, sku: true, variants: { select: { inventory: { select: { costPrice: true } } } } } });
    const byId = new Map(products.map((product) => [product.id, product]));
    const groups = new Map<string, typeof selected>();
    for (const row of selected) groups.set(row.supplierId!, [...(groups.get(row.supplierId!) ?? []), row]);
    const purchaseOrders = [];
    for (const [supplierId, rows] of groups) {
      const productIds = rows.map((row) => row.productId);
      const notes = `Forecast recommendations [forecast-recommendations:${productIds.join(',')}]`;
      const purchaseOrder = await this.purchaseOrders.create({
        supplierId, notes,
        items: rows.map((row) => {
          const costs = byId.get(row.productId)?.variants.map((variant) => Number(variant.inventory?.costPrice)).filter((cost) => Number.isFinite(cost) && cost >= 0) ?? [];
          return { productId: row.productId, orderedQuantity: row.suggestedQuantity, unitCost: costs[0] ?? 0 };
        }),
      }, actor);
      purchaseOrders.push(purchaseOrder);
    }
    return { purchaseOrders, recommendationProductIds: ids };
  }

  private latestRun() { return this.prisma.demandForecastRun.findFirst({ orderBy: { generatedAt: 'desc' } }); }
  private rowsForRun(runId: string) { return this.prisma.demandForecast.findMany({ where: { runId }, orderBy: { sku: 'asc' } }); }
  private async listForecasts(query: ForecastingQueryDto) {
    const run = await this.latestRun(); if (!run) return { data: [], total: 0, limit: query.limit, offset: query.offset };
    const where = { runId: run.id, ...(query.productId ? { productId: query.productId } : {}), ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.search ? { OR: [{ sku: { contains: query.search, mode: 'insensitive' as const } }, { productName: { contains: query.search, mode: 'insensitive' as const } }] } : {}) };
    const [total, data] = await Promise.all([this.prisma.demandForecast.count({ where }), this.prisma.demandForecast.findMany({ where, orderBy: { sku: 'asc' }, skip: query.offset, take: query.limit })]);
    return { data, total, limit: query.limit, offset: query.offset, runId: run.id, generatedAt: run.generatedAt };
  }

  private async recommendationRows(query: ForecastingQueryDto) {
    const run = await this.latestRun(); if (!run) return [];
    const config = await this.configuration();
    const forecasts = await this.prisma.demandForecast.findMany({ where: { runId: run.id, status: 'FORECASTED', ...(query.productId ? { productId: query.productId } : {}), ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.search ? { OR: [{ sku: { contains: query.search, mode: 'insensitive' } }, { productName: { contains: query.search, mode: 'insensitive' } }] } : {}) }, orderBy: { sku: 'asc' } });
    const products = forecasts.length ? await this.prisma.product.findMany({ where: { id: { in: forecasts.map((f) => f.productId) } }, select: { id: true, stock: true, variants: { select: { inventory: { select: { currentStock: true } } } } } }) : [];
    const stockMap = new Map(products.map((p) => [p.id, p.stock || p.variants.reduce((sum, v) => sum + (v.inventory?.currentStock ?? 0), 0)]));
    return forecasts.map((f) => { const m = asObject(f.metrics); const demand = Number(m.expectedDailyDemand ?? 0); const stock = stockMap.get(f.productId) ?? 0; const cover = demand > 0 ? stock / demand : null;
      return { id: f.productId, productId: f.productId, sku: f.sku, productName: f.productName, currentStock: stock, expectedDailyDemand: demand,
        daysOfCover: cover === null ? null : Math.round(cover * 10) / 10, leadDays: config.stockoutLeadDays,
        riskDate: cover === null ? null : new Date(Date.now() + cover * 86400000).toISOString().slice(0, 10),
        suggestedQuantity: Math.max(0, Math.ceil(demand * config.overstockCoverDays) - stock), modelVersion: MODEL_VERSION, dataQualityStatus: 'ESTIMATED_FROM_ORDER_HISTORY' };
    });
  }
}
function paginate<T>(items: T[], query: ForecastingQueryDto) { return { data: items.slice(query.offset, query.offset + query.limit), total: items.length, limit: query.limit, offset: query.offset }; }
function asObject(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function seriesRows(series: Map<string, number>) { return [...series].sort(([a], [b]) => a.localeCompare(b)).map(([period, units]) => ({ period, units })); }
function round(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
