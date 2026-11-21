import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  // The assistant reuses the exact same cart/order services as the REST API so
  // "add to cart" and "buy" share one source of truth across web and mobile.
  imports: [PrismaModule, CartModule, OrdersModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
