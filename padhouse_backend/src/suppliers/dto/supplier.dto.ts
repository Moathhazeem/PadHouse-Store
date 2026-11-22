import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SupplierStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Supplier phone: international-friendly format. Accepts an optional leading
 * `+` plus digits with the usual separators (spaces, dashes, parentheses).
 * The digit-count sanity check (7–15) is enforced again in the service.
 */
export const SUPPLIER_PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

export class CreateSupplierDto {
  @ApiProperty({ example: 'شركة التقنية للتوريدات', description: 'اسم المورد' })
  @IsString()
  @IsNotEmpty({ message: 'اسم المورد مطلوب' })
  @MaxLength(120, { message: 'اسم المورد طويل جداً' })
  name: string;

  @ApiPropertyOptional({ example: 'Tech Supply Co.', description: 'اسم الشركة' })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'اسم الشركة طويل جداً' })
  company?: string;

  @ApiPropertyOptional({ example: 'أحمد خالد', description: 'اسم جهة الاتصال' })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'اسم جهة الاتصال طويل جداً' })
  contactName?: string;

  @ApiProperty({ example: '0599123456', description: 'رقم الهاتف' })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  @Matches(SUPPLIER_PHONE_PATTERN, { message: 'رقم الهاتف غير صالح' })
  phone: string;

  @ApiPropertyOptional({ example: 'sales@techsupply.ps', description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @MaxLength(160, { message: 'البريد الإلكتروني طويل جداً' })
  email?: string;

  @ApiPropertyOptional({ example: 'شارع الصناعة، المنطقة الصناعية', description: 'العنوان' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'العنوان طويل جداً' })
  address?: string;

  @ApiPropertyOptional({ example: 'رام الله', description: 'المدينة' })
  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'اسم المدينة طويل جداً' })
  city?: string;

  @ApiPropertyOptional({ example: 'مورد معتمد لملحقات الآيباد', description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات طويلة جداً' })
  notes?: string;

  @ApiPropertyOptional({ enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SupplierStatus, { message: 'حالة المورد غير صالحة' })
  status?: SupplierStatus;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class UpdateSupplierStatusDto {
  @ApiProperty({ enum: SupplierStatus, description: 'حالة المورد (ACTIVE / INACTIVE)' })
  @IsEnum(SupplierStatus, { message: 'حالة المورد غير صالحة' })
  status: SupplierStatus;
}

export class SupplierQueryDto {
  @ApiPropertyOptional({ description: 'بحث بالاسم أو الشركة أو الهاتف أو البريد' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SupplierStatus, description: 'فلترة حسب الحالة' })
  @IsOptional()
  @IsEnum(SupplierStatus, { message: 'حالة المورد غير صالحة' })
  status?: SupplierStatus;
}
