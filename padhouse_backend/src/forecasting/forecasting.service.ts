import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForecastRunsQueryDto, GenerateForecastDto } from './dto/generate-forecast.dto';
import { ForecastModel, forecastWithModel, round, selectModel } from './forecasting.util';

const HORIZONS = [7, 14, 30, 60, 90] as const;
const MIN_HISTORY_DAYS = 28;
const MIN_SALE_DAYS = 5;

interface ProductInput {
  id: string;
  sku: string;
  nameAr: string;
  categoryId: string;
  category: { nameAr: string };
  createdAt: Date;
  stock: number;
  minStock: number;
  variants: Array<{ inventory: { id: string; currentStock: number; minThreshold: number } | null }>;
}

@Injectable()
export class ForecastingService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: Partial<GenerateForecastDto> = {}) {
    const savedConfig = await this.prisma.forecastConfiguration.findUnique({ where: { id: 'default' } });
    const historyDays = dto.historyDays ?? savedConfig?.historyDays ?? 730;
    const windows = dto.movingAverageWindows ?? savedConfig?.movingAverageWindows ?? [7, 14, 30];
    if (windows.length === 0 || windows.some((window) => ![7, 14, 30].includes(window))) {
      throw new BadRequestException('Moving-average windows must be selected from 7, 14, and 30 days.');
    }
    const generatedAt = new Date();
    const historyStart = new Date(generatedAt.getTime() - historyDays * 86_400_000);
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.productIds?.length ? { id: { in: dto.productIds } } : {}),
      },
      include: {
        category: { select: { nameAr: true } },
        variants: { include: { inventory: { select: { id: true, currentStock: true, minThreshold: true } } } },
      },
      orderBy: { sku: 'asc' },
    });

    const productIds = products.map((product) => product.id);
    const saleLines = productIds.length ? await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          createdAt: { gte: historyStart, lte: generatedAt },
          status: { not: 'CANCELLED' },
          paymentStatus: { not: 'REFUNDED' },
          OR: [{ status: 'DELIVERED' }, { paymentStatus: 'PAID' }],
        },
      },
      select: { productId: true, quantity: true, order: { select: { createdAt: true } } },
    }) : [];
    const refundedLines = productIds.length ? await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: { createdAt: { gte: historyStart, lte: generatedAt }, paymentStatus: 'REFUNDED' },
      },
      select: { productId: true, quantity: true },
    }) : [];

    const stockMovementRows = productIds.length ? await this.prisma.inventoryMovement.findMany({
      where: { inventory: { variant: { productId: { in: productIds } } }, createdAt: { gte: historyStart } },
      select: { inventoryId: true, createdAt: true },
    }) : [];
    const movementsByProduct = new Map<string, Array<{ inventoryId: string; createdAt: Date }>>();
    const inventoryOwner = new Map<string, string>();
    for (const product of products) for (const variant of product.variants) {
      if (variant.inventory) inventoryOwner.set(variant.inventory.id, product.id);
    }
    for (const movement of stockMovementRows) {
      const productId = inventoryOwner.get(movement.inventoryId);
      if (!productId) continue;
      const rows = movementsByProduct.get(productId) ?? [];
      rows.push(movement);
      movementsByProduct.set(productId, rows);
    }

    const salesByProductDay = new Map<string, Map<string, number>>();
    const soldDates = new Map<string, Set<string>>();
    for (const line of saleLines) {
      const key = utcDay(line.order.createdAt);
      const daily = salesByProductDay.get(line.productId) ?? new Map<string, number>();
      daily.set(key, (daily.get(key) ?? 0) + line.quantity);
      salesByProductDay.set(line.productId, daily);
      const dates = soldDates.get(line.productId) ?? new Set<string>();
      dates.add(key);
      soldDates.set(line.productId, dates);
    }
    const returnedProxy = new Map<string, number>();
    for (const line of refundedLines) returnedProxy.set(line.productId, (returnedProxy.get(line.productId) ?? 0) + line.quantity);

    const records = products.map((product) => this.forecastProduct(
      product,
      generatedAt,
      eachUtcDay(new Date(Math.max(historyStart.getTime(), product.createdAt.getTime())), generatedAt),
      salesByProductDay.get(product.id) ?? new Map(),
      soldDates.get(product.id)?.size ?? 0,
      returnedProxy.get(product.id) ?? 0,
      movementsByProduct.get(product.id) ?? [],
      windows as Array<7 | 14 | 30>,
    ));

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.demandForecastRun.create({
        data: {
          generatedAt,
          historyStart,
          historyDays,
          productCount: products.length,
          movingAverageWindows: windows,
        },
      });
      if (records.length) {
        await tx.demandForecast.createMany({
          data: records.map((record) => ({ ...record, runId: created.id })),
        });
      }
        const horizonRows = records.flatMap((record) => {
          const metrics = record.metrics as Record<string, any>;
          const days = Array.isArray(record.dailyForecast) ? record.dailyForecast as Array<{ date: string; expectedUnits: number; lower: number; upper: number }> : [];
          return days.map((day, index) => ({
            runId: created.id, productId: record.productId, forecastDate: new Date(day.date + 'T00:00:00.000Z'), horizonDays: index + 1,
            forecastedQuantity: day.expectedUnits, lowerBound: day.lower, upperBound: day.upper,
            algorithm: record.selectedModel ?? 'UNAVAILABLE', confidence: Number(metrics.confidence ?? 0),
            dataQualityStatus: record.status, modelVersion: 'demand-v1',
            evaluationResults: { walkForwardMae: metrics.walkForwardMae ?? null, walkForwardRmse: metrics.walkForwardRmse ?? null },
          }));
        });
        if (horizonRows.length) await tx.forecastProductResult.createMany({ data: horizonRows });
      return created;
    });
    return {
      runId: run.id,
      generatedAt,
      historyStart,
      historyDays,
      productCount: records.length,
      forecastedCount: records.filter((row) => row.status === 'FORECASTED').length,
      insufficientDataCount: records.filter((row) => row.status === 'INSUFFICIENT_DATA').length,
      products: records,
    };
  }

  async listRuns(dto: Partial<ForecastRunsQueryDto> = {}) {
    return this.prisma.demandForecastRun.findMany({
      orderBy: { generatedAt: 'desc' }, take: dto.limit ?? 20,
      include: { _count: { select: { forecasts: true } } },
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.demandForecastRun.findUnique({
      where: { id }, include: { forecasts: { orderBy: { sku: 'asc' } } },
    });
    if (!run) throw new NotFoundException('Forecast run not found.');
    return run;
  }

  private forecastProduct(
    product: ProductInput,
    generatedAt: Date,
    dates: string[],
    dailySales: Map<string, number>,
    saleDayCount: number,
    refundedUnitsProxy: number,
    movements: Array<{ inventoryId: string; createdAt: Date }>,
    windows: Array<7 | 14 | 30>,
  ) {
    const series = dates.map((date) => dailySales.get(date) ?? 0);
    const trainingDays = series.length;
    const salesUnits = series.reduce((sum, value) => sum + value, 0);
    const inventoryRows = product.variants.flatMap((variant) => variant.inventory ? [variant.inventory] : []);
    const currentStock = inventoryRows.reduce((sum, row) => sum + row.currentStock, 0);
    const status = trainingDays >= MIN_HISTORY_DAYS && saleDayCount >= MIN_SALE_DAYS
      ? 'FORECASTED' : 'INSUFFICIENT_DATA';
    const dataQuality = {
      saleDays: saleDayCount,
      minimumSaleDays: MIN_SALE_DAYS,
      minimumHistoryDays: MIN_HISTORY_DAYS,
      stockAvailability: 'UNKNOWN',
      stockMovementCount: movements.length,
      lastStockMovementAt: movements.length ? movements.reduce((latest, item) => item.createdAt > latest ? item.createdAt : latest, movements[0].createdAt) : null,
      returnQuantities: 'ORDER_LEVEL_REFUND_PROXY_ONLY',
      currentStock,
      minStock: product.minStock,
      variantInventoryRows: inventoryRows.length,
      caveats: [
        'Historical stock-on-hand snapshots are not stored; sales may be censored during stockouts.',
        refundedUnitsProxy > 0 ? 'Refunded order-line quantity is only a proxy; partial returned quantities are not recorded.' : 'Partial returned quantities are not recorded.',
      ],
    };
    if (status === 'INSUFFICIENT_DATA') {
      const reason = trainingDays < MIN_HISTORY_DAYS
        ? `Only ${trainingDays} days of product history are available; at least ${MIN_HISTORY_DAYS} are required.`
        : `Only ${saleDayCount} distinct sale days are available; at least ${MIN_SALE_DAYS} are required.`;
      return {
        productId: product.id, sku: product.sku, productName: product.nameAr,
        categoryId: product.categoryId, categoryName: product.category.nameAr,
        generatedAt, status, selectedModel: null, trainingDays, salesUnits,
        refundedUnitsProxy, metrics: { reason }, horizons: [], dailyForecast: [], dataQuality,
      };
    }

    const startDate = new Date(`${dates[0]}T00:00:00.000Z`);
    const selected = selectModel(series, startDate, windows);
    const daily = forecastWithModel(selected.model, series, 90, generatedAt);
    const residualSd = Math.max(selected.rmse, 0.25);
    const baseDaily = daily.length ? daily.reduce((sum, value) => sum + value, 0) / daily.length : 0;
    const trend = series.length >= 28 ? trendLabel(series) : 'INSUFFICIENT_HISTORY';
    const coefficientOfVariation = variability(series);
    const horizons = HORIZONS.map((days) => {
      const expectedUnits = daily.slice(0, days).reduce((sum, value) => sum + value, 0);
      const radius = 1.96 * residualSd * Math.sqrt(days);
      return {
        days,
        expectedUnits: round(expectedUnits),
        expectedDailyDemand: round(expectedUnits / days),
        expectedWeeklyDemand: round((expectedUnits / days) * 7),
        expectedMonthlyDemand: round((expectedUnits / days) * 30),
        predictionInterval: { lower: round(Math.max(0, expectedUnits - radius)), upper: round(expectedUnits + radius), level: 0.95 },
      };
    });
    const intervalWidth = horizons[0].predictionInterval.upper - horizons[0].predictionInterval.lower;
    const confidence = round(Math.max(0, Math.min(1, 1 - intervalWidth / Math.max(horizons[0].expectedUnits * 2, 1))), 3);
    return {
      productId: product.id, sku: product.sku, productName: product.nameAr,
      categoryId: product.categoryId, categoryName: product.category.nameAr,
      generatedAt, status, selectedModel: selected.model, trainingDays, salesUnits,
      refundedUnitsProxy,
      metrics: {
        expectedDailyDemand: round(baseDaily), expectedWeeklyDemand: round(baseDaily * 7),
        expectedMonthlyDemand: round(baseDaily * 30), trend, confidence,
        predictionIntervalLevel: 0.95, walkForwardMae: round(selected.mae), walkForwardRmse: round(selected.rmse),
        candidates: selected.candidates, demandVariability: round(coefficientOfVariation),
        weeklySeasonalityEligible: trainingDays >= 56,
        monthlySeasonalityEligible: trainingDays >= 730,
      },
      horizons,
      dailyForecast: daily.map((expectedUnits, index) => ({
        date: addUtcDays(generatedAt, index + 1), expectedUnits: round(expectedUnits),
        lower: round(Math.max(0, expectedUnits - 1.96 * residualSd)),
        upper: round(expectedUnits + 1.96 * residualSd),
      })),
      dataQuality,
    };
  }
}

function utcDay(date: Date) { return date.toISOString().slice(0, 10); }
function eachUtcDay(from: Date, to: Date) {
  const days: string[] = [];
  const current = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  while (current.getTime() <= end) { days.push(utcDay(current)); current.setUTCDate(current.getUTCDate() + 1); }
  return days;
}
function addUtcDays(date: Date, days: number) {
  const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return utcDay(next);
}
function trendLabel(series: number[]) {
  const recent = series.slice(-14).reduce((sum, value) => sum + value, 0) / 14;
  const prior = series.slice(-28, -14).reduce((sum, value) => sum + value, 0) / 14;
  if (recent > prior * 1.1) return 'UP';
  if (recent < prior * 0.9) return 'DOWN';
  return 'STABLE';
}
function variability(series: number[]) {
  const avg = series.reduce((sum, value) => sum + value, 0) / (series.length || 1);
  if (!avg) return 0;
  const variance = series.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (series.length || 1);
  return Math.sqrt(variance) / avg;
}
