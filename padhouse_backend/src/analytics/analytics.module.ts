import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCacheService } from './analytics-cache.service';

/**
 * Sales & Profit Analytics.
 *
 * `AnalyticsCacheService` is exported so the write paths that can change an
 * aggregate — sales, refunds, purchase receipts and inventory movements —
 * can drop the cached payloads (`invalidateAll`). `PrismaService` is available
 * globally via `PrismaModule`, so no extra import is needed here.
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsCacheService],
  exports: [AnalyticsService, AnalyticsCacheService],
})
export class AnalyticsModule {}
