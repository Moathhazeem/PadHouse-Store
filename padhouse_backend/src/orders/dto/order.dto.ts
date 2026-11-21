import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
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

/** Arabic label lookup shared by notifications and both clients. */
export const ORDER_STATUS_LABELS: Record<string, string> = ORDER_STATUSES.reduce(
  (acc, s) => {
    acc[s.status] = s.labelAr;
    return acc;
  },
  {} as Record<string, string>,
);

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

/**
 * Admin-entered live tracking. Today these are plain text locations resolved to
 * approximate coordinates; the same fields accept explicit lat/lng so real-time
 * GPS / live-location tracking can be wired in later without a schema change.
 */
export class UpdateOrderTrackingDto {
  @ApiPropertyOptional({ example: 'نقطة تفتيش حوارة - قرب نابلس' })
  @IsString()
  @IsOptional()
  courierLocation?: string;

  @ApiPropertyOptional({ example: 'رام الله والبيرة' })
  @IsString()
  @IsOptional()
  destinationLocation?: string;

  @ApiPropertyOptional({ example: 32.2211, description: 'خط عرض موقع المندوب (اختياري - للملء التلقائي عبر GPS لاحقاً)' })
  @IsNumber()
  @IsOptional()
  originLat?: number;

  @ApiPropertyOptional({ example: 35.2544, description: 'خط طول موقع المندوب (اختياري)' })
  @IsNumber()
  @IsOptional()
  originLng?: number;

  @ApiPropertyOptional({ example: 31.9038, description: 'خط عرض وجهة التسليم (اختياري)' })
  @IsNumber()
  @IsOptional()
  destLat?: number;

  @ApiPropertyOptional({ example: 35.2034, description: 'خط طول وجهة التسليم (اختياري)' })
  @IsNumber()
  @IsOptional()
  destLng?: number;

  @ApiPropertyOptional({ example: 90, description: 'مدة تقديرية يدوية بالدقائق. عند إرسالها تتجاوز الحساب التلقائي.' })
  @IsInt()
  @Min(1)
  @IsOptional()
  manualEtaMinutes?: number;

  @ApiPropertyOptional({ example: 'خرج المندوب من رام الله' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/** Enables the reusable "Urgent Crisis" red-alert state on an order. */
export class EnableUrgentCrisisDto {
  @ApiPropertyOptional({ example: 'CHECKPOINT', description: 'نوع الأزمة (مثال: CHECKPOINT / ROAD_CLOSURE / EMERGENCY)' })
  @IsString()
  @IsOptional()
  crisisType?: string;

  @ApiPropertyOptional({ example: 'إغلاق نقطة تفتيش حوارة بين نابلس ورام الله' })
  @IsString()
  @IsOptional()
  crisisReason?: string;

  @ApiPropertyOptional({ example: 'تعذر عبور نقطة التفتيش حالياً' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/** Resolves the crisis and returns the order to its normal tracking state. */
export class ResolveUrgentCrisisDto {
  @ApiPropertyOptional({ example: 'تم فتح الطريق واستئناف التوصيل' })
  @IsString()
  @IsOptional()
  notes?: string;
}
