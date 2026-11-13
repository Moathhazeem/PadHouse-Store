import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const POINTS_PER_ILS = 1; // 1 point per 1 ILS spent
export const POINTS_REDEEM_RATE = 10; // 100 points => 10 ILS
export const SIGNUP_BONUS_POINTS = 50;
export const REFERRAL_REWARD_POINTS = 50;
export const MIN_REDEEM_POINTS = 100;

type PrismaTx = {
  loyaltyAccount: any;
  loyaltyTransaction: any;
};

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  private tierFor(points: number): string {
    if (points >= 1500) return 'GOLD';
    if (points >= 500) return 'SILVER';
    return 'BRONZE';
  }

  private async getOrCreateAccount(profileId: string, tx: any = this.prisma) {
    let account = await tx.loyaltyAccount.findUnique({ where: { customerProfileId: profileId } });
    if (!account) {
      account = await tx.loyaltyAccount.create({ data: { customerProfileId: profileId } });
    }
    return account;
  }

  /** Adds (or subtracts) points and recalculates the customer's tier. */
  async applyPoints(
    profileId: string,
    points: number,
    type: string,
    notes: string,
    orderId?: string,
    tx: PrismaTx | null = null,
  ) {
    const client = tx ?? this.prisma;
    const account = await this.getOrCreateAccount(profileId, client);
    const newBalance = account.points + points;
    if (newBalance < 0) {
      throw new BadRequestException('رصيد نقاط الولاء غير كافٍ');
    }
    const updated = await client.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: newBalance, tier: this.tierFor(newBalance) },
    });
    await client.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        points,
        type,
        notes,
        orderId,
      },
    });
    return updated;
  }

  async getAccount(profileId: string) {
    const account = await this.getOrCreateAccount(profileId);
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { loyaltyAccountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const nextTierPoints = account.tier === 'GOLD' ? null : account.tier === 'SILVER' ? 1500 : 500;

    return {
      points: account.points,
      tier: account.tier,
      nextTier: account.tier === 'BRONZE' ? 'SILVER' : account.tier === 'SILVER' ? 'GOLD' : null,
      nextTierPoints,
      pointsToNextTier: nextTierPoints ? Math.max(0, nextTierPoints - account.points) : 0,
      redeemRate: POINTS_REDEEM_RATE,
      minRedeemPoints: MIN_REDEEM_POINTS,
      transactions: transactions.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        notes: t.notes,
        orderId: t.orderId,
        createdAt: t.createdAt,
      })),
    };
  }

  /** Converts loyalty points into a single-use coupon the customer can apply at checkout. */
  async redeemPoints(profileId: string, points: number) {
    if (points < MIN_REDEEM_POINTS) {
      throw new BadRequestException(`الحد الأدنى للاستبدال هو ${MIN_REDEEM_POINTS} نقطة`);
    }
    if (points % MIN_REDEEM_POINTS !== 0) {
      throw new BadRequestException(`يجب أن يكون عدد النقاط من مضاعفات ${MIN_REDEEM_POINTS}`);
    }

    const account = await this.getOrCreateAccount(profileId);
    if (account.points < points) {
      throw new BadRequestException('رصيد نقاط الولاء غير كافٍ');
    }

    const valueIls = points / POINTS_REDEEM_RATE;
    const code = `LOYAL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.coupon.create({
        data: {
          code,
          type: 'FIXED',
          value: valueIls,
          minSubtotal: valueIls,
          usageLimit: 1,
          usedCount: 0,
          perCustomerLimit: 1,
          descriptionAr: `قسيمة ولاء مقابل ${points} نقطة`,
          isActive: true,
        },
      });

      const updated = await this.applyPoints(
        profileId,
        -points,
        'REDEEM',
        `استبدال ${points} نقطة بقسيمة ${valueIls} ₪`,
        undefined,
        tx,
      );

      return {
        redeemed: true,
        couponCode: code,
        value: valueIls,
        remainingPoints: updated.points,
        message: `تم إنشاء قسيمة بقيمة ${valueIls} ₪`,
      };
    });
  }

  // ─── Referrals ───────────────────────────────────────────────────────────

  private generateReferralCode(): string {
    return `PAD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  async getMyReferrals(profileId: string) {
    let active = await this.prisma.referral.findFirst({
      where: { ownerProfileId: profileId, status: 'PENDING' },
    });
    if (!active) {
      active = await this.prisma.referral.create({
        data: {
          ownerProfileId: profileId,
          code: this.generateReferralCode(),
          rewardPoints: REFERRAL_REWARD_POINTS,
        },
      });
    }

    const all = await this.prisma.referral.findMany({
      where: { ownerProfileId: profileId },
      orderBy: { createdAt: 'desc' },
    });

    const completed = all.filter((r) => r.status === 'COMPLETED').length;

    return {
      code: active.code,
      rewardPoints: REFERRAL_REWARD_POINTS,
      completedCount: completed,
      earnedPoints: completed * REFERRAL_REWARD_POINTS,
      referrals: all.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.status,
        refereeEmail: r.refereeEmail,
        createdAt: r.createdAt,
      })),
    };
  }

  async applyReferral(profileId: string, code: string, refereeEmail?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!referral) {
      throw new NotFoundException('كود الإحالة غير صحيح');
    }
    if (referral.ownerProfileId === profileId) {
      throw new BadRequestException('لا يمكنك استخدام كود الإحالة الخاص بك');
    }
    if (referral.status === 'COMPLETED') {
      throw new BadRequestException('تم استخدام كود الإحالة مسبقاً');
    }

    const existingApplied = await this.prisma.referral.findFirst({
      where: { refereeEmail: refereeEmail ?? undefined, status: 'COMPLETED' },
    });
    if (refereeEmail && existingApplied) {
      throw new BadRequestException('تم استخدام كود إحالة لهذا الحساب مسبقاً');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: 'COMPLETED', refereeEmail: refereeEmail ?? null },
      });

      await this.applyPoints(
        referral.ownerProfileId,
        REFERRAL_REWARD_POINTS,
        'REFERRAL_BONUS',
        'مكافأة إحالة صديق',
        undefined,
        tx,
      );

      const bonus = await this.applyPoints(
        profileId,
        SIGNUP_BONUS_POINTS,
        'REFERRAL_BONUS',
        'مكافأة الانضمام عبر كود إحالة',
        undefined,
        tx,
      );

      return {
        applied: true,
        rewardPoints: SIGNUP_BONUS_POINTS,
        newPointsBalance: bonus.points,
        message: `تم تطبيق كود الإحالة وحصلت على ${SIGNUP_BONUS_POINTS} نقطة`,
      };
    });
  }

  async awardSignupBonus(profileId: string) {
    const account = await this.getOrCreateAccount(profileId);
    if (account.points === 0) {
      const txnCount = await this.prisma.loyaltyTransaction.count({
        where: { loyaltyAccountId: account.id },
      });
      if (txnCount === 0) {
        return this.applyPoints(profileId, SIGNUP_BONUS_POINTS, 'SIGNUP_BONUS', 'مكافأة التسجيل في برنامج الولاء');
      }
    }
    return account;
  }
}
