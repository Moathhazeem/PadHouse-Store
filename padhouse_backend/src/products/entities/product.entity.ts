import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductEntity {
  @ApiProperty({ example: '8f7d9834-45b0-4db2-947b-70c3ecba5a36' })
  id: string;

  @ApiProperty({ example: 'PH-CASE-001' })
  sku: string;

  @ApiProperty({ example: 'كفر حماية ذكي لجهاز آيباد برو' })
  nameAr: string;

  @ApiProperty({ example: 'Smart Folio Case for iPad Pro' })
  nameEn: string;

  @ApiProperty({ example: 'كفر حماية عالي الجودة مع حامل قلم مدمج' })
  descriptionAr: string;

  @ApiProperty({ example: 'Premium smart folio case with built-in pencil holder' })
  descriptionEn: string;

  @ApiProperty({ example: 'category-uuid' })
  categoryId: string;

  @ApiProperty({ example: 120.0 })
  basePrice: number;

  @ApiPropertyOptional({ example: 99.0 })
  salePrice?: number | null;

  @ApiProperty({ example: 25, default: 0, description: 'Current available quantity' })
  stock: number;

  @ApiProperty({ example: 5, default: 5, description: 'Minimum stock alert threshold' })
  minStock: number;

  @ApiProperty({ example: 100, default: 100, description: 'Maximum inventory target capacity' })
  maxStock: number;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: ['iPad Pro 11 (M4)', 'iPad Air 11 (M2)'] })
  ipadCompatibility: string[];

  @ApiProperty({ example: 12 })
  warrantyMonths: number;

  @ApiProperty({ example: '2026-11-20T19:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-20T19:00:00.000Z' })
  updatedAt: Date;
}
