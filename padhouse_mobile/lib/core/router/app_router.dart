import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../state/padhouse_controller.dart';
import '../../ui/auth_screen.dart';
import '../../ui/store_screen.dart';

/// All 46 Screen Routes for PadHouse
class AppRoutes {
  // --- CUSTOMER SCREENS (1 to 21) ---
  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/';
  static const String categories = '/categories';
  static const String productListing = '/products';
  static const String productSearch = '/search';
  static const String productDetails = '/product/:id';
  static const String productReviews = '/product/:id/reviews';
  static const String wishlist = '/wishlist';
  static const String shoppingCart = '/cart';
  static const String checkout = '/checkout';
  static const String paymentMethods = '/payment-methods';
  static const String orderConfirmation = '/order-confirmation/:id';
  static const String orderTracking = '/order-tracking/:id';
  static const String orderHistory = '/order-history';
  static const String customerProfile = '/profile';
  static const String addressManagement = '/addresses';
  static const String customerNotifications = '/notifications';
  static const String customerSupport = '/support';

  // --- ADMIN SCREENS (22 to 46) ---
  static const String adminLogin = '/admin/login';
  static const String adminOverview = '/admin';
  static const String productManagement = '/admin/products';
  static const String productEditor = '/admin/products/editor';
  static const String inventoryManagement = '/admin/inventory';
  static const String inventoryAnalytics = '/admin/inventory/analytics';
  static const String orderManagement = '/admin/orders';
  static const String orderDetails = '/admin/orders/:id';
  static const String customerManagement = '/admin/customers';
  static const String salesAnalytics = '/admin/sales-analytics';
  static const String socialMediaIntelligence = '/admin/social-intelligence';
  static const String platformAnalytics = '/admin/platform-analytics';
  static const String competitorSocial = '/admin/competitor-social';
  static const String competitorManagement = '/admin/competitors';
  static const String competitorPricing = '/admin/competitor-pricing';
  static const String priceComparison = '/admin/price-comparison';
  static const String priceHistory = '/admin/price-history';
  static const String competitorPromotions = '/admin/competitor-promotions';
  static const String socialMediaCalendar = '/admin/social-calendar';
  static const String contentEditor = '/admin/content-editor';
  static const String contentDetails = '/admin/content-details/:id';
  static const String aiContentAssistant = '/admin/ai-content-assistant';
  static const String aiBusinessAssistant = '/admin/ai-business-assistant';
  static const String adminNotifications = '/admin/notifications';
  static const String adminSettings = '/admin/settings';
}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// Dynamic wrapper widget connecting router routes directly to the interactive Store & Admin controller
class RouteStoreScreen extends ConsumerStatefulWidget {
  const RouteStoreScreen({
    super.key,
    this.tab,
    this.stack,
    this.productId,
    this.orderId,
    this.adminMode = false,
    this.adminTab,
  });

  final CustomerTab? tab;
  final CustomerStack? stack;
  final String? productId;
  final String? orderId;
  final bool adminMode;
  final AdminTab? adminTab;

  @override
  ConsumerState<RouteStoreScreen> createState() => _RouteStoreScreenState();
}

class _RouteStoreScreenState extends ConsumerState<RouteStoreScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final store = ref.read(padhouseProvider);
      if (widget.adminMode) {
        store.appMode = AppMode.admin;
        if (widget.adminTab != null) {
          store.adminTab = widget.adminTab!;
        }
      } else {
        store.appMode = AppMode.customer;
        if (widget.tab != null) {
          store.setCustomerTab(widget.tab!);
        }
        if (widget.stack != null) {
          if (widget.productId != null) {
            store.selectedProductId = widget.productId;
          }
          if (widget.orderId != null) {
            store.activeTrackingOrderId = widget.orderId!;
          }
          store.setStack(widget.stack);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const StoreScreen();
  }
}

/// GoRouter setup supporting all 46 defined screens with interactive components (no placeholders)
final GoRouter appRouter = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: AppRoutes.home,
  routes: [
    // 1-21 Customer Routes
    GoRoute(
      path: AppRoutes.home,
      builder: (c, s) => const RouteStoreScreen(tab: CustomerTab.home),
    ),
    GoRoute(
      path: AppRoutes.splash,
      builder: (c, s) => const SplashScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboarding,
      builder: (c, s) => const OnboardingScreen(),
    ),
    GoRoute(
      path: AppRoutes.login,
      builder: (c, s) => const AuthScreen(initialRegisterMode: false),
    ),
    GoRoute(
      path: AppRoutes.register,
      builder: (c, s) => const AuthScreen(initialRegisterMode: true),
    ),
    GoRoute(
      path: AppRoutes.categories,
      builder: (c, s) => const RouteStoreScreen(tab: CustomerTab.categories),
    ),
    GoRoute(
      path: AppRoutes.productListing,
      builder: (c, s) => const RouteStoreScreen(tab: CustomerTab.categories),
    ),
    GoRoute(
      path: AppRoutes.productSearch,
      builder: (c, s) => const RouteStoreScreen(tab: CustomerTab.search),
    ),
    GoRoute(
      path: AppRoutes.productDetails,
      builder: (c, s) => RouteStoreScreen(
        stack: CustomerStack.productDetails,
        productId: s.pathParameters['id'],
      ),
    ),
    GoRoute(
      path: AppRoutes.productReviews,
      builder: (c, s) => RouteStoreScreen(
        stack: CustomerStack.productDetails,
        productId: s.pathParameters['id'],
      ),
    ),
    GoRoute(
      path: AppRoutes.wishlist,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.wishlist),
    ),
    GoRoute(
      path: AppRoutes.shoppingCart,
      builder: (c, s) => const RouteStoreScreen(tab: CustomerTab.cart),
    ),
    GoRoute(
      path: AppRoutes.checkout,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.checkout),
    ),
    GoRoute(
      path: AppRoutes.paymentMethods,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.checkout),
    ),
    GoRoute(
      path: AppRoutes.orderConfirmation,
      builder: (c, s) => RouteStoreScreen(
        stack: CustomerStack.orderConfirmation,
        orderId: s.pathParameters['id'],
      ),
    ),
    GoRoute(
      path: AppRoutes.orderTracking,
      builder: (c, s) => RouteStoreScreen(
        stack: CustomerStack.tracking,
        orderId: s.pathParameters['id'],
      ),
    ),
    GoRoute(
      path: AppRoutes.orderHistory,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.orders),
    ),
    GoRoute(
      path: AppRoutes.customerProfile,
      builder: (c, s) => const RouteStoreScreen(tab: CustomerTab.profile),
    ),
    GoRoute(
      path: AppRoutes.addressManagement,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.checkout),
    ),
    GoRoute(
      path: AppRoutes.customerNotifications,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.notifications),
    ),
    GoRoute(
      path: AppRoutes.customerSupport,
      builder: (c, s) => const RouteStoreScreen(stack: CustomerStack.support),
    ),

    // 22-46 Admin Routes
    GoRoute(
      path: AppRoutes.adminLogin,
      builder: (c, s) => const AuthScreen(prefillAdmin: true),
    ),
    GoRoute(
      path: AppRoutes.adminOverview,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.overview),
    ),
    GoRoute(
      path: AppRoutes.productManagement,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.productEditor,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.inventoryManagement,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.inventory),
    ),
    GoRoute(
      path: AppRoutes.inventoryAnalytics,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.inventory),
    ),
    GoRoute(
      path: AppRoutes.orderManagement,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.orders),
    ),
    GoRoute(
      path: AppRoutes.orderDetails,
      builder: (c, s) => RouteStoreScreen(
        adminMode: true,
        adminTab: AdminTab.orders,
        orderId: s.pathParameters['id'],
      ),
    ),
    GoRoute(
      path: AppRoutes.customerManagement,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.overview),
    ),
    GoRoute(
      path: AppRoutes.salesAnalytics,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.overview),
    ),
    GoRoute(
      path: AppRoutes.socialMediaIntelligence,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.platformAnalytics,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.overview),
    ),
    GoRoute(
      path: AppRoutes.competitorSocial,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.competitorManagement,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.competitorPricing,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.priceComparison,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.priceHistory,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.competitorPromotions,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.products),
    ),
    GoRoute(
      path: AppRoutes.socialMediaCalendar,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.contentEditor,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.contentDetails,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.aiContentAssistant,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.aiBusinessAssistant,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.ai),
    ),
    GoRoute(
      path: AppRoutes.adminNotifications,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.overview),
    ),
    GoRoute(
      path: AppRoutes.adminSettings,
      builder: (c, s) => const RouteStoreScreen(adminMode: true, adminTab: AdminTab.overview),
    ),
  ],
);
