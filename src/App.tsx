/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Clock,
  ChevronLeft,
  Star,
  Plus,
  Minus,
  Trash2,
  MapPin,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  Smartphone,
  Bell,
  Phone,
  MessageSquare,
  HelpCircle,
  LogOut,
  Lock,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  Eye,
  EyeOff,
  Bot,
  Sparkles,
  Settings,
  DollarSign,
  Tag,
  Package,
  Users,
  Check,
  X,
  ExternalLink,
  Truck,
  Mail,
  KeyRound,
  Home,
  LayoutGrid,
  PenTool,
  Shield,
  Keyboard,
  Maximize2,
  Zap,
} from 'lucide-react';

// ==========================================
// تعريف النماذج والبيانات (MODELS & TYPES)
// ==========================================
export interface AppUser {
  name: string;
  email: string;
  phone: string;
  city: string;
  role: 'super_admin' | 'customer' | 'guest';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categories: string[]; // Supports multi-category mapping (e.g. cases + keyboards)
  price: number;
  originalPrice: number;
  stock: number;
  minThreshold: number;
  compatibility: string;
  rating: number;
  reviewsCount: number;
  image: string;
  description: string;
  colors: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
}

export interface Order {
  id: string;
  date: string;
  items: { product: Product; quantity: number; color: string; price: number }[];
  customerName: string;
  customerPhone: string;
  city: string;
  address: string;
  paymentMethod: 'cod' | 'palpay' | 'bank';
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'قيد المراجعة' | 'مؤكد' | 'قيد التجهيز' | 'تم الشحن' | 'تم التوصيل' | 'ملغي';
}

export interface CompetitorMatch {
  id: string;
  productName: string;
  padhousePrice: number;
  competitorName: string;
  competitorPrice: number;
  advantage: boolean;
}

// بيانات تسجيل دخول المسؤول الرئيسي المعتمدة
const SUPER_ADMIN_EMAIL = 'adimn123@gmail.com';
const SUPER_ADMIN_PASS = '123456';

// الأقسام الرسمية الـ 6 المعتمدة
export const OFFICIAL_CATEGORIES = [
  { id: 'all', name: 'الكل' },
  { id: 'cat_pens', name: 'الأقلام وملحقاتها' },
  { id: 'cat_cases', name: 'الحافظات والحقائب' },
  { id: 'cat_keyboards', name: 'لوحات المفاتيح' },
  { id: 'cat_stands', name: 'الحوامل والمساند' },
  { id: 'cat_chargers', name: 'الشواحن والكابلات' },
  { id: 'cat_others', name: 'إكسسوارات أخرى' },
];

// دالة أيقونات الأقسام الرسمية بأسلوب خطي موحد (Outline Iconography)
export function renderCategoryOutlineIcon(categoryId: string, className = 'w-4 h-4', strokeWidth = 1.75) {
  switch (categoryId) {
    case 'cat_pens':
      return <PenTool className={className} strokeWidth={strokeWidth} />;
    case 'cat_cases':
      return <Shield className={className} strokeWidth={strokeWidth} />;
    case 'cat_keyboards':
      return <Keyboard className={className} strokeWidth={strokeWidth} />;
    case 'cat_stands':
      return <Maximize2 className={className} strokeWidth={strokeWidth} />;
    case 'cat_chargers':
      return <Zap className={className} strokeWidth={strokeWidth} />;
    case 'cat_others':
      return <Package className={className} strokeWidth={strokeWidth} />;
    case 'all':
    default:
      return <LayoutGrid className={className} strokeWidth={strokeWidth} />;
  }
}

// كتالوج المنتجات الرسمي الـ 21 لمتجر بادهاوس
const OFFICIAL_21_PRODUCTS: Product[] = [
  // القسم 1: الأقلام وملحقاتها
  {
    id: 'prod-01',
    sku: 'PH-PEN-01',
    name: 'PadHouse Pencil – قلم بادهاوس',
    categories: ['cat_pens'],
    price: 120,
    originalPrice: 150,
    stock: 18,
    minThreshold: 5,
    compatibility: 'جميع موديلات iPad المدعومة',
    rating: 4.9,
    reviewsCount: 46,
image: 'https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg',
    description: 'قلم بادهاوس الذكي بدقة بكسل فائقة، حساسية إمالة للتظليل، تقنية رفض راحة اليد وشحن مغناطيسي متوافق وسريع.',
    colors: ['أبيض ناصع', 'أسود مطفي'],
  },
  {
    id: 'prod-02',
    sku: 'PH-TIP-02',
    name: 'رأس تبديل لقلم Apple الأصلي',
    categories: ['cat_pens'],
    price: 10,
    originalPrice: 15,
    stock: 45,
    minThreshold: 10,
    compatibility: 'Apple Pencil 1 / 2 / PadHouse Pencil',
    rating: 4.8,
    reviewsCount: 32,
image: 'https://padhouse.ps/wp-content/uploads/2024/12/PT-1.jpg',
    description: 'رأس بديل فائق النعومة متوافق تماماً مع أقلام آبل الأصلية وأقلام بادهاوس لتجربة كتابة ورسم انسيابية.',
    colors: ['أبيض أصلي'],
  },

  // القسم 2: الحافظات والحقائب (+ الربط مع لوحات المفاتيح للمنتجات 6 و 7)
  {
    id: 'prod-03',
    sku: 'PH-CAS-03',
    name: 'كفر iPad سيليكون شفاف',
    categories: ['cat_cases'],
    price: 25,
    originalPrice: 35,
    stock: 30,
    minThreshold: 6,
    compatibility: 'جميع مقاسات iPad (Pro, Air, 10th)',
    rating: 4.7,
    reviewsCount: 28,
image: 'https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg',
    description: 'كفر سيليكون شفاف عالي النقاء ومقاوم للاصفرار لحماية الآيباد من الصدمات مع الحفاظ على تصميمه الأنيق.',
    colors: ['شفاف كريستالي'],
  },
  {
    id: 'prod-04',
    sku: 'PH-CAS-04',
    name: 'كفر iPad سيليكون غير شفاف',
    categories: ['cat_cases'],
    price: 35,
    originalPrice: 45,
    stock: 22,
    minThreshold: 5,
    compatibility: 'iPad Pro / Air / 10th Gen',
    rating: 4.8,
    reviewsCount: 35,
image: 'https://padhouse.ps/wp-content/uploads/2024/11/1000093374-1-scaled.jpg',
    description: 'كفر سيليكون مطفي ناعم الملمس مع بطانة داخلية من المايكروفايبر لحماية فائقة من الخدوش والسقوط.',
    colors: ['كحلي داكن', 'أسود ملكي', 'زيتي'],
  },
  {
    id: 'prod-05',
    sku: 'PH-CAS-05',
    name: 'كفر iPad سيليكون غير شفاف – نقش Carbon Fiber',
    categories: ['cat_cases'],
    price: 45,
    originalPrice: 60,
    stock: 16,
    minThreshold: 4,
    compatibility: 'iPad Pro M4 / iPad Air M2',
    rating: 4.9,
    reviewsCount: 19,
image: 'https://padhouse.ps/wp-content/uploads/2025/10/Front-Red.jpg',
    description: 'تصميم رياضي فاخر بنقش ألياف الكربون (Carbon Fiber) المقاوم للصدمات والخدوش والمضاد لبصمات الأصابع.',
    colors: ['كربون أسود', 'كربون رمادي'],
  },
  {
    id: 'prod-06',
    sku: 'PH-KBD-06',
    name: 'كفر iPad سيليكون غير شفاف مع Keyboard',
    // Multi-category: الحافظات والحقائب + لوحات المفاتيح
    categories: ['cat_cases', 'cat_keyboards'],
    price: 100,
    originalPrice: 130,
    stock: 14,
    minThreshold: 4,
    compatibility: 'iPad 10th Gen / Air 11 / Pro 11',
    rating: 4.8,
    reviewsCount: 41,
image: 'https://padhouse.ps/wp-content/uploads/2025/06/CWK-1.jpg',
    description: 'كفر حماية متكامل ومزود بلوحة مفاتيح بلوتوث لاسلكية قابلة للفصل مع بطارية تدوم لأسابيع عمل متواصلة.',
    colors: ['أسود', 'أزرق داكن'],
  },
  {
    id: 'prod-07',
    sku: 'PH-KBD-07',
    name: 'كفر iPad سيليكون غير شفاف مع Keyboard وTouchpad',
    // Multi-category: الحافظات والحقائب + لوحات المفاتيح
    categories: ['cat_cases', 'cat_keyboards'],
    price: 160,
    originalPrice: 200,
    stock: 9,
    minThreshold: 3,
    compatibility: 'iPad Pro 11 / 13 M4, Air 11 / 13 M2',
    rating: 4.9,
    reviewsCount: 58,
image: 'https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg',
    description: 'يحول الآيباد إلى لابتوب متكامل: لوحة مفاتيح مع لوحة لمس (Touchpad) تدعم إيماءات التمرير المتعددة والتحكم الدقيق.',
    colors: ['أسود فخم', 'رمادي فضائي'],
  },

  // القسم 3: لوحات المفاتيح
  {
    id: 'prod-08',
    sku: 'PH-KBD-08',
    name: 'كيبورد لاسلكي قابل للطي – Meetion BTK001',
    categories: ['cat_keyboards'],
    price: 80,
    originalPrice: 100,
    stock: 15,
    minThreshold: 4,
    compatibility: 'جميع أجهزة iPad والأجهزة اللوحية',
    rating: 4.7,
    reviewsCount: 22,
image: 'https://padhouse.ps/wp-content/uploads/2025/02/MBK-1.jpg',
    description: 'كيبورد ميتشن فائق النحافة قابل للطي لسهولة الحمل في الجيب أو الحقيبة مع اتصال بلوتوث ثلاثي القنوات.',
    colors: ['رمادي داكن', 'فضي'],
  },

  // القسم 4: الحوامل والمساند
  {
    id: 'prod-09',
    sku: 'PH-STN-09',
    name: 'ستاند مكتبي 270 درجة',
    categories: ['cat_stands'],
    price: 35,
    originalPrice: 45,
    stock: 25,
    minThreshold: 5,
    compatibility: 'جميع مقاسات أجهزة iPad والهواتف',
    rating: 4.8,
    reviewsCount: 30,
image: 'https://padhouse.ps/wp-content/uploads/2024/11/PhoneStand.jpg',
    description: 'ستاند مكتبي مرن ومصنوع من الألمنيوم المتين يوفر زوايا رؤية قابلة للتعديل حتى 270 درجة للدراسة والمكالمات.',
    colors: ['فضي ألمنيوم', 'رمادي'],
  },
  {
    id: 'prod-10',
    sku: 'PH-STN-10',
    name: 'حامل آيباد مكتبي Kakusiga – دوران 360 درجة',
    categories: ['cat_stands'],
    price: 40,
    originalPrice: 55,
    stock: 18,
    minThreshold: 4,
    compatibility: 'iPad من مقاس 7.9" حتى 12.9"',
    rating: 4.9,
    reviewsCount: 27,
image: 'https://padhouse.ps/wp-content/uploads/2026/11/ستاند-ايباد-360-درجة.jpg',
    description: 'حامل كاكوسيجا المكتبي بقاعدة دوارة 360 درجة وصوت نقرات ميكانيكية مريح مع وسادات سيليكون مانعة للانزلاق.',
    colors: ['أسود مطفي', 'رمادي'],
  },
  {
    id: 'prod-11',
    sku: 'PH-STN-11',
    name: 'ستاند معدني قابل للطي للآيباد والأجهزة اللوحية',
    categories: ['cat_stands'],
    price: 50,
    originalPrice: 70,
    stock: 20,
    minThreshold: 5,
    compatibility: 'جميع أجهزة iPad اللوحية',
    rating: 4.8,
    reviewsCount: 19,
image: 'https://padhouse.ps/wp-content/uploads/2025/02/IMS-1.jpg',
    description: 'ستاند معدني احترافي عالي الاستقرار يتحمل ضغط الكتابة باليد والرسم بقلم الآيباد دون أي اهتزاز.',
    colors: ['رمادي داكن', 'فضي'],
  },

  // القسم 5: الشواحن والكابلات
  {
    id: 'prod-12',
    sku: 'PH-CAB-12',
    name: 'Yesido CA153 – Type-C إلى iPhone (Lightning)',
    categories: ['cat_chargers'],
    price: 35,
    originalPrice: 45,
    stock: 28,
    minThreshold: 6,
    compatibility: 'iPad & iPhone بمنفذ Lightning',
    rating: 4.9,
    reviewsCount: 39,
image: 'https://padhouse.ps/wp-content/uploads/2025/03/CA153-Cable.jpg',
    description: 'كابل يوسيدو CA153 للشحن السريع ونقل البيانات بقوة 20W PD مع خامة قماشية مضفرة ومقاومة للقطع.',
    colors: ['أسود مضفر'],
  },
  {
    id: 'prod-13',
    sku: 'PH-CAB-13',
    name: 'Yesido CA154 – Type-C إلى Type-C',
    categories: ['cat_chargers'],
    price: 35,
    originalPrice: 45,
    stock: 35,
    minThreshold: 6,
    compatibility: 'أجهزة iPad Pro / Air / 10th Gen',
    rating: 4.9,
    reviewsCount: 48,
image: 'https://padhouse.ps/wp-content/uploads/2025/03/CA154-Cable.jpg',
    description: 'كابل فائق السرعة يدعم حتى 60W لنقل الطاقة ومزامنة الملفات بأقصى سرعة لأجهزة الآيباد الحديثة.',
    colors: ['أسود قماشي'],
  },
  {
    id: 'prod-14',
    sku: 'PH-CAB-14',
    name: 'Yesido CA121L – USB عادي إلى iPhone (Lightning)',
    categories: ['cat_chargers'],
    price: 25,
    originalPrice: 35,
    stock: 22,
    minThreshold: 5,
    compatibility: 'iPad & iPhone Lightning',
    rating: 4.7,
    reviewsCount: 17,
image: 'https://padhouse.ps/wp-content/uploads/2025/03/USB-to-Lightning-Yesido-CA121L.webp',
    description: 'كابل يوسيدو CA121L بقوة 2.4A للشحن الآمن والمستقر من شواحن USB التقليدية ومنافذ السيارات.',
    colors: ['أبيض'],
  },
  {
    id: 'prod-15',
    sku: 'PH-CAB-15',
    name: 'Yesido CA120C – USB عادي إلى Type-C',
    categories: ['cat_chargers'],
    price: 20,
    originalPrice: 30,
    stock: 32,
    minThreshold: 6,
    compatibility: 'iPad بمنفذ تايب سي',
    rating: 4.8,
    reviewsCount: 26,
image: 'https://padhouse.ps/wp-content/uploads/2025/03/CA120C-Cable.jpg',
    description: 'كابل عملي متين ومقاوم للثني يدعم الشحن السريع ونقل البيانات للأجهزة اللوحية المزودة بمنفذ تايب سي.',
    colors: ['أبيض ناصع'],
  },
  {
    id: 'prod-16',
    sku: 'PH-CAB-16',
    name: 'Yesido CA120L – USB عادي إلى iPhone (Lightning)',
    categories: ['cat_chargers'],
    price: 20,
    originalPrice: 30,
    stock: 24,
    minThreshold: 5,
    compatibility: 'iPad & iPhone Lightning',
    rating: 4.7,
    reviewsCount: 15,
image: 'https://padhouse.ps/wp-content/uploads/2025/03/CA120L-Cable.jpg',
    description: 'كابل شحن اقتصادي عالي الجودة من شركة يوسيدو للأجهزة اللوحية والهواتف بمنفذ لايتنينغ.',
    colors: ['أبيض'],
  },
  {
    id: 'prod-17',
    sku: 'PH-CAB-17',
    name: 'Yesido CA121C – USB عادي إلى Type-C',
    categories: ['cat_chargers'],
    price: 25,
    originalPrice: 35,
    stock: 29,
    minThreshold: 5,
    compatibility: 'iPad Type-C والأجهزة الذكية',
    rating: 4.8,
    reviewsCount: 24,
image: 'https://padhouse.ps/wp-content/uploads/2025/03/USB-to-Type-C-Yesido-CA121C.webp',
    description: 'كابل شحن فائق التحمل برؤوس معدنية مقواة لحماية الكابل من التلف أثناء الاستخدام اليومي المكثف.',
    colors: ['أسود مقوى'],
  },

  // القسم 6: إكسسوارات أخرى
  {
    id: 'prod-18',
    sku: 'PH-GLS-18',
    name: 'شاشة حماية زجاج للآيباد',
    categories: ['cat_others'],
    price: 20,
    originalPrice: 30,
    stock: 40,
    minThreshold: 8,
    compatibility: 'جميع مقاسات شاشات iPad',
    rating: 4.9,
    reviewsCount: 65,
image: 'https://padhouse.ps/wp-content/uploads/2024/12/GlassP-1.jpg',
    description: 'شاشة حماية من الزجاج المقسى بدرجة صلابة 9H ضد الصدمات والخدوش الحادة مع وضوح شاشة HD كامل.',
    colors: ['شفاف كريستالي 9H'],
  },
  {
    id: 'prod-19',
    sku: 'PH-PPR-19',
    name: 'شاشة حماية ملمس الورق – PadHouse PaperFeel',
    categories: ['cat_others'],
    price: 50,
    originalPrice: 70,
    stock: 12,
    minThreshold: 4,
    compatibility: 'iPad Pro 11 / 13, Air 11 / 13, iPad 10th',
    rating: 5.0,
    reviewsCount: 74,
image: 'https://padhouse.ps/wp-content/uploads/2024/11/PPF-1.jpg',
    description: 'الشاشة الأكثر طلباً لطلاب الجامعات والرسامين: تمنحك احتكاكاً وملمساً مطابقاً للورق الطبيعي عند استخدام القلم.',
    colors: ['ملمس ورقي مطفي'],
  },
  {
    id: 'prod-20',
    sku: 'PH-CLN-20',
    name: 'مجموعة تنظيف 7 في 1 متعددة الوظائف',
    categories: ['cat_others'],
    price: 20,
    originalPrice: 30,
    stock: 35,
    minThreshold: 6,
    compatibility: 'شاشات الآيباد، الكيبوردات، السماعات والأقلام',
    rating: 4.8,
    reviewsCount: 31,
image: 'https://padhouse.ps/wp-content/uploads/2025/02/cleaningKit7in1.jpg',
    description: 'طقم متكامل يحتوي على بخاخ منظف، ممسحة فايبر، فرشاة لتنظيف الكيبورد، وأداة دقيقة لتنظيف فتحات السماعات.',
    colors: ['أزرق مع أبيض'],
  },
  {
    id: 'prod-21',
    sku: 'PH-EAR-21',
    name: 'سماعة YESIDO EP05',
    categories: ['cat_others'],
    price: 120,
    originalPrice: 150,
    stock: 11,
    minThreshold: 3,
    compatibility: 'أجهزة iPad وجميع الأجهزة الداعمة للبلوتوث',
    rating: 4.9,
    reviewsCount: 29,
image: 'https://padhouse.ps/wp-content/uploads/2024/11/EP05-1-1.jpg',
    description: 'سماعة بلوتوث لاسلكية بصوت نقي وعزل ضوضاء ممتاز وميكروفون واضح لمحاضرات الزوم والمكالمات اليومية.',
    colors: ['أبيض ناصع'],
  },
];

const INITIAL_ORDERS_DATA: Order[] = [
  {
    id: 'PH-2026-1042',
    date: 'اليوم، 10:15 ص',
    items: [
      { product: OFFICIAL_21_PRODUCTS[0], quantity: 1, color: 'أبيض ناصع', price: 120 },
      { product: OFFICIAL_21_PRODUCTS[18], quantity: 1, color: 'ملمس ورقي مطفي', price: 50 },
    ],
    customerName: 'أحمد الفلسطيني',
    customerPhone: '+970 59 912 3456',
    city: 'رام الله والبيرة',
    address: 'حي الماصيون، قرب قصر الثقافة، عمارة 4',
    paymentMethod: 'cod',
    subtotal: 170,
    shipping: 20,
    discount: 20,
    total: 170,
    status: 'قيد التجهيز',
  },
];

const PALESTINIAN_CITIES = [
  { name: 'رام الله والبيرة', fee: 20 },
  { name: 'نابلس', fee: 25 },
  { name: 'الخليل', fee: 25 },
  { name: 'بيت لحم', fee: 25 },
  { name: 'القدس وضواحيها', fee: 30 },
  { name: 'جنين', fee: 25 },
  { name: 'طولكرم', fee: 25 },
  { name: 'قلقيلية', fee: 25 },
  { name: 'أريحا والأغوار', fee: 25 },
  { name: 'قطاع غزة', fee: 35 },
];

export default function App() {
  // حالة المستخدم والمصادقة
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('padhouse_current_user_v2');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // الحسابات المسجلة
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, { password: string; user: AppUser }>>(() => {
    try {
      const saved = localStorage.getItem('padhouse_registered_users_v2');
      return saved
        ? JSON.parse(saved)
        : {
            'ahmad@padhouse.ps': {
              password: 'password123',
              user: {
                name: 'أحمد الفلسطيني',
                email: 'ahmad@padhouse.ps',
                phone: '+970 59 912 3456',
                city: 'رام الله والبيرة',
                role: 'customer',
              },
            },
          };
    } catch {
      return {};
    }
  });

  // الوضع الحالي: متجر العملاء 'customer' أو لوحة الإدارة 'admin' (فقط للمسؤول)
  const [appMode, setAppMode] = useState<'customer' | 'admin'>('customer');

  // شاشات المصادقة (تسجيل الدخول / إنشاء حساب)
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // حقول التسجيل
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('رام الله والبيرة');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // تبويبات متجر العميل
  const [customerTab, setCustomerTab] = useState<'home' | 'categories' | 'search' | 'cart' | 'profile'>('home');
  const [customerStack, setCustomerStack] = useState<
    'product_details' | 'checkout' | 'order_confirmation' | 'tracking' | 'orders' | 'wishlist' | 'support' | 'notifications' | null
  >(null);

  // تبويبات الإدارة
  const [adminTab, setAdminTab] = useState<'admin_overview' | 'admin_products' | 'admin_inventory' | 'admin_orders' | 'admin_ai'>('admin_overview');

  // الكتالوج الرسمي الـ 21 والطلبات
  const [products, setProducts] = useState<Product[]>(OFFICIAL_21_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS_DATA);
  const [cart, setCart] = useState<CartItem[]>([
    { product: OFFICIAL_21_PRODUCTS[0], quantity: 1, selectedColor: 'أبيض ناصع' },
    { product: OFFICIAL_21_PRODUCTS[18], quantity: 1, selectedColor: 'ملمس ورقي مطفي' },
  ]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(['prod-01', 'prod-19']);

  // الاختيارات الحالية
  const [selectedProduct, setSelectedProduct] = useState<Product>(OFFICIAL_21_PRODUCTS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>('PH-2026-1042');

  // بيانات إتمام الشراء
  const [checkoutCity, setCheckoutCity] = useState<string>('رام الله والبيرة');
  const [checkoutStreet, setCheckoutStreet] = useState<string>('الماصيون، قرب قصر الثقافة');
  const [checkoutName, setCheckoutName] = useState<string>('أحمد الفلسطيني');
  const [checkoutPhone, setCheckoutPhone] = useState<string>('+970 59 912 3456');
  const [checkoutPayment, setCheckoutPayment] = useState<'cod' | 'palpay' | 'bank'>('cod');
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(INITIAL_ORDERS_DATA[0]);

  // تعديل المنتجات في الإدارة
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);

  // المساعد الذكي للأعمال (جيميني)
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiChatHistory, setAiChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'مرحباً بك في مستشار بادهاوس لذكاء الأعمال! تم تحديث النظام بالكتالوج الرسمي المعتمد (21 منتجاً موزعة على 6 أقسام). يمكنني فحص كميات المخزون، الطلبات النشطة، ومعدلات الأسعار في فلسطين. كيف يمكنني مساعدتك؟',
    },
  ]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // إشعار فوري (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // حفظ الجلسة في LocalStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('padhouse_current_user_v2', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('padhouse_current_user_v2');
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('padhouse_registered_users_v2', JSON.stringify(registeredUsers));
    } catch {}
  }, [registeredUsers]);

  // التحقق من حساب المدير العام
  const isSuperAdmin = currentUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // تسجيل الدخول
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();

    if (emailTrim === SUPER_ADMIN_EMAIL.toLowerCase() && passTrim === SUPER_ADMIN_PASS) {
      const adminUser: AppUser = {
        name: 'المسؤول العام',
        email: SUPER_ADMIN_EMAIL,
        phone: '+970 59 000 0000',
        city: 'رام الله والبيرة',
        role: 'super_admin',
      };
      setCurrentUser(adminUser);
      setAppMode('customer'); // يدخل أولاً المتجر الاعتيادي
      setCheckoutName(adminUser.name);
      setCheckoutPhone(adminUser.phone);
      showToast('مرحباً بك! تم تسجيل الدخول كمسؤول عام');
      return;
    }

    const record = registeredUsers[emailTrim];
    if (record && record.password === passTrim) {
      setCurrentUser(record.user);
      setAppMode('customer');
      setCheckoutName(record.user.name);
      setCheckoutPhone(record.user.phone);
      setCheckoutCity(record.user.city);
      showToast(`أهلاً بك مجدداً ${record.user.name}!`);
      return;
    }

    setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة ثانية.');
  };

  // إنشاء حساب جديد
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const emailTrim = regEmail.trim().toLowerCase();
    const passTrim = regPassword.trim();

    if (!regName.trim()) {
      setAuthError('يرجى كتابة الاسم الكامل');
      return;
    }
    if (!emailTrim || !emailTrim.includes('@')) {
      setAuthError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }
    if (passTrim.length < 6) {
      setAuthError('كلمة المرور يجب أن لا تقل عن 6 خانات');
      return;
    }
    if (emailTrim === SUPER_ADMIN_EMAIL.toLowerCase() || registeredUsers[emailTrim]) {
      setAuthError('هذا البريد مسجل لدينا مسبقاً');
      return;
    }

    const newUser: AppUser = {
      name: regName.trim(),
      email: emailTrim,
      phone: regPhone.trim() || '+970 59 000 0000',
      city: regCity,
      role: 'customer',
    };

    setRegisteredUsers((prev) => ({
      ...prev,
      [emailTrim]: { password: passTrim, user: newUser },
    }));

    setCurrentUser(newUser);
    setAppMode('customer');
    setCheckoutName(newUser.name);
    setCheckoutPhone(newUser.phone);
    setCheckoutCity(newUser.city);
    showToast('تم إنشاء الحساب بنجاح! أهلاً بك في بادهاوس');
  };

  // المتابعة كزائر
  const handleContinueAsGuest = () => {
    const guestUser: AppUser = {
      name: 'زائر بادهاوس',
      email: 'guest@padhouse.ps',
      phone: '+970 59 000 0000',
      city: 'رام الله والبيرة',
      role: 'guest',
    };
    setCurrentUser(guestUser);
    setAppMode('customer');
    setCheckoutName(guestUser.name);
    setCheckoutPhone(guestUser.phone);
    showToast('تصفح كزائر');
  };

  // تسجيل الخروج
  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode('customer');
    setCustomerTab('home');
    setCustomerStack(null);
    setAdminTab('admin_overview');
    showToast('تم تسجيل الخروج بنجاح');
  };

  // إضافة للسلة مع التحقق من توفر المخزون
  const addToCart = (product: Product, color?: string, qty = 1) => {
    if (product.stock <= 0) {
      showToast('عذراً، هذه القطعة نفدت من المخزون حالياً');
      return;
    }
    setCart((prev) => {
      const col = color || product.colors[0];
      const existing = prev.find((item) => item.product.id === product.id && item.selectedColor === col);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedColor === col
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty, selectedColor: col }];
    });
    showToast(`تمت إضافة "${product.name}" إلى السلة`);
  };

  const updateCartQty = (productId: string, color: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.selectedColor === color) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string, color: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.selectedColor === color)));
    showToast('تم حذف القطعة من السلة');
  };

  const toggleWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('تمت الإزالة من المفضلة');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('تمت الإضافة إلى المفضلة');
        return [...prev, productId];
      }
    });
  };

  // الحسابات المالية للسلة
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [cart]);
  const deliveryFee = useMemo(() => {
    if (cart.length === 0) return 0;
    const city = PALESTINIAN_CITIES.find((c) => c.name === checkoutCity);
    return city ? city.fee : 20;
  }, [cart, checkoutCity]);
  const discountAmount = couponApplied ? 20 : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

  // إرسال الطلب وحسم المخزون
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderNumber = `PH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: orderNumber,
      date: 'الآن',
      items: cart.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        color: item.selectedColor,
        price: item.product.price,
      })),
      customerName: checkoutName,
      customerPhone: checkoutPhone,
      city: checkoutCity,
      address: checkoutStreet,
      paymentMethod: checkoutPayment,
      subtotal,
      shipping: deliveryFee,
      discount: discountAmount,
      total: grandTotal,
      status: 'مؤكد',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((ci) => ci.product.id === p.id);
        return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
      })
    );

    setLastPlacedOrder(newOrder);
    setActiveTrackingOrderId(newOrder.id);
    setCart([]);
    setCustomerStack('order_confirmation');
    showToast(`تم تأكيد طلبك بنجاح! رقم الإرسالية: ${newOrder.id}`);
  };

  // تصفية المنتجات مع دعم الفئات المتعددة
  // (كفرات لوحة المفاتيح تظهر تحت الحافظات والحقائب وأيضاً تحت لوحات المفاتيح)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'all' || p.categories.includes(selectedCategory);
      const matchSearch =
        searchQuery === '' ||
        p.name.includes(searchQuery) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.compatibility.includes(searchQuery);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // محادثة الذكاء الاصطناعي في لوحة الإدارة
  const handleSendAi = (custom?: string) => {
    const q = custom || aiPrompt;
    if (!q.trim()) return;

    setAiChatHistory((prev) => [...prev, { sender: 'user', text: q }]);
    setAiPrompt('');
    setIsAiThinking(true);

    setTimeout(() => {
      let ans = '';
      const lower = q.toLowerCase();
      if (lower.includes('مخزون') || lower.includes('نقص') || lower.includes('كمية')) {
        const low = products.filter((p) => p.stock <= p.minThreshold);
        ans = `📊 تقرير المخزون الفوري:\nيوجد ${low.length} منتجات تقترب من حد الأمان:\n${low.map((p) => `• ${p.name} (المتبقي: ${p.stock} فقط - الحد الأدنى: ${p.minThreshold})`).join('\n')}\n💡 التوصية: إعادة طلب شاشات حماية الورق وكفرات الكيبورد قبل عطلة نهاية الأسبوع.`;
      } else if (lower.includes('سعر') || lower.includes('منافس') || lower.includes('مقارنة')) {
        ans = `🔍 رصد أسعار السوق الفلسطيني:\n• قلم بادهاوس (120 ₪) منافس بشدة لأقلام آبل الأصلية التي تباع بـ 520 ₪.\n• شاشة حماية الورق PaperFeel تباع بـ 50 ₪ مقابل 65 ₪ لدى المحلات الأخرى.\n💡 التوصية: تقديم عرض حزمة يجمع قلم بادهاوس مع شاشة الورق بـ 150 ₪ لرفع قيمة السلة.`;
      } else {
        ans = `📈 ملخص الأعمال لشهر نوفمبر:\n• إجمالي المبيعات المحققة: ${orders.reduce((s, o) => s + o.total, 0).toLocaleString()} ₪\n• إجمالي عدد الطلبات: ${orders.length} طلبات\n• أكثر الفئات طلباً: لوحات المفاتيح والأقلام وملحقاتها.`;
      }
      setAiChatHistory((prev) => [...prev, { sender: 'ai', text: ans }]);
      setIsAiThinking(false);
    }, 500);
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen w-full bg-[#F1F5F9] text-[#142B45] font-['IBM_Plex_Sans_Arabic'] flex flex-col selection:bg-[#00A896]/20"
    >
      {/* إشعار فوري علوي */}
      {toastMessage && (
        <div className="fixed top-5 z-50 bg-[#142B45] text-white px-4 py-2.5 rounded-full shadow-lg border border-[#00A896]/40 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-[#00A896]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* واجهة المتجر المتجاوبة */}
      {/* ============================================================== */}
      <div className="w-full min-h-screen bg-[#FFFFFF] flex flex-col overflow-hidden relative">
        {/* في حال عدم تسجيل الدخول: عرض تدفق المصادقة */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col bg-[#FFFFFF] overflow-y-auto">
            {renderMobileAuthFlow()}
          </div>
        ) : (
          /* في حال تسجيل الدخول: عرض متجر العميل أو لوحة الإدارة */
          <>
            {/* الترويسة العلوية داخل التطبيق */}
            <div className="h-14 bg-[#FFFFFF] px-4 flex items-center justify-between border-b border-[#E8EDF2] z-20">
              {appMode === 'customer' ? (
                customerStack ? (
                  <button
                    onClick={() => setCustomerStack(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#142B45] hover:text-[#00A896] group transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 text-[#142B45] group-hover:text-[#00A896]" strokeWidth={1.75} />
                    <span>رجوع</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#00A896] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      PH
                    </div>
                    <div>
                      <span className="font-bold text-sm text-[#142B45]">بادهاوس</span>
                      <div className="flex items-center gap-1 text-[10px] text-[#00A896] font-semibold">
                        <MapPin className="w-3 h-3 text-[#00A896]" strokeWidth={1.75} />
                        <span>فلسطين • توصيل سريع</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* ترويسة لوحة الإدارة */
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#142B45] text-white flex items-center justify-center font-bold text-xs">
                      <BarChart3 className="w-3.5 h-3.5 text-[#00A896]" strokeWidth={1.75} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[#142B45]">إدارة بادهاوس</span>
                      <span className="text-[9px] text-[#00A896] font-semibold block">{SUPER_ADMIN_EMAIL}</span>
                    </div>
                  </div>

                  {/* زر التبديل السلس للرجوع لمتجر العملاء */}
                  <button
                    onClick={() => setAppMode('customer')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00A896] text-white text-[11px] font-bold shadow-2xs hover:bg-[#028090] transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                    <span>الرجوع للمتجر</span>
                  </button>
                </div>
              )}

              {/* أزرار الإجراءات داخل متجر العميل */}
              {appMode === 'customer' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCustomerStack('wishlist')}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-[#142B45] hover:bg-slate-50 transition-colors relative"
                    title="المفضلة"
                  >
                    <Heart className="w-4 h-4 text-slate-500 hover:text-[#142B45]" strokeWidth={1.75} />
                    {wishlistIds.length > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-[#142B45] text-white text-[9px] flex items-center justify-center font-bold">
                        {wishlistIds.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setCustomerStack('notifications')}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-[#142B45] hover:bg-slate-50 transition-colors relative"
                    title="التنبيهات"
                  >
                    <Bell className="w-4 h-4 text-slate-500 hover:text-[#142B45]" strokeWidth={1.75} />
                    <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#00A896]" />
                  </button>
                </div>
              )}
            </div>

            {/* محتوى الشاشات القابل للتمرير */}
            <div className="flex-1 bg-[#FFFFFF] overflow-y-auto pb-18 md:pb-8 md:pt-14">
              {appMode === 'customer' ? (
                customerStack ? (
                  renderCustomerStackView()
                ) : (
                  <>
                    {customerTab === 'home' && renderCustomerHomeTab()}
                    {customerTab === 'categories' && renderCustomerCategoriesTab()}
                    {customerTab === 'search' && renderCustomerSearchTab()}
                    {customerTab === 'cart' && renderCustomerCartTab()}
                    {customerTab === 'profile' && renderCustomerProfileTab()}
                  </>
                )
              ) : (
                /* شاشات الإدارة */
                <>
                  {adminTab === 'admin_overview' && renderAdminOverviewTab()}
                  {adminTab === 'admin_products' && renderAdminProductsTab()}
                  {adminTab === 'admin_inventory' && renderAdminInventoryTab()}
                  {adminTab === 'admin_orders' && renderAdminOrdersTab()}
                  {adminTab === 'admin_ai' && renderAdminAiTab()}
                </>
              )}
            </div>

            {/* ============================================================== */}
            {/* شريط التنقل السفلي الثابت داخل التطبيق                        */}
            {/* ============================================================== */}
            {appMode === 'customer' ? (
              <div className="h-16 md:h-14 bg-[#FFFFFF] border-t border-[#E8EDF2] md:border-b md:border-t-0 flex items-center justify-around px-2 md:px-8 text-[#64748B] text-[10px] md:text-sm select-none absolute bottom-0 md:bottom-auto md:top-14 inset-x-0 z-30 font-semibold shadow-xs">
                <button
                  onClick={() => {
                    setCustomerStack(null);
                    setCustomerTab('home');
                  }}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    !customerStack && customerTab === 'home' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 md:px-1 rounded-full transition-all ${
                      !customerStack && customerTab === 'home' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Home className="w-4 h-4" strokeWidth={!customerStack && customerTab === 'home' ? 2 : 1.75} />
                  </div>
                  <span>الرئيسية</span>
                </button>

                <button
                  onClick={() => {
                    setCustomerStack(null);
                    setCustomerTab('categories');
                  }}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    !customerStack && customerTab === 'categories' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      !customerStack && customerTab === 'categories' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" strokeWidth={!customerStack && customerTab === 'categories' ? 2 : 1.75} />
                  </div>
                  <span>الأقسام</span>
                </button>

                <button
                  onClick={() => {
                    setCustomerStack(null);
                    setCustomerTab('search');
                  }}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    !customerStack && customerTab === 'search' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      !customerStack && customerTab === 'search' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Search className="w-4 h-4" strokeWidth={!customerStack && customerTab === 'search' ? 2 : 1.75} />
                  </div>
                  <span>البحث</span>
                </button>

                <button
                  onClick={() => {
                    setCustomerStack(null);
                    setCustomerTab('cart');
                  }}
                  className={`flex flex-col items-center gap-1 transition-colors group relative ${
                    !customerStack && customerTab === 'cart' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all relative ${
                      !customerStack && customerTab === 'cart' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" strokeWidth={!customerStack && customerTab === 'cart' ? 2 : 1.75} />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#00A896] text-white text-[9px] flex items-center justify-center font-bold">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </div>
                  <span>السلة</span>
                </button>

                <button
                  onClick={() => {
                    setCustomerStack(null);
                    setCustomerTab('profile');
                  }}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    !customerStack && customerTab === 'profile' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      !customerStack && customerTab === 'profile' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <User className="w-4 h-4" strokeWidth={!customerStack && customerTab === 'profile' ? 2 : 1.75} />
                  </div>
                  <span>حسابي</span>
                </button>
              </div>
            ) : (
              /* شريط تنقل الإدارة السفلي */
              <div className="h-16 bg-[#FFFFFF] border-t border-[#E8EDF2] flex items-center justify-around px-2 text-[#64748B] text-[10px] select-none absolute bottom-0 inset-x-0 z-30 font-semibold shadow-xs">
                <button
                  onClick={() => setAdminTab('admin_overview')}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    adminTab === 'admin_overview' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      adminTab === 'admin_overview' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" strokeWidth={adminTab === 'admin_overview' ? 2 : 1.75} />
                  </div>
                  <span>المؤشرات</span>
                </button>

                <button
                  onClick={() => setAdminTab('admin_products')}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    adminTab === 'admin_products' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      adminTab === 'admin_products' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Package className="w-4 h-4" strokeWidth={adminTab === 'admin_products' ? 2 : 1.75} />
                  </div>
                  <span>المنتجات</span>
                </button>

                <button
                  onClick={() => setAdminTab('admin_inventory')}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    adminTab === 'admin_inventory' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      adminTab === 'admin_inventory' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Layers className="w-4 h-4" strokeWidth={adminTab === 'admin_inventory' ? 2 : 1.75} />
                  </div>
                  <span>المخزون</span>
                </button>

                <button
                  onClick={() => setAdminTab('admin_orders')}
                  className={`flex flex-col items-center gap-1 transition-colors group relative ${
                    adminTab === 'admin_orders' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all relative ${
                      adminTab === 'admin_orders' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" strokeWidth={adminTab === 'admin_orders' ? 2 : 1.75} />
                    {orders.filter((o) => o.status === 'قيد التجهيز' || o.status === 'قيد المراجعة').length > 0 && (
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#EF4444] text-white text-[9px] flex items-center justify-center font-bold">
                        {orders.filter((o) => o.status === 'قيد التجهيز' || o.status === 'قيد المراجعة').length}
                      </span>
                    )}
                  </div>
                  <span>الطلبات</span>
                </button>

                <button
                  onClick={() => setAdminTab('admin_ai')}
                  className={`flex flex-col items-center gap-1 transition-colors group ${
                    adminTab === 'admin_ai' ? 'text-[#00A896] font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1 px-3 rounded-full transition-all ${
                      adminTab === 'admin_ai' ? 'bg-[#00A896]/10 text-[#00A896]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Bot className="w-4 h-4" strokeWidth={adminTab === 'admin_ai' ? 2 : 1.75} />
                  </div>
                  <span>المساعد الذكي</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* نافذة إضافة أو تعديل منتج (في لوحة الإدارة) */}
      {showProductModal && renderProductEditorModal()}
    </div>
  );

  // =========================================================================
  // شاشات المصادقة (تسجيل الدخول وإنشاء الحساب) - عربي 100%
  // =========================================================================
  function renderMobileAuthFlow() {
    return (
      <div className="p-6 flex flex-col justify-between min-h-full">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#00A896] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              PH
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E8EDF2] text-[#00A896] font-bold">
              متجر بادهاوس فلسطين 🇵🇸
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#142B45]">
              {authView === 'login' ? 'تسجيل الدخول إلى بادهاوس' : 'إنشاء حساب جديد'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              {authView === 'login'
                ? 'المتجر الفلسطيني المتخصص لملحقات الآيباد المعتمدة'
                : 'انضم إلينا للتسوق والحصول على أسرع توصيل في فلسطين'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#EF4444]" strokeWidth={1.75} />
              <span>{authError}</span>
            </div>
          )}

          {/* تلميح حساب المدير العام مع تعبئة تلقائية */}
          {authView === 'login' && (
            <div className="mb-4 p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[11px] text-[#166534]">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.75} />
                  بيانات حساب المسؤول العام:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail(SUPER_ADMIN_EMAIL);
                    setLoginPassword(SUPER_ADMIN_PASS);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#BBF7D0] font-bold text-[#10B981] hover:bg-[#DCFCE7] transition-colors"
                >
                  تعبئة تلقائية
                </button>
              </div>
              <p className="mt-1 font-mono text-[10px]" dir="ltr">
                adimn123@gmail.com / 123456
              </p>
            </div>
          )}

          {authView === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#142B45] block mb-1">
                  البريد الإلكتروني
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white transition-colors">
                  <Mail className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full text-xs text-[#142B45] outline-none bg-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-[#142B45]">
                    كلمة المرور
                  </label>
                  <span className="text-[10px] text-[#00A896] font-semibold cursor-pointer">
                    نسيت كلمة المرور؟
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white transition-colors">
                  <KeyRound className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-xs text-[#142B45] outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#00A896] hover:bg-[#028090] text-white text-xs font-bold transition shadow-xs mt-2 flex items-center justify-center gap-2"
              >
                <span>تسجيل الدخول</span>
                <ArrowRight className="w-4 h-4 text-white rotate-180" strokeWidth={2} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#142B45] block mb-1">
                  الاسم الكامل
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white transition-colors">
                  <User className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <input
                    type="text"
                    required
                    placeholder="أحمد الفلسطيني"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full text-xs text-[#142B45] outline-none bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#142B45] block mb-1">
                  البريد الإلكتروني
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white transition-colors">
                  <Mail className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <input
                    type="email"
                    required
                    placeholder="name@domain.ps"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full text-xs text-[#142B45] outline-none bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#142B45] block mb-1">
                    رقم الهاتف (واتساب)
                  </label>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white transition-colors">
                    <Phone className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                    <input
                      type="text"
                      required
                      placeholder="+970 59..."
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full text-xs text-[#142B45] outline-none bg-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#142B45] block mb-1">
                    المدينة
                  </label>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[#E8EDF2] bg-white">
                    <MapPin className="w-3.5 h-3.5 text-[#00A896]" strokeWidth={1.75} />
                    <select
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full text-xs text-[#142B45] bg-transparent outline-none"
                    >
                      {PALESTINIAN_CITIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#142B45] block mb-1">
                  كلمة المرور (6 خانات على الأقل)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white transition-colors">
                  <KeyRound className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full text-xs text-[#142B45] outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#00A896] hover:bg-[#028090] text-white text-xs font-bold transition shadow-xs mt-2 flex items-center justify-center gap-2"
              >
                <span>إنشاء الحساب</span>
                <ArrowRight className="w-4 h-4 text-white rotate-180" strokeWidth={2} />
              </button>
            </form>
          )}

          <div className="text-center pt-4">
            {authView === 'login' ? (
              <span className="text-xs text-[#64748B]">
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('register');
                    setAuthError(null);
                  }}
                  className="font-bold text-[#00A896] hover:underline"
                >
                  إنشاء حساب جديد
                </button>
              </span>
            ) : (
              <span className="text-xs text-[#64748B]">
                لديك حساب بالفعل؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setAuthError(null);
                  }}
                  className="font-bold text-[#00A896] hover:underline"
                >
                  تسجيل الدخول
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-[#F1F5F9] text-center">
          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="w-full py-2.5 rounded-xl border border-[#E8EDF2] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#142B45] text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <span>المتابعة كزائر بدون تسجيل</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-180" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // تبويب 1: الرئيسية لمتجر العميل
  // =========================================================================
  function renderCustomerHomeTab() {
    return (
      <div className="mx-auto w-full max-w-screen-2xl p-4 space-y-4 md:p-8">
        {/* حقل البحث السريع */}
        <div
          onClick={() => setCustomerTab('search')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E8EDF2] text-xs text-[#94A3B8] cursor-pointer hover:border-[#00A896] hover:bg-white transition group"
        >
          <Search className="w-4 h-4 text-[#00A896] transition-transform group-hover:scale-105" strokeWidth={1.75} />
          <span>ابحث عن قلم بادهاوس، كفر كيبورد، شواحن يسيدو...</span>
        </div>

        {/* لافتة ترويجية للمتجر */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00A896] to-[#028090] text-white shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/15">
            متجر بادهاوس الرسمي 🇵🇸
          </span>
          <h3 className="text-base font-bold mt-1.5 leading-snug">
            ملحقات الآيباد المعتمدة والمختبرة
          </h3>
          <p className="text-[11px] text-white/90 mt-0.5">
            21 منتجاً أساسياً لتعزيز إنتاجيتك مع توصيل لكافة المدن والدفع عند الاستلام
          </p>
          <button
            onClick={() => setCustomerTab('categories')}
            className="mt-3 px-3.5 py-1.5 rounded-lg bg-white text-[#00A896] text-xs font-bold shadow-2xs hover:bg-[#F8FAFC] flex items-center gap-1.5 transition-colors"
          >
            <span>تصفح الأقسام الـ 6</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00A896] rotate-180" strokeWidth={2} />
          </button>
        </div>

        {/* شريط الأقسام الرسمية الـ 6 السريع */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#142B45] uppercase tracking-wider">
              الأقسام المعتمدة
            </span>
            <button
              onClick={() => setCustomerTab('categories')}
              className="text-[10px] text-[#00A896] font-bold hover:underline"
            >
              عرض الكل
            </button>
          </div>
          <div
            dir="rtl"
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar scroll-smooth select-none cursor-grab active:cursor-grabbing"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollBy({ left: -e.deltaY, behavior: 'smooth' });
              }
            }}
            onMouseDown={(e) => {
              const target = e.currentTarget;
              target.dataset.isDown = 'true';
              target.dataset.startX = `${e.pageX - target.offsetLeft}`;
              target.dataset.scrollLeft = `${target.scrollLeft}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.dataset.isDown = 'false';
            }}
            onMouseUp={(e) => {
              e.currentTarget.dataset.isDown = 'false';
            }}
            onMouseMove={(e) => {
              const target = e.currentTarget;
              if (target.dataset.isDown !== 'true') return;
              e.preventDefault();
              const x = e.pageX - target.offsetLeft;
              const startX = parseFloat(target.dataset.startX || '0');
              const scrollLeft = parseFloat(target.dataset.scrollLeft || '0');
              const walk = x - startX;
              target.scrollLeft = scrollLeft - walk;
            }}
          >
            {OFFICIAL_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#00A896]/10 text-[#00A896] border border-[#00A896]/30 shadow-2xs'
                      : 'bg-[#F8FAFC] text-[#64748B] border border-[#E8EDF2] hover:text-[#142B45] hover:border-slate-300'
                  }`}
                >
                  <span className={isSelected ? 'text-[#00A896]' : 'text-slate-400'}>
                    {renderCategoryOutlineIcon(cat.id, 'w-3.5 h-3.5', isSelected ? 2 : 1.75)}
                  </span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* قائمة المنتجات الـ 21 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B45]">
              قائمة المنتجات ({filteredProducts.length})
            </span>
            <span className="text-[11px] text-[#64748B]">الأسعار بالشيكل (₪)</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => {
                  setSelectedProduct(prod);
                  setCustomerStack('product_details');
                }}
                className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E8EDF2] hover:border-[#00A896] transition cursor-pointer flex gap-3 md:flex-col shadow-2xs group"
              >
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-20 h-20 md:w-full md:h-56 rounded-xl object-cover bg-[#F8FAFC] border border-[#E8EDF2] flex-shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#00A896] font-bold truncate max-w-[170px]">
                        {prod.compatibility}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(prod.id);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-50 transition-colors"
                        title="إضافة للمفضلة"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-colors ${
                            wishlistIds.includes(prod.id)
                              ? 'text-rose-500 fill-rose-50'
                              : 'text-slate-400 hover:text-[#00A896]'
                          }`}
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-[#142B45] line-clamp-1 mt-0.5 group-hover:text-[#00A896] transition-colors">
                      {prod.name}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-[#64748B] mt-0.5">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400/20" strokeWidth={1.75} />
                      <span className="font-semibold text-[#142B45]">{prod.rating}</span>
                      <span>({prod.reviewsCount})</span>
                      <span className="text-slate-300">•</span>
                      <span className={prod.stock > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                        {prod.stock > 0 ? `متوفر (${prod.stock})` : 'نفدت الكمية'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-[#142B45]">{prod.price} ₪</span>
                      <span className="text-[10px] text-[#94A3B8] line-through">{prod.originalPrice} ₪</span>
                    </div>
                    <button
                      disabled={prod.stock <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(prod);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        prod.stock > 0
                          ? 'bg-[#00A896] text-white hover:bg-[#028090]'
                          : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                      }`}
                    >
                      {prod.stock > 0 ? (
                        <>
                          <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                          <span>إضافة</span>
                        </>
                      ) : (
                        <span>نفدت</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // تبويب 2: الأقسام الرسمية الـ 6 المعتمدة
  // =========================================================================
  function renderCustomerCategoriesTab() {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#142B45]">
          الأقسام الرسمية لمتجر بادهاوس (6 أقسام)
        </h3>
        <p className="text-xs text-[#64748B]">
          اختر الفئة للاطلاع على المنتجات المعتمدة فوراً
        </p>
        <div className="space-y-2">
          {OFFICIAL_CATEGORIES.slice(1).map((cat) => {
            const count = products.filter((p) => p.categories.includes(cat.id)).length;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCustomerTab('home');
                }}
                className="p-3.5 rounded-2xl border border-[#E8EDF2] hover:border-[#00A896] flex items-center justify-between cursor-pointer transition bg-white group hover:shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#00A896]/10 border border-[#00A896]/20 text-[#00A896] flex items-center justify-center transition-transform group-hover:scale-105">
                    {renderCategoryOutlineIcon(cat.id, 'w-5 h-5', 1.75)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#142B45] group-hover:text-[#00A896] transition-colors">{cat.name}</h4>
                    <span className="text-[10px] text-[#00A896] font-semibold">{count} منتجات معتمدة</span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#00A896] transition-colors" strokeWidth={1.75} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // تبويب 3: البحث المباشر
  // =========================================================================
  function renderCustomerSearchTab() {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#00A896] focus-within:bg-white transition-colors">
          <Search className="w-4 h-4 text-[#00A896]" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="ابحث بالاسم، الكود، أو موديل الجهاز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-xs text-[#142B45] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* فلاتر الأقسام السريعة مع أيقونات خطية وحالة نشطة باللون التركوازي */}
        <div
          dir="rtl"
          className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar scroll-smooth select-none cursor-grab active:cursor-grabbing"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollBy({ left: -e.deltaY, behavior: 'smooth' });
            }
          }}
          onMouseDown={(e) => {
            const target = e.currentTarget;
            target.dataset.isDown = 'true';
            target.dataset.startX = `${e.pageX - target.offsetLeft}`;
            target.dataset.scrollLeft = `${target.scrollLeft}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onMouseUp={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onMouseMove={(e) => {
            const target = e.currentTarget;
            if (target.dataset.isDown !== 'true') return;
            e.preventDefault();
            const x = e.pageX - target.offsetLeft;
            const startX = parseFloat(target.dataset.startX || '0');
            const scrollLeft = parseFloat(target.dataset.scrollLeft || '0');
            const walk = x - startX;
            target.scrollLeft = scrollLeft - walk;
          }}
        >
          {OFFICIAL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#00A896]/10 text-[#00A896] border border-[#00A896]/30 font-bold shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E8EDF2] hover:text-[#142B45] hover:border-slate-300'
                }`}
              >
                <span className={isSelected ? 'text-[#00A896]' : 'text-slate-400'}>
                  {renderCategoryOutlineIcon(cat.id, 'w-3 h-3', isSelected ? 2 : 1.75)}
                </span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* نتائج البحث */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#64748B] block">
            تم العثور على {filteredProducts.length} منتجات
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSelectedProduct(p);
                setCustomerStack('product_details');
              }}
              className="p-2.5 rounded-xl border border-[#E8EDF2] flex items-center justify-between cursor-pointer hover:border-[#00A896]"
            >
              <div className="flex items-center gap-2.5">
                <img src={p.image} alt={p.name} className="w-11 h-11 rounded-lg object-cover bg-[#F8FAFC]" />
                <div>
                  <h5 className="text-xs font-bold text-[#142B45]">{p.name}</h5>
                  <span className="text-[10px] text-[#00A896]">{p.compatibility}</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#142B45]">{p.price} ₪</span>
            </div>
          ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // تبويب 4: سلة المشتريات
  // =========================================================================
  function renderCustomerCartTab() {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-base font-bold text-[#142B45]">
          سلة المشتريات ({cart.length} أصناف)
        </h3>

        {cart.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#F8FAFC] border border-[#E8EDF2] my-4">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
            <h4 className="text-xs font-bold text-[#142B45]">سلة التسوق فارغة حالياً</h4>
            <button
              onClick={() => setCustomerTab('home')}
              className="mt-3 px-4 py-1.5 rounded-xl bg-[#00A896] text-white text-xs font-bold hover:bg-[#028090] transition-colors inline-flex items-center gap-1.5"
            >
              <span>تصفح المنتجات</span>
              <ArrowRight className="w-3.5 h-3.5 text-white rotate-180" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedColor}`}
                  className="p-3 rounded-2xl border border-[#E8EDF2] flex gap-3 items-center justify-between bg-white shadow-2xs"
                >
                  <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover bg-slate-50 border border-slate-100" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-[#142B45] truncate">{item.product.name}</h5>
                    <span className="text-[10px] text-[#64748B]">{item.selectedColor}</span>
                    <span className="text-xs font-extrabold text-[#142B45] block mt-0.5">{item.product.price} ₪</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-[#E8EDF2] rounded-xl bg-[#F8FAFC] p-0.5">
                      <button
                        onClick={() => updateCartQty(item.product.id, item.selectedColor, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                        title="إنقاص الكمية"
                      >
                        <Minus className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#142B45]">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, item.selectedColor, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                        title="زيادة الكمية"
                      >
                        <Plus className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedColor)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف من السلة"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* كود الخصم */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E8EDF2]">
              <span className="text-[11px] font-semibold text-[#142B45] block mb-1">
                هل لديك كود خصم؟ (جرب PALESTINE)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="PALESTINE"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#E8EDF2] text-xs uppercase bg-white outline-none focus:border-[#00A896]"
                />
                <button
                  onClick={() => {
                    if (couponCode.toUpperCase() === 'PALESTINE') {
                      setCouponApplied(true);
                      showToast('تم تطبيق خصم 20 ₪ بنجاح!');
                    } else {
                      showToast('كود الخصم غير صحيح');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#142B45] text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  تطبيق
                </button>
              </div>
            </div>

            {/* تفصيل المجموع بالعملة المحلية */}
            <div className="p-3.5 rounded-2xl border border-[#E8EDF2] text-xs space-y-1.5 text-[#64748B] bg-white">
              <div className="flex justify-between">
                <span>المجموع الفرعي</span>
                <span className="font-bold text-[#142B45]">{subtotal} ₪</span>
              </div>
              <div className="flex justify-between">
                <span>رسوم التوصيل ({checkoutCity})</span>
                <span className="font-bold text-[#142B45]">{deliveryFee} ₪</span>
              </div>
              {couponApplied && (
                <div className="flex justify-between text-[#10B981] font-bold">
                  <span>خصم الكوبون</span>
                  <span>- {discountAmount} ₪</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#142B45] pt-1.5 border-t border-[#F1F5F9]">
                <span>المجموع الكلي</span>
                <span className="text-[#00A896]">{grandTotal} ₪</span>
              </div>
            </div>

            <button
              onClick={() => setCustomerStack('checkout')}
              className="w-full py-3.5 rounded-xl bg-[#00A896] text-white text-xs font-bold hover:bg-[#028090] shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>متابعة إلى إتمام الشراء ({grandTotal} ₪)</span>
            </button>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // تبويب 5: الملف الشخصي والتحكم بالإدارة
  // =========================================================================
  function renderCustomerProfileTab() {
    return (
      <div className="p-4 space-y-4">
        {/* بطاقة المستخدم */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E8EDF2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#00A896] text-white flex items-center justify-center font-bold text-base shadow-xs">
              {currentUser?.name.charAt(0) || 'م'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#142B45]">{currentUser?.name}</h4>
              <span className="text-xs text-[#64748B] block truncate max-w-[180px]">{currentUser?.email}</span>
              <span className="text-[10px] text-[#00A896] font-bold block mt-0.5">
                {isSuperAdmin ? '🛡️ حساب المدير العام للمتجر' : 'حساب مشتري موثق'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-100 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* بطاقة الوصول الحصرية للمدير العام (تظهر فقط لـ adimn123@gmail.com) */}
        {isSuperAdmin && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#142B45] to-[#1E3A5F] text-white shadow-md border border-[#142B45] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00A896]" strokeWidth={1.75} />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  لوحة تحكم نظام الإدارة (Admin OS)
                </h4>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00A896] text-white font-bold">
                حساب معتمد
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              أنت مسجل كمدير عام للنظام. يمكنك التحكم بالمخزون للـ 21 منتجاً، تحديث حالات الشحن، ورصد أسعار المنافسين.
            </p>
            <button
              onClick={() => {
                setAppMode('admin');
                setAdminTab('admin_overview');
              }}
              className="w-full py-2.5 rounded-xl bg-[#00A896] hover:bg-[#028090] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <BarChart3 className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>الدخول للوحة الإدارة الفورية ➔</span>
            </button>
          </div>
        )}

        {/* القائمة السريعة للعميل */}
        <div className="border border-[#E8EDF2] rounded-2xl divide-y divide-[#E8EDF2] text-xs font-semibold text-[#142B45] bg-white overflow-hidden shadow-2xs">
          <button
            onClick={() => setCustomerStack('orders')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 border border-[#00A896]/20 text-[#00A896] flex items-center justify-center transition-transform group-hover:scale-105">
                <Package className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <span>طلباتي السابقة ({orders.length})</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#00A896] transition-colors" strokeWidth={1.75} />
          </button>

          <button
            onClick={() => setCustomerStack('wishlist')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 border border-[#00A896]/20 text-[#00A896] flex items-center justify-center transition-transform group-hover:scale-105">
                <Heart className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <span>قائمة المفضلة ({wishlistIds.length})</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#00A896] transition-colors" strokeWidth={1.75} />
          </button>

          <button
            onClick={() => setCustomerStack('support')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 border border-[#00A896]/20 text-[#00A896] flex items-center justify-center transition-transform group-hover:scale-105">
                <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <span>خدمة العملاء والواتساب المباشر</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#00A896] transition-colors" strokeWidth={1.75} />
          </button>

          <button
            onClick={handleLogout}
            className="w-full p-3.5 flex items-center justify-between hover:bg-rose-50/50 text-rose-500 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center transition-transform group-hover:scale-105">
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <span>تسجيل الخروج</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-rose-300 group-hover:text-rose-500 transition-colors" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // شاشات العمق لمتجر العميل (Stack Views)
  // =========================================================================
  function renderCustomerStackView() {
    switch (customerStack) {
      case 'product_details': {
        const [activeColor, setActiveColor] = useState(selectedProduct.colors[0]);
        const [qty, setQty] = useState(1);

        return (
          <div className="p-4 space-y-4">
            <div className="w-full h-64 rounded-2xl bg-[#F8FAFC] border border-[#E8EDF2] overflow-hidden">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#00A896]">
                التوافق: {selectedProduct.compatibility}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedProduct.stock > 0 ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
                }`}
              >
                {selectedProduct.stock > 0 ? `متوفر بالمخزون (${selectedProduct.stock})` : 'نفدت الكمية'}
              </span>
            </div>

            <h2 className="text-base font-bold text-[#142B45]">{selectedProduct.name}</h2>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-[#142B45]">{selectedProduct.price} ₪</span>
              <span className="text-xs text-[#94A3B8] line-through">{selectedProduct.originalPrice} ₪</span>
            </div>

            {/* خيارات الألوان */}
            <div>
              <span className="text-xs font-bold text-[#142B45] block mb-1">اللون / المظهر:</span>
              <div className="flex gap-1.5 flex-wrap">
                {selectedProduct.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveColor(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      activeColor === c ? 'border-[#00A896] bg-[#00A896]/10 text-[#00A896]' : 'border-[#E8EDF2]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed border-t border-[#F1F5F9] pt-2">
              {selectedProduct.description}
            </p>

            <button
              disabled={selectedProduct.stock <= 0}
              onClick={() => {
                addToCart(selectedProduct, activeColor, qty);
                setCustomerStack(null);
                setCustomerTab('cart');
              }}
              className={`w-full py-3.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 ${
                selectedProduct.stock > 0
                  ? 'bg-[#00A896] text-white hover:bg-[#028090]'
                  : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
              }`}
            >
              {selectedProduct.stock > 0 ? (
                <>
                  <ShoppingBag className="w-4 h-4 text-white" strokeWidth={1.75} />
                  <span>إضافة إلى السلة • {selectedProduct.price * qty} ₪</span>
                </>
              ) : (
                <span>نفدت الكمية حالياً</span>
              )}
            </button>
          </div>
        );
      }

      case 'checkout':
        return (
          <form onSubmit={handlePlaceOrder} className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#142B45]">تفاصيل التوصيل وعنوان الاستلام</h3>
            <div>
              <label className="text-xs font-semibold text-[#142B45] block mb-1">الاسم الكامل للمستلم</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white">
                <User className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                <input
                  type="text"
                  required
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  className="w-full text-xs outline-none bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#142B45] block mb-1">رقم الهاتف (واتساب للتنسيق)</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8EDF2] focus-within:border-[#00A896] bg-white">
                <Phone className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                <input
                  type="text"
                  required
                  value={checkoutPhone}
                  onChange={(e) => setCheckoutPhone(e.target.value)}
                  className="w-full text-xs outline-none bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#142B45] block mb-1">مدينة التوصيل</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8EDF2] bg-white">
                <MapPin className="w-4 h-4 text-[#00A896]" strokeWidth={1.75} />
                <select
                  value={checkoutCity}
                  onChange={(e) => setCheckoutCity(e.target.value)}
                  className="w-full text-xs bg-transparent outline-none"
                >
                  {PALESTINIAN_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} (التوصيل: {c.fee} ₪)</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#142B45] block mb-1">العنوان التفصيلي / أقرب معلم</label>
              <input
                type="text"
                required
                value={checkoutStreet}
                onChange={(e) => setCheckoutStreet(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8EDF2] text-xs outline-none focus:border-[#00A896] bg-white"
              />
            </div>

            {/* خيارات الدفع */}
            <div>
              <label className="text-xs font-semibold text-[#142B45] block mb-1">طريقة الدفع</label>
              <div className="space-y-1.5">
                {[
                  { id: 'cod' as const, label: 'الدفع عند الاستلام (نقدًا للطريد)', icon: Truck },
                  { id: 'palpay' as const, label: 'محفظة بال باي / محفظتي (PalPay)', icon: CreditCard },
                  { id: 'bank' as const, label: 'تحويل مباشر – بنك فلسطين', icon: ShieldCheck },
                ].map((pm) => {
                  const IconComponent = pm.icon;
                  const isSelected = checkoutPayment === pm.id;
                  return (
                    <div
                      key={pm.id}
                      onClick={() => setCheckoutPayment(pm.id)}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? 'border-[#00A896] bg-[#00A896]/5 font-bold' : 'border-[#E8EDF2] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#00A896]/10 text-[#00A896]' : 'bg-slate-50 text-slate-400'}`}>
                          <IconComponent className="w-4 h-4" strokeWidth={isSelected ? 2 : 1.75} />
                        </div>
                        <span>{pm.label}</span>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00A896]" strokeWidth={2} />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#00A896] text-white text-xs font-bold hover:bg-[#028090] transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
              <span>تأكيد وإرسال الطلب • {grandTotal} ₪</span>
            </button>
          </form>
        );

      case 'order_confirmation':
        return (
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#10B981] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-[#10B981]" strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-[#142B45]">تم تأكيد طلبك بنجاح!</h3>
            <p className="text-xs text-[#64748B]">رقم الإرسالية: #{lastPlacedOrder?.id} وسيتم التواصل معك هاتفياً قبل خروج الطرد.</p>
            <button
              onClick={() => setCustomerStack('tracking')}
              className="w-full py-3 rounded-xl bg-[#00A896] text-white text-xs font-bold mt-2 flex items-center justify-center gap-2 hover:bg-[#028090] transition-colors"
            >
              <Clock className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>تتبع مسار الطلب لحظياً</span>
            </button>
          </div>
        );

      case 'tracking':
        return (
          <div className="p-4 space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E8EDF2] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#00A896] font-bold block">تتبع الشحنة المباشر</span>
                <h4 className="text-xs font-bold text-[#142B45]">{activeTrackingOrderId}</h4>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center">
                <Truck className="w-4 h-4" strokeWidth={1.75} />
              </div>
            </div>
            <div className="space-y-3 px-1 text-xs">
              {[
                { title: 'تم استلام وتأكيد الطلب', time: '10:15 ص', done: true },
                { title: 'قيد التجهيز في مستودع رام الله', time: '11:00 ص', done: true },
                { title: 'مع مندوب التوصيل', time: 'في الطريق', done: false },
                { title: 'تم التوصيل بنجاح', time: 'بانتظار الاستلام', done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] ${s.done ? 'bg-[#00A896]/10 text-[#00A896] border border-[#00A896]/30 font-bold' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00A896]" strokeWidth={2} /> : i + 1}
                  </div>
                  <div>
                    <span className="font-bold block text-[#142B45]">{s.title}</span>
                    <span className="text-[10px] text-[#64748B]">{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-[#142B45]">سجل الطلبات</h3>
            {orders.map((o) => (
              <div key={o.id} className="p-3.5 rounded-2xl border border-[#E8EDF2] flex justify-between items-center text-xs bg-white shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center">
                    <Package className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="font-bold text-[#142B45] block">{o.id}</span>
                    <span className="text-[10px] text-[#64748B]">{o.date} • {o.items.length} أصناف</span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="font-bold text-[#142B45] block">{o.total} ₪</span>
                  <span className="text-[10px] text-[#00A896] font-semibold">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'wishlist':
        return (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-[#142B45]">قائمة المفضلة</h3>
            {products.filter((p) => wishlistIds.includes(p.id)).map((p) => (
              <div key={p.id} className="p-3.5 rounded-2xl border border-[#E8EDF2] flex items-center justify-between text-xs bg-white shadow-2xs">
                <div className="flex items-center gap-3">
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-slate-50" />
                  <div>
                    <h5 className="font-bold text-[#142B45] line-clamp-1 max-w-[150px]">{p.name}</h5>
                    <span className="text-xs font-extrabold text-[#142B45]">{p.price} ₪</span>
                  </div>
                </div>
                <button
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    p.stock > 0 ? 'bg-[#00A896] text-white hover:bg-[#028090]' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {p.stock > 0 ? (
                    <>
                      <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                      <span>إضافة</span>
                    </>
                  ) : (
                    <span>نفدت</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        );

      case 'support':
        return (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#142B45]">خدمة العملاء والدعم المباشر</h3>
            <a
              href="https://wa.me/970599000000"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] flex items-center justify-between hover:bg-[#25D366]/15 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#25D366] shadow-2xs">
                  <Phone className="w-5 h-5 text-[#25D366]" strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">محادثة واتساب فورية</h4>
                  <p className="text-[11px] text-[#64748B]">إجابات فورية وتنسيق مع فريق رام الله</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#128C7E] group-hover:translate-x-[-2px] transition-transform" strokeWidth={1.75} />
            </a>
          </div>
        );

      case 'notifications':
        return (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-[#142B45]">مركز التنبيهات</h3>
            <div className="p-3.5 rounded-2xl border border-[#00A896]/30 bg-[#00A896]/5 text-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#00A896]/20 text-[#00A896] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-[#00A896]" strokeWidth={1.75} />
              </div>
              <div>
                <span className="font-bold block text-[#142B45]">تم تحديث الكتالوج الرسمي لـ 21 منتجاً</span>
                <span className="text-[#64748B] mt-0.5 block leading-relaxed">تصفح الآن إكسسوارات الآيباد، الكيبوردات، الأقلام، والشواحن الأصلية مع خيارات الشحن السريع في فلسطين.</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // =========================================================================
  // لوحة الإدارة تبويب 1: المؤشرات الإدارية (عربي 100%)
  // =========================================================================
  function renderAdminOverviewTab() {
    const totalSales = orders.reduce((s, o) => s + o.total, 0);

    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#142B45]">لوحة المؤشرات التنفيذية</h3>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#10B981] font-bold">مباشر</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-2xl border border-[#E8EDF2] bg-white shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center mb-1.5">
              <DollarSign className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] text-[#64748B] block">المبيعات الإجمالية</span>
            <span className="text-base font-extrabold text-[#142B45]">{totalSales.toLocaleString()} ₪</span>
            <span className="text-[10px] text-[#10B981] font-bold block mt-0.5">+18.4% نمو</span>
          </div>
          <div className="p-3.5 rounded-2xl border border-[#E8EDF2] bg-white shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center mb-1.5">
              <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] text-[#64748B] block">الطلبات المسجلة</span>
            <span className="text-base font-extrabold text-[#142B45]">{orders.length}</span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">طلب مؤكد</span>
          </div>
          <div className="p-3.5 rounded-2xl border border-[#E8EDF2] bg-white shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center mb-1.5">
              <Layers className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] text-[#64748B] block">إجمالي المخزون</span>
            <span className="text-base font-extrabold text-[#142B45]">
              {products.reduce((a, b) => a + b.stock, 0)} قطعة
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-[#E8EDF2] bg-white shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center mb-1.5">
              <Package className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] text-[#64748B] block">المنتجات النشطة</span>
            <span className="text-base font-extrabold text-[#00A896]">21 صنفاً</span>
          </div>
        </div>

        {/* ملخص المخزون والأسعار */}
        <div className="p-4 rounded-2xl border border-[#E8EDF2] bg-white space-y-2.5 shadow-2xs">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#142B45]">حالة الكتالوج الرسمي (21 منتج)</span>
            <span className="text-[10px] text-[#00A896] font-bold">مربوط كلياً</span>
          </div>
          <div className="space-y-2 text-[11px] text-[#64748B]">
            <div className="flex justify-between items-center">
              <span>قلم بادهاوس (120 ₪)</span>
              <span className="text-[#10B981] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.75} />
                18 قطعة متوفرة
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>شاشة ملمس الورق (50 ₪)</span>
              <span className="text-[#10B981] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.75} />
                12 قطعة متوفرة
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>كفر كيبورد مع تاتش باد (160 ₪)</span>
              <span className="text-[#EF4444] font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" strokeWidth={1.75} />
                9 قطع فقط (تنبيه نقص)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // لوحة الإدارة تبويب 2: إدارة المنتجات الـ 21 الرسمية
  // =========================================================================
  function renderAdminProductsTab() {
    return (
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#142B45]">كتالوج المنتجات الرسمي</h3>
            <span className="text-[10px] text-[#64748B]">{products.length} منتجات رسمية معتمدة</span>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#00A896] text-white text-xs font-bold hover:bg-[#028090] transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            <span>إضافة منتج</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {products.map((p) => (
            <div key={p.id} className="p-3 rounded-2xl border border-[#E8EDF2] flex items-center justify-between text-xs bg-white shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-slate-50" />
                <div className="min-w-0">
                  <h5 className="font-bold text-[#142B45] truncate max-w-[200px]">{p.name}</h5>
                  <span className="text-[10px] text-[#64748B]">
                    المخزون: {p.stock} قطعة • {p.price} ₪
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(p);
                  setShowProductModal(true);
                }}
                className="text-xs text-[#00A896] font-bold px-2.5 py-1 rounded-lg border border-[#00A896]/20 bg-[#00A896]/5 hover:bg-[#00A896]/10 flex items-center gap-1 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-[#00A896]" strokeWidth={1.75} />
                <span>تعديل</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // لوحة الإدارة تبويب 3: المخزون والكميات
  // =========================================================================
  function renderAdminInventoryTab() {
    return (
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#142B45]">إدارة المخزون والتوريد</h3>
          <span className="text-[10px] text-[#64748B]">تعديل الكميات الفورية لجميع الأصناف الـ 21</span>
        </div>
        <div className="space-y-2.5">
          {products.map((p) => (
            <div key={p.id} className="p-3 rounded-2xl border border-[#E8EDF2] flex items-center justify-between text-xs bg-white shadow-2xs">
              <div className="min-w-0">
                <h5 className="font-bold text-[#142B45] truncate max-w-[200px]">{p.name}</h5>
                <span className="text-[10px] text-[#64748B]">الحد الأدنى: {p.minThreshold} قطع</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold px-2 py-0.5 rounded-lg text-xs ${p.stock <= p.minThreshold ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  {p.stock}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, stock: item.stock + 5 } : item)));
                      showToast(`تمت إضافة 5 قطع لـ "${p.name}"`);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#00A896]/10 border border-[#00A896]/30 font-bold text-[10px] text-[#00A896] hover:bg-[#00A896]/20 transition-colors flex items-center gap-0.5"
                    title="إضافة 5 قطع"
                  >
                    <Plus className="w-3 h-3 text-[#00A896]" strokeWidth={2} />
                    <span>5</span>
                  </button>
                  <button
                    onClick={() => {
                      setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, stock: Math.max(0, item.stock - 1) } : item)));
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold text-[10px] text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-0.5"
                    title="إنقاص قطعة واحدة"
                  >
                    <Minus className="w-3 h-3 text-slate-600" strokeWidth={2} />
                    <span>1</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // لوحة الإدارة تبويب 4: إدارة الطلبات
  // =========================================================================
  function renderAdminOrdersTab() {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#142B45]">إدارة وتجهيز الطلبات</h3>
        <div className="space-y-2.5">
          {orders.map((o) => (
            <div key={o.id} className="p-3.5 rounded-2xl border border-[#E8EDF2] space-y-2 text-xs bg-white shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00A896]/10 text-[#00A896] flex items-center justify-center">
                    <Package className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <span className="font-bold text-[#142B45]">{o.id} • {o.customerName}</span>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    setOrders((prev) => prev.map((ord) => (ord.id === o.id ? { ...ord, status: st } : ord)));
                    showToast(`تم تحديث حالة الطلب إلى: ${st}`);
                  }}
                  className="px-2 py-1 rounded-lg border border-[#E8EDF2] font-bold bg-[#F8FAFC] text-[11px] outline-none"
                >
                  <option value="قيد المراجعة">قيد المراجعة</option>
                  <option value="مؤكد">مؤكد</option>
                  <option value="قيد التجهيز">قيد التجهيز</option>
                  <option value="تم الشحن">تم الشحن</option>
                  <option value="تم التوصيل">تم التوصيل</option>
                </select>
              </div>
              <div className="flex justify-between text-[#64748B] text-[11px] pt-1 border-t border-slate-50">
                <span>{o.city} • {o.items.length} أصناف</span>
                <span className="font-extrabold text-[#142B45]">{o.total} ₪</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // لوحة الإدارة تبويب 5: المساعد الذكي
  // =========================================================================
  function renderAdminAiTab() {
    return (
      <div className="p-4 space-y-3 flex flex-col h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00A896]/10 border border-[#00A896]/20 text-[#00A896] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#00A896]" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#142B45]">مساعد بادهاوس لذكاء الأعمال (Gemini)</h3>
            <span className="text-[10px] text-[#64748B]">تحليل المخزون والأسعار الفوري في فلسطين</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] p-3 bg-[#F8FAFC] rounded-2xl border border-[#E8EDF2]">
          {aiChatHistory.map((m, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                m.sender === 'user' ? 'bg-[#00A896] text-white mr-auto max-w-[85%]' : 'bg-white border border-[#E8EDF2] text-[#142B45] whitespace-pre-line'
              }`}
            >
              {m.text}
            </div>
          ))}
          {isAiThinking && (
            <div className="text-[11px] text-[#00A896] flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#00A896]" strokeWidth={1.75} />
              <span>جاري تحليل قاعدة بيانات الكتالوج الـ 21...</span>
            </div>
          )}
        </div>

        {/* اقتراحات أسئلة سريعة مع أيقونات خطية */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
          {['فحص نواقص المخزون', 'مقارنة أسعار الكتالوج بالسوق', 'ملخص مبيعات شهر نوفمبر'].map((q) => (
            <button
              key={q}
              onClick={() => handleSendAi(q)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#E8EDF2] whitespace-nowrap text-[#64748B] hover:text-[#00A896] hover:border-[#00A896]/30 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[#00A896]" strokeWidth={1.75} />
              <span>{q}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="اسأل عن مبيعات أو مخزون أي صنف..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendAi()}
            className="flex-1 px-3 py-2 rounded-xl border border-[#E8EDF2] text-xs outline-none focus:border-[#00A896] bg-white"
          />
          <button
            onClick={() => handleSendAi()}
            className="px-4 py-2 rounded-xl bg-[#00A896] text-white text-xs font-bold hover:bg-[#028090] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>إرسال</span>
            <ArrowRight className="w-3.5 h-3.5 text-white rotate-180" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // نافذة تعديل أو إضافة منتج للمدير العام
  // =========================================================================
  function renderProductEditorModal() {
    const isEdit = !!editingProduct;
    const [name, setName] = useState(editingProduct?.name || '');
    const [price, setPrice] = useState(editingProduct?.price || 50);
    const [stock, setStock] = useState(editingProduct?.stock || 20);
    const [category, setCategory] = useState(editingProduct?.categories[0] || 'cat_pens');
    const [compatibility, setCompatibility] = useState(editingProduct?.compatibility || 'جميع أجهزة iPad');

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (isEdit && editingProduct) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...p, name, price: Number(price), stock: Number(stock), categories: [category], compatibility }
              : p
          )
        );
        showToast('تم حفظ تعديلات المنتج!');
      } else {
        const newP: Product = {
          id: `prod-${Date.now()}`,
          sku: `PH-NEW-${Math.floor(100 + Math.random() * 900)}`,
          name: name || 'منتج آيباد جديد',
          categories: [category],
          price: Number(price),
          originalPrice: Number(price) + 20,
          stock: Number(stock),
          minThreshold: 5,
          compatibility,
          rating: 5.0,
          reviewsCount: 1,
          image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
          description: 'منتج معتمد عالي الجودة متوافق مع أجهزة الآيباد.',
          colors: ['أسود', 'فضي'],
        };
        setProducts((prev) => [newP, ...prev]);
        showToast('تمت إضافة المنتج بنجاح إلى الكتالوج!');
      }
      setShowProductModal(false);
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-[#E8EDF2]">
            <h4 className="text-sm font-bold text-[#142B45]">{isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h4>
            <button onClick={() => setShowProductModal(false)} className="p-1 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" strokeWidth={1.75} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-2.5 text-xs">
            <div>
              <label className="font-semibold block mb-1">اسم المنتج</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8EDF2] outline-none focus:border-[#00A896]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">السعر (₪)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8EDF2] outline-none focus:border-[#00A896]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">الكمية بالمخزون</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8EDF2] outline-none focus:border-[#00A896]"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">القسم</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8EDF2] bg-white outline-none focus:border-[#00A896]"
              >
                {OFFICIAL_CATEGORIES.slice(1).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">التوافق</label>
              <input
                type="text"
                value={compatibility}
                onChange={(e) => setCompatibility(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8EDF2] outline-none focus:border-[#00A896]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-3 py-1.5 rounded-lg border text-[#64748B] hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00A896] text-white font-bold hover:bg-[#028090] transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Check className="w-4 h-4 text-white" strokeWidth={2} />
                <span>حفظ</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
