import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_SHIPPING_FEE,
  GOVERNORATES,
  PAYMENT_METHODS,
  SHIPPING_FEE_BY_CITY,
  STORE_POLICIES,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP,
} from '../common/data/palestine';
import {
  formatPalestinianPhone,
  isValidPalestinianPhone,
  normalizePalestinianPhone,
} from '../common/utils/phone.util';

@Injectable()
export class DeliveryService {
  getGovernorates() {
    return GOVERNORATES;
  }

  getDeliveryZones() {
    return GOVERNORATES.flatMap((governorate) =>
      governorate.cities.map((city) => ({
        governorate: governorate.nameAr,
        region: governorate.region,
        city: city.name,
        fee: city.fee,
        etaDays: city.etaDays,
      })),
    );
  }

  quote(city: string) {
    if (!city || !city.trim()) {
      throw new BadRequestException('يرجى تحديد المدينة');
    }
    const trimmed = city.trim();
    const fee = SHIPPING_FEE_BY_CITY[trimmed];
    if (fee === undefined) {
      throw new BadRequestException('التوصيل غير متاح لهذه المدينة حالياً');
    }
    const zone = this.getDeliveryZones().find((z) => z.city === trimmed);
    return {
      city: trimmed,
      fee,
      etaDays: zone?.etaDays ?? '1-3 أيام',
      available: true,
    };
  }

  validatePhone(phone: string) {
    const valid = isValidPalestinianPhone(phone);
    return {
      valid,
      normalized: valid ? normalizePalestinianPhone(phone) : null,
      formatted: valid ? formatPalestinianPhone(phone) : null,
      message: valid
        ? 'رقم هاتف فلسطيني صحيح'
        : 'يرجى إدخال رقم هاتف فلسطيني صحيح (مثال: 0599123456)',
    };
  }

  getPaymentMethods() {
    return PAYMENT_METHODS.filter((method) => method.enabled);
  }

  getPolicies() {
    return {
      ...STORE_POLICIES,
      support: {
        phone: SUPPORT_PHONE,
        whatsapp: SUPPORT_WHATSAPP,
        whatsappUrl: `https://wa.me/${SUPPORT_WHATSAPP}`,
      },
    };
  }
}
