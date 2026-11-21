import { CategoryInfo } from '../types';

export const OFFICIAL_CATEGORIES: CategoryInfo[] = [
  { id: 'all', name: 'جميع المنتجات', slug: 'all', description: 'تصفح تشكيلة بادهاوس الكاملة المخصصة لأجهزة الآيباد' },
  { id: 'cat_pens', name: 'الأقلام وملحقاتها', slug: 'pens', description: 'أقلام ذكية متوافقة، رؤوس بديلة وتجربة كتابة فائقة الدقة' },
  { id: 'cat_cases', name: 'الحافظات والحقائب', slug: 'cases', description: 'حماية متكاملة ومظهر أنيق لأجهزة iPad Pro وAir وiPad 10' },
  { id: 'cat_keyboards', name: 'لوحات المفاتيح', slug: 'keyboards', description: 'كيبوردات ميكانيكية ولاسلكية مع تاتش باد تحول آيبادك إلى لابتوب' },
  { id: 'cat_stands', name: 'الحوامل والمساند', slug: 'stands', description: 'ستاندات ألمنيوم متينة وقابلة للتدوير 360 درجة للدراسة والعمل' },
  { id: 'cat_chargers', name: 'الشواحن والكابلات', slug: 'chargers', description: 'كابلات Type-C وLightning أصلية وسريعة ومعتمدة من Yesido' },
  { id: 'cat_others', name: 'إكسسوارات وحماية', slug: 'others', description: 'شاشات PaperFeel ملمس الورق، زجاج 9H، وأطقم تنظيف احترافية' },
];

export const PALESTINIAN_CITIES = [
  { name: 'رام الله والبيرة', fee: 20 },
  { name: 'القدس وضواحيها', fee: 30 },
  { name: 'نابلس', fee: 25 },
  { name: 'الخليل', fee: 25 },
  { name: 'بيت لحم', fee: 25 },
  { name: 'جنين', fee: 25 },
  { name: 'طولكرم', fee: 25 },
  { name: 'قلقيلية', fee: 25 },
  { name: 'أريحا والأغوار', fee: 25 },
  { name: 'سلفيت', fee: 25 },
  { name: 'طوباس', fee: 25 },
  { name: 'الداخل المحتل (48)', fee: 50 },
];
