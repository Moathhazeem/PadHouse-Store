import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @ApiOperation({ summary: 'توصيات مخصصة للعميل (أو المنتجات المميزة للزوار)' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('for-you')
  async getForYou(@CurrentUser('customerProfileId') profileId?: string) {
    return this.recommendationsService.getForYou(profileId);
  }

  @ApiOperation({ summary: 'منتجات مشابهة في نفس الفئة' })
  @Get('related/:productId')
  async getRelated(@Param('productId') productId: string) {
    return this.recommendationsService.getRelated(productId);
  }

  @ApiOperation({ summary: 'يُشترى معه عادةً (بناءً على الطلبات الفعلية)' })
  @Get('frequently-bought-together/:productId')
  async getFbt(@Param('productId') productId: string) {
    return this.recommendationsService.getFrequentlyBoughtTogether(productId);
  }

  @ApiOperation({ summary: 'بناء طقم iPad الكامل بناءً على التوافق المؤكد مع الموديل' })
  @ApiQuery({ name: 'model', required: true, example: 'iPad Pro 11 (M4)' })
  @Get('ipad-setup')
  async getIpadSetup(@Query('model') model: string) {
    return this.recommendationsService.getIpadSetup(model);
  }
}
