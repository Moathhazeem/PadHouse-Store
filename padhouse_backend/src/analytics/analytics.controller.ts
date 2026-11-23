import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsBestSellingQueryDto,
  AnalyticsInventoryValuationQueryDto,
  AnalyticsOrdersQueryDto,
  AnalyticsOverviewQueryDto,
  AnalyticsProductPerformanceQueryDto,
  AnalyticsProfitQueryDto,
  AnalyticsSalesByCategoryQueryDto,
  AnalyticsSalesQueryDto,
} from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Sales & Profit Analytics (admin dashboards).
 *
 * Read-only, aggregation-only surface: every endpoint is scoped to the
 * management roles so customer-facing tokens can never reach it. All figures are
 * produced by PostgreSQL against the live tables — see {@link AnalyticsService}.
 * Effective base path is `/api/v1/analytics` (global prefix `api/v1`).
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER', 'MARKETING_MANAGER')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'نظرة عامة: المبيعات والأرباح والمخزون وأهم التصنيفات والمنتجات' })
  @ApiResponse({ status: 200, description: 'تم توليد النظرة العامة بنجاح' })
  @Get('overview')
  async overview(@Query() query: AnalyticsOverviewQueryDto) {
    return this.analyticsService.overview(query);
  }

  @ApiOperation({ summary: 'تحليل المبيعات: ملخص واتجاه زمني وتوزيع حسب الحالة والتصنيف' })
  @ApiResponse({ status: 200, description: 'تم توليد تحليل المبيعات بنجاح' })
  @Get('sales')
  async sales(@Query() query: AnalyticsSalesQueryDto) {
    return this.analyticsService.sales(query);
  }

  @ApiOperation({ summary: 'المبيعات حسب التصنيف مع الإيراد والتكلفة والهامش' })
  @ApiResponse({ status: 200, description: 'تم توليد المبيعات حسب التصنيف بنجاح' })
  @Get('sales-by-category')
  async salesByCategory(@Query() query: AnalyticsSalesByCategoryQueryDto) {
    return this.analyticsService.salesByCategory(query);
  }

  @ApiOperation({ summary: 'المنتجات الأكثر مبيعاً (مرتبة وقابلة للترقيم)' })
  @ApiResponse({ status: 200, description: 'تم توليد قائمة المنتجات الأكثر مبيعاً بنجاح' })
  @Get('best-selling-products')
  async bestSellingProducts(@Query() query: AnalyticsBestSellingQueryDto) {
    return this.analyticsService.bestSellingProducts(query);
  }

  @ApiOperation({ summary: 'تحليل الأرباح: إجمالي/صافي الربح والهامش والاتجاه الزمني' })
  @ApiResponse({ status: 200, description: 'تم توليد تحليل الأرباح بنجاح' })
  @Get('profit')
  async profit(@Query() query: AnalyticsProfitQueryDto) {
    return this.analyticsService.profit(query);
  }

  @ApiOperation({ summary: 'تقييم المخزون الحالي (متوسط التكلفة المرجّح) مع تنبيهات النقص' })
  @ApiResponse({ status: 200, description: 'تم توليد تقييم المخزون بنجاح' })
  @Get('inventory-valuation')
  async inventoryValuation(@Query() query: AnalyticsInventoryValuationQueryDto) {
    return this.analyticsService.inventoryValuation(query);
  }

  @ApiOperation({ summary: 'تحليل الطلبات: توزيع الحالات والدفع والاتجاه وأحدث الطلبات' })
  @ApiResponse({ status: 200, description: 'تم توليد تحليل الطلبات بنجاح' })
  @Get('orders')
  async orders(@Query() query: AnalyticsOrdersQueryDto) {
    return this.analyticsService.orders(query);
  }

  @ApiOperation({ summary: 'أداء المنتجات: المبيعات والتكلفة والربح والمخزون الحالي' })
  @ApiResponse({ status: 200, description: 'تم توليد أداء المنتجات بنجاح' })
  @Get('product-performance')
  async productPerformance(@Query() query: AnalyticsProductPerformanceQueryDto) {
    return this.analyticsService.productPerformance(query);
  }
}
