import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../data/catalog.dart';
import '../state/padhouse_controller.dart';
import 'widgets.dart';

class CustomerStackBody extends StatelessWidget {
  const CustomerStackBody({super.key, required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    switch (store.customerStack) {
      case CustomerStack.productDetails:
        return ProductDetails(store: store, product: store.selectedProduct);
      case CustomerStack.checkout:
        return CheckoutView(store: store);
      case CustomerStack.orderConfirmation:
        return _Confirmation(store: store);
      case CustomerStack.tracking:
        return _Tracking(store: store);
      case CustomerStack.orders:
        return _Orders(store: store);
      case CustomerStack.wishlist:
        return _Wishlist(store: store);
      case CustomerStack.support:
        return const _Support();
      case CustomerStack.notifications:
        return const _Notifications();
      case null:
        return const SizedBox.shrink();
    }
  }
}

class ProductDetails extends StatefulWidget {
  const ProductDetails({super.key, required this.store, required this.product});
  final PadhouseController store;
  final Product product;

  @override
  State<ProductDetails> createState() => _ProductDetailsState();
}

class _ProductDetailsState extends State<ProductDetails> {
  late String color = widget.product.colors.first;
  int qty = 1;

  @override
  void didUpdateWidget(covariant ProductDetails oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.product.id != widget.product.id) {
      color = widget.product.colors.first;
      qty = 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        NetImage(url: product.image, height: 230, radius: 16),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: Text('التوافق: ${product.compatibility}', style: const TextStyle(fontSize: 12, color: AppColors.turquoise, fontWeight: FontWeight.w800))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: product.stock > 0 ? AppColors.successBg : AppColors.errorBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(product.stock > 0 ? 'متوفر (${product.stock})' : 'نفدت الكمية', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: product.stock > 0 ? AppColors.success : AppColors.error)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(product.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.navy)),
        const SizedBox(height: 6),
        Row(
          children: [
            Text('${product.price} ₪', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(width: 8),
            Text('${product.originalPrice} ₪', style: const TextStyle(color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
          ],
        ),
        const SizedBox(height: 12),
        const Text('اللون / المظهر', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final item in product.colors)
              ChoiceChip(
                label: Text(item),
                selected: color == item,
                selectedColor: AppColors.turquoise.withValues(alpha: 0.12),
                labelStyle: TextStyle(color: color == item ? AppColors.turquoise : AppColors.navy, fontWeight: FontWeight.w700),
                side: BorderSide(color: color == item ? AppColors.turquoise : AppColors.borderLight),
                onSelected: (_) => setState(() => color = item),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            const Text('الكمية', style: TextStyle(fontWeight: FontWeight.w800)),
            const Spacer(),
            IconButton(onPressed: qty > 1 ? () => setState(() => qty--) : null, icon: const PhIcon(LucideIcons.minus, size: 16)),
            Text('$qty', style: const TextStyle(fontWeight: FontWeight.w800)),
            IconButton(onPressed: () => setState(() => qty++), icon: const PhIcon(LucideIcons.plus, size: 16)),
          ],
        ),
        const SizedBox(height: 8),
        Text(product.description, style: const TextStyle(fontSize: 13, height: 1.6, color: AppColors.textSecondary)),
        const SizedBox(height: 16),
        PrimaryButton(
          label: product.stock > 0 ? 'إضافة إلى السلة • ${product.price * qty} ₪' : 'نفدت الكمية حالياً',
          icon: LucideIcons.shoppingBag,
          onPressed: product.stock > 0
              ? () {
                  widget.store.addToCart(product, color: color, qty: qty);
                  widget.store.setCustomerTab(CustomerTab.cart);
                }
              : null,
        ),
      ],
    );
  }
}

class CheckoutView extends StatefulWidget {
  const CheckoutView({super.key, required this.store});
  final PadhouseController store;

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  late final name = TextEditingController(text: widget.store.checkoutName);
  late final phone = TextEditingController(text: widget.store.checkoutPhone);
  late final street = TextEditingController(text: widget.store.checkoutStreet);
  late String city = widget.store.checkoutCity;
  late String payment = widget.store.checkoutPayment;

  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    street.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('تفاصيل التوصيل وعنوان الاستلام', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        const FieldLabel('الاسم الكامل للمستلم'),
        IconField(icon: LucideIcons.user, child: TextField(controller: name, decoration: bareInput('الاسم'))),
        const SizedBox(height: 10),
        const FieldLabel('رقم الهاتف (واتساب للتنسيق)'),
        IconField(icon: LucideIcons.phone, child: TextField(controller: phone, decoration: bareInput('+970'))),
        const SizedBox(height: 10),
        const FieldLabel('مدينة التوصيل'),
        IconField(
          icon: LucideIcons.mapPin,
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: city,
              isExpanded: true,
              items: [
                for (final item in palestinianCities)
                  DropdownMenuItem(value: item.name, child: Text('${item.name} (التوصيل: ${item.fee} ₪)', style: const TextStyle(fontSize: 13))),
              ],
              onChanged: (value) => setState(() => city = value ?? city),
            ),
          ),
        ),
        const SizedBox(height: 10),
        const FieldLabel('العنوان التفصيلي / أقرب معلم'),
        TextField(controller: street, decoration: const InputDecoration(hintText: 'الحي، الشارع، أقرب معلم')),
        const SizedBox(height: 12),
        const FieldLabel('طريقة الدفع'),
        _payTile('cod', 'الدفع عند الاستلام (نقدًا للطريد)', LucideIcons.truck),
        _payTile('palpay', 'محفظة بال باي / محفظتي (PalPay)', LucideIcons.creditCard),
        _payTile('bank', 'تحويل مباشر – بنك فلسطين', LucideIcons.shieldCheck),
        const SizedBox(height: 12),
        PrimaryButton(
          keyId: const Key('place-order'),
          label: 'تأكيد وإرسال الطلب • ${store.grandTotal} ₪',
          icon: LucideIcons.checkCircle2,
          onPressed: () {
            if (name.text.trim().isEmpty || phone.text.trim().isEmpty || street.text.trim().isEmpty) {
              store.showToast('يرجى إكمال بيانات التوصيل');
              return;
            }
            store.checkoutName = name.text.trim();
            store.checkoutPhone = phone.text.trim();
            store.checkoutStreet = street.text.trim();
            store.checkoutCity = city;
            store.checkoutPayment = payment;
            store.placeOrder();
          },
        ),
      ],
    );
  }

  Widget _payTile(String id, String label, IconData icon) {
    final selected = payment == id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SoftCard(
        onTap: () => setState(() => payment = id),
        child: Row(
          children: [
            PhIcon(icon, size: 16, color: selected ? AppColors.turquoise : AppColors.textTertiary),
            const SizedBox(width: 8),
            Expanded(child: Text(label, style: TextStyle(fontWeight: selected ? FontWeight.w800 : FontWeight.w600, color: selected ? AppColors.turquoise : AppColors.navy))),
            PhIcon(selected ? LucideIcons.checkCircle2 : LucideIcons.circle, size: 16, color: selected ? AppColors.turquoise : AppColors.textTertiary),
          ],
        ),
      ),
    );
  }
}

class _Confirmation extends StatelessWidget {
  const _Confirmation({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 24),
          Container(
            width: 64,
            height: 64,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(16)),
            child: const PhIcon(LucideIcons.checkCircle2, size: 32, color: AppColors.success),
          ),
          const SizedBox(height: 12),
          const Text('تم تأكيد طلبك بنجاح!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('رقم الإرسالية: #${store.lastPlacedOrder?.id ?? ''} وسيتم التواصل معك هاتفياً قبل خروج الطرد.', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary, height: 1.5)),
          const SizedBox(height: 16),
          PrimaryButton(label: 'تتبع مسار الطلب لحظياً', icon: LucideIcons.clock, onPressed: () => store.setStack(CustomerStack.tracking)),
        ],
      ),
    );
  }
}

class _Tracking extends StatelessWidget {
  const _Tracking({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    const steps = [
      ('تم استلام وتأكيد الطلب', '10:15 ص', true),
      ('قيد التجهيز في مستودع رام الله', '11:00 ص', true),
      ('مع مندوب التوصيل', 'في الطريق', false),
      ('تم التوصيل بنجاح', 'بانتظار الاستلام', false),
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SoftCard(
          color: AppColors.offWhite,
          child: Row(
            children: [
              const PhIcon(LucideIcons.truck, color: AppColors.turquoise),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('تتبع الشحنة المباشر', style: TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w800)),
                    Text(store.activeTrackingOrderId, style: const TextStyle(fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        for (final step in steps)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: PhIcon(step.$3 ? LucideIcons.checkCircle2 : LucideIcons.clock, color: step.$3 ? AppColors.turquoise : AppColors.textTertiary),
            title: Text(step.$1, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            subtitle: Text(step.$2),
          ),
      ],
    );
  }
}

class _Orders extends StatelessWidget {
  const _Orders({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('سجل الطلبات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        for (final order in store.orders)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              onTap: () {
                store.activeTrackingOrderId = order.id;
                store.setStack(CustomerStack.tracking);
              },
              child: Row(
                children: [
                  const PhIcon(LucideIcons.package, color: AppColors.turquoise),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.id, style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text('${order.date} • ${order.items.length} أصناف', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${order.total} ₪', style: const TextStyle(fontWeight: FontWeight.w900)),
                      Text(order.status, style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Wishlist extends StatelessWidget {
  const _Wishlist({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final items = store.products.where((p) => store.wishlistIds.contains(p.id)).toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('قائمة المفضلة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        if (items.isEmpty) const Text('لا توجد منتجات في المفضلة بعد.', style: TextStyle(color: AppColors.textSecondary)),
        for (final product in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              onTap: () => store.openProduct(product),
              child: Row(
                children: [
                  NetImage(url: product.image, width: 44, height: 44, radius: 10),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text('${product.price} ₪', style: const TextStyle(fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ),
                  FilledButton(
                    onPressed: product.stock > 0 ? () => store.addToCart(product) : null,
                    style: FilledButton.styleFrom(backgroundColor: AppColors.turquoise, visualDensity: VisualDensity.compact),
                    child: Text(product.stock > 0 ? 'إضافة' : 'نفدت'),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Support extends StatelessWidget {
  const _Support();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('خدمة العملاء والدعم المباشر', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        SizedBox(height: 12),
        SoftCard(
          color: Color(0x1425D366),
          child: Row(
            children: [
              PhIcon(LucideIcons.phone, color: Color(0xFF128C7E)),
              SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('محادثة واتساب فورية', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF128C7E))),
                    Text('إجابات فورية وتنسيق مع فريق رام الله', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    SizedBox(height: 4),
                    Text('+970 59 900 0000', style: TextStyle(fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              PhIcon(LucideIcons.externalLink, color: Color(0xFF128C7E)),
            ],
          ),
        ),
      ],
    );
  }
}

class _Notifications extends StatelessWidget {
  const _Notifications();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('مركز التنبيهات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        SizedBox(height: 12),
        SoftCard(
          color: Color(0x1400A896),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              PhIcon(LucideIcons.bell, color: AppColors.turquoise),
              SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('تم تحديث الكتالوج الرسمي لـ 21 منتجاً', style: TextStyle(fontWeight: FontWeight.w800)),
                    SizedBox(height: 4),
                    Text('تصفح الآن إكسسوارات الآيباد، الكيبوردات، الأقلام، والشواحن الأصلية مع خيارات الشحن السريع في فلسطين.', style: TextStyle(fontSize: 12, height: 1.5, color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class AdminBody extends StatelessWidget {
  const AdminBody({super.key, required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    switch (store.adminTab) {
      case AdminTab.overview:
        return _Overview(store: store);
      case AdminTab.products:
        return _ProductsAdmin(store: store);
      case AdminTab.inventory:
        return _Inventory(store: store);
      case AdminTab.orders:
        return _AdminOrders(store: store);
      case AdminTab.ai:
        return _AiTab(store: store);
    }
  }
}

class _Overview extends StatelessWidget {
  const _Overview({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final sales = store.orders.fold<int>(0, (sum, order) => sum + order.total);
    final stock = store.products.fold<int>(0, (sum, product) => sum + product.stock);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('لوحة المؤشرات التنفيذية', key: Key('admin-kpis'), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(999)),
              child: const Text('مباشر', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w800, fontSize: 11)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _kpi(LucideIcons.dollarSign, 'المبيعات الإجمالية', '$sales ₪', '+18.4% نمو'),
            _kpi(LucideIcons.shoppingBag, 'الطلبات المسجلة', '${store.orders.length}', 'طلب مؤكد'),
            _kpi(LucideIcons.layers, 'إجمالي المخزون', '$stock قطعة', 'وحدات متاحة'),
            _kpi(LucideIcons.package, 'المنتجات النشطة', '${store.products.length} صنفاً', 'كتالوج رسمي'),
          ],
        ),
        const SizedBox(height: 12),
        const SoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('حالة الكتالوج الرسمي', style: TextStyle(fontWeight: FontWeight.w800)),
              SizedBox(height: 8),
              Text('قلم بادهاوس (120 ₪) — 18 قطعة متوفرة'),
              Text('شاشة ملمس الورق (50 ₪) — 12 قطعة متوفرة'),
              Text('كفر كيبورد مع تاتش باد (160 ₪) — تنبيه نقص'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _kpi(IconData icon, String label, String value, String hint) {
    return SizedBox(
      width: 160,
      child: SoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PhIcon(icon, color: AppColors.turquoise, size: 16),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            Text(hint, style: const TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

class _ProductsAdmin extends StatelessWidget {
  const _ProductsAdmin({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('كتالوج المنتجات الرسمي', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  Text('المنتجات الرسمية المعتمدة', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: () => showProductEditor(context, store, null),
              style: FilledButton.styleFrom(backgroundColor: AppColors.turquoise),
              icon: const PhIcon(LucideIcons.plus, size: 14, color: Colors.white),
              label: const Text('إضافة منتج'),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (final product in store.products)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              child: Row(
                children: [
                  NetImage(url: product.image, width: 42, height: 42, radius: 10),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                        Text('المخزون: ${product.stock} قطعة • ${product.price} ₪', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => showProductEditor(context, store, product),
                    icon: const PhIcon(LucideIcons.settings, size: 14, color: AppColors.turquoise),
                    label: const Text('تعديل'),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Inventory extends StatelessWidget {
  const _Inventory({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('إدارة المخزون والتوريد', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const Text('تعديل الكميات الفورية لجميع الأصناف', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        const SizedBox(height: 10),
        for (final product in store.products)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                        Text('الحد الأدنى: ${product.minThreshold} قطع', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: product.stock <= product.minThreshold ? AppColors.errorBg : AppColors.successBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${product.stock}', style: TextStyle(fontWeight: FontWeight.w900, color: product.stock <= product.minThreshold ? AppColors.error : AppColors.success)),
                  ),
                  const SizedBox(width: 6),
                  TextButton(onPressed: () => store.adjustStock(product.id, 5), child: const Text('+5')),
                  TextButton(onPressed: () => store.adjustStock(product.id, -1), child: const Text('-1')),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _AdminOrders extends StatelessWidget {
  const _AdminOrders({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('إدارة وتجهيز الطلبات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        for (final order in store.orders)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${order.id} • ${order.customerName}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  DropdownButton<String>(
                    value: orderStatuses.contains(order.status) ? order.status : orderStatuses.first,
                    isExpanded: true,
                    items: [for (final status in orderStatuses) DropdownMenuItem(value: status, child: Text(status))],
                    onChanged: (value) {
                      if (value != null) store.updateOrderStatus(order.id, value);
                    },
                  ),
                  Text('${order.city} • ${order.items.length} أصناف • ${order.total} ₪', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _AiTab extends StatefulWidget {
  const _AiTab({required this.store});
  final PadhouseController store;

  @override
  State<_AiTab> createState() => _AiTabState();
}

class _AiTabState extends State<_AiTab> {
  final prompt = TextEditingController();

  @override
  void dispose() {
    prompt.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    const suggestions = ['فحص نواقص المخزون', 'مقارنة أسعار الكتالوج بالسوق', 'ملخص مبيعات شهر نوفمبر'];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Row(
          children: [
            PhIcon(LucideIcons.bot, color: AppColors.turquoise, size: 22),
            SizedBox(width: 8),
            Expanded(child: Text('مساعد بادهاوس لذكاء الأعمال', style: TextStyle(fontWeight: FontWeight.w800))),
          ],
        ),
        const SizedBox(height: 10),
        for (final message in store.aiChat)
          Align(
            alignment: message.sender == 'user' ? Alignment.centerLeft : Alignment.centerRight,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              constraints: const BoxConstraints(maxWidth: 280),
              decoration: BoxDecoration(
                color: message.sender == 'user' ? AppColors.turquoise : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: message.sender == 'user' ? AppColors.turquoise : AppColors.borderLight),
              ),
              child: Text(message.text, style: TextStyle(color: message.sender == 'user' ? Colors.white : AppColors.navy, fontSize: 12, height: 1.45)),
            ),
          ),
        if (store.isAiThinking)
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Text('جاري تحليل قاعدة بيانات الكتالوج الـ 21...', style: TextStyle(color: AppColors.turquoise, fontWeight: FontWeight.w700)),
          ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final item in suggestions)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: ActionChip(
                    avatar: const PhIcon(LucideIcons.sparkles, size: 14, color: AppColors.turquoise),
                    label: Text(item),
                    onPressed: () => store.sendAi(item),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: TextField(controller: prompt, decoration: const InputDecoration(hintText: 'اسأل عن مبيعات أو مخزون أي صنف...'))),
            const SizedBox(width: 8),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.turquoise),
              onPressed: () {
                store.aiPrompt = prompt.text;
                store.sendAi();
                prompt.clear();
              },
              child: const Text('إرسال'),
            ),
          ],
        ),
      ],
    );
  }
}

Future<void> showProductEditor(BuildContext context, PadhouseController store, Product? product) async {
  final name = TextEditingController(text: product?.name ?? '');
  final price = TextEditingController(text: '${product?.price ?? 50}');
  final stock = TextEditingController(text: '${product?.stock ?? 20}');
  final compatibility = TextEditingController(text: product?.compatibility ?? 'جميع أجهزة iPad');
  var category = product?.categories.first ?? 'cat_pens';
  await showDialog<void>(
    context: context,
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setLocal) {
          return AlertDialog(
            title: Text(product == null ? 'إضافة منتج جديد' : 'تعديل المنتج'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(controller: name, decoration: const InputDecoration(labelText: 'اسم المنتج')),
                  TextField(controller: price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'السعر (₪)')),
                  TextField(controller: stock, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'الكمية بالمخزون')),
                  DropdownButton<String>(
                    value: category,
                    isExpanded: true,
                    items: [
                      for (final cat in officialCategories.skip(1)) DropdownMenuItem(value: cat.id, child: Text(cat.name)),
                    ],
                    onChanged: (value) => setLocal(() => category = value ?? category),
                  ),
                  TextField(controller: compatibility, decoration: const InputDecoration(labelText: 'التوافق')),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
              FilledButton(
                onPressed: () {
                  store.editingProduct = product;
                  store.saveProduct(
                    name: name.text.trim(),
                    price: int.tryParse(price.text) ?? 0,
                    stock: int.tryParse(stock.text) ?? 0,
                    category: category,
                    compatibility: compatibility.text.trim(),
                  );
                  Navigator.pop(context);
                },
                child: const Text('حفظ'),
              ),
            ],
          );
        },
      );
    },
  );
  name.dispose();
  price.dispose();
  stock.dispose();
  compatibility.dispose();
}
