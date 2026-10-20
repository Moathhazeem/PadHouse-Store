export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  specs: string[];
  compatibility: string;
  warranty: string;
  variants?: string[];
  colors?: string[];
};

export const PRODUCTS: Product[] = [
  {
    id: 'pencil',
    name: 'قلم الباد هاوس',
    price: 120,
    image: 'https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg',
    category: 'أقلام الآيباد',
    description: 'قلم باد هاوس للكتابة والرسم على الآيباد. المعلومات المنشورة تذكر رفض راحة اليد والشحن السريع.',
    specs: ['رفض راحة اليد', 'نحو 15 دقيقة شحن لاستخدام يقارب 9 ساعات', 'كفالة سنة واحدة حسب صفحة المنتج'],
    compatibility: 'صفحة المنتج تذكر أجهزة iPad من إصدار 2018 فما بعد. تحقّق من موديل جهازك قبل الطلب.',
    warranty: 'كفالة سنة واحدة بحسب صفحة المنتج.',
  },
  {
    id: 'clear-case',
    name: 'كفر ايباد سليكون شفاف',
    price: 25,
    image: 'https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg',
    category: 'الكفرات والحافظات',
    description: 'كفر سيليكون شفاف. اختر قياس جهازك المطابق قبل الإضافة.',
    specs: ['سيليكون شفاف', 'المقاسات المنشورة: 10.2، 10.9/11، 12.9/13 إنش'],
    compatibility: 'المقاسات المنشورة فقط؛ توافق موديلات iPad المحددة غير مؤكد.',
    warranty: 'معلومات الكفالة غير متوفرة.',
    variants: ['10.2 إنش', '10.9 / 11 إنش', '12.9 / 13 إنش'],
  },
  {
    id: 'carbon-case',
    name: 'كفر ايباد سليكون غير شفاف – نقش كاربون فايبر',
    price: 45,
    image: 'https://padhouse.ps/wp-content/uploads/2025/10/Front-Black.jpg',
    category: 'الكفرات والحافظات',
    description: 'كفر سيليكون غير شفاف بنقش كاربون فايبر.',
    specs: ['نقش كاربون فايبر', 'مقاسات منشورة متعددة', 'اللون الأسود ظاهر في صورة المنتج'],
    compatibility: 'اختر المقاس المنشور المطابق؛ الموديلات المحددة غير مؤكدة.',
    warranty: 'معلومات الكفالة غير متوفرة.',
    variants: ['10.2 إنش', '10.9 / 11 إنش', '12.9 / 13 إنش'],
    colors: ['أسود'],
  },
  {
    id: 'keyboard-case',
    name: 'كفر ايباد مع كيبورد وتتش باد',
    price: 160,
    image: 'https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg',
    category: 'لوحات المفاتيح',
    description: 'كفر سيليكون غير شفاف مع كيبورد وتتش باد، باللون الأسود.',
    specs: ['كيبورد وتتش باد', 'اللون الأسود', 'مقاسات منشورة: 10.2، 10.9/11، 12.9/13 إنش'],
    compatibility: 'اختر المقاس المنشور المطابق؛ الموديلات المحددة غير مؤكدة.',
    warranty: 'معلومات الكفالة غير متوفرة.',
    variants: ['10.2 إنش', '10.9 / 11 إنش', '12.9 / 13 إنش'],
    colors: ['أسود'],
  },
  {
    id: 'cable',
    name: 'سلك شاحن تايب سي إلى ايفون — Yesido CA153',
    price: 35,
    image: 'https://padhouse.ps/wp-content/uploads/2025/03/CA153-Cable.jpg',
    category: 'الشواحن والكابلات',
    description: 'سلك Yesido CA153 من Type‑C إلى iPhone.',
    specs: ['الموديل: Yesido CA153', 'Type‑C إلى iPhone', 'الطول والقدرة غير متوفرين'],
    compatibility: 'التوافق مع iPad غير مؤكد؛ اتجاه السلك المنشور إلى iPhone.',
    warranty: 'معلومات الكفالة غير متوفرة.',
  },
];

export const CATEGORIES = [
  { id: 'styluses', name: 'أقلام الآيباد', icon: 'pencil-outline' },
  { id: 'cases', name: 'الكفرات والحافظات', icon: 'shield-checkmark-outline' },
  { id: 'keyboards', name: 'لوحات المفاتيح', icon: 'keypad-outline' },
  { id: 'screen-protection', name: 'حمايات الشاشة', icon: 'scan-outline' },
  { id: 'chargers', name: 'الشواحن والكابلات', icon: 'flash-outline' },
  { id: 'stands', name: 'المساند والحوامل', icon: 'phone-portrait-outline' },
  { id: 'adapters', name: 'المحولات والملحقات', icon: 'git-compare-outline' },
];

export const DELIVERY_FEES: Record<string, number> = {
  'الضفة الغربية': 20,
  'القدس': 30,
  'مناطق 48': 70,
  'استلام من نابلس': 0,
};

export function formatShekel(value: number) {
  return `₪ ${new Intl.NumberFormat('ar-PS', { maximumFractionDigits: 0 }).format(value)}`;
}
