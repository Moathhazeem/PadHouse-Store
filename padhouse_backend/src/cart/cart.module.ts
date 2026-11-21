import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartReminderService } from './cart-reminder.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CartController],
  providers: [CartService, CartReminderService],
  exports: [CartService],
})
export class CartModule {}
