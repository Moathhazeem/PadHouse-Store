import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto, ORDER_STATUSES } from './dto/order.dto';
import { CouponsService } from '../coupons/coupons.service';
import { LoyaltyService, POINTS_PER_ILS } from '../loyalty/loyalty.service';
import { GiftCardsService } from '../gift-cards/gift-cards.service';
import {
  DEFAULT_SHIPPING_FEE,
  PAYMENT_METHODS,
  SHIPPING_FEE_BY_CITY,
} from '../common/data/palestine';
import {
  isValidPalestinianPhone,
  normalizePalestinianPhone,
} from '../common/utils/phone.util';

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private loyaltyService: LoyaltyService,
    private giftCardsService: GiftCardsService,
  ) {}

  /** Canonical lifecycle shared by both platforms. */
  getStatuses() {
    return ORDER_STATUSES;
  }

  async createOrder(userId: string, profileId: string, dto: CreateOrderDto) {
    // 0. Verify the requested payment method is actually supported.
    const method = PAYMENT_METHODS.find((m) => m.id === dto.paymentMethod);
    if (!method || !method.enabled) {
      throw new BadRequestException('طريقة الدفع المختارة غير مدعومة حالياً');
    }

    // 1. Fetch Cart with Items and Inventory
    const cart = await this.prisma.cart.findUnique({
      where: { customerProfileId: profileId },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سلة التسوق فارغة، لا يمكن إنشاء طلب');
    }

    // 2. Validate the delivery city against verified Palestinian zones
    const city = dto.city.trim();
    const zoneFee = SHIPPING_FEE_BY_CITY[city];
    if (zoneFee === undefined) {
      throw new BadRequestException('التوصيل غير متاح لهذه المدينة حالياً');
    }

    // 3. Validate & normalize the Palestinian phone number
    let phone = (dto.phone || '').trim();
    if (phone) {
      if (!isValidPalestinianPhone(phone)) {
        throw new BadRequestException(
          'يرجى إدخال رقم هاتف فلسطيني صحيح (مثال: 0599123456)',
        );
      }
      phone = normalizePalestinianPhone(phone);
    }

    // 4. Validate Inventory & Calculate Verified Subtotal
    let subtotal = 0;
    for (const item of cart.items) {
      const stock = item.variant.inventory?.currentStock ?? 0;
      if (stock < item.quantity) {
        throw new BadRequestException(
          `المنتج "${item.product.nameAr}" نفد أو الكمية المتوفرة (${stock}) أقل من المطلوب`,
        );
      }
      const verifiedPrice = Number(item.product.salePrice || item.product.basePrice);
      subtotal += verifiedPrice * item.quantity;
    }
    subtotal = round2(subtotal);

    // 5. Shipping fee (STORE zone fee, may be waived by a free-shipping coupon)
    let shippingFee = zoneFee ?? DEFAULT_SHIPPING_FEE;

    // 6. Coupon evaluation (falls back to the coupon stored on the cart)
    const requestedCoupon = (dto.couponCode || cart.couponCode || '').trim();
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;
    let appliedCouponId: string | null = null;
    if (requestedCoupon) {
      const evaluation = await this.couponsService.evaluate(requestedCoupon, subtotal, profileId);
      couponDiscount = evaluation.discount;
      appliedCouponCode = evaluation.coupon.code;
      appliedCouponId = evaluation.coupon.id;
      if (evaluation.freeShipping) shippingFee = 0;
    }

    // 7. Gift card application on the remaining payable amount
    const payableBeforeGift = round2(Math.max(0, subtotal + shippingFee - couponDiscount));
    let giftCardDiscount = 0;
    let giftCardCode: string | null = null;
    if (dto.giftCardCode && dto.giftCardCode.trim()) {
      const validation = await this.giftCardsService.validateForAmount(
        dto.giftCardCode,
        payableBeforeGift,
      );
      giftCardDiscount = validation.applied;
      giftCardCode = validation.card.code;
    }

    const discountTotal = round2(couponDiscount);
    const grandTotal = round2(Math.max(0, payableBeforeGift - giftCardDiscount));

    // 8. Loyalty points earned on the amount actually paid
    const pointsEarned = Math.floor(grandTotal * POINTS_PER_ILS);

    // 9. Generate Unique Order Number
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(100 + Math.random() * 900);
    const orderNumber = `PH-2026-${timestamp}${random}`;

    // 10. Transaction: Address, Order, Items, History, Stock, Coupon, Gift Card, Loyalty, Warranty, Cart clear
    const order = await this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          customerProfileId: profileId,
          city,
          street: dto.street.trim(),
          phone,
        },
      });

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: address.id,
          status: 'PENDING',
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'PENDING',
          subtotal,
          shippingFee,
          discountTotal,
          giftCardCode,
          giftCardDiscount,
          grandTotal,
          customerNotes: dto.customerNotes,
          statusHistory: {
            create: {
              status: 'PENDING',
              notes: 'تم استلام الطلب وهو قيد التأكيد',
            },
          },
          items: {
            create: cart.items.map((item) => {
              const price = Number(item.product.salePrice || item.product.basePrice);
              return {
                productId: item.productId,
                variantId: item.variantId,
                unitPrice: price,
                quantity: item.quantity,
                totalPrice: round2(price * item.quantity),
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: { include: { images: true } },
              variant: true,
            },
          },
          shippingAddress: true,
          statusHistory: true,
        },
      });

      // Stock decrement + inventory movement
      for (const item of cart.items) {
        if (item.variant.inventory) {
          const stockUpdate = await tx.inventory.updateMany({
            where: {
              id: item.variant.inventory.id,
              currentStock: { gte: item.quantity },
            },
            data: { currentStock: { decrement: item.quantity } },
          });
          if (stockUpdate.count !== 1) {
            throw new BadRequestException(
              `الكمية المطلوبة من المنتج "${item.product.nameAr}" لم تعد متوفرة`,
            );
          }

          await tx.inventoryMovement.create({
            data: {
              inventoryId: item.variant.inventory.id,
              quantity: -item.quantity,
              type: 'ORDER_FULFILLMENT',
              notes: `حجز للطلب رقم ${orderNumber}`,
              actorId: userId,
            },
          });
        }
      }

      // Coupon redemption tracking
      if (appliedCouponId) {
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponRedemption.create({
          data: {
            couponId: appliedCouponId,
            customerProfileId: profileId,
            orderId: created.id,
            amount: couponDiscount,
          },
        });
      }

      // Gift card consumption
      if (giftCardCode && giftCardDiscount > 0) {
        await this.giftCardsService.consume(tx, giftCardCode, giftCardDiscount);
      }

      // Loyalty points for the paid amount
      if (pointsEarned > 0) {
        await this.loyaltyService.applyPoints(
          profileId,
          pointsEarned,
          'EARN_ORDER',
          `نقاط مكتسبة من الطلب ${orderNumber}`,
          created.id,
          tx,
        );
      }

      // Warranty records for each purchased item
      for (const item of cart.items) {
        const months = item.product.warrantyMonths || 12;
        const startsAt = new Date();
        const expiresAt = new Date(startsAt);
        expiresAt.setMonth(expiresAt.getMonth() + months);
        await tx.warranty.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            customerProfileId: profileId,
            months,
            startsAt,
            expiresAt,
            status: 'ACTIVE',
          },
        });
      }

      // Clear the cart (items + applied coupon)
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { couponCode: null, discountAmount: 0 },
      });

      return created;
    });

    return { ...order, pointsEarned };
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
        shippingAddress: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(idOrNumber: string, userId?: string, isAdmin = false) {
    const where: any = {
      OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
    };
    if (!isAdmin && userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        shippingAddress: true,
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    return order;
  }

  /** Warranty records belonging to the signed-in customer. */
  async getMyWarranties(profileId: string) {
    const warranties = await this.prisma.warranty.findMany({
      where: { customerProfileId: profileId },
      include: {
        product: { include: { images: true } },
        order: { select: { orderNumber: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return warranties.map((w) => ({
      id: w.id,
      orderNumber: w.order.orderNumber,
      productId: w.productId,
      productName: w.product.nameAr,
      image: w.product.images?.[0]?.url ?? null,
      months: w.months,
      startsAt: w.startsAt,
      expiresAt: w.expiresAt,
      status: w.expiresAt < now && w.status === 'ACTIVE' ? 'EXPIRED' : w.status,
      purchasedAt: w.order.createdAt,
    }));
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        shippingAddress: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Centralized cancellation logic shared by customer cancellation and admin status updates.
   * Restores inventory atomically and idempotently.
   */
  async cancelOrder(orderId: string, actorId: string, reason?: string, requesterUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: { inventory: true },
              },
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('الطلب غير موجود');
      }

      // If requested by a customer, validate ownership
      if (requesterUserId && order.userId !== requesterUserId) {
        throw new BadRequestException('غير مصرح لك بإلغاء هذا الطلب');
      }

      // Prevent cancelling an already cancelled order
      if (order.status === 'CANCELLED') {
        throw new BadRequestException('الطلب ملغى بالفعل');
      }

      // If customer requested, only PENDING orders can be cancelled
      if (requesterUserId && order.status !== 'PENDING') {
        throw new BadRequestException('لا يمكن إلغاء الطلب بعد دخوله مرحلة المعالجة أو التجهيز');
      }

      // Check if this order cannot be cancelled (e.g. DELIVERED)
      if (order.status === 'DELIVERED') {
        throw new BadRequestException('لا يمكن إلغاء طلب تم تسليمه بالفعل');
      }

      // Atomic status transition
      const updateResult = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { not: 'CANCELLED' },
        },
        data: {
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('تم إلغاء الطلب بالتزامن أو أنه ملغى بالفعل');
      }

      // Double-check idempotency: verify no RETURN_RESTOCK movements exist for this order
      const existingRestock = await tx.inventoryMovement.findFirst({
        where: {
          notes: { contains: order.orderNumber },
          type: 'RETURN_RESTOCK',
        },
      });

      if (!existingRestock) {
        for (const item of order.items) {
          if (item.variant?.inventory) {
            await tx.inventory.update({
              where: { id: item.variant.inventory.id },
              data: {
                currentStock: { increment: item.quantity },
              },
            });

            await tx.inventoryMovement.create({
              data: {
                inventoryId: item.variant.inventory.id,
                quantity: item.quantity,
                type: 'RETURN_RESTOCK',
                notes: `استرجاع مخزون بسبب إلغاء الطلب رقم ${order.orderNumber}`,
                actorId,
              },
            });
          }
        }
      }

      // Record in order status history
      const historyNotes = reason
        ? `تم إلغاء الطلب: ${reason}`
        : 'تم إلغاء الطلب واسترجاع المخزون';

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'CANCELLED',
          notes: historyNotes,
          updatedBy: actorId,
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: { include: { images: true } },
              variant: true,
            },
          },
          shippingAddress: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });
    });
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (dto.status === 'CANCELLED') {
      return this.cancelOrder(orderId, actorId, dto.notes);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('لا يمكن تغيير حالة طلب ملغى');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          // Cash-on-delivery orders are settled when delivered.
          paymentStatus:
            dto.status === 'DELIVERED' && order.paymentMethod === 'CASH_ON_DELIVERY'
              ? 'PAID'
              : undefined,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: dto.status,
          notes: dto.notes || `تغيير الحالة إلى ${dto.status}`,
          updatedBy: actorId,
        },
      });

      return updated;
    });
  }
}
