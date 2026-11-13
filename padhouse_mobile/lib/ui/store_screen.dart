import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../data/catalog.dart';
import '../state/padhouse_controller.dart';
import 'auth_screen.dart';
import 'stack_and_admin.dart';
import 'widgets.dart';

class StoreScreen extends ConsumerWidget {
  const StoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final store = ref.watch(padhouseProvider);
    if (store.user == null) {
      return const AuthScreen();
    }
    final admin = store.appMode == AppMode.admin;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                _Header(store: store),
                Expanded(
                  child: admin
                      ? AdminBody(store: store)
                      : store.customerStack != null
                          ? CustomerStackBody(store: store)
                          : CustomerTabBody(store: store),
                ),
                admin ? _AdminNav(store: store) : _CustomerNav(store: store),
              ],
            ),
            if (store.toastMessage != null)
              Positioned(
                top: 70,
                left: 20,
                right: 20,
                child: Material(
                  elevation: 6,
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.navy,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        const PhIcon(LucideIcons.info, size: 16, color: AppColors.turquoise),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            store.toastMessage!,
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────

class _Header extends ConsumerWidget {
  const _Header({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (store.appMode == AppMode.admin) {
      return Container(
        height: 60,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderLight))),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(8)),
              child: const PhIcon(LucideIcons.barChart3, size: 16, color: AppColors.turquoise),
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('إدارة بادهاوس', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  Text(superAdminEmail, style: TextStyle(fontSize: 10, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            FilledButton.icon(
              key: const Key('back-to-store'),
              onPressed: store.backToStore,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.turquoise,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                visualDensity: VisualDensity.compact,
              ),
              icon: const PhIcon(LucideIcons.shoppingBag, size: 14, color: Colors.white),
              label: const Text('الرجوع للمتجر', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      );
    }

    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderLight))),
      child: Row(
        children: [
          if (store.customerStack != null)
            TextButton.icon(
              onPressed: () => store.setStack(null),
              icon: const PhIcon(LucideIcons.arrowRight, size: 16, color: AppColors.navy),
              label: const Text('رجوع', style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w800)),
            )
          else
            Expanded(
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: AppColors.turquoise, borderRadius: BorderRadius.circular(10)),
                    child: const Text('PH', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                  ),
                  const SizedBox(width: 8),
                  const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('بادهاوس', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                      Row(
                        children: [
                          PhIcon(LucideIcons.mapPin, size: 12, color: AppColors.turquoise),
                          SizedBox(width: 4),
                          Text('فلسطين • توصيل سريع', style: TextStyle(fontSize: 10, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          // Cart icon (always visible) — opens cart tab
          IconButton(
            key: const Key('nav-cart'),
            onPressed: () => store.setCustomerTab(CustomerTab.cart),
            icon: Badge(
              isLabelVisible: store.cartCount > 0,
              label: Text('${store.cartCount}'),
              backgroundColor: AppColors.turquoise,
              child: const PhIcon(LucideIcons.shoppingCart, size: 20, color: AppColors.navy),
            ),
          ),
          // Search icon — opens search tab
          IconButton(
            key: const Key('nav-search'),
            onPressed: () => store.setCustomerTab(CustomerTab.search),
            icon: const PhIcon(LucideIcons.search, size: 20, color: AppColors.textSecondary),
          ),
          // Notifications with dot badge
          IconButton(
            onPressed: () => store.setStack(CustomerStack.notifications),
            icon: const Badge(
              isLabelVisible: true,
              smallSize: 8,
              backgroundColor: AppColors.turquoise,
              child: PhIcon(LucideIcons.bell, size: 20, color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Customer Navigation ──────────────────────────────────────────────────────

class _CustomerNav extends StatelessWidget {
  const _CustomerNav({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final active = store.customerStack == null ? store.customerTab : null;
    return _NavBarWithFab(
      store: store,
      items: [
        _NavItem('الرئيسية', LucideIcons.home, active == CustomerTab.home, () => store.setCustomerTab(CustomerTab.home), const Key('nav-home')),
        _NavItem('التصنيفات', LucideIcons.layoutGrid, active == CustomerTab.categories, () => store.setCustomerTab(CustomerTab.categories), const Key('nav-categories')),
        _NavItem('', LucideIcons.bot, active == CustomerTab.ai, () => store.setCustomerTab(CustomerTab.ai), const Key('nav-ai'), isFab: true),
        _NavItem('المفضلة', LucideIcons.heart, active == CustomerTab.wishlist, () => store.setCustomerTab(CustomerTab.wishlist), const Key('nav-wishlist'), badge: store.wishlistIds.length),
        _NavItem('حسابي', LucideIcons.user, active == CustomerTab.profile, () => store.setCustomerTab(CustomerTab.profile), const Key('nav-profile')),
      ],
    );
  }
}

class _AdminNav extends StatelessWidget {
  const _AdminNav({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return _NavBar(
      items: [
        _NavItem('المؤشرات', LucideIcons.barChart3, store.adminTab == AdminTab.overview, () => store.setAdminTab(AdminTab.overview), const Key('admin-overview')),
        _NavItem('المنتجات', LucideIcons.package, store.adminTab == AdminTab.products, () => store.setAdminTab(AdminTab.products), const Key('admin-products')),
        _NavItem('المخزون', LucideIcons.layers, store.adminTab == AdminTab.inventory, () => store.setAdminTab(AdminTab.inventory), const Key('admin-inventory')),
        _NavItem('الطلبات', LucideIcons.shoppingBag, store.adminTab == AdminTab.orders, () => store.setAdminTab(AdminTab.orders), const Key('admin-orders'), badge: store.pendingOrders, badgeColor: AppColors.error),
        _NavItem('المساعد الذكي', LucideIcons.bot, store.adminTab == AdminTab.ai, () => store.setAdminTab(AdminTab.ai), const Key('admin-ai')),
      ],
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.icon, this.active, this.onTap, this.keyId, {this.badge = 0, this.badgeColor = AppColors.turquoise, this.isFab = false});
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  final Key keyId;
  final int badge;
  final Color badgeColor;
  final bool isFab;
}

// Nav bar with center FAB-style button for AI tab
class _NavBarWithFab extends StatelessWidget {
  const _NavBarWithFab({required this.items, required this.store});
  final List<_NavItem> items;
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.borderLight))),
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          for (final item in items)
            Expanded(
              child: item.isFab ? _FabNavItem(item: item) : _RegularNavItem(item: item),
            ),
        ],
      ),
    );
  }
}

class _FabNavItem extends StatelessWidget {
  const _FabNavItem({required this.item});
  final _NavItem item;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: item.keyId,
      onTap: item.onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: item.active ? AppColors.navy : AppColors.turquoise,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.turquoise.withValues(alpha: 0.4),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: PhIcon(item.icon, size: 22, color: Colors.white),
          ),
          const SizedBox(height: 2),
          Text(
            'الذكاء الاصطناعي',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 9,
              fontWeight: item.active ? FontWeight.w800 : FontWeight.w600,
              color: item.active ? AppColors.turquoise : AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

class _RegularNavItem extends StatelessWidget {
  const _RegularNavItem({required this.item});
  final _NavItem item;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 700;
    return InkWell(
      key: item.keyId,
      onTap: item.onTap,
      child: isWide
          ? Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _navIcon(item, compact: true),
                const SizedBox(width: 8),
                Flexible(child: _navLabel(item, maxLines: 1)),
              ],
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _navIcon(item),
                const SizedBox(height: 2),
                _navLabel(item, maxLines: 1),
              ],
            ),
    );
  }

  Widget _navIcon(_NavItem item, {bool compact = false}) => Container(
        padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 12, vertical: 4),
        decoration: BoxDecoration(
          color: item.active ? AppColors.turquoise.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Badge(
          isLabelVisible: item.badge > 0,
          label: Text('${item.badge}'),
          backgroundColor: item.badgeColor,
          child: PhIcon(item.icon, size: 18, color: item.active ? AppColors.turquoise : AppColors.textTertiary),
        ),
      );

  Widget _navLabel(_NavItem item, {required int maxLines}) => Text(
        item.label,
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 10,
          fontWeight: item.active ? FontWeight.w800 : FontWeight.w600,
          color: item.active ? AppColors.turquoise : AppColors.textTertiary,
        ),
      );
}

class _NavBar extends StatelessWidget {
  const _NavBar({required this.items});
  final List<_NavItem> items;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 700;
    return Container(
      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.borderLight))),
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          for (final item in items)
            Expanded(
              child: InkWell(
                key: item.keyId,
                onTap: item.onTap,
                child: isWide
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _navIcon(item, compact: true),
                          const SizedBox(width: 8),
                          Flexible(child: _navLabel(item, maxLines: 1)),
                        ],
                      )
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _navIcon(item),
                          const SizedBox(height: 2),
                          _navLabel(item, maxLines: 1),
                        ],
                      ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _navIcon(_NavItem item, {bool compact = false}) => Container(
        padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 12, vertical: 4),
        decoration: BoxDecoration(
          color: item.active ? AppColors.turquoise.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Badge(
          isLabelVisible: item.badge > 0,
          label: Text('${item.badge}'),
          backgroundColor: item.badgeColor,
          child: PhIcon(item.icon, size: 18, color: item.active ? AppColors.turquoise : AppColors.textTertiary),
        ),
      );

  Widget _navLabel(_NavItem item, {required int maxLines}) => Text(
        item.label,
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 10,
          fontWeight: item.active ? FontWeight.w800 : FontWeight.w600,
          color: item.active ? AppColors.turquoise : AppColors.textTertiary,
        ),
      );
}

// ─── Customer Tab Body ────────────────────────────────────────────────────────

class CustomerTabBody extends StatelessWidget {
  const CustomerTabBody({super.key, required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    switch (store.customerTab) {
      case CustomerTab.home:
        return _HomeTab(store: store);
      case CustomerTab.categories:
        return _CategoriesTab(store: store);
      case CustomerTab.search:
        return _SearchTab(store: store);
      case CustomerTab.ai:
        return _AiTab(store: store);
      case CustomerTab.wishlist:
        return _WishlistTab(store: store);
      case CustomerTab.cart:
        return _CartTab(store: store);
      case CustomerTab.profile:
        return _ProfileTab(store: store);
    }
  }
}

// ─── Search Tab ────────────────────────────────────────────────────────────────

class _SearchTab extends StatefulWidget {
  const _SearchTab({required this.store});
  final PadhouseController store;

  @override
  State<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<_SearchTab> {
  late final TextEditingController _controller = TextEditingController(text: widget.store.searchQuery);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final q = store.searchQuery.trim();
    final results = q.isEmpty
        ? <Product>[]
        : store.products
            .where((p) =>
                p.name.contains(q) ||
                p.sku.toLowerCase().contains(q.toLowerCase()) ||
                p.compatibility.contains(q))
            .toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                const PhIcon(LucideIcons.search, size: 18, color: AppColors.turquoise),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    key: const Key('search-field'),
                    controller: _controller,
                    autofocus: true,
                    textInputAction: TextInputAction.search,
                    onChanged: store.setSearch,
                    decoration: bareInput('ابحث عن منتج أو رمز SKU...'),
                  ),
                ),
                if (q.isNotEmpty)
                  InkWell(
                    onTap: () {
                      _controller.clear();
                      store.setSearch('');
                    },
                    child: const PhIcon(LucideIcons.x, size: 18, color: AppColors.textTertiary),
                  ),
              ],
            ),
          ),
        ),
        if (q.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 2, 16, 6),
            child: Row(
              children: [
                Text('نتائج البحث (${results.length})',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy)),
              ],
            ),
          ),
        Expanded(
          child: q.isEmpty
              ? const EmptyState(
                  icon: LucideIcons.search,
                  title: 'ابحث في متجر بادهاوس',
                  subtitle: 'اكتب اسم المنتج أو رمز SKU للعثور على ما يناسب آيبادك',
                )
              : results.isEmpty
                  ? EmptyState(
                      icon: LucideIcons.search,
                      title: 'لا توجد نتائج مطابقة',
                      subtitle: 'جرّب كلمات بحث أخرى أو استعرض الأقسام',
                      ctaLabel: 'تصفح الأقسام',
                      onCta: () => store.setCustomerTab(CustomerTab.categories),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(14),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: 0.72,
                      ),
                      itemCount: results.length,
                      itemBuilder: (context, index) => ProductCard(store: store, product: results[index]),
                    ),
        ),
      ],
    );
  }
}

// ─── Cart Tab ──────────────────────────────────────────────────────────────────

class _CartTab extends StatelessWidget {
  const _CartTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final lines = store.cart
        .map((line) => (line: line, product: store.productById(line.productId)))
        .where((e) => e.product != null)
        .toList();

    if (lines.isEmpty) {
      return EmptyState(
        icon: LucideIcons.shoppingCart,
        title: 'سلة التسوق فارغة',
        subtitle: 'أضف منتجاتك المفضلة ثم أكمل عملية الشراء بسهولة',
        ctaLabel: 'تصفح المنتجات',
        onCta: () => store.setCustomerTab(CustomerTab.home),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Row(
                children: [
                  const PhIcon(LucideIcons.shoppingCart, size: 18, color: AppColors.turquoise),
                  const SizedBox(width: 8),
                  const Text('سلة التسوق', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const Spacer(),
                  Text('${store.cartCount} قطعة',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ],
              ),
              const SizedBox(height: 12),
              for (final entry in lines)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SoftCard(
                    child: Row(
                      children: [
                        NetImage(url: entry.product!.image, width: 64, height: 64, radius: 12),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(entry.product!.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                              const SizedBox(height: 2),
                              Text(entry.line.selectedColor,
                                  style: const TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                              const SizedBox(height: 6),
                              Text('${entry.product!.price * entry.line.quantity} ₪',
                                  style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.turquoise)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          children: [
                            _QtyStepper(
                              quantity: entry.line.quantity,
                              onInc: () => store.updateCartQty(entry.line.productId, entry.line.selectedColor, 1),
                              onDec: () => store.updateCartQty(entry.line.productId, entry.line.selectedColor, -1),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => store.removeFromCart(entry.line.productId, entry.line.selectedColor),
                              child: const PhIcon(LucideIcons.trash2, size: 16, color: AppColors.error),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.borderLight)),
          ),
          child: Column(
            children: [
              _summaryRow('المجموع الفرعي', '${store.subtotal} ₪'),
              const SizedBox(height: 4),
              _summaryRow('التوصيل', '${store.deliveryFee} ₪'),
              if (store.discountAmount > 0) ...[
                const SizedBox(height: 4),
                _summaryRow('الخصم', '- ${store.discountAmount} ₪'),
              ],
              const Divider(height: 18),
              _summaryRow('الإجمالي', '${store.grandTotal} ₪', bold: true),
              const SizedBox(height: 10),
              PrimaryButton(
                label: 'متابعة إلى الدفع',
                icon: LucideIcons.arrowLeft,
                onPressed: () => store.setStack(CustomerStack.checkout),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _summaryRow(String label, String value, {bool bold = false}) {
    return Row(
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 12,
                color: bold ? AppColors.navy : AppColors.textSecondary,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
        const Spacer(),
        Text(value,
            style: TextStyle(
                fontSize: bold ? 15 : 12,
                color: bold ? AppColors.navy : AppColors.textSecondary,
                fontWeight: bold ? FontWeight.w900 : FontWeight.w600)),
      ],
    );
  }
}

class _QtyStepper extends StatelessWidget {
  const _QtyStepper({required this.quantity, required this.onInc, required this.onDec});

  final int quantity;
  final VoidCallback onInc;
  final VoidCallback onDec;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.borderLight),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _stepperBtn(LucideIcons.plus, onInc),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Text('$quantity', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
          ),
          _stepperBtn(LucideIcons.minus, onDec),
        ],
      ),
    );
  }

  Widget _stepperBtn(IconData icon, VoidCallback onTap) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: PhIcon(icon, size: 14, color: AppColors.turquoise),
        ),
      );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

class _HomeTab extends StatelessWidget {
  const _HomeTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final products = store.filteredProducts;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Search bar (tappable, opens the search tab)
        Material(
          color: AppColors.offWhite,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            key: const Key('home-search'),
            borderRadius: BorderRadius.circular(16),
            onTap: () => store.setCustomerTab(CustomerTab.search),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.borderLight)),
              child: const Row(
                children: [
                  PhIcon(LucideIcons.search, size: 16, color: AppColors.turquoise),
                  SizedBox(width: 8),
                  Expanded(child: Text('ابحث عن منتجات بادهاوس...', style: TextStyle(fontSize: 12, color: AppColors.textTertiary))),
                  PhIcon(LucideIcons.bot, size: 16, color: AppColors.turquoise),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        // Hero banner
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              colors: [AppColors.turquoise, AppColors.turquoiseDark],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                child: const Text('متجر بادهاوس الرسمي 🇵🇸', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 10),
              const Text(
                'ملحقات الآيباد الأكثر طلباً في فلسطين',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, height: 1.3),
              ),
              const SizedBox(height: 6),
              const Text(
                'توصيل سريع لكافة المدن • دفع عند الاستلام • ضمان سنة كاملة',
                style: TextStyle(color: Colors.white, fontSize: 11, height: 1.5),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () => store.setCustomerTab(CustomerTab.categories),
                style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.turquoise),
                icon: const PhIcon(LucideIcons.arrowRight, size: 14, color: AppColors.turquoise),
                label: const Text('تصفح الأقسام الـ 6', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Category chips
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('الأقسام المعتمدة', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            TextButton(onPressed: () => store.setCustomerTab(CustomerTab.categories), child: const Text('عرض الكل')),
          ],
        ),
        CategoryChips(selected: store.selectedCategory, onSelect: (id) => store.setCategory(id)),
        const SizedBox(height: 16),
        // Verified iPad model compatibility selector (models from the backend).
        if (store.ipadModels.isNotEmpty) ...[
          const Row(
            children: [
              PhIcon(LucideIcons.tablet, size: 15, color: AppColors.turquoise),
              SizedBox(width: 6),
              Text('تصفية حسب موديل الآيباد', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 8),
          _IpadModelSelector(store: store),
          const SizedBox(height: 16),
        ],
        // Section header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('قائمة المنتجات (${products.length})', key: const Key('product-count'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const Text('الأسعار بالشيكل (₪)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
        const SizedBox(height: 10),
        // Product grid: 2 columns on mobile
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final columns = width >= 1400 ? 4 : width >= 1000 ? 3 : width >= 500 ? 2 : 2;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: products.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.72,
              ),
              itemBuilder: (context, index) => ProductCard(store: store, product: products[index]),
            );
          },
        ),
      ],
    );
  }
}

// ─── iPad Model Selector ────────────────────────────────────────────────────

/// Customer-facing iPad model filter. Models come from `GET /products/ipad-models`
/// and filtering is delegated to the backend via `GET /products?compatibility=`.
class _IpadModelSelector extends StatelessWidget {
  const _IpadModelSelector({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      child: Row(
        children: [
          _chip(null, 'كل الموديلات'),
          for (final model in store.ipadModels) _chip(model, model),
        ],
      ),
    );
  }

  Widget _chip(String? model, String label) {
    final active = store.selectedIpadModel == model;
    final color = active ? AppColors.turquoise : AppColors.textSecondary;
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: Material(
        color: active ? AppColors.turquoise.withValues(alpha: 0.1) : AppColors.offWhite,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: active ? null : () => store.selectIpadModel(model),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: active ? AppColors.turquoise.withValues(alpha: 0.35) : AppColors.borderLight),
            ),
            child: Text(label,
                style: TextStyle(
                    fontSize: 12, fontWeight: active ? FontWeight.w700 : FontWeight.w600, color: color)),
          ),
        ),
      ),
    );
  }
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

class _CategoriesTab extends StatefulWidget {
  const _CategoriesTab({required this.store});
  final PadhouseController store;

  @override
  State<_CategoriesTab> createState() => _CategoriesTabState();
}

class _CategoriesTabState extends State<_CategoriesTab> {
  String? _activeCategoryId;

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final cats = officialCategories.where((c) => c.id != 'all').toList();

    if (_activeCategoryId != null) {
      final cat = cats.firstWhere((c) => c.id == _activeCategoryId, orElse: () => cats.first);
      final catProducts = store.products.where((p) => p.categories.contains(_activeCategoryId)).toList();
      return Column(
        children: [
          // Sub-header with back
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderLight))),
            child: Row(
              children: [
                InkWell(
                  onTap: () => setState(() => _activeCategoryId = null),
                  child: const Row(
                    children: [
                      PhIcon(LucideIcons.arrowRight, size: 16, color: AppColors.navy),
                      SizedBox(width: 4),
                      Text('رجوع', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.navy)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                PhIcon(categoryIcon(cat.id), size: 18, color: AppColors.turquoise),
                const SizedBox(width: 6),
                Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.turquoise.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text('${catProducts.length} منتج', style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          Expanded(
            child: catProducts.isEmpty
                ? const EmptyState(icon: LucideIcons.package, title: 'لا توجد منتجات', subtitle: 'لا توجد منتجات في هذا القسم حالياً')
                : GridView.builder(
                    padding: const EdgeInsets.all(14),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: catProducts.length,
                    itemBuilder: (context, index) => ProductCard(store: store, product: catProducts[index]),
                  ),
          ),
        ],
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(14),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: cats.length,
      itemBuilder: (context, index) {
        final cat = cats[index];
        final count = store.products.where((p) => p.categories.contains(cat.id)).length;
        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: () => setState(() => _activeCategoryId = cat.id),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.turquoise.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.2)),
                    ),
                    child: PhIcon(categoryIcon(cat.id), color: AppColors.turquoise, size: 24),
                  ),
                  const SizedBox(height: 10),
                  Text(cat.name, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.turquoise.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
                    child: Text('$count منتج', style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// ─── AI Tab ───────────────────────────────────────────────────────────────────

class _AiTab extends StatefulWidget {
  const _AiTab({required this.store});
  final PadhouseController store;

  @override
  State<_AiTab> createState() => _AiTabState();
}

class _AiTabState extends State<_AiTab> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  static const _welcomeMessage = 'مرحباً! أنا مساعد بادهاوس الذكي للتسوق 🛍️ اسألني عن أي منتج، توافقه مع جهازك، أو أفضل الصفقات المتاحة';
  static const _suggestions = ['قلم آيباد', 'كيبورد مع تاتش باد', 'شاشة PaperFeel', 'الشواحن'];

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _send([String? text]) {
    final q = text ?? _controller.text;
    if (q.trim().isEmpty) return;
    _controller.clear();
    widget.store.sendCustomerAi(q);
    Future.delayed(const Duration(milliseconds: 200), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 200,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [AppColors.turquoise, AppColors.turquoiseDark]),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                child: const PhIcon(LucideIcons.bot, size: 20, color: Colors.white),
              ),
              const SizedBox(width: 10),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('المساعد الذكي', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                  Text('مساعد بادهاوس للتسوق', style: TextStyle(color: Colors.white, fontSize: 11)),
                ],
              ),
              const Spacer(),
              if (store.isAiThinking)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                ),
            ],
          ),
        ),
        // Messages
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(14),
            itemCount: 1 + store.aiChat.length,
            itemBuilder: (context, index) {
              if (index == 0) {
                // Welcome message
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: AppColors.turquoise, borderRadius: BorderRadius.circular(10)),
                        child: const PhIcon(LucideIcons.bot, size: 16, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(4),
                              topRight: Radius.circular(16),
                              bottomLeft: Radius.circular(16),
                              bottomRight: Radius.circular(16),
                            ),
                            border: Border.all(color: AppColors.borderLight),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
                          ),
                          child: const Text(_welcomeMessage, style: TextStyle(fontSize: 13, height: 1.5, color: AppColors.navy)),
                        ),
                      ),
                    ],
                  ),
                );
              }
              final msg = store.aiChat[index - 1];
              final isUser = msg.sender == 'user';
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!isUser) ...[
                      Container(
                        width: 30,
                        height: 30,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: AppColors.turquoise, borderRadius: BorderRadius.circular(10)),
                        child: const PhIcon(LucideIcons.bot, size: 16, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isUser ? AppColors.turquoise : Colors.white,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(isUser ? 16 : 4),
                            topRight: Radius.circular(isUser ? 4 : 16),
                            bottomLeft: const Radius.circular(16),
                            bottomRight: const Radius.circular(16),
                          ),
                          border: isUser ? null : Border.all(color: AppColors.borderLight),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
                        ),
                        child: Text(
                          msg.text,
                          style: TextStyle(fontSize: 13, height: 1.5, color: isUser ? Colors.white : AppColors.navy),
                        ),
                      ),
                    ),
                    if (isUser) const SizedBox(width: 8),
                  ],
                ),
              );
            },
          ),
        ),
        // AI thinking indicator
        if (store.isAiThinking)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: AppColors.turquoise, borderRadius: BorderRadius.circular(10)),
                  child: const PhIcon(LucideIcons.bot, size: 16, color: Colors.white),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (int i = 0; i < 3; i++) ...[
                        if (i > 0) const SizedBox(width: 4),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(color: AppColors.turquoise, shape: BoxShape.circle),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        // Suggestion chips
        if (store.aiChat.length <= 1)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final chip in _suggestions) ...[
                    InkWell(
                      onTap: () => _send(chip),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.turquoise.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.3)),
                        ),
                        child: Text(chip, style: const TextStyle(fontSize: 12, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
            ),
          ),
        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.borderLight)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.offWhite,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: TextField(
                    controller: _controller,
                    decoration: bareInput('اكتب سؤالك هنا...'),
                    onSubmitted: _send,
                    textInputAction: TextInputAction.send,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () => _send(),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: store.isAiThinking ? AppColors.textTertiary : AppColors.turquoise,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const PhIcon(LucideIcons.send, size: 18, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Wishlist Tab ─────────────────────────────────────────────────────────────

class _WishlistTab extends StatelessWidget {
  const _WishlistTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final wishlistProducts = store.products.where((p) => store.wishlistIds.contains(p.id)).toList();

    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
          child: Row(
            children: [
              const PhIcon(LucideIcons.heart, size: 18, color: AppColors.turquoise),
              const SizedBox(width: 8),
              const Text('قائمة المفضلة', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const Spacer(),
              if (wishlistProducts.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.turquoise.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Text('${wishlistProducts.length} منتج', style: const TextStyle(fontSize: 12, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        ),
        Expanded(
          child: wishlistProducts.isEmpty
              ? EmptyState(
                  icon: LucideIcons.heart,
                  title: 'قائمة المفضلة فارغة',
                  subtitle: 'أضف المنتجات التي تعجبك لمتابعتها والشراء لاحقاً',
                  ctaLabel: 'تصفح المنتجات',
                  onCta: () => store.setCustomerTab(CustomerTab.home),
                )
              : GridView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 0.72,
                  ),
                  itemCount: wishlistProducts.length,
                  itemBuilder: (context, index) => ProductCard(store: store, product: wishlistProducts[index]),
                ),
        ),
      ],
    );
  }
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final current = store.user;
    final initial = (current?.name.isNotEmpty ?? false) ? current!.name.characters.first : 'م';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SoftCard(
          color: AppColors.offWhite,
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.turquoise,
                child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(current?.name ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    Text(current?.email ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.turquoise.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        store.isSuperAdmin ? 'مدير عام' : current?.role == 'guest' ? 'زائر' : 'مشتري موثق',
                        style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(onPressed: store.logout, icon: const PhIcon(LucideIcons.logOut, size: 18, color: AppColors.error)),
            ],
          ),
        ),
        if (store.isSuperAdmin) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(colors: [AppColors.navy, Color(0xFF1E3A5F)]),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    PhIcon(LucideIcons.shieldCheck, size: 18, color: AppColors.turquoise),
                    SizedBox(width: 8),
                    Expanded(child: Text('لوحة تحكم نظام الإدارة (Admin OS)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12))),
                  ],
                ),
                const SizedBox(height: 8),
                const Text('أنت مسجل كمدير عام للنظام. يمكنك التحكم بالمخزون للـ 21 منتجاً، تحديث حالات الشحن، ورصد أسعار المنافسين.', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.5)),
                const SizedBox(height: 12),
                PrimaryButton(
                  keyId: const Key('enter-admin'),
                  label: 'الدخول للوحة الإدارة الفورية',
                  icon: LucideIcons.barChart3,
                  onPressed: store.enterAdmin,
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        _menuTile(LucideIcons.package, 'طلباتي (${store.orders.length})', () => store.setStack(CustomerStack.orders)),
        _menuTile(LucideIcons.mapPin, 'عناويني', () => store.setStack(CustomerStack.addresses)),
        _menuTile(LucideIcons.bell, 'الإشعارات', () => store.setStack(CustomerStack.notifications)),
        _menuTile(LucideIcons.settings, 'الإعدادات', () => store.setStack(CustomerStack.settings)),
        _menuTile(LucideIcons.messageSquare, 'خدمة العملاء', () => store.setStack(CustomerStack.support)),
        _menuTile(LucideIcons.logOut, 'تسجيل الخروج', store.logout, danger: true),
      ],
    );
  }

  Widget _menuTile(IconData icon, String label, VoidCallback onTap, {bool danger = false}) {
    final color = danger ? AppColors.error : AppColors.turquoise;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SoftCard(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: PhIcon(icon, size: 17, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: danger ? AppColors.error : AppColors.navy))),
            PhIcon(LucideIcons.chevronLeft, size: 16, color: danger ? AppColors.error : AppColors.textTertiary),
          ],
        ),
      ),
    );
  }
}
