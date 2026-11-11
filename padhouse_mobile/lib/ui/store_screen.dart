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
          IconButton(
            onPressed: () => store.setStack(CustomerStack.wishlist),
            icon: Badge(
              isLabelVisible: store.wishlistIds.isNotEmpty,
              label: Text('${store.wishlistIds.length}'),
              backgroundColor: AppColors.navy,
              child: const PhIcon(LucideIcons.heart, size: 18, color: AppColors.textSecondary),
            ),
          ),
          IconButton(
            onPressed: () => store.setStack(CustomerStack.notifications),
            icon: const Badge(
              isLabelVisible: true,
              smallSize: 8,
              backgroundColor: AppColors.turquoise,
              child: PhIcon(LucideIcons.bell, size: 18, color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomerNav extends StatelessWidget {
  const _CustomerNav({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final active = store.customerStack == null ? store.customerTab : null;
    return _NavBar(
      items: [
        _NavItem('الرئيسية', LucideIcons.home, active == CustomerTab.home, () => store.setCustomerTab(CustomerTab.home), const Key('nav-home')),
        _NavItem('الأقسام', LucideIcons.layoutGrid, active == CustomerTab.categories, () => store.setCustomerTab(CustomerTab.categories), const Key('nav-categories')),
        _NavItem('البحث', LucideIcons.search, active == CustomerTab.search, () => store.setCustomerTab(CustomerTab.search), const Key('nav-search')),
        _NavItem('السلة', LucideIcons.shoppingBag, active == CustomerTab.cart, () => store.setCustomerTab(CustomerTab.cart), const Key('nav-cart'), badge: store.cartCount),
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
  const _NavItem(this.label, this.icon, this.active, this.onTap, this.keyId, {this.badge = 0, this.badgeColor = AppColors.turquoise});
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  final Key keyId;
  final int badge;
  final Color badgeColor;
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
      case CustomerTab.cart:
        return _CartTab(store: store);
      case CustomerTab.profile:
        return _ProfileTab(store: store);
    }
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final products = store.filteredProducts;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
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
                  Expanded(child: Text('ابحث عن قلم بادهاوس، كفر كيبورد، شواحن يسيدو...', style: TextStyle(fontSize: 12, color: AppColors.textTertiary))),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(colors: [AppColors.turquoise, AppColors.turquoiseDark]),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                child: const Text('متجر بادهاوس الرسمي 🇵🇸', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 8),
              const Text('ملحقات الآيباد المعتمدة والمختبرة', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              const Text('21 منتجاً أساسياً لتعزيز إنتاجيتك مع توصيل لكافة المدن والدفع عند الاستلام', style: TextStyle(color: Colors.white, fontSize: 12, height: 1.4)),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => store.setCustomerTab(CustomerTab.categories),
                style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.turquoise),
                icon: const PhIcon(LucideIcons.arrowRight, size: 14, color: AppColors.turquoise),
                label: const Text('تصفح الأقسام الـ 6', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('الأقسام المعتمدة', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            TextButton(onPressed: () => store.setCustomerTab(CustomerTab.categories), child: const Text('عرض الكل')),
          ],
        ),
        CategoryChips(selected: store.selectedCategory, onSelect: (id) => store.setCategory(id)),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('قائمة المنتجات (${products.length})', key: const Key('product-count'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const Text('الأسعار بالشيكل (₪)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final columns = width >= 1400 ? 4 : width >= 1000 ? 3 : width >= 600 ? 2 : 1;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: products.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: columns == 1 ? 3.05 : 1.8,
              ),
              itemBuilder: (context, index) => _ProductCard(store: store, product: products[index]),
            );
          },
        ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.store, required this.product});
  final PadhouseController store;
  final Product product;

  @override
  Widget build(BuildContext context) {
    final wished = store.wishlistIds.contains(product.id);
    return SoftCard(
      onTap: () => store.openProduct(product),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          NetImage(url: product.image, width: 78, height: 78),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(product.compatibility, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: AppColors.turquoise, fontWeight: FontWeight.w700))),
                    InkWell(
                      onTap: () => store.toggleWishlist(product.id),
                      child: PhIcon(LucideIcons.heart, size: 16, color: wished ? const Color(0xFFF43F5E) : AppColors.textTertiary),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.navy)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const PhIcon(LucideIcons.star, size: 12, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 4),
                    Text('${product.rating} (${product.reviewsCount})', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    const SizedBox(width: 6),
                    Text(product.stock > 0 ? 'متوفر (${product.stock})' : 'نفدت الكمية', style: TextStyle(fontSize: 11, color: product.stock > 0 ? AppColors.success : AppColors.error, fontWeight: FontWeight.w700)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text('${product.price} ₪', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.navy)),
                    const SizedBox(width: 6),
                    Text('${product.originalPrice} ₪', style: const TextStyle(fontSize: 11, color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
                    const Spacer(),
                    FilledButton(
                      onPressed: product.stock > 0 ? () => store.addToCart(product) : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.turquoise,
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                      child: Text(product.stock > 0 ? 'إضافة' : 'نفدت', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoriesTab extends StatelessWidget {
  const _CategoriesTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final cats = officialCategories.skip(1);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('الأقسام الرسمية لمتجر بادهاوس (6 أقسام)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        const Text('اختر الفئة للاطلاع على المنتجات المعتمدة فوراً', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        const SizedBox(height: 12),
        for (final cat in cats) ...[
          SoftCard(
            onTap: () => store.setCategory(cat.id, goHome: true),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.turquoise.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.2)),
                  ),
                  child: PhIcon(categoryIcon(cat.id), color: AppColors.turquoise, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      Text('${store.products.where((p) => p.categories.contains(cat.id)).length} منتجات معتمدة', style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                const PhIcon(LucideIcons.chevronLeft, size: 16, color: AppColors.textTertiary),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _SearchTab extends StatefulWidget {
  const _SearchTab({required this.store});
  final PadhouseController store;

  @override
  State<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<_SearchTab> {
  late final TextEditingController _query = TextEditingController(text: widget.store.searchQuery);

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final results = store.filteredProducts;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: AppColors.offWhite,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.turquoise),
          ),
          child: Row(
            children: [
              const PhIcon(LucideIcons.search, size: 16, color: AppColors.turquoise),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  key: const Key('search-field'),
                  autofocus: true,
                  controller: _query,
                  decoration: bareInput('ابحث بالاسم، الكود، أو موديل الجهاز...'),
                  onChanged: store.setSearch,
                ),
              ),
              if (store.searchQuery.isNotEmpty)
                IconButton(
                  onPressed: () {
                    _query.clear();
                    store.setSearch('');
                  },
                  icon: const PhIcon(LucideIcons.x, size: 16, color: AppColors.textTertiary),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        CategoryChips(selected: store.selectedCategory, onSelect: (id) => store.setCategory(id)),
        const SizedBox(height: 12),
        Text('تم العثور على ${results.length} منتجات', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.textSecondary)),
        const SizedBox(height: 8),
        for (final product in results)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              onTap: () => store.openProduct(product),
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  NetImage(url: product.image, width: 44, height: 44, radius: 10),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                        Text(product.compatibility, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: AppColors.turquoise)),
                      ],
                    ),
                  ),
                  Text('${product.price} ₪', style: const TextStyle(fontWeight: FontWeight.w900)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _CartTab extends StatelessWidget {
  const _CartTab({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('سلة المشتريات (${store.cart.length} أصناف)', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        if (store.cart.isEmpty)
          SoftCard(
            color: AppColors.offWhite,
            child: Column(
              children: [
                const PhIcon(LucideIcons.shoppingBag, size: 36, color: AppColors.textTertiary),
                const SizedBox(height: 8),
                const Text('سلة التسوق فارغة حالياً', style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
                FilledButton(onPressed: () => store.setCustomerTab(CustomerTab.home), child: const Text('تصفح المنتجات')),
              ],
            ),
          )
        else ...[
          for (final line in store.cart)
            if (store.productById(line.productId) != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _CartRow(store: store, line: line, product: store.productById(line.productId)!),
              ),
          const SizedBox(height: 8),
          SoftCard(
            color: AppColors.offWhite,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('هل لديك كود خصم؟ (جرب PALESTINE)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        key: const Key('coupon-field'),
                        decoration: const InputDecoration(hintText: 'PALESTINE'),
                        onChanged: (value) => store.couponCode = value,
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      key: const Key('apply-coupon'),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
                      onPressed: store.applyCoupon,
                      child: const Text('تطبيق'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SoftCard(
            child: Column(
              children: [
                _moneyRow('المجموع الفرعي', '${store.subtotal} ₪'),
                _moneyRow('رسوم التوصيل (${store.checkoutCity})', '${store.deliveryFee} ₪'),
                if (store.couponApplied) _moneyRow('خصم الكوبون', '- ${store.discountAmount} ₪', color: AppColors.success),
                const Divider(),
                _moneyRow('المجموع الكلي', '${store.grandTotal} ₪', color: AppColors.turquoise, bold: true),
              ],
            ),
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            keyId: const Key('go-checkout'),
            label: 'متابعة إلى إتمام الشراء (${store.grandTotal} ₪)',
            icon: LucideIcons.shoppingBag,
            onPressed: () => store.setStack(CustomerStack.checkout),
          ),
        ],
      ],
    );
  }

  Widget _moneyRow(String label, String value, {Color? color, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: color ?? AppColors.textSecondary, fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
          Text(value, style: TextStyle(fontSize: bold ? 15 : 12, color: color ?? AppColors.navy, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _CartRow extends StatelessWidget {
  const _CartRow({required this.store, required this.line, required this.product});
  final PadhouseController store;
  final CartLine line;
  final Product product;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      child: Row(
        children: [
          NetImage(url: product.image, width: 56, height: 56),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                Text(line.selectedColor, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                Text('${product.price} ₪', style: const TextStyle(fontWeight: FontWeight.w900)),
              ],
            ),
          ),
          Column(
            children: [
              Row(
                children: [
                  _qtyBtn(LucideIcons.minus, () => store.updateCartQty(line.productId, line.selectedColor, -1)),
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: Text('${line.quantity}', style: const TextStyle(fontWeight: FontWeight.w800))),
                  _qtyBtn(LucideIcons.plus, () => store.updateCartQty(line.productId, line.selectedColor, 1)),
                ],
              ),
              IconButton(
                onPressed: () => store.removeFromCart(line.productId, line.selectedColor),
                icon: const PhIcon(LucideIcons.trash2, size: 16, color: AppColors.error),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: AppColors.offWhite, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.borderLight)),
        child: PhIcon(icon, size: 12, color: AppColors.navy),
      ),
    );
  }
}

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
              CircleAvatar(radius: 24, backgroundColor: AppColors.turquoise, child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(current?.name ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    Text(current?.email ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    Text(store.isSuperAdmin ? 'حساب المدير العام للمتجر' : current?.role == 'guest' ? 'تصفح كزائر' : 'حساب مشتري موثق', style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w800)),
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
        const SizedBox(height: 12),
        _menuTile(LucideIcons.package, 'طلباتي السابقة (${store.orders.length})', () => store.setStack(CustomerStack.orders)),
        _menuTile(LucideIcons.heart, 'قائمة المفضلة (${store.wishlistIds.length})', () => store.setStack(CustomerStack.wishlist)),
        _menuTile(LucideIcons.messageSquare, 'خدمة العملاء والواتساب المباشر', () => store.setStack(CustomerStack.support)),
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
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: PhIcon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: danger ? AppColors.error : AppColors.navy))),
            PhIcon(LucideIcons.chevronLeft, size: 16, color: danger ? AppColors.error : AppColors.textTertiary),
          ],
        ),
      ),
    );
  }
}
