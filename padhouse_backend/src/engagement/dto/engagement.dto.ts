import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductRefDto {
  @ApiProperty({ example: 'prod-01' })
  @IsString()
  @IsNotEmpty()
  productId: string;
}

export class BackInStockDto {
  @ApiProperty({ example: 'prod-01' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 'guest@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0599123456' })
  @IsOptional()
  @IsString()
  phone?: string;
}
