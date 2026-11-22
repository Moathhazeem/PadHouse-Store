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
import { SuppliersService } from './suppliers.service';
import {
  CreateSupplierDto,
  SupplierQueryDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
} from './dto/supplier.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({ summary: 'قائمة الموردين مع البحث والفلترة (لوحة الإدارة)' })
  @Get()
  async findAll(@Query() query: SupplierQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @ApiOperation({ summary: 'تفاصيل مورد معين مع سجل المشتريات وملخص القيمة الإجمالية' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @ApiOperation({ summary: 'سجل طلبات الشراء الخاصة بالمورد' })
  @Get(':id/purchase-history')
  async getPurchaseHistory(@Param('id') id: string) {
    return this.suppliersService.getPurchaseHistory(id);
  }

  @ApiOperation({ summary: 'إنشاء مورد جديد (لوحة الإدارة)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المورد بنجاح' })
  @Post()
  async create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @ApiOperation({ summary: 'تحديث بيانات مورد (لوحة الإدارة)' })
  @ApiResponse({ status: 200, description: 'تم تحديث المورد بنجاح' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @ApiOperation({ summary: 'تفعيل أو تعطيل مورد (لوحة الإدارة)' })
  @ApiResponse({ status: 200, description: 'تم تحديث حالة المورد بنجاح' })
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateSupplierStatusDto) {
    return this.suppliersService.updateStatus(id, dto.status);
  }

  @ApiOperation({ summary: 'حذف مورد (مرفوض إذا كان مرتبطاً بطلبات شراء) (لوحة الإدارة)' })
  @ApiResponse({ status: 200, description: 'تم حذف المورد بنجاح' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
