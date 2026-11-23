import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class ForecastingQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 25;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset = 0;

  @ApiPropertyOptional() @IsOptional() @IsUUID('4')
  productId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Forecast horizon in days.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90)
  horizonDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;
}

export class ForecastConfigurationDto {
  @ApiPropertyOptional({ description: 'Enable daily backend forecast generation.' })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  scheduledForecastingEnabled?: boolean;

  @ApiPropertyOptional({ example: '02:00', description: 'Daily run time in server local time, HH:mm.' })
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  scheduledForecastingTime?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 90 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90)
  alertStockoutDays?: number;

  @ApiPropertyOptional({ minimum: 0.01, maximum: 2 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(2)
  alertAccuracyWapeThreshold?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 365 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(30) @Max(365)
  alertOverstockDays?: number;

  @ApiPropertyOptional({ enum: ['SERVICE_LEVEL'] })
  @IsOptional() @IsIn(['SERVICE_LEVEL'])
  safetyStockMethod?: string;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 3.5, default: 1.65 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(3.5)
  safetyStockZScore?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 90, default: 30 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90)
  replenishmentPeriodDays?: number;
  @ApiPropertyOptional({ minimum: 90, maximum: 1095 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(90) @Max(1095)
  historyDays?: number;

  @ApiPropertyOptional({ type: [Number], enum: [7, 14, 30] })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @Type(() => Number) @IsInt({ each: true })
  movingAverageWindows?: number[];

  @ApiPropertyOptional({ minimum: 1, maximum: 90 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90)
  defaultHorizonDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 180 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(180)
  stockoutLeadDays?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 365 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(30) @Max(365)
  overstockCoverDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 30, default: 2 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  stockoutCriticalDays?: number;

  @ApiPropertyOptional({ minimum: 2, maximum: 60, default: 7 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) @Max(60)
  stockoutHighRiskDays?: number;

  @ApiPropertyOptional({ minimum: 3, maximum: 90, default: 14 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(3) @Max(90)
  stockoutMediumRiskDays?: number;
}

export class ReplenishmentOverrideDto {
  @ApiProperty({ minimum: 0, description: 'Administrator approved quantity; explicit override may exceed maximum stock.' })
  @Type(() => Number) @IsInt() @Min(0)
  recommendedQuantity: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Optional administrator safety-stock override.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  safetyStockOverride?: number;
}

export class CreateRecommendationPurchaseOrderDto {
  @ApiProperty({ description: 'Select an active supplier for the draft purchase order.' })
  @IsUUID('4')
  supplierId: string;

  @ApiProperty({ minimum: 0, description: 'Unit cost from supplier quote.' })
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost: number;
}

export class CreateBulkRecommendationPurchaseOrderDto {
  @ApiProperty({ type: [String], description: 'Selected product IDs from the current replenishment recommendations.' })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsUUID('4', { each: true })
  productIds: string[];

  @ApiPropertyOptional({ description: 'Explicit administrator confirmation after reviewing selected recommendations.' })
  @IsOptional() @IsIn([true])
  confirmed?: true;
}
