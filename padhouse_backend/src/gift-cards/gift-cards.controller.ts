import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GiftCardsService } from './gift-cards.service';
import { IssueGiftCardDto } from './dto/gift-card.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Gift Cards')
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private giftCardsService: GiftCardsService) {}

  @ApiOperation({ summary: 'التحقق من رصيد بطاقة هدايا' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':code/balance')
  async getBalance(@Param('code') code: string) {
    return this.giftCardsService.getBalance(code);
  }

  @ApiOperation({ summary: 'إصدار بطاقة هدايا جديدة (الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Post()
  async issue(@Body() dto: IssueGiftCardDto) {
    return this.giftCardsService.issue(dto);
  }
}
