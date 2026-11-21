import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  UpdateOrderTrackingDto,
  EnableUrgentCrisisDto,
  ResolveUrgentCrisisDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @ApiOperation({ summary: 'إنشاء طلب جديد من السلة الحالية للعميل' })
  @Post()
  async createOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('customerProfileId') profileId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, profileId, dto);
  }

  @ApiOperation({ summary: 'قائمة حالات الطلب المعتمدة (مشتركة بين الموقع والتطبيق)' })
  @Get('statuses')
  getStatuses() {
    return this.ordersService.getStatuses();
  }

  @ApiOperation({ summary: 'استرجاع قائمة طلبات العميل الحالي' })
  @Get('my')
  async getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @ApiOperation({ summary: 'سجل ضمانات العميل الحالي' })
  @Get('warranties/my')
  async getMyWarranties(@CurrentUser('customerProfileId') profileId: string) {
    return this.ordersService.getMyWarranties(profileId);
  }

  @ApiOperation({ summary: 'إلغاء الطلب من قبل العميل' })
  @Patch(':id/cancel')
  async cancelMyOrder(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, userId, dto?.reason, userId);
  }

  @ApiOperation({ summary: 'تتبع طلب معين برقم الطلب أو المعرف' })
  @Get(':idOrNumber')
  async getOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('idOrNumber') idOrNumber: string,
  ) {
    const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    return this.ordersService.getOrderById(idOrNumber, userId, isAdmin);
  }

  @ApiOperation({ summary: 'استرجاع جميع الطلبات (لوحة تحكم الإدارة)' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/all')
  async getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @ApiOperation({ summary: 'تحديث حالة الطلب (لوحة تحكم الإدارة)' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto, actorId);
  }

  @ApiOperation({ summary: 'تحديث موقع المندوب ووجهة التسليم وحساب الوقت المتوقع (الإدارة)' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/tracking')
  async updateTracking(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderTrackingDto,
  ) {
    return this.ordersService.updateTracking(id, dto, actorId);
  }

  @ApiOperation({ summary: 'تفعيل حالة "الأزمة الطارئة" (نقطة تفتيش/إغلاق طريق) على الطلب' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/crisis')
  async enableCrisis(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: EnableUrgentCrisisDto,
  ) {
    return this.ordersService.enableCrisis(id, dto, actorId);
  }

  @ApiOperation({ summary: 'إنهاء حالة "الأزمة الطارئة" واستئناف التوصيل مع حساب وقت جديد' })
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id/crisis')
  async resolveCrisis(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: ResolveUrgentCrisisDto,
  ) {
    return this.ordersService.resolveCrisis(id, dto, actorId);
  }
}

