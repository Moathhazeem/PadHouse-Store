import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethodType {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  PALPAY = 'PALPAY',
  MAHFAZATI = 'MAHFAZATI',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

/**
 * Canonical order lifecycle used by both the website and the mobile app.
 * The Arabic labels are the single source of truth returned by the API.
 */
export const ORDER_STATUSES = [
  { status: 'PENDING', labelAr: 'طلب جديد' },
  { status: 'UNDER_REVIEW', labelAr: 'قيد التأكيد' },
  { status: 'CONFIRMED', labelAr: 'تم التأكيد' },
  { status: 'PREPARING', labelAr: 'قيد التجهيز' },
  { status: 'SHIPPED', labelAr: 'خرج للتوصيل' },
  { status: 'DELIVERED', labelAr: 'تم التسليم' },
  { status: 'CANCELLED', labelAr: 'ملغي' },
] as const;

export const ORDER_STATUS_VALUES = ORDER_STATUSES.map((s) => s.status);

export class CreateOrderDto {
  @ApiProperty({ example: 'رام الله والبيرة' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'الماصيون، قرب قصر الثقافة' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiPropertyOptional({ example: '+970 59 912 3456' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @ApiPropertyOptional({ example: 'SAVE10' })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'GIFT-AB12CD34' })
  @IsString()
  @IsOptional()
  giftCardCode?: string;

  @ApiPropertyOptional({ example: 'يرجى الاتصال قبل الوصول' })
  @IsString()
  @IsOptional()
  customerNotes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUS_VALUES, example: 'SHIPPED' })
  @IsIn(ORDER_STATUS_VALUES as unknown as string[])
  status: string;

  @ApiPropertyOptional({ example: 'تم تسليم الشحنة لشركة التوصيل' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'تغيير في خطة الشراء' })
  @IsString()
  @IsOptional()
  reason?: string;
}
