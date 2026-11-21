import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CheckLowStockParams {
  productId: string;
  productNameAr?: string;
  stock: number;
  minStock: number;
}

/**
 * Notification types surfaced to customers: promotions, purchase confirmation,
 * order tracking (progress / approaching / arrival), Urgent Crisis alerts and
 * the abandoned-cart reminder for orders left unfinished.
 */
export const USER_NOTIFICATION_TYPES = [
  'PROMOTION',
  'ORDER_CONFIRMATION',
  'ORDER_PROGRESS',
  'ORDER_APPROACHING',
  'ORDER_ARRIVED',
  'URGENT_CRISIS',
  'CRISIS_RESOLVED',
  'CART_REMINDER',
] as const;

/** Notification types kept for the admin console (not delivered to customers). */
export const ADMIN_NOTIFICATION_TYPES = ['LOW_STOCK'] as const;

export interface CreateUserNotificationParams {
  userId: string;
  orderId?: string | null;
  title: string;
  message: string;
  type: (typeof USER_NOTIFICATION_TYPES)[number] | string;
  /** Optional structured payload used by the UI for deep links. */
  metadata?: Prisma.InputJsonValue;
  /** Marks the notification with the Urgent Crisis red-alert styling. */
  isUrgentCrisis?: boolean;
}

export interface CreateBroadcastNotificationParams {
  title: string;
  message: string;
  type: (typeof USER_NOTIFICATION_TYPES)[number] | string;
  metadata?: Prisma.InputJsonValue;
  isUrgentCrisis?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches all admin/global notifications (customer-facing notifications such as
   * order progress, promotions and broadcasts are excluded) ordered newest first
   * along with the unread count.
   */
  async findAll() {
    const where: Prisma.NotificationWhereInput = {
      userId: null,
      type: { notIn: [...USER_NOTIFICATION_TYPES] },
    };
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              nameAr: true,
              nameEn: true,
              stock: true,
              minStock: true,
              maxStock: true,
            },
          },
        },
      }),
      this.prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marks all notifications as read.
   */
  async markAllAsRead() {
    const result = await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  /**
   * Evaluates product stock and triggers a low-stock alert if stock < minStock.
   * Safe to call inside an existing Prisma transaction or standalone.
   * Idempotent: avoids spamming duplicate unread notifications for the same product.
   */
  async checkAndCreateLowStockNotification(
    params: CheckLowStockParams,
    tx?: Prisma.TransactionClient,
  ) {
    const { productId, productNameAr, stock, minStock } = params;

    // Only trigger if strictly below threshold
    if (stock >= minStock) {
      return null;
    }

    const client = tx || this.prisma;

    // Avoid spamming duplicate unread notifications for the same product
    const existingUnread = await client.notification.findFirst({
      where: {
        productId,
        type: 'LOW_STOCK',
        isRead: false,
      },
    });

    if (existingUnread) {
      this.logger.debug(
        `[LowStockAlert] Unread alert already exists for product ${productId}. Skipping duplicate creation.`,
      );
      return existingUnread;
    }

    const title = 'تنبيه انخفاض المخزون (Low Stock)';
    const nameLabel = productNameAr ? ` "${productNameAr}"` : '';
    const message = `المنتج${nameLabel} وصل إلى مستوى مخزون منخفض: المتبقي (${stock}) قطعة، بينما الحد الأدنى المطلوب هو (${minStock}) قطعة.`;

    const notification = await client.notification.create({
      data: {
        title,
        message,
        type: 'LOW_STOCK',
        productId,
        isRead: false,
      },
    });

    this.logger.warn(
      `[LowStockAlert] Created alert for product ${productId}: stock (${stock}) < minStock (${minStock})`,
    );

    return notification;
  }

  /**
   * Creates a customer-targeted notification (order progress / approaching /
   * arrival / confirmation / crisis alerts).
   * Safe to call inside an existing Prisma transaction or standalone.
   */
  async createForUser(
    params: CreateUserNotificationParams,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.notification.create({
      data: {
        title: params.title,
        message: params.message,
        type: params.type,
        userId: params.userId,
        orderId: params.orderId ?? null,
        metadata: params.metadata,
        isUrgentCrisis: params.isUrgentCrisis ?? false,
        isRead: false,
      },
    });
  }

  /**
   * Creates a broadcast notification (userId = null) delivered to every customer,
   * e.g. a new promotion, coupon or flash sale announced from the Admin console.
   */
  async createBroadcast(params: CreateBroadcastNotificationParams) {
    return this.prisma.notification.create({
      data: {
        title: params.title,
        message: params.message,
        type: params.type,
        userId: null,
        metadata: params.metadata,
        isUrgentCrisis: params.isUrgentCrisis ?? false,
        isRead: false,
      },
    });
  }

  /** Broadcasts a promotions & discounts notification to all customers. */
  async promote(params: {
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.createBroadcast({ type: 'PROMOTION', ...params });
  }

  /** Returns a customer's own notifications plus active broadcasts (newest first). */
  async findForUser(userId: string) {
    const where: Prisma.NotificationWhereInput = {
      OR: [
        { userId },
        { userId: null, type: { in: [...USER_NOTIFICATION_TYPES] } },
      ],
    };
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  /** Marks one of the customer's own notifications (or a broadcast) as read. */
  async markUserAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { userId: null, type: { in: [...USER_NOTIFICATION_TYPES] } },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /** Marks all of the customer's own notifications (and broadcasts) as read. */
  async markAllUserAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          { userId },
          { userId: null, type: { in: [...USER_NOTIFICATION_TYPES] } },
        ],
      },
      data: { isRead: true },
    });

    return { success: true, updatedCount: result.count };
  }
}
