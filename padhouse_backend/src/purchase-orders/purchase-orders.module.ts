import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';

@Module({
  imports: [InventoryModule, AnalyticsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
