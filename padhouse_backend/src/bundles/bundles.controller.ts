import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/bundle.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Bundles & Flash Sales')
@Controller()
export class BundlesController {
  constructor(private bundlesService: BundlesService) {}

  @ApiOperation({ summary: 'العروض المجمعة (Bundles) المتاحة' })
  @Get('bundles')
  async getBundles() {
    return this.bundlesService.getBundles();
  }

  @ApiOperation({ summary: 'تفاصيل عرض مجمع معين' })
  @Get('bundles/:slug')
  async getBundle(@Param('slug') slug: string) {
    return this.bundlesService.getBundleBySlug(slug);
  }

  @ApiOperation({ summary: 'التخفيضات السريعة النشطة (Flash Sales)' })
  @Get('flash-sales')
  async getFlashSales() {
    return this.bundlesService.getActiveFlashSales();
  }

  @ApiOperation({ summary: 'إنشاء عرض مجمع (الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Post('bundles')
  async createBundle(@Body() dto: CreateBundleDto) {
    return this.bundlesService.createBundle(dto);
  }
}
