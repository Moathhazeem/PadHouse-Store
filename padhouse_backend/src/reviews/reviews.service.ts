import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  private async resolveProduct(idOrSku: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSku }, { sku: idOrSku }] },
    });
    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }
    return product;
  }

  private mapReview(review: any) {
    return {
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt,
      customerName: review.customerProfile?.user?.fullName || 'عميل بادهاوس',
    };
  }

  async getProductReviews(idOrSku: string) {
    const product = await this.resolveProduct(idOrSku);
    const reviews = await this.prisma.review.findMany({
      where: { productId: product.id },
      include: { customerProfile: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = reviews.length;
    const average =
      total > 0 ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / total) * 10) / 10 : 0;

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    reviews.forEach((r) => {
      breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
    });

    return {
      productId: product.id,
      average,
      total,
      breakdown,
      reviews: reviews.map((r) => this.mapReview(r)),
    };
  }

  private async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const count = await this.prisma.orderItem.count({
      where: {
        productId,
        order: { userId, status: { in: ['DELIVERED', 'SHIPPED', 'PREPARING', 'CONFIRMED'] } },
      },
    });
    return count > 0;
  }

  async createReview(userId: string, profileId: string, dto: CreateReviewDto) {
    const product = await this.resolveProduct(dto.productId);
    const isVerifiedPurchase = await this.hasPurchased(userId, product.id);

    const existing = await this.prisma.review.findFirst({
      where: { productId: product.id, customerProfileId: profileId },
    });

    if (existing) {
      const updated = await this.prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: dto.rating,
          comment: dto.comment,
          isVerifiedPurchase,
        },
        include: { customerProfile: { include: { user: { select: { fullName: true } } } } },
      });
      return this.mapReview(updated);
    }

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        customerProfileId: profileId,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedPurchase,
      },
      include: { customerProfile: { include: { user: { select: { fullName: true } } } } },
    });

    return this.mapReview(review);
  }

  async getMyReviews(profileId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { customerProfileId: profileId },
      include: {
        product: { include: { images: { orderBy: { displayOrder: 'asc' } } } },
        customerProfile: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review) => ({
      ...this.mapReview(review),
      product: {
        id: review.product.id,
        name: review.product.nameAr,
        image: review.product.images[0]?.url || '',
      },
    }));
  }

  async deleteReview(profileId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.customerProfileId !== profileId) {
      throw new NotFoundException('التقييم غير موجود');
    }
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { deleted: true };
  }
}
