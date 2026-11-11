class AppUser {
  final String name;
  final String email;
  final String phone;
  final String city;
  final String role; // super_admin | customer | guest

  const AppUser({
    required this.name,
    required this.email,
    required this.phone,
    required this.city,
    required this.role,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'phone': phone,
        'city': city,
        'role': role,
      };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        city: json['city'] as String? ?? '',
        role: json['role'] as String? ?? 'customer',
      );
}

class Product {
  final String id;
  final String sku;
  final String name;
  final List<String> categories;
  final int price;
  final int originalPrice;
  final int stock;
  final int minThreshold;
  final String compatibility;
  final double rating;
  final int reviewsCount;
  final String image;
  final String description;
  final List<String> colors;

  const Product({
    required this.id,
    required this.sku,
    required this.name,
    required this.categories,
    required this.price,
    required this.originalPrice,
    required this.stock,
    required this.minThreshold,
    required this.compatibility,
    required this.rating,
    required this.reviewsCount,
    required this.image,
    required this.description,
    required this.colors,
  });

  Product copyWith({
    String? name,
    List<String>? categories,
    int? price,
    int? originalPrice,
    int? stock,
    String? compatibility,
    String? description,
  }) {
    return Product(
      id: id,
      sku: sku,
      name: name ?? this.name,
      categories: categories ?? this.categories,
      price: price ?? this.price,
      originalPrice: originalPrice ?? this.originalPrice,
      stock: stock ?? this.stock,
      minThreshold: minThreshold,
      compatibility: compatibility ?? this.compatibility,
      rating: rating,
      reviewsCount: reviewsCount,
      image: image,
      description: description ?? this.description,
      colors: colors,
    );
  }
}

class CartLine {
  final String productId;
  final int quantity;
  final String selectedColor;

  const CartLine({
    required this.productId,
    required this.quantity,
    required this.selectedColor,
  });

  CartLine copyWith({int? quantity}) => CartLine(
        productId: productId,
        quantity: quantity ?? this.quantity,
        selectedColor: selectedColor,
      );
}

class OrderLine {
  final String productId;
  final String name;
  final int quantity;
  final String color;
  final int price;

  const OrderLine({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.color,
    required this.price,
  });
}

class ShopOrder {
  final String id;
  final String date;
  final List<OrderLine> items;
  final String customerName;
  final String customerPhone;
  final String city;
  final String address;
  final String paymentMethod;
  final int subtotal;
  final int shipping;
  final int discount;
  final int total;
  final String status;

  const ShopOrder({
    required this.id,
    required this.date,
    required this.items,
    required this.customerName,
    required this.customerPhone,
    required this.city,
    required this.address,
    required this.paymentMethod,
    required this.subtotal,
    required this.shipping,
    required this.discount,
    required this.total,
    required this.status,
  });

  ShopOrder copyWith({String? status}) => ShopOrder(
        id: id,
        date: date,
        items: items,
        customerName: customerName,
        customerPhone: customerPhone,
        city: city,
        address: address,
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        total: total,
        status: status ?? this.status,
      );
}

class CityFee {
  final String name;
  final int fee;
  const CityFee(this.name, this.fee);
}

class OfficialCategory {
  final String id;
  final String name;
  const OfficialCategory(this.id, this.name);
}

const superAdminEmail = 'adimn123@gmail.com';
const superAdminPass = '123456';

const officialCategories = <OfficialCategory>[
  OfficialCategory('all', 'الكل'),
  OfficialCategory('cat_pens', 'الأقلام وملحقاتها'),
  OfficialCategory('cat_cases', 'الحافظات والحقائب'),
  OfficialCategory('cat_keyboards', 'لوحات المفاتيح'),
  OfficialCategory('cat_stands', 'الحوامل والمساند'),
  OfficialCategory('cat_chargers', 'الشواحن والكابلات'),
  OfficialCategory('cat_others', 'إكسسوارات أخرى'),
];

const palestinianCities = <CityFee>[
  CityFee('رام الله والبيرة', 20),
  CityFee('نابلس', 25),
  CityFee('الخليل', 25),
  CityFee('بيت لحم', 25),
  CityFee('القدس وضواحيها', 30),
  CityFee('جنين', 25),
  CityFee('طولكرم', 25),
  CityFee('قلقيلية', 25),
  CityFee('أريحا والأغوار', 25),
  CityFee('قطاع غزة', 35),
];

const orderStatuses = <String>[
  'قيد المراجعة',
  'مؤكد',
  'قيد التجهيز',
  'تم الشحن',
  'تم التوصيل',
  'ملغي',
];

const officialProducts = <Product>[
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
    id: 'prod-06',
    sku: 'PH-KBD-06',
    name: 'كفر iPad سيليكون غير شفاف مع Keyboard',
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
  ),
  Product(
    id: 'prod-07',
    sku: 'PH-KBD-07',
    name: 'كفر iPad سيليكون غير شفاف مع Keyboard وTouchpad',
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
  Product(
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
  ),
];

ShopOrder seedOrder() {
  return const ShopOrder(
    id: 'PH-2026-1042',
    date: 'اليوم، 10:15 ص',
    items: [
      OrderLine(productId: 'prod-01', name: 'PadHouse Pencil – قلم بادهاوس', quantity: 1, color: 'أبيض ناصع', price: 120),
      OrderLine(productId: 'prod-19', name: 'شاشة حماية ملمس الورق – PadHouse PaperFeel', quantity: 1, color: 'ملمس ورقي مطفي', price: 50),
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
  );
}
