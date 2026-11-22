import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Upper bound for any monetary field — guards against overflow / fat fingers. */
export const MAX_MONEY = 99_999_999.99;
/** Percentage ceiling shared by line discount and tax rates. */
export const MAX_PERCENT = 100;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * A single purchase-order line. Only `productId` is sent — the product name and
 * SKU are snapshotted from the existing catalog record so product identity is
 * referenced and never duplicated.
 */
export class PurchaseOrderItemInputDto {
  @ApiProperty({ example: 'prod-01', description: 'معرّف المنتج الموجود في الكتالوج' })
  @IsString()
  @IsNotEmpty({ message: 'معرّف المنتج مطلوب' })
  productId: string;

  @ApiProperty({ example: 25, description: 'الكمية المطلوبة' })
  @Type(() => Number)
  @IsInt({ message: 'الكمية المطلوبة يجب أن تكون عدداً صحيحاً' })
  @Min(1, { message: 'الكمية المطلوبة يجب أن تكون 1 على الأقل' })
  orderedQuantity: number;

  @ApiProperty({ example: 42.5, description: 'تكلفة شراء الوحدة (منفصلة عن سعر البيع)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'تكلفة الوحدة يجب أن تكون رقماً بمنزلتين عشريتين' })
  @Min(0, { message: 'تكلفة الوحدة لا يمكن أن تكون سالبة' })
  @Max(MAX_MONEY, { message: 'تكلفة الوحدة كبيرة جداً' })
  unitCost: number;

  @ApiPropertyOptional({ example: 5, default: 0, description: 'نسبة الخصم على السطر (%)' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'نسبة الخصم غير صالحة' })
  @Min(0, { message: 'نسبة الخصم لا يمكن أن تكون سالبة' })
  @Max(MAX_PERCENT, { message: 'نسبة الخصم لا يمكن أن تتجاوز 100%' })
  discountRate?: number = 0;

  @ApiPropertyOptional({ example: 16, default: 0, description: 'نسبة الضريبة على السطر (%)' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'نسبة الضريبة غير صالحة' })
  @Min(0, { message: 'نسبة الضريبة لا يمكن أن تكون سالبة' })
  @Max(MAX_PERCENT, { message: 'نسبة الضريبة لا يمكن أن تتجاوز 100%' })
  taxRate?: number = 0;
}

/** Fields shared by create & update. */
class PurchaseOrderBaseDto {
  @ApiPropertyOptional({ example: 'PO header note', description: 'ملاحظات عامة' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'الملاحظات طويلة جداً' })
  notes?: string;

  @ApiPropertyOptional({ example: 'ILS', description: 'رمز العملة (ISO-4217)' })
  @IsOptional()
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: 'رمز العملة يجب أن يكون 3 أحرف لاتينية كبيرة' })
  currency?: string;

  @ApiPropertyOptional({ example: 'Net 30', description: 'شروط الدفع' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'شروط الدفع طويلة جداً' })
  paymentTerms?: string;

  @ApiPropertyOptional({ example: '2026-11-23', description: 'تاريخ الطلب' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الطلب غير صالح' })
  orderDate?: string;

  @ApiPropertyOptional({ example: '2026-12-01', description: 'تاريخ التسليم المتوقع' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ التسليم المتوقع غير صالح' })
  expectedAt?: string;

  @ApiPropertyOptional({ example: 25, default: 0, description: 'تكلفة الشحن' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'تكلفة الشحن غير صالحة' })
  @Min(0, { message: 'تكلفة الشحن لا يمكن أن تكون سالبة' })
  @Max(MAX_MONEY, { message: 'تكلفة الشحن كبيرة جداً' })
  shippingCost?: number = 0;
}

export class CreatePurchaseOrderDto extends PurchaseOrderBaseDto {
  @ApiProperty({ example: 'd5a1c9e2-...', description: 'معرّف المورد' })
  @IsUUID('4', { message: 'معرّف المورد غير صالح' })
  supplierId: string;

  @ApiProperty({ type: [PurchaseOrderItemInputDto], description: 'بنود أمر الشراء' })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب إضافة بند واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items: PurchaseOrderItemInputDto[];
}

export class UpdatePurchaseOrderDto extends PurchaseOrderBaseDto {
  @ApiPropertyOptional({ example: 'd5a1c9e2-...', description: 'معرّف المورد' })
  @IsOptional()
  @IsUUID('4', { message: 'معرّف المورد غير صالح' })
  supplierId?: string;

  @ApiPropertyOptional({
    type: [PurchaseOrderItemInputDto],
    description: 'عند الإرسال تستبدل هذه القائمة كامل بنود أمر الشراء',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب إضافة بند واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items?: PurchaseOrderItemInputDto[];
}

/**
 * One line of a goods receipt: `quantityReceived` is the quantity received in
 * THIS receipt (a positive delta), not the cumulative total. It must not exceed
 * the line's remaining quantity.
 */
export class ReceiveItemDto {
  @ApiProperty({ example: '9b1d...', description: 'معرّف بند أمر الشراء' })
  @IsUUID('4', { message: 'معرّف البند غير صالح' })
  itemId: string;

  @ApiProperty({ example: 4, description: 'الكمية المستلمة فعلياً في هذا الاستلام لهذا البند' })
  @Type(() => Number)
  @IsInt({ message: 'الكمية المستلمة يجب أن تكون عدداً صحيحاً' })
  @Min(0, { message: 'الكمية المستلمة لا يمكن أن تكون سالبة' })
  quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceiveItemDto], description: 'الكميات المستلمة لكل بند' })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب تحديد كمية مستلمة لبند واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @ApiPropertyOptional({ description: 'ملاحظات الاستلام' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات طويلة جداً' })
  notes?: string;
}

/** Shared shape of the workflow action endpoints (submit / approve / reject / send). */
export class PurchaseOrderActionDto {
  @ApiPropertyOptional({ description: 'ملاحظات تُسجّل في سجل التغييرات' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات طويلة جداً' })
  notes?: string;
}

export class CancelPurchaseOrderDto {
  @ApiPropertyOptional({ description: 'سبب الإلغاء' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'السبب طويل جداً' })
  reason?: string;

  @ApiPropertyOptional({ description: 'ملاحظات إضافية' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات طويلة جداً' })
  notes?: string;
}

/**
 * Filters + shaping options for the Purchase Analytics dashboard. Every field is
 * optional; an empty query aggregates across all purchase orders.
 */
export class PurchaseAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'من تاريخ أمر الشراء (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
  from?: string;

  @ApiPropertyOptional({ description: 'إلى تاريخ أمر الشراء (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
  to?: string;

  @ApiPropertyOptional({ description: 'فلترة حسب المورد' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus, description: 'فلترة حسب حالة أمر الشراء' })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus, { message: 'حالة أمر الشراء غير صالحة' })
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'فلترة الأوامر التي تحتوي هذا المنتج ضمن بنودها' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'الحد الأقصى لعدد الصفوف في القوائم المرتبة (موردون/منتجات/أحدث الأوامر)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'حد القوائم يجب أن يكون عدداً صحيحاً' })
  @Min(1)
  @Max(50)
  topLimit?: number = 10;

  @ApiPropertyOptional({
    example: 12,
    default: 12,
    description: 'عدد الأشهر في اتجاه الإنفاق الشهري (1–24)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'عدد الأشهر يجب أن يكون عدداً صحيحاً' })
  @Min(1)
  @Max(24)
  months?: number = 12;
}

export class PurchaseOrderQueryDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus, description: 'فلترة حسب الحالة' })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus, { message: 'حالة أمر الشراء غير صالحة' })
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'فلترة حسب المورد' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'بحث برقم الأمر أو اسم/رقم المورد' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'من تاريخ (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
  from?: string;

  @ApiPropertyOptional({ description: 'إلى تاريخ (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
  to?: string;
}
