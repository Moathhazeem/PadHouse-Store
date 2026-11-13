import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @ApiOperation({ summary: 'تقييمات منتج معين مع المتوسط والتوزيع' })
  @ApiQuery({ name: 'productId', required: true })
  @Get()
  async getReviews(@Query('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @ApiOperation({ summary: 'تقييمات العميل الحالي' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyReviews(@CurrentUser('customerProfileId') profileId: string) {
    return this.reviewsService.getMyReviews(profileId);
  }

  @ApiOperation({ summary: 'إضافة أو تحديث تقييم لمنتج' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async createReview(
    @CurrentUser('id') userId: string,
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, profileId, dto);
  }

  @ApiOperation({ summary: 'حذف تقييم خاص بالعميل الحالي' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteReview(
    @CurrentUser('customerProfileId') profileId: string,
    @Param('id') id: string,
  ) {
    return this.reviewsService.deleteReview(profileId, id);
  }
}
