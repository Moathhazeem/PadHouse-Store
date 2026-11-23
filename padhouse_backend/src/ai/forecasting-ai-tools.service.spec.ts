import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiController } from './ai.controller';
import { ForecastingAiToolsService } from './forecasting-ai-tools.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('Forecasting inventory assistant authorization', () => {
  it('limits tool definition and execution routes to inventory administrators', () => {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'];
    expect(Reflect.getMetadata(ROLES_KEY, AiController.prototype.forecastToolDefinitions)).toEqual(roles);
    expect(Reflect.getMetadata(ROLES_KEY, AiController.prototype.executeForecastTool)).toEqual(roles);
    expect(Reflect.getMetadata('__guards__', AiController.prototype.forecastToolDefinitions)).toHaveLength(2);
    expect(Reflect.getMetadata('__guards__', AiController.prototype.executeForecastTool)).toHaveLength(2);
  });

  it('refuses draft purchase orders until an administrator explicitly confirms', async () => {
    const inventoryAi = { createDraftPurchaseOrders: jest.fn() };
    const tools = new ForecastingAiToolsService({} as any, {} as any, {} as any, inventoryAi as any);
    await expect(tools.execute('create_draft_purchase_order', { confirmed: false }, { id: 'admin', fullName: 'Admin' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(inventoryAi.createDraftPurchaseOrders).not.toHaveBeenCalled();
  });
});
