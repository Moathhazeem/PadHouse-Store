import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PurchaseOrdersService, PurchaseOrderActor } from './purchase-orders.service';
import {
  CancelPurchaseOrderDto,
  CreatePurchaseOrderDto,
  PurchaseAnalyticsQueryDto,
  PurchaseOrderActionDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/** Shape of the authenticated principal injected by the JWT strategy. */
interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  private actor(user: AuthUser): PurchaseOrderActor {
    return { id: user?.id ?? null, fullName: user?.fullName ?? null };
  }

  @ApiOperation({ summary: 'قائمة أوامر الشراء مع البحث والفلترة (لوحة الإدارة)' })
  @Get()
  async findAll(@Query() query: PurchaseOrderQueryDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @ApiOperation({
    summary: 'تحليلات المشتريات: مؤشرات ورسوم وبيانات أداء الموردين (لوحة الإدارة)',
  })
  @ApiResponse({ status: 200, description: 'تم توليد تحليلات المشتريات بنجاح' })
  @Get('analytics')
  async analytics(@Query() query: PurchaseAnalyticsQueryDto) {
    return this.purchaseOrdersService.analytics(query);
  }

  @ApiOperation({ summary: 'تفاصيل أمر شراء مع البنود وسجل الحالات (لوحة الإدارة)' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @ApiOperation({ summary: 'إنشاء أمر شراء جديد (حالة مبدئية: مسودة)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء أمر الشراء بنجاح' })
  @Post()
  async create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.create(dto, this.actor(user));
  }

  @ApiOperation({ summary: 'تعديل أمر شراء — متاح فقط في حالة المسودة' })
  @ApiResponse({ status: 200, description: 'تم تحديث أمر الشراء بنجاح' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.update(id, dto, this.actor(user));
  }

  @ApiOperation({ summary: 'حذف أمر شراء — متاح فقط في حالة المسودة' })
  @ApiResponse({ status: 200, description: 'تم حذف أمر الشراء بنجاح' })
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.remove(id, this.actor(user));
  }

  @ApiOperation({ summary: 'إرسال أمر الشراء للاعتماد (مسودة ← بانتظار الموافقة)' })
  @Post(':id/submit')
  async submit(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.submit(id, dto, this.actor(user));
  }

  @ApiOperation({ summary: 'اعتماد أمر الشراء (بانتظار الموافقة ← معتمد)' })
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.approve(id, dto, this.actor(user));
  }

  @ApiOperation({ summary: 'رفض أمر الشراء وإعادته للمسودة (بانتظار الموافقة ← مسودة)' })
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.reject(id, dto, this.actor(user));
  }

  @ApiOperation({ summary: 'تعليم أمر الشراء كمُرسل للمورد (معتمد ← مُرسل)' })
  @Post(':id/send')
  async send(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.send(id, dto, this.actor(user));
  }

  @ApiOperation({ summary: 'تسجيل استلام كميات (معتمد/مُرسل ← مستلم جزئياً/مستلم بالكامل)' })
  @Post(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.receive(id, dto, this.actor(user));
  }

  @ApiOperation({ summary: 'إلغاء أمر الشراء (من أي حالة غير نهائية)' })
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelPurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.cancel(id, dto, this.actor(user));
  }
}
