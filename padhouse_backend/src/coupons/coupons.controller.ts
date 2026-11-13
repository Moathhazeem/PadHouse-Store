import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { ApplyCouponDto, CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @ApiOperation({ summary: 'أكواد الخصم المتاحة حالياً (عام)' })
  @Get('active')
  async listActive() {
    return this.couponsService.listActiveCoupons();
  }

  @ApiOperation({ summary: 'تطبيق كود خصم على سلة العميل الحالي' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async apply(
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.couponsService.applyToCart(profileId, dto.code);
  }

  @ApiOperation({ summary: 'إزالة كود الخصم من سلة العميل الحالي' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('apply')
  async remove(@CurrentUser('customerProfileId') profileId: string) {
    return this.couponsService.removeFromCart(profileId);
  }

  @ApiOperation({ summary: 'قائمة جميع أكواد الخصم (الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Get()
  async listAll() {
    return this.couponsService.listCoupons();
  }

  @ApiOperation({ summary: 'إنشاء كود خصم جديد (الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Post()
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @ApiOperation({ summary: 'تحديث كود خصم (الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.updateCoupon(id, dto);
  }
}
