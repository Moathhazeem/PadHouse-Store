import { Module } from '@nestjs/common';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { ForecastingDashboardService } from './forecasting-dashboard.service';
import { ForecastingController } from './forecasting.controller';
import { ForecastingService } from './forecasting.service';
import { StockoutPredictionService } from './stockout-prediction.service';
import { ReplenishmentService } from './replenishment.service';
import { ForecastAutomationService } from './forecast-automation.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ForecastingController],
  imports: [PurchaseOrdersModule, NotificationsModule],
  providers: [ForecastingService, ForecastingDashboardService, StockoutPredictionService, ReplenishmentService, ForecastAutomationService],
  exports: [ForecastingService, ForecastingDashboardService, StockoutPredictionService, ReplenishmentService],
})
export class ForecastingModule {}
