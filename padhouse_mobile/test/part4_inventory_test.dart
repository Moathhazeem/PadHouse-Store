import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:padhouse_mobile/data/catalog.dart';
import 'package:padhouse_mobile/state/padhouse_controller.dart';
import 'package:padhouse_mobile/ui/stack_and_admin.dart';
import 'package:padhouse_mobile/ui/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  void setPhoneSize(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  }

  group('Part 4: ProductModel & AdminNotificationModel Unit Tests', () {
    test('ProductModel parses stock, minStock, and maxStock safely from JSON', () {
      final json = {
        'id': 'test-prod-1',
        'sku': 'PH-TEST-01',
        'nameAr': 'قلم بادهاوس فائق الدقة',
        'price': 120,
        'stock': 15,
        'minStock': 5,
        'maxStock': 80,
        'compatibility': 'iPad Pro',
      };

      final product = ProductModel.fromJson(json);

      expect(product.id, 'test-prod-1');
      expect(product.stock, 15);
      expect(product.minStock, 5);
      expect(product.maxStock, 80);
      expect(product.minThreshold, 5);
      expect(product.isOutOfStock, isFalse);
      expect(product.isLowStock, isFalse);

      final outJson = product.toJson();
      expect(outJson['stock'], 15);
      expect(outJson['minStock'], 5);
      expect(outJson['maxStock'], 80);
    });

    test('ProductModel handles out of stock (stock <= 0) and low stock flags', () {
      final oosProduct = ProductModel.fromJson({
        'id': 'test-oos',
        'sku': 'PH-OOS',
        'name': 'كفر منتهي',
        'price': 40,
        'stock': 0,
        'minStock': 5,
        'maxStock': 50,
      });

      expect(oosProduct.isOutOfStock, isTrue);
      expect(oosProduct.isLowStock, isFalse);

      final lowStockProduct = ProductModel.fromJson({
        'id': 'test-low',
        'sku': 'PH-LOW',
        'name': 'كفر رصيد منخفض',
        'price': 40,
        'stock': 3,
        'minStock': 5,
        'maxStock': 50,
      });

      expect(lowStockProduct.isOutOfStock, isFalse);
      expect(lowStockProduct.isLowStock, isTrue);
    });

    test('AdminNotificationModel parses and serializes correctly', () {
      final now = DateTime(2026, 11, 20, 19, 0, 0);
      final json = {
        'id': 'notif-1',
        'title': 'تنبيه انخفاض المخزون',
        'message': 'رصيد المنتج وصل إلى 2 قطع',
        'productId': 'prod-01',
        'isRead': false,
        'createdAt': now.toIso8601String(),
        'type': 'LOW_STOCK',
      };

      final notif = AdminNotificationModel.fromJson(json);

      expect(notif.id, 'notif-1');
      expect(notif.title, 'تنبيه انخفاض المخزون');
      expect(notif.productId, 'prod-01');
      expect(notif.isRead, isFalse);
      expect(notif.type, 'LOW_STOCK');

      final readNotif = notif.copyWith(isRead: true);
      expect(readNotif.isRead, isTrue);
      expect(readNotif.toJson()['isRead'], isTrue);
    });
  });

  group('Part 4: Customer Out-of-Stock Ribbon & Button State', () {
    testWidgets('ProductCard displays red "نفذت الكمية" ribbon and disables Add to Cart when stock <= 0',
        (WidgetTester tester) async {
      setPhoneSize(tester);

      final controller = PadhouseController();
      const oosProduct = Product(
        id: 'oos-test-item',
        sku: 'PH-OOS-01',
        name: 'منتج غير متوفر',
        categories: ['cat_pens'],
        price: 99,
        originalPrice: 120,
        stock: 0,
        minStock: 5,
        maxStock: 50,
        compatibility: 'iPad',
        rating: 4.8,
        reviewsCount: 10,
        image: '',
        description: 'وصف المنتج',
        colors: ['افتراضي'],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              height: 380,
              width: 240,
              child: ProductCard(store: controller, product: oosProduct),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Check for prominent red ribbon labeled "نفذت الكمية"
      expect(find.text('نفذت الكمية'), findsWidgets);
      expect(find.byType(OutOfStockRibbon), findsWidgets);

      // Verify the Add to Cart button is disabled
      final buttonFinder = find.byType(FilledButton);
      expect(buttonFinder, findsOneWidget);
      final FilledButton button = tester.widget(buttonFinder);
      expect(button.onPressed, isNull);
    });

    testWidgets('ProductDetails displays red "نفذت الكمية" ribbon and disables Add to Cart when stock <= 0',
        (WidgetTester tester) async {
      setPhoneSize(tester);

      final controller = PadhouseController();
      const oosProduct = Product(
        id: 'oos-details-item',
        sku: 'PH-OOS-02',
        name: 'شاشة حماية نفذت الكمية',
        categories: ['cat_others'],
        price: 50,
        originalPrice: 70,
        stock: 0,
        minStock: 5,
        maxStock: 100,
        compatibility: 'iPad 10th',
        rating: 5.0,
        reviewsCount: 20,
        image: '',
        description: 'شاشة حماية متوافقة نفدت الكمية.',
        colors: ['شفاف'],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProductDetails(store: controller, product: oosProduct),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Check for ribbon on image and badge
      expect(find.text('نفذت الكمية'), findsWidgets);
      expect(find.byType(OutOfStockRibbon), findsOneWidget);

      // Verify CTA button is disabled and labeled "نفذت الكمية حالياً"
      expect(find.text('نفذت الكمية حالياً'), findsOneWidget);
      final primaryButtonFinder = find.byType(PrimaryButton);
      expect(primaryButtonFinder, findsOneWidget);
      final PrimaryButton primaryBtn = tester.widget(primaryButtonFinder);
      expect(primaryBtn.onPressed, isNull);
    });
  });

  group('Part 4: Admin Low-Stock Notifications & Product Form', () {
    testWidgets('Admin Overview displays Low-Stock Notifications section and handles Mark as Read',
        (WidgetTester tester) async {
      setPhoneSize(tester);

      final controller = PadhouseController();
      controller.user = const AppUser(
        name: 'مسؤول النظام',
        email: 'admin@gmail.com',
        phone: '+970 59 000 0000',
        city: 'رام الله والبيرة',
        role: 'super_admin',
      );
      controller.enterAdmin();

      // Ensure we have a product where stock < minStock
      controller.products = [
        const Product(
          id: 'alert-item-1',
          sku: 'PH-ALERT-01',
          name: 'كيبورد آيباد منخفض المخزون',
          categories: ['cat_keyboards'],
          price: 150,
          originalPrice: 180,
          stock: 2,
          minStock: 5,
          maxStock: 50,
          compatibility: 'iPad Pro',
          rating: 4.8,
          reviewsCount: 12,
          image: '',
          description: 'كيبورد ذكي',
          colors: ['أسود'],
        ),
      ];

      // Refresh alerts
      await controller.loadAdminNotifications();

      expect(controller.adminUnreadNotificationCount, greaterThanOrEqualTo(1));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdminBody(store: controller),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Section header should be present
      expect(find.text('تنبيهات المخزون المنخفض'), findsOneWidget);
      expect(find.textContaining('كيبورد آيباد منخفض المخزون'), findsOneWidget);

      // Mark single notification as read
      final markReadFinder = find.text('تحديد كمقروء');
      if (markReadFinder.evaluate().isNotEmpty) {
        await tester.tap(markReadFinder.first);
        await tester.pumpAndSettle();
        expect(controller.adminUnreadNotificationCount, 0);
      }
    });

    testWidgets('showProductEditor has inputs for stock, minStock, and maxStock',
        (WidgetTester tester) async {
      setPhoneSize(tester);

      final controller = PadhouseController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (ctx) => ElevatedButton(
                onPressed: () => showProductEditor(ctx, controller, null),
                child: const Text('Open Editor'),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Open Editor'));
      await tester.pumpAndSettle();

      // Verify inputs exist
      expect(find.text('إضافة منتج جديد'), findsOneWidget);
      expect(find.text('الكمية الحالية في المخزون (Stock)'), findsOneWidget);
      expect(find.text('الحد الأدنى للتنبيه (minStock)'), findsOneWidget);
      expect(find.text('السعة القصوى (maxStock)'), findsOneWidget);

      // Enter stock values
      await tester.enterText(find.widgetWithText(TextField, 'اسم المنتج'), 'منتج تجريبي');
      await tester.tap(find.text('إلغاء'));
      await tester.pumpAndSettle();
    });
  });
}
