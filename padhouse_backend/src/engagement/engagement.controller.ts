import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EngagementService } from './engagement.service';
import { BackInStockDto, ProductRefDto } from './dto/engagement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Engagement')
@Controller()
export class EngagementController {
  constructor(private engagementService: EngagementService) {}

  // ─── Wishlist ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'قائمة مفضلات العميل الحالي' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('wishlist')
  async getWishlist(@CurrentUser('customerProfileId') profileId: string) {
    return this.engagementService.getWishlist(profileId);
  }

  @ApiOperation({ summary: 'إضافة منتج إلى المفضلة' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('wishlist')
  async addToWishlist(
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: ProductRefDto,
  ) {
    return this.engagementService.addToWishlist(profileId, dto.productId);
  }

  @ApiOperation({ summary: 'إزالة منتج من المفضلة' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('wishlist/:productId')
  async removeFromWishlist(
    @CurrentUser('customerProfileId') profileId: string,
    @Param('productId') productId: string,
  ) {
    return this.engagementService.removeFromWishlist(profileId, productId);
  }

  // ─── Recently Viewed ─────────────────────────────────────────────────────

  @ApiOperation({ summary: 'آخر المنتجات التي شاهدها العميل' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('recently-viewed')
  async getRecentlyViewed(@CurrentUser('customerProfileId') profileId: string) {
    return this.engagementService.getRecentlyViewed(profileId);
  }

  @ApiOperation({ summary: 'تسجيل مشاهدة منتج في قائمة المشاهدات الأخيرة' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('recently-viewed')
  async recordView(
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: ProductRefDto,
  ) {
    return this.engagementService.recordView(profileId, dto.productId);
  }

  // ─── Back-in-stock alerts ────────────────────────────────────────────────

  @ApiOperation({ summary: 'الاشتراك في تنبيه توفر منتج (متاح للضيوف)' })
  @UseGuards(OptionalJwtAuthGuard)
  @Post('stock-alerts')
  async subscribe(
    @CurrentUser('customerProfileId') profileId: string | undefined,
    @Body() dto: BackInStockDto,
  ) {
    return this.engagementService.subscribeToBackInStock(profileId, dto);
  }

  @ApiOperation({ summary: 'قائمة تنبيهات التوفر الخاصة بالعميل' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stock-alerts')
  async getMyAlerts(@CurrentUser('customerProfileId') profileId: string) {
    return this.engagementService.getMyAlerts(profileId);
  }

  @ApiOperation({ summary: 'إلغاء تنبيه توفر منتج' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('stock-alerts/:id')
  async removeAlert(
    @CurrentUser('customerProfileId') profileId: string,
    @Param('id') id: string,
  ) {
    return this.engagementService.removeAlert(profileId, id);
  }
}
