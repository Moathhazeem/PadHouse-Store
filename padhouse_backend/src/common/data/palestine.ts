/**
 * Verified Palestinian market data: governorates, cities, delivery fees,
 * supported payment methods and store policies.
 * Both clients must read delivery fees and payment methods from here (via API)
 * so the online store and the mobile app can never diverge.
 */

export interface CityZone {
  name: string;
  fee: number;
  etaDays: string;
}

export interface Governorate {
  id: string;
  nameAr: string;
  region: 'الضفة الغربية' | 'قطاع غزة' | 'القدس';
  cities: CityZone[];
}

export const GOVERNORATES: Governorate[] = [
  {
    id: 'jerusalem',
    nameAr: 'محافظة القدس',
    region: 'القدس',
    cities: [{ name: 'القدس وضواحيها', fee: 30, etaDays: '1-2 يوم' }],
  },
  {
    id: 'ramallah',
    nameAr: 'محافظة رام الله والبيرة',
    region: 'الضفة الغربية',
    cities: [
      { name: 'رام الله والبيرة', fee: 20, etaDays: '1 يوم' },
      { name: 'بيتونيا', fee: 20, etaDays: '1 يوم' },
      { name: 'روابي', fee: 20, etaDays: '1 يوم' },
    ],
  },
  {
    id: 'nablus',
    nameAr: 'محافظة نابلس',
    region: 'الضفة الغربية',
    cities: [{ name: 'نابلس', fee: 25, etaDays: '1-2 يوم' }],
  },
  {
    id: 'hebron',
    nameAr: 'محافظة الخليل',
    region: 'الضفة الغربية',
    cities: [{ name: 'الخليل', fee: 25, etaDays: '1-2 يوم' }],
  },
  {
    id: 'bethlehem',
    nameAr: 'محافظة بيت لحم',
    region: 'الضفة الغربية',
    cities: [
      { name: 'بيت لحم', fee: 25, etaDays: '1-2 يوم' },
      { name: 'بيت جالا', fee: 25, etaDays: '1-2 يوم' },
    ],
  },
  {
    id: 'jenin',
    nameAr: 'محافظة جنين',
    region: 'الضفة الغربية',
    cities: [{ name: 'جنين', fee: 25, etaDays: '2 يوم' }],
  },
  {
    id: 'tulkarm',
    nameAr: 'محافظة طولكرم',
    region: 'الضفة الغربية',
    cities: [{ name: 'طولكرم', fee: 25, etaDays: '2 يوم' }],
  },
  {
    id: 'qalqilya',
    nameAr: 'محافظة قلقيلية',
    region: 'الضفة الغربية',
    cities: [{ name: 'قلقيلية', fee: 25, etaDays: '1-2 يوم' }],
  },
  {
    id: 'jericho',
    nameAr: 'محافظة أريحا والأغوار',
    region: 'الضفة الغربية',
    cities: [{ name: 'أريحا والأغوار', fee: 25, etaDays: '2 يوم' }],
  },
  {
    id: 'salfit',
    nameAr: 'محافظة سلفيت',
    region: 'الضفة الغربية',
    cities: [{ name: 'سلفيت', fee: 25, etaDays: '1-2 يوم' }],
  },
  {
    id: 'tubas',
    nameAr: 'محافظة طوباس',
    region: 'الضفة الغربية',
    cities: [{ name: 'طوباس', fee: 25, etaDays: '2 يوم' }],
  },
  {
    id: 'north-gaza',
    nameAr: 'محافظة شمال غزة',
    region: 'قطاع غزة',
    cities: [{ name: 'شمال غزة', fee: 35, etaDays: '2-4 أيام' }],
  },
  {
    id: 'gaza',
    nameAr: 'محافظة غزة',
    region: 'قطاع غزة',
    cities: [{ name: 'غزة', fee: 35, etaDays: '2-4 أيام' }],
  },
  {
    id: 'deir-al-balah',
    nameAr: 'محافظة دير البلح',
    region: 'قطاع غزة',
    cities: [{ name: 'دير البلح', fee: 35, etaDays: '2-4 أيام' }],
  },
  {
    id: 'khan-younis',
    nameAr: 'محافظة خان يونس',
    region: 'قطاع غزة',
    cities: [{ name: 'خان يونس', fee: 35, etaDays: '2-4 أيام' }],
  },
  {
    id: 'rafah',
    nameAr: 'محافظة رفح',
    region: 'قطاع غزة',
    cities: [{ name: 'رفح', fee: 35, etaDays: '2-4 أيام' }],
  },
];

export const SHIPPING_FEE_BY_CITY: Record<string, number> = GOVERNORATES.reduce(
  (acc, governorate) => {
    governorate.cities.forEach((city) => {
      acc[city.name] = city.fee;
    });
    return acc;
  },
  {} as Record<string, number>,
);

export const DEFAULT_SHIPPING_FEE = 25;

/**
 * Payment methods actually supported by the current integration.
 * Only `enabled` methods are returned to customers so the storefront never
 * advertises a method that cannot be processed end to end.
 */
export interface PaymentMethodInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  enabled: boolean;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'CASH_ON_DELIVERY',
    nameAr: 'الدفع عند الاستلام',
    nameEn: 'Cash on Delivery',
    description: 'ادفع نقداً لمندوب التوصيل عند استلام طلبك في جميع المحافظات.',
    enabled: true,
  },
  {
    id: 'PALPAY',
    nameAr: 'بالباي (PalPay)',
    nameEn: 'PalPay',
    description: 'الدفع الإلكتروني عبر محفظة بالباي. سيتم تفعيله بعد ربط بوابة الدفع.',
    enabled: false,
  },
  {
    id: 'MAHFAZATI',
    nameAr: 'محفظتي',
    nameEn: 'Mahfazati',
    description: 'الدفع عبر محفظة محفظتي. سيتم تفعيله بعد ربط بوابة الدفع.',
    enabled: false,
  },
  {
    id: 'BANK_TRANSFER',
    nameAr: 'حوالة بنكية',
    nameEn: 'Bank Transfer',
    description: 'تحويل بنكي يدوي. سيتم تفعيله بعد تجهيز بيانات الحساب البنكي وآلية تأكيد التحويل.',
    enabled: false,
  },
];

export const SUPPORT_PHONE = '+970599000000';
export const SUPPORT_WHATSAPP = '970599000000';

export const STORE_POLICIES = {
  exchange: {
    titleAr: 'سياسة الاستبدال',
    summaryAr: 'يمكنك استبدال المنتج خلال 7 أيام من الاستلام بشرط أن يكون بحالته الأصلية وبتغليفه الكامل.',
    detailsAr: [
      'يشترط تقديم رقم الطلب أو فاتورة الشراء.',
      'يجب أن يكون المنتج غير مستخدم وبتغليفه الأصلي مع كافة الملحقات.',
      'العيوب المصنعية تُستبدل مجاناً خلال فترة الضمان.',
      'المنتجات التالفة بسبب سوء الاستخدام لا تخضع للاستبدال.',
    ],
  },
  return: {
    titleAr: 'سياسة الاسترجاع',
    summaryAr: 'يمكنك طلب إرجاع المنتج خلال 7 أيام من الاستلام واسترداد المبلغ حسب طريقة الدفع.',
    detailsAr: [
      'يتم استرداد المبلغ نقداً عند الاستلام للطلبات المدفوعة عند الاستلام، أو تحويلاً للطلبات الإلكترونية.',
      'تُعاد رسوم التوصيل في حال كان الإرجاع بسبب خطأ من بادهاوس.',
      'يتم معالجة طلبات الإرجاع خلال 3 أيام عمل من استلام المنتج.',
      'المنتجات المخصصة أو المطبوعة حسب الطلب غير قابلة للإرجاع.',
    ],
  },
  warranty: {
    titleAr: 'سياسة الضمان',
    summaryAr: 'جميع المنتجات الأصلية مكفولة ضد العيوب المصنعية لمدة الضمان المعلنة لكل منتج.',
    detailsAr: [
      'تبدأ فترة الضمان من تاريخ استلام الطلب.',
      'يشمل الضمان العيوب المصنعية فقط ولا يشمل الكسر أو السوائل أو سوء الاستخدام.',
      'يتم إصلاح أو استبدال المنتج المعطوب خلال فترة الضمان مجاناً.',
      'يمكن التحقق من حالة الضمان عبر رقم الطلب من صفحة "ضماناتي".',
    ],
  },
};
