import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { IsGreaterThanOrEqualTo } from '../../common/validators/is-greater-than-or-equal.validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ example: 20, description: 'Updated current stock quantity' })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 5, description: 'Minimum stock alert threshold' })
  @IsInt()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum inventory target capacity' })
  @IsInt()
  @IsOptional()
  @IsGreaterThanOrEqualTo('minStock', {
    message: 'maxStock must be greater than or equal to minStock',
  })
  maxStock?: number;
}
