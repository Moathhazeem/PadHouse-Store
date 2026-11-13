import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { ApplyReferralDto, RedeemPointsDto } from './dto/loyalty.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Loyalty & Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  @ApiOperation({ summary: 'رصيد نقاط الولاء والفئة وسجل الحركات' })
  @Get('loyalty')
  async getAccount(@CurrentUser('customerProfileId') profileId: string) {
    return this.loyaltyService.getAccount(profileId);
  }

  @ApiOperation({ summary: 'استبدال نقاط الولاء بقسيمة خصم' })
  @Post('loyalty/redeem')
  async redeem(
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.loyaltyService.redeemPoints(profileId, dto.points);
  }

  @ApiOperation({ summary: 'كود الإحالة الخاص بالعميل وحالة الإحالات' })
  @Get('referrals')
  async getReferrals(@CurrentUser('customerProfileId') profileId: string) {
    return this.loyaltyService.getMyReferrals(profileId);
  }

  @ApiOperation({ summary: 'تطبيق كود إحالة صديق' })
  @Post('referrals/apply')
  async applyReferral(
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.loyaltyService.applyReferral(profileId, dto.code, dto.refereeEmail);
  }
}
