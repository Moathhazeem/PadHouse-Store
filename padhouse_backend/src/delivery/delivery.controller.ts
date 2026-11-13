import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { ValidatePhoneDto } from './dto/delivery.dto';

@ApiTags('Delivery & Palestinian Market')
@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @ApiOperation({ summary: 'المحافظات والمدن ومناطق التوصيل' })
  @Get('governorates')
  async getGovernorates() {
    return this.deliveryService.getGovernorates();
  }

  @ApiOperation({ summary: 'قائمة مناطق التوصيل مع الرسوم ومدة التسليم' })
  @Get('zones')
  async getZones() {
    return this.deliveryService.getDeliveryZones();
  }

  @ApiOperation({ summary: 'حساب رسوم التوصيل لمدينة معينة' })
  @ApiQuery({ name: 'city', required: true, example: 'رام الله والبيرة' })
  @Get('quote')
  async quote(@Query('city') city: string) {
    return this.deliveryService.quote(city);
  }

  @ApiOperation({ summary: 'التحقق من صحة رقم هاتف فلسطيني' })
  @Post('validate-phone')
  async validatePhone(@Body() dto: ValidatePhoneDto) {
    return this.deliveryService.validatePhone(dto.phone);
  }

  @ApiOperation({ summary: 'وسائل الدفع المحلية المدعومة فعلياً' })
  @Get('payment-methods')
  async getPaymentMethods() {
    return this.deliveryService.getPaymentMethods();
  }

  @ApiOperation({ summary: 'سياسات الاستبدال والاسترجاع والضمان وبيانات الدعم' })
  @Get('policies')
  async getPolicies() {
    return this.deliveryService.getPolicies();
  }
}
