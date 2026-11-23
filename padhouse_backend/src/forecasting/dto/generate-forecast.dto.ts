import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GenerateForecastDto {
  @ApiPropertyOptional({ description: 'Forecast selected products only; omitted means all active products.' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Optional product category filter.' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ default: 730, minimum: 90, maximum: 1095 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(90)
  @Max(1095)
  historyDays = 730;

  @ApiPropertyOptional({ enum: [7, 14, 30], isArray: true, description: 'Moving-average windows compared during backtesting.' })
  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value.map(Number) : String(value).split(',').map(Number))
  @IsArray()
  @IsInt({ each: true })
  movingAverageWindows: number[] = [7, 14, 30];
}

export class ForecastRunsQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
