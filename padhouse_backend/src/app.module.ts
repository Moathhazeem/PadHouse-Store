import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { CouponsModule } from './coupons/coupons.module';
import { EngagementModule } from './engagement/engagement.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BundlesModule } from './bundles/bundles.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { DeliveryModule } from './delivery/delivery.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    InventoryModule,
    CouponsModule,
    EngagementModule,
    ReviewsModule,
    BundlesModule,
    RecommendationsModule,
    DeliveryModule,
    LoyaltyModule,
    GiftCardsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
