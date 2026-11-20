import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CheckLowStockParams {
  productId: string;
  productNameAr?: string;
  stock: number;
  minStock: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches all notifications ordered newest first along with unread count.
   */
  async findAll() {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
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
        where: { isRead: false },
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
}
