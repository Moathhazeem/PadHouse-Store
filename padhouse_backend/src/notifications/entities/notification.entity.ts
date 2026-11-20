import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationEntity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'تنبيه انخفاض المخزون' })
  title: string;

  @ApiProperty({ example: 'المنتج "كفر حماية ذكي" وصل إلى رصيد منخفض (3 قطع، الحد الأدنى: 5)' })
  message: string;

  @ApiProperty({ example: 'LOW_STOCK' })
  type: string;

  @ApiPropertyOptional({ example: '8f7d9834-45b0-4db2-947b-70c3ecba5a36' })
  productId: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-11-20T19:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-20T19:00:00.000Z' })
  updatedAt: Date;
}
