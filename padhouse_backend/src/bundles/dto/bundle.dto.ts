import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const BUNDLE_DISCOUNT_TYPES = ['PERCENT', 'FIXED'] as const;

export class BundleItemDto {
  @ApiProperty({ example: 'prod-01' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBundleDto {
  @ApiProperty({ example: 'ipad-complete-setup' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'طقم iPad الكامل' })
  @IsString()
  @IsNotEmpty()
  titleAr: string;

  @ApiPropertyOptional({ example: 'قلم + حافظة + لوحة مفاتيح بسعر مميز' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ enum: BUNDLE_DISCOUNT_TYPES, example: 'PERCENT' })
  @IsIn(BUNDLE_DISCOUNT_TYPES as unknown as string[])
  discountType: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [BundleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  items: BundleItemDto[];
}
