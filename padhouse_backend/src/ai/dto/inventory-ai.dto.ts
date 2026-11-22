import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Filters for the AI reorder-suggestion analysis. Every field is optional; with
 * an empty query the analysis runs across the whole active catalog.
 */
export class ReorderSuggestionsDto {
  @ApiPropertyOptional({ description: 'فلترة التحليل على فئة واحدة' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoryId?: string;

  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: 'نافذة حساب متوسط المبيعات بالأيام (1–365)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'نافذة المبيعات يجب أن تكون عدداً صحيحاً' })
  @Min(1)
  @Max(365)
  windowDays?: number = 30;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'الحد الأقصى لعدد المنتجات المقترحة (1–100)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'الحد يجب أن يكون عدداً صحيحاً' })
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * An explicit administrator request to draft purchase orders for the products
 * that need restocking. The assistant only ever creates DRAFT orders for review;
 * approval, sending and goods receipt remain manual, guarded actions.
 */
export class CreateDraftPurchaseOrderDto {
  @ApiPropertyOptional({
    example: 'أنشئ أمر شراء للمنتجات التي تحتاج إعادة توريد',
    description: 'طلب المدير باللغة الطبيعية (اختياري — يُستخدم لصياغة الرد)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  message?: string;

  @ApiPropertyOptional({ description: 'تثبيت مورد واحد لكل بنود المسودة (اختياري)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  supplierId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'حصر المسودة على منتجات محددة (اختياري). تُقبل فقط المنتجات التي تحتاج توريداً.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: 'نافذة حساب متوسط المبيعات بالأيام (1–365)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'نافذة المبيعات يجب أن تكون عدداً صحيحاً' })
  @Min(1)
  @Max(365)
  windowDays?: number = 30;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'الحد الأقصى لعدد البنود في المسودة (1–100)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'الحد يجب أن يكون عدداً صحيحاً' })
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: '2026-12-01', description: 'تاريخ التسليم المتوقع (اختياري)' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ التسليم المتوقع غير صالح' })
  expectedAt?: string;

  @ApiPropertyOptional({ description: 'ملاحظات إضافية تُحفظ على أمر الشراء' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
