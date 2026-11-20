import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { IsGreaterThanOrEqualTo } from '../../common/validators/is-greater-than-or-equal.validator';

export class CreateProductDto {
  @ApiProperty({ example: 'PH-CASE-001', description: 'Product unique SKU' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'كفر حماية ذكي لجهاز آيباد برو', description: 'Arabic name' })
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({ example: 'Smart Folio Case for iPad Pro', description: 'English name' })
  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @ApiProperty({ example: 'كفر حماية عالي الجودة مع حامل قلم مدمج', description: 'Arabic description' })
  @IsString()
  @IsNotEmpty()
  descriptionAr: string;

  @ApiProperty({ example: 'Premium smart folio case with built-in pencil holder', description: 'English description' })
  @IsString()
  @IsNotEmpty()
  descriptionEn: string;

  @ApiProperty({ example: 'c4e3b123-4567-89ab-cdef-0123456789ab', description: 'Category ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 120.0, description: 'Base retail price' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: 99.0, description: 'Discounted sale price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ example: 25, default: 0, description: 'Current available stock quantity' })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number = 0;

  @ApiPropertyOptional({ example: 5, default: 5, description: 'Minimum stock alert threshold' })
  @IsInt()
  @Min(0)
  @IsOptional()
  minStock?: number = 5;

  @ApiPropertyOptional({ example: 100, default: 100, description: 'Maximum inventory target capacity' })
  @IsInt()
  @IsOptional()
  @IsGreaterThanOrEqualTo('minStock', {
    message: 'maxStock must be greater than or equal to minStock',
  })
  maxStock?: number = 100;

  @ApiPropertyOptional({ example: ['iPad Pro 11 (M4)', 'iPad Air 11 (M2)'], description: 'iPad compatible models' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipadCompatibility?: string[];

  @ApiPropertyOptional({ example: 12, default: 12, description: 'Warranty period in months' })
  @IsInt()
  @Min(0)
  @IsOptional()
  warrantyMonths?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
