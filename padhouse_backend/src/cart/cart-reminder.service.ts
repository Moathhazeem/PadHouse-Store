import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** How long an untouched, non-empty cart waits before a reminder is sent. */
const ABANDON_AFTER_MS = 5 * 60 * 1000;

/** How often abandoned carts are swept. */
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Reminds a customer when they started an order (added items to their cart) but
 * did not complete the purchase within 5 minutes.
 *
 * Persistence & dedup: `Cart.reminderSentAt` is stamped once a reminder is sent
 * and reset to null on any cart change (see CartService), so each idle window
 * reminds the customer at most once. Completing the purchase clears the cart
 * items, so finished (or emptied) carts are never reminded.
 */
@Injectable()
export class CartReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CartReminderService.name);
  private timer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    // Never keep the process alive solely for this timer.
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Scans idle carts and reminds each customer at most once per idle window. */
  async sweep(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
      const carts = await this.prisma.cart.findMany({
        where: {
          reminderSentAt: null,
          updatedAt: { lte: cutoff },
          items: { some: {} },
        },
        include: {
          items: { select: { quantity: true } },
          customerProfile: { select: { userId: true } },
        },
      });

      for (const cart of carts) {
        const userId = cart.customerProfile?.userId;
        if (!userId) continue;

        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

        await this.notifications.createForUser({
          userId,
          type: 'CART_REMINDER',
          title: 'طلبك بانتظار الإتمام',
          message: 'لديك طلب بانتظار إتمام الشراء',
          metadata: { action: 'open_cart', cartId: cart.id, itemCount },
        });

        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { reminderSentAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error(
        `[CartReminder] Sweep failed: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.sweeping = false;
    }
  }
}
