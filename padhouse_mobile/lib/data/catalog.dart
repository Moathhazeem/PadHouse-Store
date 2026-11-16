import '../core/network/api_client.dart';

class AppUser {
  final String name;
  final String email;
  final String phone;
  final String city;
  final String address;
  final String role; // super_admin | customer | guest

  const AppUser({
    required this.name,
    required this.email,
    required this.phone,
    required this.city,
    this.address = '',
    required this.role,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'phone': phone,
        'city': city,
        'address': address,
        'role': role,
      };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        city: json['city'] as String? ?? '',
        address: json['address'] as String? ?? '',
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
  final List<String> compatibilityList;
  final double rating;
  final int reviewsCount;
  final String image;
  final List<String> images;
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
    this.compatibilityList = const [],
    required this.rating,
    required this.reviewsCount,
    required this.image,
    this.images = const [],
    required this.description,
    required this.colors,
  });

  List<String> get galleryImages => images.isNotEmpty ? images : [image];

  factory Product.fromJson(Map<String, dynamic> json) {
    final imgs = json['images'];
    List<String> imageList = [];
    if (imgs is List) {
      imageList = imgs.map((e) => e.toString()).toList();
    }
    final rawImg = json['image']?.toString() ??
        (imageList.isNotEmpty ? imageList.first : '');
    imageList = imageList
        .map(ApiClient.resolveImageUrl)
        .where((value) => value.isNotEmpty)
        .toList();
    final resolvedRawImg = ApiClient.resolveImageUrl(rawImg);
    if (imageList.isEmpty && resolvedRawImg.isNotEmpty) {
      imageList = [resolvedRawImg];
    }
    final rawColors = json['colors'];
    List<String> colorsList = ['افتراضي'];
    if (rawColors is List && rawColors.isNotEmpty) {
      colorsList = rawColors.map((e) => e.toString()).toList();
    }
    final rawCategories = json['categories'];
    List<String> catList = ['cat_others'];
    if (rawCategories is List && rawCategories.isNotEmpty) {
      catList = rawCategories.map((e) => e.toString()).toList();
    }

    // Verified iPad compatibility list from the backend (never guessed locally).
    final compatibilityStr =
        json['compatibility']?.toString() ?? 'جميع أجهزة iPad المدعومة';
    final rawCompatList = json['compatibilityList'];
    List<String> compatList = [];
    if (rawCompatList is List && rawCompatList.isNotEmpty) {
      compatList = rawCompatList
          .map((e) => e.toString())
          .where((s) => s.isNotEmpty)
          .toList();
    } else {
      compatList = compatibilityStr
          .split(RegExp(r'[,،·]'))
          .map((e) => e.trim())
          .where((s) => s.isNotEmpty)
          .toList();
    }

    return Product(
      id: json['id']?.toString() ??
          'prod-${DateTime.now().millisecondsSinceEpoch}',
      sku: json['sku']?.toString() ?? 'PH-GEN',
      name: json['nameAr']?.toString() ??
          json['name']?.toString() ??
          'منتج بادهاوس',
      categories: catList,
      price: (json['price'] as num?)?.toInt() ?? 0,
      originalPrice: (json['originalPrice'] as num?)?.toInt() ??
          (json['price'] as num?)?.toInt() ??
          0,
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      minThreshold: (json['minThreshold'] as num?)?.toInt() ?? 5,
      compatibility: compatibilityStr,
      compatibilityList: compatList,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewsCount: (json['reviewsCount'] as num?)?.toInt() ?? 0,
      image: resolvedRawImg.isNotEmpty
          ? resolvedRawImg
          : (imageList.isNotEmpty ? imageList.first : ''),
      images: imageList,
      description: json['description']?.toString() ?? '',
      colors: colorsList,
    );
  }

  Product copyWith({
    String? name,
    List<String>? categories,
    int? price,
    int? originalPrice,
    int? stock,
    String? compatibility,
    List<String>? compatibilityList,
    String? description,
    List<String>? images,
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
      compatibilityList: compatibilityList ?? this.compatibilityList,
      rating: rating,
      reviewsCount: reviewsCount,
      image: image,
      images: images ?? this.images,
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

ShopOrder seedOrder() {
  return const ShopOrder(
    id: 'PH-2026-1042',
    date: 'اليوم، 10:15 ص',
    items: [
      OrderLine(
          productId: 'prod-01',
          name: 'PadHouse Pencil – قلم بادهاوس',
          quantity: 1,
          color: 'أبيض ناصع',
          price: 120),
      OrderLine(
          productId: 'prod-19',
          name: 'شاشة حماية ملمس الورق – PadHouse PaperFeel',
          quantity: 1,
          color: 'ملمس ورقي مطفي',
          price: 50),
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
