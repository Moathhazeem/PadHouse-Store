import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/catalog.dart';
import 'api_client.dart';

/// Typed wrapper around the shared PadHouse NestJS backend.
///
/// Every method maps 1:1 to a real, existing endpoint. It reuses the singleton
/// [ApiClient] Dio instance so the JWT interceptor (which reads the
/// `access_token` / `refresh_token` secure-storage keys) applies automatically.
class PadhouseApi {
  PadhouseApi();

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  Dio get _dio => ApiClient.instance.dio;

  // ─── Token helpers (same keys the interceptor reads) ──────────────────────

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  Future<String?> readAccessToken() => _storage.read(key: 'access_token');

  Future<String?> readRefreshToken() => _storage.read(key: 'refresh_token');

  Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  // ─── Low-level helpers ────────────────────────────────────────────────────

  Future<dynamic> _get(String path, {Map<String, dynamic>? query}) async {
    final res = await _dio.get<dynamic>(path, queryParameters: query);
    return res.data;
  }

  Future<dynamic> _post(String path, [Map<String, dynamic>? body]) async {
    final res = await _dio.post<dynamic>(path, data: body);
    return res.data;
  }

  Future<dynamic> _patch(String path, [Map<String, dynamic>? body]) async {
    final res = await _dio.patch<dynamic>(path, data: body);
    return res.data;
  }

  Future<dynamic> _delete(String path, [Map<String, dynamic>? body]) async {
    final res = await _dio.delete<dynamic>(path, data: body);
    return res.data;
  }

  static List<Map<String, dynamic>> _asList(dynamic data) {
    if (data is List) {
      return data
          .whereType<Map<dynamic, dynamic>>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return const [];
  }

  static Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map) return Map<String, dynamic>.from(data);
    return const {};
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  Future<AuthResult> login(String email, String password) async {
    final data = await _post('/auth/login', {'email': email, 'password': password});
    return AuthResult.fromJson(_asMap(data));
  }

  Future<AuthResult> register({
    required String fullName,
    required String email,
    required String password,
    String? phone,
    String? city,
    String? street,
  }) async {
    final data = await _post('/auth/register', {
      'fullName': fullName,
      'email': email,
      'password': password,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (city != null && city.isNotEmpty) 'city': city,
      if (street != null && street.isNotEmpty) 'street': street,
    });
    return AuthResult.fromJson(_asMap(data));
  }

  Future<Map<String, dynamic>> getMe() async => _asMap(await _get('/auth/me'));

  // ─── Cart ─────────────────────────────────────────────────────────────────

  Future<CartSnapshot> getCart() async =>
      CartSnapshot.fromJson(_asMap(await _get('/cart')));

  Future<CartSnapshot> addCartItem({
    required String productId,
    required int quantity,
    String? selectedColor,
    String? variantId,
  }) async {
    final data = await _post('/cart/items', {
      'productId': productId,
      'quantity': quantity,
      if (selectedColor != null && selectedColor.isNotEmpty) 'selectedColor': selectedColor,
      if (variantId != null && variantId.isNotEmpty) 'variantId': variantId,
    });
    return CartSnapshot.fromJson(_asMap(data));
  }

  Future<CartSnapshot> updateCartItem(String itemId, int quantity) async =>
      CartSnapshot.fromJson(_asMap(await _patch('/cart/items/$itemId', {'quantity': quantity})));

  Future<CartSnapshot> removeCartItem(String itemId) async =>
      CartSnapshot.fromJson(_asMap(await _delete('/cart/items/$itemId')));

  Future<CartSnapshot> clearCart() async =>
      CartSnapshot.fromJson(_asMap(await _delete('/cart')));

  // ─── Coupons ──────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getActiveCoupons() async =>
      _asList(await _get('/coupons/active'));

  Future<CouponResult> applyCoupon(String code) async =>
      CouponResult.fromJson(_asMap(await _post('/coupons/apply', {'code': code})));

  Future<Map<String, dynamic>> removeCoupon() async =>
      _asMap(await _delete('/coupons/apply'));

  // ─── Delivery ─────────────────────────────────────────────────────────────

  Future<List<Governorate>> getGovernorates() async => _asList(await _get('/delivery/governorates'))
      .map(Governorate.fromJson)
      .toList();

  Future<List<Map<String, dynamic>>> getZones() async => _asList(await _get('/delivery/zones'));

  Future<DeliveryQuote> quoteDelivery(String city) async =>
      DeliveryQuote.fromJson(_asMap(await _get('/delivery/quote', query: {'city': city})));

  Future<Map<String, dynamic>> validatePhone(String phone) async =>
      _asMap(await _post('/delivery/validate-phone', {'phone': phone}));

  Future<List<PaymentMethod>> getPaymentMethods() async => _asList(await _get('/delivery/payment-methods'))
      .map(PaymentMethod.fromJson)
      .where((m) => m.enabled)
      .toList();

  Future<Map<String, dynamic>> getPolicies() async => _asMap(await _get('/delivery/policies'));

  // ─── Orders ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> createOrder({
    required String city,
    required String street,
    String? phone,
    required String paymentMethod,
    String? couponCode,
    String? giftCardCode,
    String? customerNotes,
  }) async {
    return _asMap(await _post('/orders', {
      'city': city,
      'street': street,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'paymentMethod': paymentMethod,
      if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      if (giftCardCode != null && giftCardCode.isNotEmpty) 'giftCardCode': giftCardCode,
      if (customerNotes != null && customerNotes.isNotEmpty) 'customerNotes': customerNotes,
    }));
  }

  Future<List<OrderStatusInfo>> getOrderStatuses() async => _asList(await _get('/orders/statuses'))
      .map(OrderStatusInfo.fromJson)
      .toList();

  Future<List<Map<String, dynamic>>> getMyOrders() async => _asList(await _get('/orders/my'));

  Future<Map<String, dynamic>> getOrder(String idOrNumber) async =>
      _asMap(await _get('/orders/$idOrNumber'));

  Future<Map<String, dynamic>> cancelOrder(String orderId, {String? reason}) async =>
      _asMap(await _patch('/orders/$orderId/cancel', {
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      }));

  // ─── Wishlist / Recently viewed / Stock alerts ───────────────────────────

  Future<List<Map<String, dynamic>>> getWishlist() async => _asList(await _get('/wishlist'));

  Future<List<Map<String, dynamic>>> addToWishlist(String productId) async =>
      _asList(await _post('/wishlist', {'productId': productId}));

  Future<List<Map<String, dynamic>>> removeFromWishlist(String productId) async =>
      _asList(await _delete('/wishlist/$productId'));

  Future<List<Map<String, dynamic>>> getRecentlyViewed() async =>
      _asList(await _get('/recently-viewed'));

  Future<Map<String, dynamic>> recordRecentlyViewed(String productId) async =>
      _asMap(await _post('/recently-viewed', {'productId': productId}));

  Future<Map<String, dynamic>> subscribeStockAlert({
    required String productId,
    required String email,
  }) async =>
      _asMap(await _post('/stock-alerts', {'productId': productId, 'email': email}));

  // ─── Reviews ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getReviews(String productId) async =>
      _asMap(await _get('/reviews', query: {'productId': productId}));

  Future<Map<String, dynamic>> createReview({
    required String productId,
    required int rating,
    String? comment,
  }) async =>
      _asMap(await _post('/reviews', {
        'productId': productId,
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      }));

  // ─── Bundles / Flash sales ────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getBundles() async => _asList(await _get('/bundles'));

  Future<List<Map<String, dynamic>>> getFlashSales() async => _asList(await _get('/flash-sales'));

  // ─── Recommendations ──────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getRecommendationsForYou() async =>
      _asList(await _get('/recommendations/for-you'));

  Future<List<Map<String, dynamic>>> getRelated(String productId) async =>
      _asList(await _get('/recommendations/related/$productId'));

  Future<List<Map<String, dynamic>>> getFrequentlyBoughtTogether(String productId) async =>
      _asList(await _get('/recommendations/frequently-bought-together/$productId'));

  Future<Map<String, dynamic>> getIpadSetup(String model) async =>
      _asMap(await _get('/recommendations/ipad-setup', query: {'model': model}));

  // ─── Loyalty / Referrals / Gift cards ─────────────────────────────────────

  Future<Map<String, dynamic>> getLoyalty() async => _asMap(await _get('/loyalty'));

  Future<Map<String, dynamic>> redeemLoyalty(int points) async =>
      _asMap(await _post('/loyalty/redeem', {'points': points}));

  Future<Map<String, dynamic>> getReferrals() async => _asMap(await _get('/referrals'));

  Future<Map<String, dynamic>> applyReferral({required String code, String? refereeEmail}) async =>
      _asMap(await _post('/referrals/apply', {
        'code': code,
        if (refereeEmail != null && refereeEmail.isNotEmpty) 'refereeEmail': refereeEmail,
      }));

  Future<Map<String, dynamic>> getGiftCardBalance(String code) async =>
      _asMap(await _get('/gift-cards/$code/balance'));

  // ─── Products / Categories ────────────────────────────────────────────────

  Future<List<Product>> getProducts({
    String? category,
    String? search,
    String? compatibility,
  }) async {
    final data = await _get('/products', query: {
      if (category != null && category.isNotEmpty && category != 'all') 'category': category,
      if (search != null && search.isNotEmpty) 'search': search,
      if (compatibility != null && compatibility.isNotEmpty) 'compatibility': compatibility,
    });
    if (data is List) {
      return data
          .whereType<Map<dynamic, dynamic>>()
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return const [];
  }

  Future<List<String>> getIpadModels() async {
    final data = await _get('/products/ipad-models');
    if (data is List) return data.map((e) => e.toString()).toList();
    return const [];
  }

  Future<List<Map<String, dynamic>>> getCategories() async => _asList(await _get('/categories'));
}

// ─── Response models ─────────────────────────────────────────────────────────

class ApiUser {
  final String id;
  final String email;
  final String fullName;
  final String phone;
  final String role;
  final String? customerProfileId;

  const ApiUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.phone,
    required this.role,
    this.customerProfileId,
  });

  factory ApiUser.fromJson(Map<String, dynamic> json) => ApiUser(
        id: json['id']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        fullName: json['fullName']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
        role: json['role']?.toString() ?? 'CUSTOMER',
        customerProfileId: json['customerProfileId']?.toString(),
      );
}

class AuthResult {
  final ApiUser user;
  final String accessToken;
  final String refreshToken;

  const AuthResult({required this.user, required this.accessToken, required this.refreshToken});

  factory AuthResult.fromJson(Map<String, dynamic> json) => AuthResult(
        user: ApiUser.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? const {})),
        accessToken: json['accessToken']?.toString() ?? '',
        refreshToken: json['refreshToken']?.toString() ?? '',
      );
}

class CartItemSnapshot {
  final String id;
  final String productId;
  final String productName;
  final String color;
  final String? variantId;
  final int quantity;
  final int availableStock;
  final double price;
  final double lineTotal;
  final String image;

  const CartItemSnapshot({
    required this.id,
    required this.productId,
    required this.productName,
    required this.color,
    required this.variantId,
    required this.quantity,
    required this.availableStock,
    required this.price,
    required this.lineTotal,
    required this.image,
  });

  factory CartItemSnapshot.fromJson(Map<String, dynamic> json) {
    final price = (json['price'] as num?)?.toDouble() ?? 0;
    final qty = (json['quantity'] as num?)?.toInt() ?? 0;
    return CartItemSnapshot(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? json['name']?.toString() ?? '',
      color: json['color']?.toString() ?? '',
      variantId: json['variantId']?.toString(),
      quantity: qty,
      availableStock: (json['availableStock'] as num?)?.toInt() ?? 0,
      price: price,
      lineTotal: (json['lineTotal'] as num?)?.toDouble() ?? (json['total'] as num?)?.toDouble() ?? price * qty,
      image: json['image']?.toString() ?? '',
    );
  }
}

class CartSnapshot {
  final String id;
  final List<CartItemSnapshot> items;
  final int itemCount;
  final double subtotal;
  final double discount;
  final double shippingFee;
  final double total;
  final String? couponCode;

  const CartSnapshot({
    required this.id,
    required this.items,
    required this.itemCount,
    required this.subtotal,
    required this.discount,
    required this.shippingFee,
    required this.total,
    required this.couponCode,
  });

  factory CartSnapshot.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final items = rawItems is List
        ? rawItems
            .whereType<Map<dynamic, dynamic>>()
            .map((e) => CartItemSnapshot.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <CartItemSnapshot>[];
    return CartSnapshot(
      id: (json['id'] ?? json['cartId'])?.toString() ?? '',
      items: items,
      itemCount: (json['itemCount'] as num?)?.toInt() ?? items.fold(0, (s, i) => s + i.quantity),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      shippingFee: (json['shippingFee'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      couponCode: json['couponCode']?.toString(),
    );
  }
}

class CouponResult {
  final bool applied;
  final String? couponCode;
  final double discount;
  final bool freeShipping;
  final double subtotal;
  final String? message;

  const CouponResult({
    required this.applied,
    required this.couponCode,
    required this.discount,
    required this.freeShipping,
    required this.subtotal,
    required this.message,
  });

  factory CouponResult.fromJson(Map<String, dynamic> json) => CouponResult(
        applied: json['applied'] == true,
        couponCode: json['couponCode']?.toString(),
        discount: (json['discount'] as num?)?.toDouble() ?? 0,
        freeShipping: json['freeShipping'] == true,
        subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
        message: json['message']?.toString(),
      );
}

class DeliveryQuote {
  final bool available;
  final String city;
  final int fee;
  final String? etaDays;
  final String? message;

  const DeliveryQuote({
    required this.available,
    required this.city,
    required this.fee,
    this.etaDays,
    this.message,
  });

  factory DeliveryQuote.fromJson(Map<String, dynamic> json) => DeliveryQuote(
        available: json['available'] == true,
        city: json['city']?.toString() ?? '',
        fee: (json['fee'] as num?)?.toInt() ?? 0,
        etaDays: json['etaDays']?.toString(),
        message: json['message']?.toString(),
      );
}

class PaymentMethod {
  final String id;
  final String nameAr;
  final String nameEn;
  final String description;
  final bool enabled;

  const PaymentMethod({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.description,
    required this.enabled,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) => PaymentMethod(
        id: json['id']?.toString() ?? '',
        nameAr: json['nameAr']?.toString() ?? '',
        nameEn: json['nameEn']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        enabled: json['enabled'] == true,
      );
}

class OrderStatusInfo {
  final String status;
  final String labelAr;

  const OrderStatusInfo(this.status, this.labelAr);

  factory OrderStatusInfo.fromJson(Map<String, dynamic> json) => OrderStatusInfo(
        json['status']?.toString() ?? '',
        json['labelAr']?.toString() ?? '',
      );
}

class CityZone {
  final String name;
  final int fee;
  final String? etaDays;

  const CityZone({required this.name, required this.fee, this.etaDays});

  factory CityZone.fromJson(Map<String, dynamic> json) => CityZone(
        name: json['name']?.toString() ?? '',
        fee: (json['fee'] as num?)?.toInt() ?? 0,
        etaDays: json['etaDays']?.toString(),
      );
}

class Governorate {
  final String id;
  final String nameAr;
  final String region;
  final List<CityZone> cities;

  const Governorate({
    required this.id,
    required this.nameAr,
    required this.region,
    required this.cities,
  });

  factory Governorate.fromJson(Map<String, dynamic> json) {
    final rawCities = json['cities'];
    return Governorate(
      id: json['id']?.toString() ?? '',
      nameAr: json['nameAr']?.toString() ?? '',
      region: json['region']?.toString() ?? '',
      cities: rawCities is List
          ? rawCities
              .whereType<Map<dynamic, dynamic>>()
              .map((e) => CityZone.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}
