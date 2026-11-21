import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { USER_NOTIFICATION_TYPES } from '../notifications.service';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'خصم 20% على جميع الكفرات' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'استفد من خصم 20% على جميع كفرات الآيباد لفترة محدودة.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    enum: USER_NOTIFICATION_TYPES,
    default: 'PROMOTION',
    description: 'نوع الإشعار الموجّه للعملاء',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'بيانات إضافية للربط المباشر (اختياري)' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isUrgentCrisis?: boolean;
}
