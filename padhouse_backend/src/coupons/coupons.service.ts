import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

export interface CouponEvaluation {
  coupon: {
    id: string;
    code: string;
    type: string;
    value: number;
    descriptionAr: string | null;
  };
  discount: number;
  freeShipping: boolean;
}

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(profileId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { customerProfileId: profileId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { customerProfileId: profileId } });
    }
    return cart;
  }

  private async cartSubtotal(cartId: string): Promise<number> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: { product: true },
    });
    return items.reduce((acc, item) => {
      const price = Number(item.product.salePrice || item.product.basePrice);
      return acc + price * item.quantity;
    }, 0);
  }

  /** Validates a coupon against business rules and returns the computed discount. */
  async evaluate(
    rawCode: string,
    subtotal: number,
    customerProfileId?: string,
  ): Promise<CouponEvaluation> {
    const code = (rawCode || '').trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('كود الخصم غير صالح');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('لم يبدأ سريان كود الخصم بعد');
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      throw new BadRequestException('انتهت صلاحية كود الخصم');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('تم استنفاد عدد مرات استخدام هذا الكود');
    }

    const minSubtotal = Number(coupon.minSubtotal);
    if (subtotal < minSubtotal) {
      throw new BadRequestException(
        `الحد الأدنى لاستخدام هذا الكود هو ${minSubtotal} ₪`,
      );
    }

    if (customerProfileId) {
      const used = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, customerProfileId },
      });
      if (used >= coupon.perCustomerLimit) {
        throw new BadRequestException('لقد استخدمت هذا الكود من قبل');
      }
    }

    let discount = 0;
    let freeShipping = false;
    const value = Number(coupon.value);

    if (coupon.type === 'FIXED') {
      discount = Math.min(value, subtotal);
    } else if (coupon.type === 'PERCENT') {
      discount = (subtotal * value) / 100;
      if (coupon.maxDiscount !== null) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else if (coupon.type === 'FREE_SHIPPING') {
      freeShipping = true;
    }

    discount = Math.round(discount * 100) / 100;

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value,
        descriptionAr: coupon.descriptionAr,
      },
      discount,
      freeShipping,
    };
  }

  async listActiveCoupons() {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return coupons
      .filter(
        (c) =>
          (!c.startsAt || c.startsAt <= now) &&
          (!c.endsAt || c.endsAt >= now) &&
          (c.usageLimit === null || c.usedCount < c.usageLimit),
      )
      .map((c) => ({
        code: c.code,
        type: c.type,
        value: Number(c.value),
        minSubtotal: Number(c.minSubtotal),
        maxDiscount: c.maxDiscount !== null ? Number(c.maxDiscount) : null,
        descriptionAr: c.descriptionAr,
        endsAt: c.endsAt,
      }));
  }

  /** Applies a coupon to the signed-in customer's active cart. */
  async applyToCart(profileId: string, code: string) {
    const cart = await this.getOrCreateCart(profileId);
    const subtotal = await this.cartSubtotal(cart.id);
    const evaluation = await this.evaluate(code, subtotal, profileId);

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: evaluation.coupon.code,
        discountAmount: evaluation.discount,
      },
    });

    return {
      applied: true,
      couponCode: evaluation.coupon.code,
      discount: evaluation.discount,
      freeShipping: evaluation.freeShipping,
      subtotal,
      message: evaluation.freeShipping
        ? 'تم تطبيق الكود: توصيل مجاني'
        : `تم تطبيق الكود وخصم ${evaluation.discount} ₪`,
    };
  }

  async removeFromCart(profileId: string) {
    const cart = await this.getOrCreateCart(profileId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null, discountAmount: 0 },
    });
    return { applied: false, couponCode: null, discount: 0 };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('كود الخصم مستخدم مسبقاً');
    }
    return this.prisma.coupon.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        minSubtotal: dto.minSubtotal ?? 0,
        maxDiscount: dto.maxDiscount ?? null,
        usageLimit: dto.usageLimit ?? null,
        perCustomerLimit: dto.perCustomerLimit ?? 1,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        descriptionAr: dto.descriptionAr,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listCoupons() {
    const coupons = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return coupons.map((c) => ({
      ...c,
      value: Number(c.value),
      minSubtotal: Number(c.minSubtotal),
      maxDiscount: c.maxDiscount !== null ? Number(c.maxDiscount) : null,
    }));
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('كود الخصم غير موجود');
    }
    return this.prisma.coupon.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        value: dto.value,
        usageLimit: dto.usageLimit,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }
}
