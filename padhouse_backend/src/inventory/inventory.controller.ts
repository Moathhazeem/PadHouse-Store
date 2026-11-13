import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { UpdateStockDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'قائمة أرصدة المخزون وحالات النقص (لوحة الإدارة)' })
  @Get()
  async getInventory() {
    return this.inventoryService.getInventoryOverview();
  }

  @ApiOperation({ summary: 'تنبيهات انخفاض المخزون (تحت الحد الأدنى)' })
  @Get('alerts/low-stock')
  async getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @ApiOperation({ summary: 'تحديث رصيد متغير منتج وتسجيل حركة المخزون' })
  @Patch('variants/:variantId/stock')
  async updateStock(
    @CurrentUser('id') actorId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(variantId, dto, actorId);
  }
}

