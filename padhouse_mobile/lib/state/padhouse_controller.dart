import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/network/padhouse_api.dart';
import '../data/catalog.dart';

enum AppMode { customer, admin }

enum CustomerTab { home, categories, search, ai, wishlist, cart, profile }

enum CustomerStack {
  productDetails,
  checkout,
  orderConfirmation,
  tracking,
  orders,
  wishlist,
  support,
  notifications,
  addresses,
  settings
}

enum AdminTab { overview, products, inventory, orders, ai }

class ChatMessage {
  final String sender; // user | ai
  final String text;
  const ChatMessage(this.sender, this.text);
}

class RegisteredAccount {
  final String password;
  final AppUser user;
  const RegisteredAccount({required this.password, required this.user});

  Map<String, dynamic> toJson() =>
      {'password': password, 'user': user.toJson()};

  factory RegisteredAccount.fromJson(Map<String, dynamic> json) =>
      RegisteredAccount(
        password: json['password'] as String? ?? '',
        user: AppUser.fromJson(Map<String, dynamic>.from(json['user'] as Map)),
      );
}

class PadhouseController extends ChangeNotifier {
  static const _userKey = 'padhouse_current_user_v2';
  static const _accountsKey = 'padhouse_registered_users_v2';

  /// Canonical backend order lifecycle (Arabic labels) used as an offline fallback
  /// until [orderStatuses] is loaded from `GET /orders/statuses`.
  static const Map<String, String> _statusLabelFallback = {
    'PENDING': 'طلب جديد',
    'UNDER_REVIEW': 'قيد التأكيد',
    'CONFIRMED': 'تم التأكيد',
    'PREPARING': 'قيد التجهيز',
    'SHIPPED': 'خرج للتوصيل',
    'DELIVERED': 'تم التسليم',
    'CANCELLED': 'ملغي',
  };

  /// Typed client for the shared PadHouse NestJS backend.
  final PadhouseApi _api = PadhouseApi();

  bool _disposed = false;

  bool bootstrapped = false;
  AppUser? user;
  // Kept for API compatibility; real registration/login is delegated to the backend.
  Map<String, RegisteredAccount> accounts = {};

  AppMode appMode = AppMode.customer;
  CustomerTab customerTab = CustomerTab.home;
  CustomerStack? customerStack;
  AdminTab adminTab = AdminTab.overview;

  List<Product> products = officialProducts;
  List<ShopOrder> orders = const [];
  List<CartLine> cart = const [
    CartLine(productId: 'prod-01', quantity: 1, selectedColor: 'أبيض ناصع'),
    CartLine(productId: 'prod-19', quantity: 1, selectedColor: 'ملمس ورقي مطفي'),
  ];
  List<String> wishlistIds = const [];

  String? selectedProductId = 'prod-01';
  String selectedCategory = 'all';
  String searchQuery = '';
  String activeTrackingOrderId = '';

  String checkoutCity = 'رام الله والبيرة';
  String checkoutStreet = 'الماصيون، قرب قصر الثقافة';
  String checkoutName = 'أحمد الفلسطيني';
  String checkoutPhone = '+970 59 912 3456';
  String checkoutPayment = 'CASH_ON_DELIVERY';
  String couponCode = '';
  bool couponApplied = false;
  ShopOrder? lastPlacedOrder;

  bool showProductModal = false;
  Product? editingProduct;

  String aiPrompt = '';
  bool isAiThinking = false;
  bool isCustomerAiThinking = false;
  // Admin AI chat
  List<ChatMessage> aiChat = const [
    ChatMessage(
      'ai',
      'مرحباً بك في مستشار بادهاوس لذكاء الأعمال! تم تحديث النظام بالكتالوج الرسمي المعتمد (21 منتجاً موزعة على 6 أقسام). يمكنني فحص كميات المخزون، الطلبات النشطة، ومعدلات الأسعار في فلسطين. كيف يمكنني مساعدتك؟',
    ),
  ];
  // Customer AI chat
  List<ChatMessage> customerAiChat = const [];

  String? toastMessage;

  // ─── Server-driven reference data ──────────────────────────────────────────

  /// Enabled payment methods returned by `GET /delivery/payment-methods`.
  List<PaymentMethod> paymentMethods = const [];

  /// Canonical lifecycle returned by `GET /orders/statuses`.
  List<OrderStatusInfo> orderStatuses = const [];

  /// Governorates/cities returned by `GET /delivery/governorates`.
  List<Governorate> governorates = const [];

  /// Verified iPad models returned by `GET /products/ipad-models`.
  List<String> ipadModels = const [];
  String? selectedIpadModel;

  /// Last error surfaced by [placeOrder] (null when the last attempt succeeded).
  String? lastOrderError;

  // ─── Admin Notifications & Inventory Alerts ──────────────────────────────

  List<AdminNotificationModel> adminNotifications = const [];
  int adminUnreadNotificationCount = 0;
  bool isLoadingNotifications = false;

  // ─── Customer notifications (order progress / Urgent Crisis) ─────────────

  List<UserNotificationModel> userNotifications = const [];
  int userUnreadNotificationCount = 0;
  bool isLoadingUserNotifications = false;

  // ─── Remote cart bookkeeping ───────────────────────────────────────────────

  int? _remoteSubtotal;
  double _couponDiscount = 0;
  int? _quotedDeliveryFee;
  final Map<String, String> _cartItemIds = {};

  bool get isSuperAdmin {
    final u = user;
    if (u == null) return false;
    final role = u.role.toLowerCase();
    final emailLower = u.email.toLowerCase();
    return role == 'admin' ||
        role == 'super_admin' ||
        emailLower == defaultAdminEmail ||
        emailLower == superAdminEmail ||
        emailLower == legacyAdminEmail;
  }

  bool get _isLoggedInCustomer => user != null && user!.role != 'guest';

  /// Public flag so UI can decide between backend reads and local fallbacks.
  bool get isLoggedInCustomer => _isLoggedInCustomer;

  bool get _isTestEnvironment =>
      WidgetsBinding.instance.runtimeType.toString().contains('Test');

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Product? productById(String id) {
    for (final p in products) {
      if (p.id == id) return p;
    }
    return null;
  }

  Product? get selectedProduct =>
      productById(selectedProductId ?? '') ??
      (products.isEmpty ? null : products.first);

  List<Product> get filteredProducts {
    return products.where((p) {
      final matchCategory =
          selectedCategory == 'all' || p.categories.contains(selectedCategory);
      final q = searchQuery.trim();
      final matchSearch = q.isEmpty ||
          p.name.contains(q) ||
          p.sku.toLowerCase().contains(q.toLowerCase()) ||
          p.compatibility.contains(q);
      return matchCategory && matchSearch;
    }).toList();
  }

  int get subtotal {
    final remote = _remoteSubtotal;
    if (remote != null) return remote.round();
    return cart.fold(0, (sum, line) {
      final p = productById(line.productId);
      if (p == null) return sum;
      return sum + p.price * line.quantity;
    });
  }

  int get deliveryFee {
    if (cart.isEmpty) return 0;
    final quoted = _quotedDeliveryFee;
    if (quoted != null) return quoted;
    for (final city in palestinianCities) {
      if (city.name == checkoutCity) return city.fee;
    }
    return 20;
  }

  int get discountAmount => couponApplied ? _couponDiscount.round() : 0;

  int get grandTotal => max(0, subtotal + deliveryFee - discountAmount);

  int get cartCount => cart.fold(0, (sum, line) => sum + line.quantity);

  int get pendingOrders => orders
      .where((o) =>
          o.status == 'PREPARING' ||
          o.status == 'UNDER_REVIEW' ||
          o.status == 'PENDING')
      .length;

  bool isSyncingWithBackend = false;

  /// Arabic label for a canonical backend status value.
  String statusLabel(String status) {
    for (final s in orderStatuses) {
      if (s.status == status) return s.labelAr;
    }
    return _statusLabelFallback[status] ?? status;
  }

  void updateProfile(
      {required String name,
      required String phone,
      required String city,
      required String address}) {
    if (user != null) {
      final updated = AppUser(
        name: name.trim().isEmpty ? user!.name : name.trim(),
        email: user!.email,
        phone: phone.trim().isEmpty ? user!.phone : phone.trim(),
        city: city.trim().isEmpty ? user!.city : city.trim(),
        address: address.trim(),
        role: user!.role,
      );
      user = updated;
      checkoutName = updated.name;
      checkoutPhone = updated.phone;
      checkoutCity = updated.city;
      checkoutStreet = updated.address;
      _persist();
      _notify();
      showToast('تم حفظ بيانات الحساب والعنوان بنجاح');
    }
  }

  Future<void> syncWithBackend() async {
    isSyncingWithBackend = true;
    _notify();
    try {
      final list = await _api.getProducts();
      if (list.isNotEmpty) {
        products = list;
      }
    } catch (_) {
      if (products.isEmpty) {
        products = officialProducts;
      }
    } finally {
      isSyncingWithBackend = false;
      _notify();
    }
  }

  /// Loads the verified iPad models used by the compatibility selector (never guessed).
  Future<void> loadIpadModels() async {
    try {
      final list = await _api.getIpadModels();
      if (list.isNotEmpty) {
        ipadModels = list;
        _notify();
      }
    } catch (_) {}
  }

  /// Filters the catalog by a verified iPad model via `GET /products?compatibility=`.
  Future<void> selectIpadModel(String? model) async {
    selectedIpadModel = model;
    _notify();
    try {
      final list = await _api.getProducts(compatibility: model);
      products = list;
      _notify();
      if (list.isEmpty && model != null && model.isNotEmpty) {
        showToast('لا توجد منتجات متوافقة مع «$model» حالياً');
      }
    } catch (_) {
      showToast('تعذّر تحميل المنتجات المتوافقة مع هذا الموديل');
    }
  }

  /// Enabled payment methods from `GET /delivery/payment-methods`.
  Future<void> loadPaymentMethods() async {
    try {
      final list = await _api.getPaymentMethods();
      if (list.isNotEmpty) {
        paymentMethods = list;
        _notify();
      }
    } catch (_) {}
  }

  /// Canonical order lifecycle from `GET /orders/statuses`.
  Future<void> loadOrderStatuses() async {
    try {
      final list = await _api.getOrderStatuses();
      if (list.isNotEmpty) {
        orderStatuses = list;
        _notify();
      }
    } catch (_) {}
  }

  /// Governorates & delivery zones from `GET /delivery/governorates`.
  Future<void> loadGovernorates() async {
    try {
      final list = await _api.getGovernorates();
      if (list.isNotEmpty) {
        governorates = list;
        _notify();
      }
    } catch (_) {}
  }

  /// Real delivery quote for a city via `GET /delivery/quote?city=`.
  Future<void> quoteDelivery(String city) async {
    checkoutCity = city;
    int? fee;
    try {
      final quote = await _api.quoteDelivery(city);
      if (quote.available) fee = quote.fee;
    } catch (_) {
      // Fall back to the verified local zone fee below.
    }
    _quotedDeliveryFee = fee ?? _localFeeFor(city);
    _notify();
  }

  int? _localFeeFor(String city) {
    for (final c in palestinianCities) {
      if (c.name == city) return c.fee;
    }
    return null;
  }

  /// Delivery cities from the shared backend (`GET /delivery/governorates`),
  /// falling back to the verified Palestinian list while offline.
  List<CityFee> get deliveryCities {
    if (governorates.isEmpty) return palestinianCities;
    final cities = <CityFee>[];
    for (final g in governorates) {
      for (final c in g.cities) {
        cities.add(CityFee(c.name, c.fee));
      }
    }
    return cities.isEmpty ? palestinianCities : cities;
  }

  /// Reloads cart, wishlist and order history for the signed-in customer.
  Future<void> syncAuthedData() async {
    if (!_isLoggedInCustomer) return;
    await Future.wait([
      _syncCart(),
      _syncWishlist(),
      refreshMyOrders(),
      loadUserNotifications(),
    ]);
    _notify();
  }

  Future<void> _syncCart() async {
    try {
      _applyCartSnapshot(await _api.getCart());
    } catch (_) {}
  }

  Future<void> _syncWishlist() async {
    try {
      final list = await _api.getWishlist();
      wishlistIds =
          list.map(_productIdOf).where((id) => id.isNotEmpty).toList();
    } catch (_) {}
  }

  /// Order history from `GET /orders/my`.
  Future<void> refreshMyOrders() async {
    if (!_isLoggedInCustomer) return;
    try {
      final raw = await _api.getMyOrders();
      orders = raw.map(_mapOrder).toList();
      _notify();
    } catch (_) {}
  }

  /// Fetches a single order from the backend and merges it into [orders].
  Future<void> loadOrder(String idOrNumber) async {
    if (idOrNumber.isEmpty || !_isLoggedInCustomer) return;
    try {
      final data = await _api.getOrder(idOrNumber);
      if (data.isEmpty) return;
      final order = _mapOrder(data);
      orders = [order, ...orders.where((o) => o.id != order.id)];
      _notify();
    } catch (_) {}
  }

  Future<void> bootstrap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final rawUser = prefs.getString(_userKey);
      if (rawUser != null && rawUser.isNotEmpty) {
        user = AppUser.fromJson(jsonDecode(rawUser) as Map<String, dynamic>);
        checkoutName = user!.name;
        checkoutPhone = user!.phone;
        if (user!.city.isNotEmpty) checkoutCity = user!.city;
        if (user!.address.isNotEmpty) checkoutStreet = user!.address;
      }
      final rawAccounts = prefs.getString(_accountsKey);
      if (rawAccounts != null && rawAccounts.isNotEmpty) {
        final decoded = jsonDecode(rawAccounts) as Map<String, dynamic>;
        accounts = decoded.map(
          (key, value) => MapEntry(
              key,
              RegisteredAccount.fromJson(
                  Map<String, dynamic>.from(value as Map))),
        );
      }
    } catch (_) {}
    bootstrapped = true;
    lastPlacedOrder ??= orders.isNotEmpty ? orders.first : null;
    _notify();
    // Non-blocking sync with the shared backend.
    unawaited(syncWithBackend());
    unawaited(loadIpadModels());
    unawaited(loadPaymentMethods());
    unawaited(loadOrderStatuses());
    unawaited(loadGovernorates());
    if (_isLoggedInCustomer) {
      unawaited(syncAuthedData());
    }
  }

  Future<void> sendCustomerAi([String? custom]) async {
    final q = (custom ?? aiPrompt).trim();
    if (q.isEmpty || isCustomerAiThinking) return;
    customerAiChat = [...customerAiChat, ChatMessage('user', q)];
    isCustomerAiThinking = true;
    _notify();
    final history =
        customerAiChat.take(max(0, customerAiChat.length - 1)).toList();
    try {
      final result = await _api.chatAssistant(
        message: q,
        history: history
            .take(12)
            .map((message) => {
                  'role': message.sender == 'user' ? 'user' : 'model',
                  'content': message.text,
                })
            .toList(),
      );
      // Accept the text under whichever key the backend used (`answer` today,
      // but `reply`/`message`/`text`/`content` are tolerated) so a response is
      // never dropped and rendered as an empty bubble.
      final answer = (result['answer'] ??
                  result['reply'] ??
                  result['message'] ??
                  result['text'] ??
                  result['content'])
              ?.toString()
              .trim() ??
          '';
      customerAiChat = [
        ...customerAiChat,
        ChatMessage(
            'ai',
            answer.isEmpty
                ? 'لم يصلني رد واضح. هل يمكنك إعادة صياغة سؤالك؟'
                : answer),
      ];

      // Keep the shared cart / order state in sync with what the assistant did.
      // Prefer the cart snapshot returned with the reply so the badge updates on
      // the same notify; only refetch when the reply carried no snapshot.
      final action = result['action']?.toString();
      if (action == 'ADDED_TO_CART') {
        final cartJson = result['cart'];
        if (cartJson is Map) {
          _applyCartSnapshot(
              CartSnapshot.fromJson(Map<String, dynamic>.from(cartJson)));
        } else {
          unawaited(_syncCart());
        }
      } else if (action == 'ORDER_CREATED') {
        unawaited(refreshMyOrders());
      }
    } catch (error) {
      if (error is DioException) {
        debugPrint(
          '[PadHouse AI] ${error.requestOptions.method} '
          '${error.requestOptions.uri} failed: '
          'HTTP ${error.response?.statusCode ?? 'no response'}; '
          'type=${error.type}; message=${error.message}; '
          'response=${error.response?.data}',
        );
      } else {
        debugPrint('[PadHouse AI] Unexpected chatbot error: $error');
      }
      customerAiChat = [
        ...customerAiChat,
        ChatMessage(
            'ai',
            _dioMessage(error,
                fallback:
                    'تأخر الرد أو تعذّر الاتصال. يرجى المحاولة مرة أخرى.')),
      ];
    } finally {
      isCustomerAiThinking = false;
      _notify();
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (user == null) {
        await prefs.remove(_userKey);
      } else {
        await prefs.setString(_userKey, jsonEncode(user!.toJson()));
      }
      await prefs.setString(
        _accountsKey,
        jsonEncode(accounts.map((key, value) => MapEntry(key, value.toJson()))),
      );
    } catch (_) {}
  }

  void showToast(String message) {
    toastMessage = message;
    _notify();
    if (!_isTestEnvironment) {
      Future.delayed(const Duration(milliseconds: 2500), () {
        if (toastMessage == message) {
          toastMessage = null;
          _notify();
        }
      });
    }
  }

  // ─── Authentication (real shared backend) ─────────────────────────────────

  String? login(String email, String password) {
    final emailTrim = email.trim().toLowerCase();
    final passTrim = password;
    if (emailTrim.isEmpty || !emailTrim.contains('@')) {
      return 'يرجى إدخال بريد إلكتروني صالح';
    }
    if (passTrim.isEmpty) return 'يرجى إدخال كلمة المرور';

    // In the offline test harness there is no reachable server, so fall back to
    // local verification to keep the widget tests deterministic.
    if (_isTestEnvironment) {
      return _localLogin(emailTrim, passTrim);
    }

    unawaited(_remoteLogin(email.trim(), passTrim));
    return null;
  }

  /// Awaitable login — returns null on success, error string on failure.
  /// Use this from the UI to properly await the network call, show a loading
  /// indicator, display backend errors in-form, and navigate on success.
  Future<String?> loginAsync(String email, String password) async {
    final emailTrim = email.trim().toLowerCase();
    final passTrim = password;
    if (emailTrim.isEmpty || !emailTrim.contains('@')) {
      return 'يرجى إدخال بريد إلكتروني صالح';
    }
    if (passTrim.isEmpty) return 'يرجى إدخال كلمة المرور';

    if (_isTestEnvironment) return _localLogin(emailTrim, passTrim);

    try {
      final result = await _api.login(emailTrim, passTrim);
      await _api.saveTokens(result.accessToken, result.refreshToken);
      _applyApiUser(result.user);
      await _persist();
      _notify();
      showToast('أهلاً بك مجدداً ${user?.name ?? ''}!');
      unawaited(syncAuthedData());
      return null;
    } catch (e) {
      return _dioMessage(e,
          fallback:
              'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة ثانية.');
    }
  }

  String? _localLogin(String emailTrim, String passTrim) {
    if ((emailTrim == defaultAdminEmail && passTrim == defaultAdminPass) ||
        (emailTrim == superAdminEmail && passTrim == superAdminPass) ||
        (emailTrim == legacyAdminEmail && passTrim == legacyAdminPass)) {
      user = AppUser(
        name: 'مسؤول النظام (Admin)',
        email: emailTrim,
        phone: '+970 59 000 0000',
        city: 'رام الله والبيرة',
        role: 'super_admin',
      );
      appMode = AppMode.customer;
      checkoutName = user!.name;
      checkoutPhone = user!.phone;
      _persist();
      _notify();
      showToast('مرحباً بك! تم تسجيل الدخول كمسؤول');
      return null;
    }
    final record = accounts[emailTrim];
    if (record != null && record.password == passTrim) {
      user = record.user;
      appMode = AppMode.customer;
      checkoutName = record.user.name;
      checkoutPhone = record.user.phone;
      checkoutCity = record.user.city;
      _persist();
      _notify();
      showToast('أهلاً بك مجدداً ${record.user.name}!');
      return null;
    }
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة ثانية.';
  }

  Future<void> _remoteLogin(String email, String password) async {
    try {
      final result = await _api.login(email, password);
      await _api.saveTokens(result.accessToken, result.refreshToken);
      _applyApiUser(result.user);
      await _persist();
      _notify();
      showToast('أهلاً بك مجدداً ${user?.name ?? ''}!');
      unawaited(syncAuthedData());
    } catch (e) {
      showToast(_dioMessage(e,
          fallback:
              'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة ثانية.'));
    }
  }

  String? register({
    required String name,
    required String email,
    required String phone,
    required String city,
    required String password,
  }) {
    final emailTrim = email.trim().toLowerCase();
    final passTrim = password;
    if (name.trim().isEmpty) return 'يرجى كتابة الاسم الكامل';
    if (emailTrim.isEmpty || !emailTrim.contains('@')) {
      return 'يرجى إدخال بريد إلكتروني صالح';
    }
    if (passTrim.length < 6) return 'كلمة المرور يجب أن لا تقل عن 6 خانات';

    if (_isTestEnvironment) {
      if (emailTrim == superAdminEmail || accounts.containsKey(emailTrim)) {
        return 'هذا البريد مسجل لدينا مسبقاً';
      }
      final created = AppUser(
        name: name.trim(),
        email: emailTrim,
        phone: phone.trim().isEmpty ? '+970 59 000 0000' : phone.trim(),
        city: city,
        role: 'customer',
      );
      accounts = {
        ...accounts,
        emailTrim: RegisteredAccount(password: passTrim, user: created)
      };
      user = created;
      appMode = AppMode.customer;
      checkoutName = created.name;
      checkoutPhone = created.phone;
      checkoutCity = created.city;
      _persist();
      _notify();
      showToast('تم إنشاء الحساب بنجاح! أهلاً بك في بادهاوس');
      return null;
    }

    unawaited(_remoteRegister(
      name: name.trim(),
      email: emailTrim,
      phone: phone.trim(),
      city: city,
      password: passTrim,
    ));
    return null;
  }

  /// Awaitable register — returns null on success, error string on failure.
  /// Use this from the UI to properly await the network call, show a loading
  /// indicator, display backend errors in-form, and navigate on success.
  Future<String?> registerAsync({
    required String name,
    required String email,
    required String phone,
    required String city,
    required String password,
  }) async {
    final emailTrim = email.trim().toLowerCase();
    final passTrim = password;
    if (name.trim().isEmpty) return 'يرجى كتابة الاسم الكامل';
    if (emailTrim.isEmpty || !emailTrim.contains('@')) {
      return 'يرجى إدخال بريد إلكتروني صالح';
    }
    if (passTrim.length < 6) return 'كلمة المرور يجب أن لا تقل عن 6 خانات';

    if (_isTestEnvironment) {
      if (emailTrim == superAdminEmail || accounts.containsKey(emailTrim)) {
        return 'هذا البريد مسجل لدينا مسبقاً';
      }
      final created = AppUser(
        name: name.trim(),
        email: emailTrim,
        phone: phone.trim().isEmpty ? '+970 59 000 0000' : phone.trim(),
        city: city,
        role: 'customer',
      );
      accounts = {
        ...accounts,
        emailTrim: RegisteredAccount(password: passTrim, user: created)
      };
      user = created;
      appMode = AppMode.customer;
      checkoutName = created.name;
      checkoutPhone = created.phone;
      checkoutCity = created.city;
      _persist();
      _notify();
      showToast('تم إنشاء الحساب بنجاح! أهلاً بك في بادهاوس');
      return null;
    }

    try {
      final result = await _api.register(
        fullName: name.trim(),
        email: emailTrim,
        password: passTrim,
        phone: phone.trim().isEmpty ? null : phone.trim(),
        city: city.isEmpty ? null : city,
      );
      await _api.saveTokens(result.accessToken, result.refreshToken);
      _applyApiUser(result.user);
      await _persist();
      _notify();
      showToast('تم إنشاء الحساب بنجاح! أهلاً بك في بادهاوس');
      unawaited(syncAuthedData());
      return null;
    } catch (e) {
      return _dioMessage(e,
          fallback: 'تعذّر إنشاء الحساب، يرجى المحاولة مرة أخرى');
    }
  }

  Future<void> _remoteRegister({
    required String name,
    required String email,
    required String phone,
    required String city,
    required String password,
  }) async {
    try {
      final result = await _api.register(
        fullName: name,
        email: email,
        password: password,
        phone: phone.isEmpty ? null : phone,
        city: city.isEmpty ? null : city,
      );
      await _api.saveTokens(result.accessToken, result.refreshToken);
      _applyApiUser(result.user);
      await _persist();
      _notify();
      showToast('تم إنشاء الحساب بنجاح! أهلاً بك في بادهاوس');
      unawaited(syncAuthedData());
    } catch (e) {
      showToast(_dioMessage(e,
          fallback: 'تعذّر إنشاء الحساب، يرجى المحاولة مرة أخرى'));
    }
  }

  void _applyApiUser(ApiUser u) {
    final name = u.fullName.trim().isNotEmpty
        ? u.fullName.trim()
        : u.email.split('@').first;
    user = AppUser(
      name: name,
      email: u.email,
      phone: u.phone,
      city: user?.city.isNotEmpty == true ? user!.city : checkoutCity,
      address: user?.address ?? checkoutStreet,
      role: _mapRole(u.role),
    );
    appMode = AppMode.customer;
    checkoutName = user!.name;
    if (user!.phone.isNotEmpty) checkoutPhone = user!.phone;
  }

  String _mapRole(String role) {
    switch (role.toUpperCase()) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'super_admin';
      case 'CUSTOMER':
        return 'customer';
      default:
        return role.toLowerCase();
    }
  }

  void continueAsGuest() {
    user = const AppUser(
      name: 'زائر بادهاوس',
      email: 'guest@padhouse.ps',
      phone: '+970 59 000 0000',
      city: 'رام الله والبيرة',
      role: 'guest',
    );
    appMode = AppMode.customer;
    checkoutName = user!.name;
    checkoutPhone = user!.phone;
    _persist();
    _notify();
    showToast('تصفح كزائر');
  }

  void logout() {
    user = null;
    appMode = AppMode.customer;
    customerTab = CustomerTab.home;
    customerStack = null;
    adminTab = AdminTab.overview;
    cart = const [];
    wishlistIds = const [];
    orders = const [];
    lastPlacedOrder = null;
    lastOrderError = null;
    _clearRemoteCartState();
    unawaited(_api.clearTokens());
    _persist();
    _notify();
    showToast('تم تسجيل الخروج بنجاح');
  }

  void openProduct(Product product) {
    selectedProductId = product.id;
    customerStack = CustomerStack.productDetails;
    _notify();
  }

  void setCustomerTab(CustomerTab tab) {
    customerStack = null;
    customerTab = tab;
    _notify();
  }

  void setCategory(String id, {bool goHome = false}) {
    selectedCategory = id;
    if (goHome) {
      customerStack = null;
      customerTab = CustomerTab.home;
    }
    _notify();
  }

  void setSearch(String value) {
    searchQuery = value;
    _notify();
  }

  void setStack(CustomerStack? stack) {
    customerStack = stack;
    _notify();
  }

  void setAdminTab(AdminTab tab) {
    adminTab = tab;
    _notify();
  }

  void enterAdmin() {
    appMode = AppMode.admin;
    adminTab = AdminTab.overview;
    _refreshLocalLowStockAlerts();
    unawaited(loadAdminNotifications());
    _notify();
  }

  void backToStore() {
    appMode = AppMode.customer;
    _notify();
  }

  // ─── Cart ─────────────────────────────────────────────────────────────────

  void addToCart(Product product, {String? color, int qty = 1}) {
    if (product.stock <= 0) {
      showToast('عذراً، هذه القطعة نفدت من المخزون حالياً');
      return;
    }
    final col =
        color ?? (product.colors.isNotEmpty ? product.colors.first : '');
    if (_isLoggedInCustomer) {
      unawaited(_remoteAddToCart(product, col, qty));
      return;
    }
    final index = cart.indexWhere(
        (item) => item.productId == product.id && item.selectedColor == col);
    if (index >= 0) {
      cart = [
        for (var i = 0; i < cart.length; i++)
          i == index
              ? cart[i].copyWith(quantity: cart[i].quantity + qty)
              : cart[i],
      ];
    } else {
      cart = [
        ...cart,
        CartLine(productId: product.id, quantity: qty, selectedColor: col)
      ];
    }
    showToast('تمت إضافة "${product.name}" إلى السلة');
  }

  Future<void> _remoteAddToCart(Product product, String color, int qty) async {
    try {
      final snap = await _api.addCartItem(
        productId: product.id,
        quantity: qty,
        selectedColor: color.isEmpty ? null : color,
      );
      _applyCartSnapshot(snap);
      _notify();
      showToast('تمت إضافة "${product.name}" إلى السلة');
    } catch (e) {
      showToast(_dioMessage(e, fallback: 'تعذّر إضافة المنتج إلى السلة'));
    }
  }

  void updateCartQty(String productId, String color, int delta) {
    final index = cart.indexWhere(
        (item) => item.productId == productId && item.selectedColor == color);
    if (index < 0) return;
    final next = cart[index].quantity + delta;

    if (_isLoggedInCustomer) {
      final itemId = _cartItemIds['$productId::$color'];
      if (itemId != null) {
        if (next <= 0) {
          unawaited(_remoteRemoveCartItem(itemId, silent: false));
        } else {
          unawaited(_remoteUpdateCartItem(itemId, next));
        }
        return;
      }
    }

    if (next <= 0) {
      cart = cart
          .where((item) =>
              !(item.productId == productId && item.selectedColor == color))
          .toList();
    } else {
      cart = cart
          .map((item) =>
              (item.productId == productId && item.selectedColor == color)
                  ? item.copyWith(quantity: next)
                  : item)
          .toList();
    }
    _notify();
  }

  Future<void> _remoteUpdateCartItem(String itemId, int quantity) async {
    try {
      _applyCartSnapshot(await _api.updateCartItem(itemId, quantity));
      _notify();
    } catch (e) {
      showToast(_dioMessage(e, fallback: 'تعذّر تحديث الكمية'));
    }
  }

  void removeFromCart(String productId, String color) {
    if (_isLoggedInCustomer) {
      final itemId = _cartItemIds['$productId::$color'];
      if (itemId != null) {
        unawaited(_remoteRemoveCartItem(itemId, silent: false));
        return;
      }
    }
    cart = cart
        .where((item) =>
            !(item.productId == productId && item.selectedColor == color))
        .toList();
    showToast('تم حذف القطعة من السلة');
  }

  Future<void> _remoteRemoveCartItem(String itemId,
      {required bool silent}) async {
    try {
      _applyCartSnapshot(await _api.removeCartItem(itemId));
      _notify();
      if (!silent) showToast('تم حذف القطعة من السلة');
    } catch (e) {
      showToast(_dioMessage(e, fallback: 'تعذّر حذف القطعة من السلة'));
    }
  }

  void _applyCartSnapshot(CartSnapshot snap) {
    cart = snap.items
        .map((i) => CartLine(
            productId: i.productId,
            quantity: i.quantity,
            selectedColor: i.color))
        .toList();
    _cartItemIds
      ..clear()
      ..addEntries(
          snap.items.map((i) => MapEntry('${i.productId}::${i.color}', i.id)));
    _remoteSubtotal = snap.subtotal.round();
    _couponDiscount = snap.discount;
    if (snap.couponCode != null && snap.couponCode!.isNotEmpty) {
      couponCode = snap.couponCode!;
    }
    couponApplied = snap.discount > 0 || (snap.couponCode?.isNotEmpty ?? false);
  }

  void _clearRemoteCartState() {
    _remoteSubtotal = null;
    _couponDiscount = 0;
    _quotedDeliveryFee = null;
    _cartItemIds.clear();
    couponApplied = false;
    couponCode = '';
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────

  void toggleWishlist(String productId) {
    if (_isLoggedInCustomer) {
      if (wishlistIds.contains(productId)) {
        unawaited(_remoteWishlistRemove(productId));
      } else {
        unawaited(_remoteWishlistAdd(productId));
      }
      return;
    }
    if (wishlistIds.contains(productId)) {
      wishlistIds = wishlistIds.where((id) => id != productId).toList();
      showToast('تمت الإزالة من المفضلة');
    } else {
      wishlistIds = [...wishlistIds, productId];
      showToast('تمت الإضافة إلى المفضلة');
    }
  }

  Future<void> _remoteWishlistAdd(String productId) async {
    try {
      final list = await _api.addToWishlist(productId);
      wishlistIds =
          list.map(_productIdOf).where((id) => id.isNotEmpty).toList();
      _notify();
      showToast('تمت الإضافة إلى المفضلة');
    } catch (e) {
      showToast(_dioMessage(e, fallback: 'تعذّر تحديث المفضلة'));
    }
  }

  Future<void> _remoteWishlistRemove(String productId) async {
    try {
      final list = await _api.removeFromWishlist(productId);
      wishlistIds =
          list.map(_productIdOf).where((id) => id.isNotEmpty).toList();
      _notify();
      showToast('تمت الإزالة من المفضلة');
    } catch (e) {
      showToast(_dioMessage(e, fallback: 'تعذّر تحديث المفضلة'));
    }
  }

  String _productIdOf(Map<String, dynamic> product) =>
      product['id']?.toString() ?? product['productId']?.toString() ?? '';

  // ─── Coupons ──────────────────────────────────────────────────────────────

  void applyCoupon() {
    final code = couponCode.trim();
    if (code.isEmpty) {
      showToast('يرجى إدخال كود الخصم');
      return;
    }
    if (!_isLoggedInCustomer) {
      showToast('يجب تسجيل الدخول لتطبيق كود الخصم');
      return;
    }
    unawaited(_remoteApplyCoupon(code));
  }

  Future<void> _remoteApplyCoupon(String code) async {
    try {
      final res = await _api.applyCoupon(code);
      _couponDiscount = res.discount;
      couponApplied = res.applied || res.discount > 0;
      _notify();
      showToast(couponApplied
          ? 'تم تطبيق الخصم بقيمة ${res.discount.round()} ₪'
          : (res.message ?? 'كود الخصم غير صحيح'));
    } catch (e) {
      couponApplied = false;
      _couponDiscount = 0;
      _notify();
      showToast(_dioMessage(e, fallback: 'كود الخصم غير صحيح'));
    }
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  void placeOrder() {
    if (cart.isEmpty) {
      lastOrderError = 'سلة التسوق فارغة';
      showToast(lastOrderError!);
      return;
    }
    if (!_isLoggedInCustomer) {
      lastOrderError = 'يجب تسجيل الدخول لإتمام الطلب';
      showToast(lastOrderError!);
      _notify();
      return;
    }
    lastOrderError = null;
    _notify();
    unawaited(_remotePlaceOrder());
  }

  Future<void> _remotePlaceOrder() async {
    try {
      final data = await _api.createOrder(
        city: checkoutCity,
        street: checkoutStreet,
        phone: checkoutPhone,
        paymentMethod: _normalizePayment(checkoutPayment),
        couponCode: couponApplied ? couponCode : null,
      );
      final order = _mapOrder(data);
      orders = [order, ...orders.where((o) => o.id != order.id)];
      lastPlacedOrder = order;
      activeTrackingOrderId = order.id;
      cart = const [];
      _clearRemoteCartState();
      lastOrderError = null;
      customerStack = CustomerStack.orderConfirmation;
      _notify();
      showToast('تم تأكيد طلبك بنجاح! رقم الإرسالية: ${order.id}');
    } catch (e) {
      lastOrderError =
          _dioMessage(e, fallback: 'تعذّر إنشاء الطلب، يرجى المحاولة مرة أخرى');
      _notify();
      showToast(lastOrderError!);
    }
  }

  /// Prisma `Decimal` columns are serialized as JSON strings by the backend
  /// (e.g. `"240"`), so a plain `as num?` cast silently yields null.
  double _toNum(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  ShopOrder _mapOrder(Map<String, dynamic> o) {
    final addr = o['shippingAddress'] is Map
        ? Map<String, dynamic>.from(o['shippingAddress'] as Map)
        : const <String, dynamic>{};

    final lines = <OrderLine>[];
    final rawItems = o['items'];
    if (rawItems is List) {
      for (final raw in rawItems.whereType<Map<dynamic, dynamic>>()) {
        final item = Map<String, dynamic>.from(raw);
        final product = item['product'] is Map
            ? Map<String, dynamic>.from(item['product'] as Map)
            : const <String, dynamic>{};
        final variant = item['variant'] is Map
            ? Map<String, dynamic>.from(item['variant'] as Map)
            : const <String, dynamic>{};
        lines.add(OrderLine(
          productId: item['productId']?.toString() ?? '',
          name: product['nameAr']?.toString() ??
              product['name']?.toString() ??
              '',
          quantity: _toNum(item['quantity']).toInt(),
          color: variant['colorNameAr']?.toString() ?? '',
          price: _toNum(item['unitPrice']).round(),
        ));
      }
    }

    return ShopOrder(
      id: o['orderNumber']?.toString() ?? o['id']?.toString() ?? '',
      backendId: o['id']?.toString(),
      date: _formatDate(o['createdAt']),
      items: lines,
      customerName: user?.name ?? '',
      customerPhone: addr['phone']?.toString() ?? checkoutPhone,
      city: addr['city']?.toString() ?? checkoutCity,
      address: addr['street']?.toString() ?? checkoutStreet,
      paymentMethod:
          o['paymentMethod']?.toString() ?? _normalizePayment(checkoutPayment),
      subtotal: _toNum(o['subtotal']).round(),
      shipping: _toNum(o['shippingFee']).round(),
      discount: _toNum(o['discountTotal']).round(),
      total: _toNum(o['grandTotal']).round(),
      status: o['status']?.toString() ?? 'PENDING',
      courierLocation: _nullIfEmpty(o['courierLocation']),
      destinationLocation: _nullIfEmpty(o['destinationLocation']),
      distanceKm: o['distanceKm'] == null ? null : _toNum(o['distanceKm']),
      manualEtaMinutes: _toIntOrNull(o['manualEtaMinutes']),
      autoEtaMinutes: _toIntOrNull(o['autoEtaMinutes']),
      isUrgentCrisis: o['isUrgentCrisis'] == true,
      crisisType: _nullIfEmpty(o['crisisType']),
      crisisReason: _nullIfEmpty(o['crisisReason']),
    );
  }

  String? _nullIfEmpty(dynamic value) {
    final text = value?.toString().trim();
    return (text == null || text.isEmpty) ? null : text;
  }

  int? _toIntOrNull(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return 'الآن';
    final dt = DateTime.tryParse(raw.toString());
    if (dt == null) return 'الآن';
    final d = dt.toLocal();
    return '${d.year}/${d.month.toString().padLeft(2, '0')}/${d.day.toString().padLeft(2, '0')}';
  }

  String _normalizePayment(String value) {
    switch (value) {
      case 'cod':
        return 'CASH_ON_DELIVERY';
      case 'palpay':
        return 'PALPAY';
      case 'bank':
        return 'BANK_TRANSFER';
      default:
        return value.isEmpty ? 'CASH_ON_DELIVERY' : value;
    }
  }

  String _dioMessage(Object error, {required String fallback}) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message = data['message'];
        if (message is String && message.isNotEmpty) return message;
        if (message is List && message.isNotEmpty) {
          return message.first.toString();
        }
      }
      final type = error.type;
      if (type == DioExceptionType.connectionError ||
          type == DioExceptionType.connectionTimeout ||
          type == DioExceptionType.receiveTimeout ||
          type == DioExceptionType.sendTimeout) {
        return 'تعذّر الاتصال بالخدمة، يرجى المحاولة لاحقاً';
      }
    }
    return fallback;
  }

  bool isCancellingOrder = false;

  Future<bool> cancelOrder(String orderId, {String? reason}) async {
    isCancellingOrder = true;
    _notify();
    try {
      final updatedData = await _api.cancelOrder(orderId, reason: reason);
      final updatedOrder = _mapOrder(updatedData);
      orders = orders
          .map((o) =>
              (o.id == orderId || o.id == updatedOrder.id) ? updatedOrder : o)
          .toList();
      showToast('تم إلغاء الطلب بنجاح واسترجاع المخزون');
      // Refresh backend orders & products to get synchronized inventory
      unawaited(syncAuthedData());
      unawaited(syncWithBackend());
      return true;
    } catch (e) {
      showToast(
          _dioMessage(e, fallback: 'تعذّر إلغاء الطلب، يرجى المحاولة لاحقاً'));
      return false;
    } finally {
      isCancellingOrder = false;
      _notify();
    }
  }

  // ─── Admin / catalog management (local admin OS & ERP Sync) ──────────────

  /// Loads admin notifications from backend `GET /admin/notifications`,
  /// supplemented with active low-stock alerts for products where `stock < minStock`.
  Future<void> loadAdminNotifications() async {
    if (!isSuperAdmin) return;
    isLoadingNotifications = true;
    _notify();
    if (_isTestEnvironment) {
      _refreshLocalLowStockAlerts();
      isLoadingNotifications = false;
      _notify();
      return;
    }
    try {
      final res = await _api.getAdminNotifications();
      final backendNotifications = res.notifications;

      final activeAlerts = <AdminNotificationModel>[];
      for (final p in products) {
        if (p.stock < p.minStock) {
          final existing = backendNotifications
              .where((n) => n.productId == p.id)
              .firstOrNull;
          if (existing != null) {
            activeAlerts.add(existing);
          } else {
            activeAlerts.add(AdminNotificationModel(
              id: 'local-alert-${p.id}',
              title: 'تنبيه انخفاض المخزون: ${p.name}',
              message:
                  'الرصيد الحالي (${p.stock} قطعة) أقل من الحد الأدنى المطلوب (${p.minStock} قطع).',
              productId: p.id,
              isRead: false,
              createdAt: DateTime.now(),
              type: 'LOW_STOCK',
            ));
          }
        }
      }

      final merged = <String, AdminNotificationModel>{};
      for (final n in activeAlerts) {
        merged[n.id] = n;
      }
      for (final n in backendNotifications) {
        merged.putIfAbsent(n.id, () => n);
      }

      adminNotifications = merged.values.toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      adminUnreadNotificationCount =
          adminNotifications.where((n) => !n.isRead).length;
    } catch (_) {
      _refreshLocalLowStockAlerts();
    } finally {
      isLoadingNotifications = false;
      _notify();
    }
  }

  void _refreshLocalLowStockAlerts() {
    final alerts = <AdminNotificationModel>[];
    for (final p in products) {
      if (p.stock < p.minStock) {
        final prev = adminNotifications
            .where((n) => n.productId == p.id || n.id == 'local-alert-${p.id}')
            .firstOrNull;
        alerts.add(AdminNotificationModel(
          id: 'local-alert-${p.id}',
          title: 'تنبيه انخفاض المخزون: ${p.name}',
          message:
              'الرصيد الحالي (${p.stock} قطعة) أقل من الحد الأدنى المطلوب (${p.minStock} قطع).',
          productId: p.id,
          isRead: prev?.isRead ?? false,
          createdAt: prev?.createdAt ?? DateTime.now(),
          type: 'LOW_STOCK',
        ));
      }
    }
    adminNotifications = alerts;
    adminUnreadNotificationCount =
        adminNotifications.where((n) => !n.isRead).length;
  }

  Future<void> markAdminNotificationAsRead(String id) async {
    adminNotifications = adminNotifications.map((n) {
      if (n.id == id) return n.copyWith(isRead: true);
      return n;
    }).toList();
    adminUnreadNotificationCount =
        adminNotifications.where((n) => !n.isRead).length;
    _notify();
    if (!_isTestEnvironment) {
      try {
        await _api.markAdminNotificationAsRead(id);
      } catch (_) {}
    }
    showToast('تم تحديد الإشعار كمقروء');
  }

  Future<void> markAllAdminNotificationsAsRead() async {
    adminNotifications =
        adminNotifications.map((n) => n.copyWith(isRead: true)).toList();
    adminUnreadNotificationCount = 0;
    _notify();
    if (!_isTestEnvironment) {
      try {
        await _api.markAllAdminNotificationsAsRead();
      } catch (_) {}
    }
    showToast('تم تحديد جميع الإشعارات كمقروءة');
  }

  void adjustStock(String productId, int delta) {
    products = products
        .map((item) => item.id == productId
            ? item.copyWith(stock: max(0, item.stock + delta))
            : item)
        .toList();
    final updatedProduct = productById(productId);
    final name = updatedProduct?.name ?? '';
    _refreshLocalLowStockAlerts();
    if (delta > 0) {
      showToast('تمت إضافة $delta قطع لـ "$name" (المخزون: ${updatedProduct?.stock ?? 0})');
    } else {
      showToast('تم خصم ${delta.abs()} قطع من "$name" (المخزون: ${updatedProduct?.stock ?? 0})');
    }
    if (!_isTestEnvironment && updatedProduct != null) {
      unawaited(_api.updateAdminProductStock(productId, updatedProduct.stock));
    }
    _notify();
  }

  /// Admin: advances an order's lifecycle status on the shared backend.
  Future<void> updateOrderStatus(String orderId, String status) async {
    final backendId = _backendIdOf(orderId);
    if (backendId == null) {
      showToast('تعذّر تحديد الطلب على الخادم');
      return;
    }
    try {
      final data = await _api.updateOrderStatus(backendId, status);
      _mergeUpdatedOrder(data, fallbackId: orderId, status: status);
      showToast('تم تحديث حالة الطلب إلى: ${statusLabel(status)}');
    } catch (e) {
      showToast(
          _dioMessage(e, fallback: 'تعذّر تحديث حالة الطلب، يرجى المحاولة لاحقاً'));
    }
  }

  /// Admin: updates courier location / destination / manual ETA and lets the
  /// backend derive an AVG ETA from the resolved distance.
  Future<bool> updateOrderTracking(
    String orderId, {
    String? courierLocation,
    String? destinationLocation,
    int? manualEtaMinutes,
  }) async {
    final backendId = _backendIdOf(orderId);
    if (backendId == null) {
      showToast('تعذّر تحديد الطلب على الخادم');
      return false;
    }
    try {
      final data = await _api.updateOrderTracking(backendId, {
        if (courierLocation != null && courierLocation.trim().isNotEmpty)
          'courierLocation': courierLocation.trim(),
        if (destinationLocation != null && destinationLocation.trim().isNotEmpty)
          'destinationLocation': destinationLocation.trim(),
        if (manualEtaMinutes != null) 'manualEtaMinutes': manualEtaMinutes,
      });
      _mergeUpdatedOrder(data, fallbackId: orderId);
      showToast('تم تحديث الموقع وإشعار العميل بالوقت المتوقع');
      return true;
    } catch (e) {
      showToast(_dioMessage(e,
          fallback: 'تعذّر تحديث بيانات التتبع، يرجى المحاولة لاحقاً'));
      return false;
    }
  }

  /// Admin: switches an order into the red “Urgent Crisis” state.
  Future<bool> enableOrderCrisis(
    String orderId, {
    String? crisisType,
    String? crisisReason,
  }) async {
    final backendId = _backendIdOf(orderId);
    if (backendId == null) {
      showToast('تعذّر تحديد الطلب على الخادم');
      return false;
    }
    try {
      final data = await _api.enableOrderCrisis(
        backendId,
        crisisType: crisisType ?? 'EMERGENCY_DELAY',
        crisisReason: crisisReason,
      );
      _mergeUpdatedOrder(data, fallbackId: orderId, isUrgentCrisis: true);
      showToast('تم تفعيل حالة الأزمة الطارئة وإخطار العميل');
      return true;
    } catch (e) {
      showToast(_dioMessage(e,
          fallback: 'تعذّر تفعيل حالة الأزمة، يرجى المحاولة لاحقاً'));
      return false;
    }
  }

  /// Admin: resolves the crisis and recalculates a fresh approximate ETA.
  Future<bool> resolveOrderCrisis(String orderId, {String? notes}) async {
    final backendId = _backendIdOf(orderId);
    if (backendId == null) {
      showToast('تعذّر تحديد الطلب على الخادم');
      return false;
    }
    try {
      final data = await _api.resolveOrderCrisis(backendId, notes: notes);
      _mergeUpdatedOrder(data, fallbackId: orderId, isUrgentCrisis: false);
      showToast('تم إنهاء الأزمة واستئناف التوصيل بوقت متوقع جديد');
      return true;
    } catch (e) {
      showToast(_dioMessage(e,
          fallback: 'تعذّر إنهاء حالة الأزمة، يرجى المحاولة لاحقاً'));
      return false;
    }
  }

  /// Resolves the backend UUID for a locally-tracked order number.
  String? _backendIdOf(String orderId) {
    for (final o in orders) {
      if (o.id == orderId) {
        final backend = o.backendId;
        if (backend != null && backend.isNotEmpty) return backend;
        break;
      }
    }
    // Fall back to the raw id (works when callers already hold the UUID).
    return orderId.isEmpty ? null : orderId;
  }

  /// Merges an updated backend order payload back into [orders].
  void _mergeUpdatedOrder(
    Map<String, dynamic> data, {
    required String fallbackId,
    String? status,
    bool? isUrgentCrisis,
  }) {
    if (data.isEmpty) {
      _patchLocalOrder(fallbackId, status: status, isUrgentCrisis: isUrgentCrisis);
      _notify();
      return;
    }
    final updated = _mapOrder(data);
    final isKnown = orders.any((o) => o.id == updated.id || o.id == fallbackId);
    orders = isKnown
        ? orders
            .map((o) => (o.id == updated.id || o.id == fallbackId) ? updated : o)
            .toList()
        : [updated, ...orders];
    _notify();
  }

  void _patchLocalOrder(String orderId,
      {String? status, bool? isUrgentCrisis}) {
    orders = orders
        .map((o) => o.id == orderId
            ? o.copyWith(status: status, isUrgentCrisis: isUrgentCrisis)
            : o)
        .toList();
  }

  // ─── Customer notifications (order progress / crisis) ─────────────────────

  /// Loads the signed-in customer's notifications from `GET /notifications/my`.
  Future<void> loadUserNotifications() async {
    if (!_isLoggedInCustomer || _isTestEnvironment) return;
    isLoadingUserNotifications = true;
    _notify();
    try {
      final res = await _api.getMyNotifications();
      userNotifications = res.notifications;
      userUnreadNotificationCount = res.unreadCount;
      // Keep tracked orders in sync with the latest backend state (deduped).
      final orderIds = <String>{
        for (final n in res.notifications)
          if (n.orderId != null && n.orderId!.isNotEmpty) n.orderId!,
      };
      for (final id in orderIds) {
        unawaited(loadOrder(id));
      }
    } catch (_) {
      // Keep the last known list on failure.
    } finally {
      isLoadingUserNotifications = false;
      _notify();
    }
  }

  Future<void> markUserNotificationRead(String id) async {
    userNotifications = userNotifications
        .map((n) => n.id == id ? n.copyWith(isRead: true) : n)
        .toList();
    userUnreadNotificationCount =
        userNotifications.where((n) => !n.isRead).length;
    _notify();
    if (!_isTestEnvironment) {
      try {
        await _api.markMyNotificationAsRead(id);
      } catch (_) {}
    }
  }

  Future<void> markAllUserNotificationsRead() async {
    userNotifications =
        userNotifications.map((n) => n.copyWith(isRead: true)).toList();
    userUnreadNotificationCount = 0;
    _notify();
    if (!_isTestEnvironment) {
      try {
        await _api.markAllMyNotificationsAsRead();
      } catch (_) {}
    }
  }

  /// Formats an ETA in minutes into a compact Arabic label.
  static String formatEtaMinutes(int? minutes) {
    if (minutes == null || minutes <= 0) return '';
    if (minutes < 60) return '$minutes دقيقة';
    final hours = minutes ~/ 60;
    final rest = minutes % 60;
    return rest == 0 ? '$hours ساعة' : '$hours ساعة و$rest دقيقة';
  }

  void saveProduct({
    required String name,
    required int price,
    required int stock,
    int minStock = 5,
    int maxStock = 100,
    required String category,
    required String compatibility,
  }) {
    final editing = editingProduct;
    if (editing != null) {
      products = products
          .map((p) => p.id == editing.id
              ? p.copyWith(
                  name: name,
                  price: price,
                  stock: stock,
                  minStock: minStock,
                  maxStock: maxStock,
                  categories: [category],
                  compatibility: compatibility,
                )
              : p)
          .toList();
      showToast('تم حفظ تعديلات المنتج وحدود المخزون!');
      unawaited(_api.updateAdminProduct(editing.id, {
        'nameAr': name,
        'basePrice': price,
        'stock': stock,
        'minStock': minStock,
        'maxStock': maxStock,
        'compatibility': compatibility,
      }));
    } else {
      final created = Product(
        id: 'prod-${DateTime.now().millisecondsSinceEpoch}',
        sku: 'PH-NEW-${100 + Random().nextInt(900)}',
        name: name.isEmpty ? 'منتج آيباد جديد' : name,
        categories: [category],
        price: price,
        originalPrice: price + 20,
        stock: stock,
        minStock: minStock,
        maxStock: maxStock,
        minThreshold: minStock,
        compatibility: compatibility,
        rating: 5,
        reviewsCount: 1,
        image:
            'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
        description: 'منتج معتمد عالي الجودة متوافق مع أجهزة الآيباد.',
        colors: const ['أسود', 'فضي'],
      );
      products = [created, ...products];
      showToast('تمت إضافة المنتج بنجاح إلى الكتالوج!');
      unawaited(_api.createAdminProduct(created.toJson()));
    }
    _refreshLocalLowStockAlerts();
    showProductModal = false;
    editingProduct = null;
    _notify();
  }

  void openEditor(Product? product) {
    editingProduct = product;
    showProductModal = true;
    _notify();
  }

  void closeEditor() {
    showProductModal = false;
    editingProduct = null;
    _notify();
  }

  void sendAi([String? custom]) {
    final q = (custom ?? aiPrompt).trim();
    if (q.isEmpty) return;
    aiChat = [...aiChat, ChatMessage('user', q)];
    aiPrompt = '';
    isAiThinking = true;
    _notify();
    Future.delayed(const Duration(milliseconds: 500), () {
      final lower = q.toLowerCase();
      String ans;
      if (lower.contains('مخزون') ||
          lower.contains('نقص') ||
          lower.contains('كمية') ||
          q.contains('نواقص')) {
        final low = products.where((p) => p.stock <= p.minThreshold).toList();
        ans =
            '📊 تقرير المخزون الفوري:\nيوجد ${low.length} منتجات تقترب من حد الأمان:\n${low.map((p) => '• ${p.name} (المتبقي: ${p.stock} فقط - الحد الأدنى: ${p.minThreshold})').join('\n')}\n💡 التوصية: إعادة طلب شاشات حماية الورق وكفرات الكيبورد قبل عطلة نهاية الأسبوع.';
      } else if (lower.contains('سعر') ||
          lower.contains('منافس') ||
          lower.contains('مقارنة') ||
          q.contains('أسعار')) {
        ans =
            '🔍 رصد أسعار السوق الفلسطيني:\n• قلم بادهاوس (120 ₪) منافس بشدة لأقلام آبل الأصلية التي تباع بـ 520 ₪.\n• شاشة حماية الورق PaperFeel تباع بـ 50 ₪ مقابل 65 ₪ لدى المحلات الأخرى.\n💡 التوصية: تقديم عرض حزمة يجمع قلم بادهاوس مع شاشة الورق بـ 150 ₪ لرفع قيمة السلة.';
      } else {
        final sales = orders.fold<int>(0, (s, o) => s + o.total);
        ans =
            '📈 ملخص الأعمال لشهر نوفمبر:\n• إجمالي المبيعات المحققة: $sales ₪\n• إجمالي عدد الطلبات: ${orders.length} طلبات\n• أكثر الفئات طلباً: لوحات المفاتيح والأقلام وملحقاتها.';
      }
      aiChat = [...aiChat, ChatMessage('ai', ans)];
      isAiThinking = false;
      _notify();
    });
  }
}

final padhouseProvider =
    ChangeNotifierProvider<PadhouseController>((ref) => PadhouseController());
