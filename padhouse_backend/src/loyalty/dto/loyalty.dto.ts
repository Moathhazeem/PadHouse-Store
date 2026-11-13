import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(100)
  points: number;
}

export class ApplyReferralDto {
  @ApiProperty({ example: 'PAD-AB12CD' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'friend@example.com' })
  @IsOptional()
  @IsString()
  refereeEmail?: string;
}
