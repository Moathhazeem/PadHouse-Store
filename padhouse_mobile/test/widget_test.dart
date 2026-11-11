import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:padhouse_mobile/main.dart';
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

  testWidgets('App opens directly into Auth screen with admin quick-fill and guest option', (WidgetTester tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: PadHouseApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Title & Brand
    expect(find.byKey(const Key('auth-title')), findsOneWidget);
    expect(find.text('تسجيل الدخول إلى بادهاوس'), findsOneWidget);
    expect(find.text('متجر بادهاوس فلسطين 🇵🇸'), findsOneWidget);

    // Verify Admin Credentials card with Quick-fill
    expect(find.byKey(const Key('admin-credentials')), findsOneWidget);
    expect(find.byKey(const Key('admin-autofill')), findsOneWidget);
    expect(find.text('adimn123@gmail.com / 123456'), findsOneWidget);

    // Verify Continue as Guest button
    expect(find.byKey(const Key('continue-guest')), findsOneWidget);
    expect(find.text('المتابعة كزائر بدون تسجيل'), findsOneWidget);
  });

  testWidgets('Autofill admin credentials fills fields correctly', (WidgetTester tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: PadHouseApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Tap autofill
    await tester.tap(find.byKey(const Key('admin-autofill')));
    await tester.pumpAndSettle();

    // Verify fields populated
    expect(find.text('adimn123@gmail.com'), findsOneWidget);
  });

  testWidgets('Continue as Guest enters Store and renders products & 6 categories', (WidgetTester tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: PadHouseApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Tap continue as guest
    await tester.tap(find.byKey(const Key('continue-guest')));
    await tester.pumpAndSettle();

    // Should now be in customer store
    expect(find.byKey(const Key('nav-home')), findsOneWidget);
    expect(find.byKey(const Key('nav-categories')), findsOneWidget);
    expect(find.byKey(const Key('nav-search')), findsOneWidget);
    expect(find.byKey(const Key('nav-cart')), findsOneWidget);
    expect(find.byKey(const Key('nav-profile')), findsOneWidget);

    // Verify official Palestinian products count
    expect(find.byKey(const Key('product-count')), findsOneWidget);
    expect(find.text('قائمة المنتجات (21)'), findsOneWidget);

    // Verify categories chips exist
    expect(find.text('الأقلام وملحقاتها'), findsWidgets);
    expect(find.text('الحافظات والحقائب'), findsWidgets);
    expect(find.text('لوحات المفاتيح'), findsWidgets);
    expect(find.text('الحوامل والمساند'), findsWidgets);
    expect(find.text('الشواحن والكابلات'), findsWidgets);
    expect(find.text('إكسسوارات أخرى'), findsWidgets);
  });

  testWidgets('Admin user flow: login -> Profile -> enter Admin OS -> back to Store', (WidgetTester tester) async {
    setPhoneSize(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: PadHouseApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Autofill & Submit Login
    await tester.tap(find.byKey(const Key('admin-autofill')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();

    // Navigate to Profile tab
    await tester.tap(find.byKey(const Key('nav-profile')));
    await tester.pumpAndSettle();

    // Verify Admin OS Banner is available
    expect(find.byKey(const Key('enter-admin')), findsOneWidget);
    expect(find.text('لوحة تحكم نظام الإدارة (Admin OS)'), findsOneWidget);

    // Enter Admin OS
    await tester.tap(find.byKey(const Key('enter-admin')));
    await tester.pumpAndSettle();

    // Verify Admin Header & Tabs
    expect(find.text('إدارة بادهاوس'), findsOneWidget);
    expect(find.byKey(const Key('back-to-store')), findsOneWidget);
    expect(find.byKey(const Key('admin-overview')), findsOneWidget);
    expect(find.byKey(const Key('admin-products')), findsOneWidget);
    expect(find.byKey(const Key('admin-inventory')), findsOneWidget);
    expect(find.byKey(const Key('admin-orders')), findsOneWidget);
    expect(find.byKey(const Key('admin-ai')), findsOneWidget);

    // Tap back to store
    await tester.tap(find.byKey(const Key('back-to-store')));
    await tester.pumpAndSettle();

    // Should return to Customer Store
    expect(find.byKey(const Key('nav-home')), findsOneWidget);
  });
}
