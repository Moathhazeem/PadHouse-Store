import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'توريد جديد من المصنع' })
  @IsString()
  @IsOptional()
  notes?: string;
}

