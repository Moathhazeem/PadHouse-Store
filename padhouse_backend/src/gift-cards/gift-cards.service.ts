import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueGiftCardDto } from './dto/gift-card.dto';

@Injectable()
export class GiftCardsService {
  constructor(private prisma: PrismaService) {}

  async getBalance(code: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!card) {
      throw new NotFoundException('بطاقة الهدايا غير موجودة');
    }
    const expired = card.expiresAt ? card.expiresAt < new Date() : false;
    return {
      code: card.code,
      balance: Number(card.balance),
      currency: card.currency,
      isActive: card.isActive && !expired,
      expired,
      expiresAt: card.expiresAt,
    };
  }

  /**
   * Validates a gift card and returns how much of it can be applied to the
   * given order total. Used by the checkout flow.
   */
  async validateForAmount(code: string, orderTotal: number) {
    const card = await this.prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!card) {
      throw new NotFoundException('بطاقة الهدايا غير موجودة');
    }
    if (!card.isActive) {
      throw new BadRequestException('بطاقة الهدايا غير مفعّلة');
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new BadRequestException('انتهت صلاحية بطاقة الهدايا');
    }
    const balance = Number(card.balance);
    if (balance <= 0) {
      throw new BadRequestException('رصيد بطاقة الهدايا صفر');
    }
    const applied = Math.min(balance, Math.max(0, orderTotal));
    return { card, applied: Math.round(applied * 100) / 100 };
  }

  /** Decrements the gift card balance inside an existing transaction. */
  async consume(tx: any, code: string, amount: number) {
    const card = await tx.giftCard.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!card) return;
    const newBalance = Math.max(0, Number(card.balance) - amount);
    await tx.giftCard.update({
      where: { id: card.id },
      data: { balance: newBalance, isActive: newBalance > 0 ? card.isActive : false },
    });
  }

  async issue(dto: IssueGiftCardDto) {
    const code = `GIFT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const card = await this.prisma.giftCard.create({
      data: {
        code,
        initialBalance: dto.amount,
        balance: dto.amount,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return {
      code: card.code,
      balance: Number(card.balance),
      currency: card.currency,
      expiresAt: card.expiresAt,
    };
  }
}
