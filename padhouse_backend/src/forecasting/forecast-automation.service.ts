import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForecastingService } from './forecasting.service';
import { ForecastingDashboardService } from './forecasting-dashboard.service';
import { StockoutPredictionService } from './stockout-prediction.service';
import { ReplenishmentService } from './replenishment.service';
import { Prisma } from '@prisma/client';

/** Durable schedule state lives in ForecastConfiguration; the timer only wakes to check it. */
@Injectable()
export class ForecastAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ForecastAutomationService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly forecasts: ForecastingService,
    private readonly dashboard: ForecastingDashboardService,
    private readonly stockouts: StockoutPredictionService,
    private readonly replenishment: ReplenishmentService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 60_000);
    this.timer.unref?.();
    void this.tick();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async tick(now = new Date()) {
    const config = await this.prisma.forecastConfiguration.findUnique({ where: { id: 'default' } });
    if (!config) return;
    if (config.scheduledForecastingEnabled && this.isDue(config.scheduledForecastingTime, config.lastScheduledForecastAt, now)) {
      const claimed = await this.prisma.forecastConfiguration.updateMany({
        where: { id: 'default', lastScheduledForecastAt: config.lastScheduledForecastAt },
        data: { lastScheduledForecastAt: now },
      });
      if (claimed.count !== 1) return;
      try {
        await this.forecasts.generate();
      } catch (error) {
        this.logger.error(`Scheduled forecast generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await this.emitAlerts(config);
  }

  private isDue(time: string, last: Date | null, now: Date) {
    const [hour, minute] = time.split(':').map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
    return now.getHours() === hour && now.getMinutes() === minute && (!last || last.toDateString() !== now.toDateString());
  }

  private async emitAlerts(config: any) {
    const query = { limit: 100, offset: 0 };
    const [stockouts, overstock, recommendations, accuracy] = await Promise.all([
      this.stockouts.predictions(query), this.dashboard.overstock(query),
      this.replenishment.recommendations(query), this.dashboard.accuracy(query),
    ]);
    for (const item of stockouts.data) {
      if (!['CRITICAL', 'HIGH'].includes(item.riskLevel) || item.remainingDays === null || item.remainingDays > config.alertStockoutDays) continue;
      await this.alert('FORECAST_STOCKOUT', item.productId, `Stockout risk: ${item.productName}`, `${item.productName} is estimated to run out in ${item.remainingDays} days.`, { remainingDays: item.remainingDays, riskLevel: item.riskLevel });
      if (item.riskLevel === 'CRITICAL') await this.alert('FORECAST_CRITICAL_RISK', item.productId, `Critical stock risk: ${item.productName}`, `${item.productName} has critical stockout risk.`, { remainingDays: item.remainingDays });
    }
    for (const item of recommendations.data) {
      if (item.suggestedQuantity > 0) await this.alert('FORECAST_REPLENISHMENT', item.productId, `Replenishment needed: ${item.productName}`, `${item.productName} has a forecast replenishment recommendation of ${item.suggestedQuantity} units.`, { suggestedQuantity: item.suggestedQuantity });
    }
    for (const item of overstock.data) {
      if (item.classification === 'OVERSTOCKED' && Number(item.inventoryCoverageDays) >= config.alertOverstockDays) await this.alert('FORECAST_OVERSTOCK', item.productId, `Overstock detected: ${item.productName}`, `${item.productName} is significantly overstocked based on forecast coverage.`, { excessInventoryQuantity: item.excessInventoryQuantity, inventoryCoverageDays: item.inventoryCoverageDays });
    }
    const wape = (accuracy.algorithms ?? []).map((row: any) => Number(row.wape)).filter(Number.isFinite);
    if (wape.some((value: number) => value >= config.alertAccuracyWapeThreshold)) {
      await this.alert('FORECAST_ACCURACY_DROP', null, 'Forecast accuracy below threshold', `Forecast WAPE reached ${Math.max(...wape)}; configured threshold is ${config.alertAccuracyWapeThreshold}.`, { wape: Math.max(...wape), threshold: config.alertAccuracyWapeThreshold });
    }
  }

  private async alert(type: string, productId: string | null, title: string, message: string, metadata: Record<string, unknown>) {
    const existing = await this.prisma.notification.findFirst({ where: { type, productId, isRead: false } });
    if (existing) return;
    await this.prisma.notification.create({ data: { type, productId, title, message, metadata: metadata as Prisma.InputJsonValue, isRead: false } });
  }
}
