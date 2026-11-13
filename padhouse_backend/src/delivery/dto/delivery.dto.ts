import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePhoneDto {
  @ApiProperty({ example: '0599123456' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
