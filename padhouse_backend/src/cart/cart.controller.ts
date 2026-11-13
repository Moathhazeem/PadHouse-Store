import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @ApiOperation({ summary: 'استرجاع سلة التسوق الحالية وحساب الإجماليات والتحقق من المخزون' })
  @Get()
  async getCart(@CurrentUser('customerProfileId') profileId: string) {
    return this.cartService.getCart(profileId);
  }

  @ApiOperation({ summary: 'إضافة منتج إلى سلة التسوق' })
  @Post('items')
  async addItem(
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addItem(profileId, dto);
  }

  @ApiOperation({ summary: 'تحديث كمية منتج في السلة' })
  @Patch('items/:id')
  async updateQuantity(
    @CurrentUser('customerProfileId') profileId: string,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(profileId, itemId, dto);
  }

  @ApiOperation({ summary: 'حذف منتج من السلة' })
  @Delete('items/:id')
  async removeItem(
    @CurrentUser('customerProfileId') profileId: string,
    @Param('id') itemId: string,
  ) {
    return this.cartService.removeItem(profileId, itemId);
  }

  @ApiOperation({ summary: 'إفراغ السلة بالكامل' })
  @Delete()
  async clearCart(@CurrentUser('customerProfileId') profileId: string) {
    return this.cartService.clearCart(profileId);
  }
}

