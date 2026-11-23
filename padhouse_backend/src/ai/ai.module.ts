import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { ForecastingModule } from '../forecasting/forecasting.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiInventoryService } from './ai-inventory.service';
import { ForecastingAiToolsService } from './forecasting-ai-tools.service';

@Module({
  // The assistant reuses the exact same cart/order services as the REST API so
  // "add to cart" and "buy" share one source of truth across web and mobile.
  // `PurchaseOrdersModule` supplies the same `PurchaseOrdersService` the REST API
  // uses, so AI-drafted purchase orders are created through the identical DRAFT
  // path — never a parallel one.
  imports: [PrismaModule, CartModule, OrdersModule, PurchaseOrdersModule, ForecastingModule],
  controllers: [AiController],
  providers: [AiService, AiInventoryService, ForecastingAiToolsService],
})
export class AiModule {}
