import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ANALYTICS_GROUP_BY, AnalyticsGroupBy } from '../analytics.util';

/**
 * Query DTOs for the Sales & Profit Analytics dashboard.
 *
 * The global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted`, so
 * every parameter an endpoint accepts must be declared here — an unknown query
 * key is rejected with 400 rather than silently ignored.
 */

/** `groupBy` granularities accepted by the trend endpoints. */
const GROUP_BY_VALUES: AnalyticsGroupBy[] = [...ANALYTICS_GROUP_BY];

/** Ranked-list sort keys per endpoint. Kept as const tuples for `@IsIn`. */
export const SALES_CATEGORY_SORTS = ['revenue', 'unitsSold', 'orderCount'] as const;
export const BEST_SELLING_SORTS = ['unitsSold', 'revenue', 'orderCount'] as const;
export const PRODUCT_PERFORMANCE_SORTS = [
  'revenue',
  'unitsSold',
  'orderCount',
  'profit',
  'marginPct',
  'revenueAsc',
  'stockAsc',
] as const;
export const INVENTORY_VALUATION_SORTS = [
  'costValue',
  'retailValue',
  'currentStock',
] as const;

export type SalesCategorySort = (typeof SALES_CATEGORY_SORTS)[number];
export type BestSellingSort = (typeof BEST_SELLING_SORTS)[number];
export type ProductPerformanceSort = (typeof PRODUCT_PERFORMANCE_SORTS)[number];
export type InventoryValuationSort = (typeof INVENTORY_VALUATION_SORTS)[number];

/**
 * Fields shared by every date-scoped analytics endpoint.
 *
 * Date boundaries are applied to `Order.createdAt` in UTC: a date-only value
 * covers the whole day, a full ISO timestamp is used as the exact instant.
 */
export class AnalyticsRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'من تاريخ (شامل) — ISO' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-11-23', description: 'إلى تاريخ (شامل) — ISO' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'فلترة حسب معرّف التصنيف' })
  @IsOptional()
  @IsString({ message: 'معرّف التصنيف غير صالح' })
  categoryId?: string;
}

/** Shared ranked-list shaping: how many rows and which page. */
export class AnalyticsListQueryDto extends AnalyticsRangeQueryDto {
  @ApiPropertyOptional({ example: 10, default: 10, description: 'عدد الصفوف في القوائم المرتبة (1–100)' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'الحد يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'الحد يجب أن يكون 1 على الأقل' })
  @Max(100, { message: 'الحد لا يمكن أن يتجاوز 100' })
  limit?: number = 10;
}

/* ------------------------------------------------------------------ */

export class AnalyticsOverviewQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: GROUP_BY_VALUES,
    default: 'month',
    description: 'تجميع اتجاه المبيعات الزمني',
  })
  @IsOptional()
  @IsIn(GROUP_BY_VALUES, { message: 'قيمة groupBy غير صالحة (day|week|month)' })
  groupBy?: AnalyticsGroupBy = 'month';
}

export class AnalyticsSalesQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: GROUP_BY_VALUES,
    default: 'day',
    description: 'تجميع اتجاه المبيعات الزمني',
  })
  @IsOptional()
  @IsIn(GROUP_BY_VALUES, { message: 'قيمة groupBy غير صالحة (day|week|month)' })
  groupBy?: AnalyticsGroupBy = 'day';
}

export class AnalyticsSalesByCategoryQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: SALES_CATEGORY_SORTS,
    default: 'revenue',
    description: 'حقل الترتيب',
  })
  @IsOptional()
  @IsIn([...SALES_CATEGORY_SORTS], { message: 'قيمة sortBy غير صالحة' })
  sortBy?: SalesCategorySort = 'revenue';
}

export class AnalyticsBestSellingQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: BEST_SELLING_SORTS,
    default: 'unitsSold',
    description: 'حقل الترتيب',
  })
  @IsOptional()
  @IsIn([...BEST_SELLING_SORTS], { message: 'قيمة sortBy غير صالحة' })
  sortBy?: BestSellingSort = 'unitsSold';

  @ApiPropertyOptional({ example: 1, default: 1, description: 'رقم الصفحة' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون 1 على الأقل' })
  page?: number = 1;
}

export class AnalyticsProfitQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: GROUP_BY_VALUES,
    default: 'month',
    description: 'تجميع اتجاه الأرباح الزمني',
  })
  @IsOptional()
  @IsIn(GROUP_BY_VALUES, { message: 'قيمة groupBy غير صالحة (day|week|month)' })
  groupBy?: AnalyticsGroupBy = 'month';
}

/**
 * Inventory valuation is a point-in-time snapshot of current stock, so it does
 * not accept a date range — only category filtering, pagination and sorting.
 */
export class AnalyticsInventoryValuationQueryDto {
  @ApiPropertyOptional({ description: 'فلترة حسب معرّف التصنيف' })
  @IsOptional()
  @IsString({ message: 'معرّف التصنيف غير صالح' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'عدد الصفوف في صفحة المتغيرات (1–100)' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'الحد يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'الحد يجب أن يكون 1 على الأقل' })
  @Max(100, { message: 'الحد لا يمكن أن يتجاوز 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'رقم الصفحة' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون 1 على الأقل' })
  page?: number = 1;

  @ApiPropertyOptional({
    enum: INVENTORY_VALUATION_SORTS,
    default: 'costValue',
    description: 'حقل الترتيب',
  })
  @IsOptional()
  @IsIn([...INVENTORY_VALUATION_SORTS], { message: 'قيمة sortBy غير صالحة' })
  sortBy?: InventoryValuationSort = 'costValue';

  @ApiPropertyOptional({ example: 5, default: 5, description: 'عدد صفوف قائمة المخزون المنخفض' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'الحد يجب أن يكون عدداً صحيحاً' })
  @Min(1)
  @Max(50, { message: 'الحد لا يمكن أن يتجاوز 50' })
  lowStockLimit?: number = 5;
}

export class AnalyticsOrdersQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: GROUP_BY_VALUES,
    default: 'day',
    description: 'تجميع اتجاه الطلبات الزمني',
  })
  @IsOptional()
  @IsIn(GROUP_BY_VALUES, { message: 'قيمة groupBy غير صالحة (day|week|month)' })
  groupBy?: AnalyticsGroupBy = 'day';

  @ApiPropertyOptional({ example: 1, default: 1, description: 'رقم الصفحة' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون 1 على الأقل' })
  page?: number = 1;
}

export class AnalyticsProductPerformanceQueryDto extends AnalyticsListQueryDto {
  @ApiPropertyOptional({
    enum: PRODUCT_PERFORMANCE_SORTS,
    default: 'revenue',
    description: 'حقل الترتيب',
  })
  @IsOptional()
  @IsIn([...PRODUCT_PERFORMANCE_SORTS], { message: 'قيمة sortBy غير صالحة' })
  sortBy?: ProductPerformanceSort = 'revenue';

  @ApiPropertyOptional({ example: 1, default: 1, description: 'رقم الصفحة' })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون 1 على الأقل' })
  page?: number = 1;
}
