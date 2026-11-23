import { BadRequestException, Injectable } from '@nestjs/common';
import { ForecastingDashboardService } from '../forecasting/forecasting-dashboard.service';
import { StockoutPredictionService } from '../forecasting/stockout-prediction.service';
import { ReplenishmentService } from '../forecasting/replenishment.service';
import { ForecastingQueryDto } from '../forecasting/dto/forecasting-query.dto';
import { CreateDraftPurchaseOrderDto } from './dto/inventory-ai.dto';
import { AiInventoryService } from './ai-inventory.service';
import { PurchaseOrderActor } from '../purchase-orders/purchase-orders.service';

/** Provider-neutral function schemas consumed by the admin assistant UI/model adapter. */
export const INVENTORY_FORECAST_TOOL_DEFINITIONS = [
  { name: 'get_demand_forecast', description: 'Read saved real demand forecasts.', parameters: { type: 'object', properties: { productId: { type: 'string' }, search: { type: 'string' }, horizonDays: { type: 'integer' } } } },
  { name: 'get_stockout_predictions', description: 'Read products predicted to stock out within configured lead time.', parameters: { type: 'object', properties: { limit: { type: 'integer' } } } },
  { name: 'get_at_risk_products', description: 'Read critical and high risk stockout products.', parameters: { type: 'object', properties: { limit: { type: 'integer' } } } },
  { name: 'get_replenishment_recommendations', description: 'Read saved forecast based replenishment recommendations.', parameters: { type: 'object', properties: { limit: { type: 'integer' } } } },
  { name: 'get_overstocked_products', description: 'Read products above configured forecast stock coverage.', parameters: { type: 'object', properties: { limit: { type: 'integer' } } } },
  { name: 'get_forecast_accuracy', description: 'Read realized accuracy from completed forecast dates.', parameters: { type: 'object', properties: { productId: { type: 'string' } } } },
  { name: 'create_draft_purchase_order', description: 'Create DRAFT purchase order(s) only after administrator review and explicit confirmation; requires supplier and quoted unit cost.', parameters: { type: 'object', properties: { confirmed: { type: 'boolean' }, supplierId: { type: 'string' }, productIds: { type: 'array', items: { type: 'string' } }, message: { type: 'string' } }, required: ['confirmed'] } },
] as const;

@Injectable()
export class ForecastingAiToolsService {
  constructor(
    private readonly dashboard: ForecastingDashboardService,
    private readonly stockouts: StockoutPredictionService,
    private readonly replenishment: ReplenishmentService,
    private readonly inventoryAi: AiInventoryService,
  ) {}

  definitions() { return INVENTORY_FORECAST_TOOL_DEFINITIONS; }

  async execute(name: string, args: Record<string, unknown>, actor: PurchaseOrderActor) {
    const query = { limit: boundedLimit(args.limit), offset: 0, ...(typeof args.productId === 'string' ? { productId: args.productId } : {}), ...(typeof args.search === 'string' ? { search: args.search } : {}), ...(typeof args.horizonDays === 'number' ? { horizonDays: args.horizonDays } : {}) } as ForecastingQueryDto;
    switch (name) {
      case 'get_demand_forecast': return this.dashboard.demand(query);
      case 'get_stockout_predictions': return this.stockouts.predictions(query);
      case 'get_at_risk_products': {
        const data = await this.stockouts.predictions({ ...query, limit: 100 });
        return { ...data, data: data.data.filter((row: any) => row.riskLevel === 'CRITICAL' || row.riskLevel === 'HIGH').slice(0, query.limit) };
      }
      case 'get_replenishment_recommendations': return this.replenishment.recommendations(query);
      case 'get_overstocked_products': return this.dashboard.overstock(query);
      case 'get_forecast_accuracy': return this.dashboard.accuracy(query);
      case 'create_draft_purchase_order': {
        if (args.confirmed !== true) throw new BadRequestException('Administrator review and explicit confirmation are required.');
        const dto = { ...args, productIds: Array.isArray(args.productIds) ? args.productIds : undefined } as CreateDraftPurchaseOrderDto;
        return this.inventoryAi.createDraftPurchaseOrders(dto, actor);
      }
      default: throw new BadRequestException('Unknown inventory forecast tool.');
    }
  }
}

function boundedLimit(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? Math.max(1, Math.min(100, value)) : 25;
}
