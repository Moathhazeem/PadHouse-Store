import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ForecastingService } from './forecasting.service';
import { ForecastRunsQueryDto, GenerateForecastDto } from './dto/generate-forecast.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ForecastingDashboardService } from './forecasting-dashboard.service';
import { CreateRecommendationPurchaseOrderDto, ForecastConfigurationDto, ForecastingQueryDto, ReplenishmentOverrideDto } from './dto/forecasting-query.dto';
import { StockoutPredictionService } from './stockout-prediction.service';
import { ReplenishmentService } from './replenishment.service';
import { CreateBulkRecommendationPurchaseOrderDto } from './dto/forecasting-query.dto';

interface AuthUser { id: string; fullName: string; }

@ApiTags('Demand Forecasting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
@Controller('forecasting')
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService, private readonly dashboard: ForecastingDashboardService, private readonly stockoutPrediction: StockoutPredictionService, private readonly replenishment: ReplenishmentService) {}

  @Get('overview') @ApiOperation({ summary: 'Forecast dashboard summary from the latest saved run.' })
  overview() { return this.dashboard.overview(); }
  @Get('demand') @ApiOperation({ summary: 'Paginated saved demand forecasts.' })
  demand(@Query() query: ForecastingQueryDto) { return this.dashboard.demand(query); }
  @Get('stockout-predictions') @ApiOperation({ summary: 'Products projected to reach zero stock within configured lead time.' })
  stockouts(@Query() query: ForecastingQueryDto) { return this.stockoutPrediction.predictions(query); }
  @Get('recommendations') @ApiOperation({ summary: 'Paginated replenishment recommendations.' })
  recommendations(@Query() query: ForecastingQueryDto) { return this.dashboard.recommendations(query); }
  @Patch('recommendations/:productId/override') @ApiOperation({ summary: 'Override a replenishment quantity and optional safety stock.' })
  overrideRecommendation(@Param('productId', new ParseUUIDPipe()) productId: string, @Body() dto: ReplenishmentOverrideDto) { return this.replenishment.override(productId, dto.recommendedQuantity, dto.safetyStockOverride); }
  @Get('overstock') @ApiOperation({ summary: 'Products with forecast stock coverage above configured threshold.' })
  overstock(@Query() query: ForecastingQueryDto) { return this.dashboard.overstock(query); }
  @Get('trends') @ApiOperation({ summary: 'Forecast trends across the latest 12 saved runs.' })
  trends(@Query() query: ForecastingQueryDto) { return this.dashboard.trends(query); }
  @Get('accuracy') @ApiOperation({ summary: 'Walk-forward backtest accuracy for the latest saved run.' })
  accuracy(@Query() query: ForecastingQueryDto) { return this.dashboard.accuracy(query); }
  @Post('evaluate') @ApiOperation({ summary: 'Evaluate completed saved forecast dates against recorded sales.' })
  evaluate() { return this.dashboard.evaluateCompleted(); }
  @Get('products/:productId') @ApiOperation({ summary: 'Recent saved forecasts for one product.' })
  product(@Param('productId', new ParseUUIDPipe()) productId: string) { return this.dashboard.product(productId); }
  @Get('configuration') @ApiOperation({ summary: 'Read forecasting configuration.' })
  configuration() { return this.dashboard.configuration(); }
  @Patch('configuration') @ApiOperation({ summary: 'Update forecasting thresholds and generation defaults.' })
  updateConfiguration(@Body() dto: ForecastConfigurationDto, @CurrentUser() user: AuthUser) { return this.dashboard.updateConfiguration(dto, user.id); }
  @Post('generate') @ApiOperation({ summary: 'Generate and persist forecasts from historical sales.' })
  generate(@Body() dto: GenerateForecastDto) { return this.forecastingService.generate(dto); }
  @Get('runs') @ApiOperation({ summary: 'List saved forecast runs.' })
  listRuns(@Query() dto: ForecastRunsQueryDto) { return this.forecastingService.listRuns(dto); }
  @Get('runs/:id') @ApiOperation({ summary: 'Read a saved forecast run and product forecasts.' })
  getRun(@Param('id', new ParseUUIDPipe()) id: string) { return this.forecastingService.getRun(id); }
  @Post('recommendations/:id/create-purchase-order') @ApiOperation({ summary: 'Create a draft purchase order from an active forecast recommendation.' })
  createPurchaseOrder(@Param('id', new ParseUUIDPipe()) productId: string, @Body() dto: CreateRecommendationPurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.dashboard.createPurchaseOrder(productId, dto, user);
  }
  @Post('recommendations/create-purchase-order') @ApiOperation({ summary: 'Create reviewed draft purchase orders for selected replenishment recommendations.' })
  createPurchaseOrders(@Body() dto: CreateBulkRecommendationPurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.dashboard.createPurchaseOrders(dto, user);
  }
}
