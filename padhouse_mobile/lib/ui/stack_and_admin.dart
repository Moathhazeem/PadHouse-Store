import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../data/catalog.dart';
import '../state/padhouse_controller.dart';
import 'widgets.dart';

// ─── Customer Stack Router ─────────────────────────────────────────────────

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
      case CustomerStack.addresses:
        return _Addresses(store: store);
      case CustomerStack.settings:
        return _Settings(store: store);
      case null:
        return const SizedBox.shrink();
    }
  }
}

// ─── Product Details ───────────────────────────────────────────────────────

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
  int _galleryPage = 0;
  late PageController _pageCtrl;

  @override
  void initState() {
    super.initState();
    _pageCtrl = PageController();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant ProductDetails oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.product.id != widget.product.id) {
      color = widget.product.colors.first;
      qty = 1;
      _galleryPage = 0;
      _pageCtrl.jumpToPage(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final gallery = product.galleryImages;
    final isWishlisted = widget.store.wishlistIds.contains(product.id);
    final discount = product.originalPrice > 0
        ? ((1 - product.price / product.originalPrice) * 100).round()
        : 0;

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // ── Image Gallery ──────────────────────────────────────────
        Stack(
          children: [
            SizedBox(
              height: 260,
              child: PageView.builder(
                controller: _pageCtrl,
                itemCount: gallery.length,
                onPageChanged: (i) => setState(() => _galleryPage = i),
                itemBuilder: (_, i) => NetImage(url: gallery[i], height: 260, radius: 0),
              ),
            ),
            // Wishlist toggle
            Positioned(
              top: 12,
              right: 12,
              child: GestureDetector(
                onTap: () => setState(() => widget.store.toggleWishlist(product.id)),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 6)],
                  ),
                  child: PhIcon(
                    isWishlisted ? LucideIcons.heartCrack : LucideIcons.heart,
                    size: 18,
                    color: isWishlisted ? Colors.red : AppColors.navy,
                  ),
                ),
              ),
            ),
            // Dots indicator
            if (gallery.length > 1)
              Positioned(
                bottom: 10,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(gallery.length, (i) {
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: _galleryPage == i ? 18 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _galleryPage == i ? AppColors.turquoise : Colors.white.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    );
                  }),
                ),
              ),
          ],
        ),

        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Badges row ──────────────────────────────────────────
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.turquoise.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.3)),
                    ),
                    child: Text('متوافق: ${product.compatibility}',
                        style: const TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: product.stock > 0 ? AppColors.successBg : AppColors.errorBg,
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      product.stock > 0 ? 'متوفر (${product.stock})' : 'نفدت الكمية',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: product.stock > 0 ? AppColors.success : AppColors.error),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // ── Product name ───────────────────────────────────────
              Text(product.name,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.navy)),
              const SizedBox(height: 8),

              // ── Price row ──────────────────────────────────────────
              Row(
                children: [
                  Text('${product.price} ₪',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.navy)),
                  const SizedBox(width: 8),
                  if (product.originalPrice > product.price)
                    Text('${product.originalPrice} ₪',
                        style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textTertiary,
                            decoration: TextDecoration.lineThrough)),
                  const SizedBox(width: 8),
                  if (discount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                          color: AppColors.error, borderRadius: BorderRadius.circular(99)),
                      child: Text('-$discount%',
                          style: const TextStyle(
                              color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                    ),
                ],
              ),
              const SizedBox(height: 8),

              // ── Rating row ─────────────────────────────────────────
              Row(
                children: [
                  const PhIcon(LucideIcons.star, size: 14, color: Color(0xFFFFB800)),
                  const SizedBox(width: 4),
                  Text('${product.rating}',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  const SizedBox(width: 4),
                  Text('(${product.reviewsCount} تقييم)',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ],
              ),
              const SizedBox(height: 14),

              // ── Colors ────────────────────────────────────────────
              const Text('اللون / المظهر', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  for (final item in product.colors)
                    ChoiceChip(
                      label: Text(item),
                      selected: color == item,
                      selectedColor: AppColors.turquoise.withValues(alpha: 0.12),
                      labelStyle: TextStyle(
                          color: color == item ? AppColors.turquoise : AppColors.navy,
                          fontWeight: FontWeight.w700),
                      side: BorderSide(
                          color: color == item ? AppColors.turquoise : AppColors.borderLight),
                      onSelected: (_) => setState(() => color = item),
                    ),
                ],
              ),
              const SizedBox(height: 14),

              // ── Quantity stepper ──────────────────────────────────
              Row(
                children: [
                  const Text('الكمية', style: TextStyle(fontWeight: FontWeight.w800)),
                  const Spacer(),
                  _QtyButton(
                    icon: LucideIcons.minus,
                    enabled: qty > 1,
                    onTap: () => setState(() => qty--),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('$qty',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                  ),
                  _QtyButton(
                    icon: LucideIcons.plus,
                    enabled: true,
                    onTap: () => setState(() => qty++),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── Description ───────────────────────────────────────
              const Text('وصف المنتج',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.navy)),
              const SizedBox(height: 6),
              Text(product.description,
                  style: const TextStyle(fontSize: 13, height: 1.7, color: AppColors.textSecondary)),
              const SizedBox(height: 20),

              // ── CTA Buttons ───────────────────────────────────────
              PrimaryButton(
                label: product.stock > 0
                    ? 'إضافة إلى السلة • ${product.price * qty} ₪'
                    : 'نفدت الكمية حالياً',
                icon: LucideIcons.shoppingBag,
                onPressed: product.stock > 0
                    ? () {
                        widget.store.addToCart(product, color: color, qty: qty);
                        widget.store.setStack(CustomerStack.checkout);
                      }
                    : null,
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () {
                  widget.store.toggleWishlist(product.id);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(widget.store.wishlistIds.contains(product.id)
                          ? 'تمت الإضافة للمفضلة'
                          : 'تمت الإزالة من المفضلة'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                  setState(() {});
                },
                icon: PhIcon(
                  isWishlisted ? LucideIcons.heartCrack : LucideIcons.heart,
                  size: 16,
                  color: AppColors.turquoise,
                ),
                label: Text(isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.turquoise,
                  side: const BorderSide(color: AppColors.turquoise),
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.enabled, required this.onTap});
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: enabled ? AppColors.turquoise.withValues(alpha: 0.1) : AppColors.offWhite,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: enabled ? AppColors.turquoise : AppColors.borderLight),
        ),
        child: Center(
          child: PhIcon(icon, size: 16, color: enabled ? AppColors.turquoise : AppColors.textTertiary),
        ),
      ),
    );
  }
}

// ─── Checkout View ─────────────────────────────────────────────────────────

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
  void initState() {
    super.initState();
    // Clear any stale validation error from a previous attempt.
    widget.store.lastOrderError = null;
    // Pull the real delivery fee for the initially selected city.
    widget.store.quoteDelivery(city);
  }

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
    final cartProducts = store.cart
        .map((line) => (
              line: line,
              product: store.products.where((p) => p.id == line.productId).firstOrNull,
            ))
        .where((e) => e.product != null)
        .toList();

    final subtotal = store.subtotal;
    final delivery = store.deliveryFee;
    final discount = store.discountAmount;
    final total = store.grandTotal;

    // Guard the dropdown against a selected city missing from the loaded zones.
    final cities = store.deliveryCities;
    final cityValue = cities.any((c) => c.name == city)
        ? city
        : (cities.isNotEmpty ? cities.first.name : city);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Header ─────────────────────────────────────────────────
        const Text('إتمام الطلب',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
        const SizedBox(height: 14),

        // ── Cart Summary ───────────────────────────────────────────
        const Text('ملخص السلة', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 8),
        for (final entry in cartProducts)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              children: [
                NetImage(url: entry.product!.image, width: 44, height: 44, radius: 8),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(entry.product!.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                      Text('${entry.line.quantity} × ${entry.product!.price} ₪ · ${entry.line.selectedColor}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                Text('${entry.product!.price * entry.line.quantity} ₪',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
              ],
            ),
          ),
        const Divider(height: 20),

        // ── Delivery Form ──────────────────────────────────────────
        const Text('بيانات التوصيل', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 10),
        const FieldLabel('الاسم الكامل للمستلم'),
        IconField(icon: LucideIcons.user, child: TextField(controller: name, decoration: bareInput('الاسم الكامل'))),
        const SizedBox(height: 10),
        const FieldLabel('رقم الهاتف (واتساب للتنسيق)'),
        IconField(icon: LucideIcons.phone, child: TextField(controller: phone, keyboardType: TextInputType.phone, decoration: bareInput('+970'))),
        const SizedBox(height: 10),
        const FieldLabel('مدينة التوصيل'),
        IconField(
          icon: LucideIcons.mapPin,
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: cityValue,
              isExpanded: true,
              items: [
                for (final item in cities)
                  DropdownMenuItem(
                      value: item.name,
                      child: Text('${item.name} (التوصيل: ${item.fee} ₪)',
                          style: const TextStyle(fontSize: 13))),
              ],
              onChanged: (value) {
                final next = value ?? cityValue;
                setState(() => city = next);
                // Ask the shared backend for the verified fee of this city.
                store.quoteDelivery(next);
              },
            ),
          ),
        ),
        const SizedBox(height: 10),
        const FieldLabel('العنوان التفصيلي / أقرب معلم'),
        TextField(
            controller: street,
            decoration: const InputDecoration(hintText: 'الحي، الشارع، أقرب معلم')),
        const SizedBox(height: 14),

        // ── Payment Method ─────────────────────────────────────────
        const Text('طريقة الدفع', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 8),
        // Render the real, enabled methods from `GET /delivery/payment-methods`.
        for (final method in _paymentOptions(store))
          _payTile(method.$1, method.$2, method.$3),
        const SizedBox(height: 14),

        // ── Order Summary ──────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.offWhite,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              _summaryRow('المجموع الفرعي', '$subtotal ₪'),
              _summaryRow('رسوم التوصيل', '$delivery ₪'),
              if (discount > 0) _summaryRow('الخصم', '-$discount ₪', color: AppColors.success),
              const Divider(height: 16),
              _summaryRow('الإجمالي', '$total ₪', bold: true, big: true),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // ── Validation error from placeOrder() ─────────────────────
        if (store.lastOrderError != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.errorBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.35)),
            ),
            child: Row(
              children: [
                const PhIcon(LucideIcons.alertCircle, size: 16, color: AppColors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(store.lastOrderError!,
                      style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // ── Confirm Button ─────────────────────────────────────────
        PrimaryButton(
          keyId: const Key('place-order'),
          label: 'تأكيد وإرسال الطلب • $total ₪',
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
            setState(() {});
          },
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  /// Enabled payment methods from the backend, or a safe local fallback.
  List<(String, String, IconData)> _paymentOptions(PadhouseController store) {
    if (store.paymentMethods.isEmpty) {
      return const [
        ('CASH_ON_DELIVERY', 'الدفع عند الاستلام (نقداً)', LucideIcons.truck),
        ('PALPAY', 'بال باي / محفظتي', LucideIcons.creditCard),
        ('BANK_TRANSFER', 'تحويل – بنك فلسطين', LucideIcons.shieldCheck),
      ];
    }
    return [
      for (final m in store.paymentMethods)
        (m.id, m.nameAr.isNotEmpty ? m.nameAr : m.nameEn, _paymentIcon(m.id)),
    ];
  }

  IconData _paymentIcon(String id) {
    switch (id) {
      case 'CASH_ON_DELIVERY':
        return LucideIcons.truck;
      case 'BANK_TRANSFER':
        return LucideIcons.shieldCheck;
      default:
        return LucideIcons.creditCard;
    }
  }

  Widget _payTile(String id, String label, IconData icon) {
    final selected = payment == id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SoftCard(
        onTap: () => setState(() => payment = id),
        child: Row(
          children: [
            PhIcon(icon, size: 18, color: selected ? AppColors.turquoise : AppColors.textTertiary),
            const SizedBox(width: 10),
            Expanded(
                child: Text(label,
                    style: TextStyle(
                        fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                        color: selected ? AppColors.turquoise : AppColors.navy))),
            PhIcon(selected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                size: 18, color: selected ? AppColors.turquoise : AppColors.textTertiary),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value,
      {Color? color, bool bold = false, bool big = false}) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
      fontSize: big ? 16 : 13,
      color: color ?? AppColors.navy,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

// ─── Confirmation ──────────────────────────────────────────────────────────

class _Confirmation extends StatefulWidget {
  const _Confirmation({required this.store});
  final PadhouseController store;

  @override
  State<_Confirmation> createState() => _ConfirmationState();
}

class _ConfirmationState extends State<_Confirmation>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _scale = CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          ScaleTransition(
            scale: _scale,
            child: Container(
              width: 80,
              height: 80,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: AppColors.successBg, borderRadius: BorderRadius.circular(20)),
              child: const PhIcon(LucideIcons.checkCircle2, size: 40, color: AppColors.success),
            ),
          ),
          const SizedBox(height: 16),
          const Text('تم تأكيد طلبك بنجاح!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.navy)),
          const SizedBox(height: 8),
          Text(
            'رقم الطلب: #${store.lastPlacedOrder?.id ?? ''}',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.turquoise),
          ),
          const SizedBox(height: 6),
          const Text(
            'سيتم التواصل معك قبل خروج الطرد\nوالتسليم خلال يومي عمل',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, height: 1.6),
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'تتبع الطلب',
            icon: LucideIcons.mapPin,
            onPressed: () => store.setStack(CustomerStack.tracking),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => store.setStack(null),
            icon: const PhIcon(LucideIcons.shoppingBag, size: 16, color: AppColors.navy),
            label: const Text('متابعة التسوق'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.navy,
              side: const BorderSide(color: AppColors.borderLight),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Tracking ──────────────────────────────────────────────────────────────

class _Tracking extends StatefulWidget {
  const _Tracking({required this.store});
  final PadhouseController store;

  @override
  State<_Tracking> createState() => _TrackingState();
}

class _TrackingState extends State<_Tracking> {
  /// Verified local fallback, mirroring the backend `ORDER_STATUSES` lifecycle.
  static const List<(String, String)> _fallbackSteps = [
    ('PENDING', 'طلب جديد'),
    ('UNDER_REVIEW', 'قيد التأكيد'),
    ('CONFIRMED', 'تم التأكيد'),
    ('PREPARING', 'قيد التجهيز'),
    ('SHIPPED', 'خرج للتوصيل'),
    ('DELIVERED', 'تم التسليم'),
  ];

  @override
  void initState() {
    super.initState();
    // Refresh the tracked order from the shared backend (no-op for guests).
    widget.store.loadOrder(widget.store.activeTrackingOrderId);
  }

  /// Timeline built from the canonical `GET /orders/statuses` lifecycle.
  List<(String, String)> _timelineSteps(PadhouseController store) {
    if (store.orderStatuses.isEmpty) return _fallbackSteps;
    final list = [
      for (final s in store.orderStatuses)
        if (s.status != 'CANCELLED' && s.status != 'CANCELED') (s.status, s.labelAr),
    ];
    return list.isEmpty ? _fallbackSteps : list;
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final order = store.orders
        .where((o) => o.id == store.activeTrackingOrderId)
        .firstOrNull;

    final steps = _timelineSteps(store);
    final status = order?.status;
    final isCancelled = status == 'CANCELLED' || status == 'CANCELED';
    final matchedIndex = status == null ? -1 : steps.indexWhere((s) => s.$1 == status);
    final currentStep = matchedIndex < 0 ? 0 : matchedIndex;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Order number banner ────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.turquoise, Color(0xFF1FA99F)],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              const PhIcon(LucideIcons.truck, color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('تتبع الشحنة المباشر',
                      style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)),
                  Text(store.activeTrackingOrderId,
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                  if (status != null)
                    Text(store.statusLabel(status),
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // ── Timeline stepper (RTL) ─────────────────────────────────
        const Text('مسار الطلب',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy)),
        const SizedBox(height: 10),
        if (isCancelled)
          SoftCard(
            child: Row(
              children: [
                const PhIcon(LucideIcons.xCircle, size: 18, color: AppColors.error),
                const SizedBox(width: 10),
                Text(store.statusLabel('CANCELLED'),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, color: AppColors.error)),
              ],
            ),
          )
        else
          for (int i = 0; i < steps.length; i++)
            _TrackStep(
              label: steps[i].$2,
              isDone: matchedIndex >= 0 && i < currentStep,
              isCurrent: i == currentStep,
              isLast: i == steps.length - 1,
            ),
        const SizedBox(height: 14),

        // ── Order info card ────────────────────────────────────────
        if (order != null) ...[
          const Text('معلومات الطلب',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy)),
          const SizedBox(height: 8),
          SoftCard(
            child: Column(
              children: [
                _infoRow(LucideIcons.user, 'العميل', order.customerName),
                _infoRow(LucideIcons.mapPin, 'العنوان', '${order.city} - ${order.address}'),
                _infoRow(LucideIcons.creditCard, 'الدفع', _paymentLabel(order.paymentMethod)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Text('أصناف الطلب',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy)),
          const SizedBox(height: 8),
          for (final item in order.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: SoftCard(
                child: Row(
                  children: [
                    const PhIcon(LucideIcons.package, size: 16, color: AppColors.turquoise),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(item.name.isNotEmpty ? item.name : item.productId,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                    Text('${item.quantity} قطع',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
            ),
        ],
      ],
    );
  }

  String _paymentLabel(String value) {
    switch (value) {
      case 'CASH_ON_DELIVERY':
        return 'الدفع عند الاستلام (نقداً)';
      case 'PALPAY':
        return 'بال باي';
      case 'MAHFAZATI':
        return 'محفظتي';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي';
      default:
        return value;
    }
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          PhIcon(icon, size: 15, color: AppColors.turquoise),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}

class _TrackStep extends StatelessWidget {
  const _TrackStep({
    required this.label,
    required this.isDone,
    required this.isCurrent,
    required this.isLast,
  });
  final String label;
  final bool isDone;
  final bool isCurrent;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = isDone
        ? AppColors.turquoise
        : isCurrent
            ? AppColors.navy
            : AppColors.textTertiary;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isDone
                      ? AppColors.turquoise
                      : isCurrent
                          ? AppColors.navy
                          : AppColors.offWhite,
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 2),
                ),
                child: Center(
                  child: isDone
                      ? const PhIcon(LucideIcons.check, size: 14, color: Colors.white)
                      : isCurrent
                          ? const PhIcon(LucideIcons.clock, size: 13, color: Colors.white)
                          : null,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(width: 2, color: isDone ? AppColors.turquoise : AppColors.borderLight),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 16),
            child: Text(
              label,
              style: TextStyle(
                fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                fontSize: isCurrent ? 14 : 13,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Orders ────────────────────────────────────────────────────────────────

class _Orders extends StatelessWidget {
  const _Orders({required this.store});
  final PadhouseController store;

  bool _isDone(String status) => status == 'DELIVERED' || status == 'مكتمل';

  String _statusIcon(String status) => _isDone(status) ? '✓' : '⏳';

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('سجل الطلبات',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
        const SizedBox(height: 10),
        if (store.orders.isEmpty)
          _EmptyState(
            icon: LucideIcons.shoppingBag,
            title: 'لا توجد طلبات بعد',
            subtitle: 'استعرض المنتجات وأضف أول طلب',
            onTap: () => store.setStack(null),
            ctaLabel: 'تصفح المنتجات',
          )
        else
          for (final order in store.orders)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SoftCard(
                onTap: () {
                  store.activeTrackingOrderId = order.id;
                  store.setStack(CustomerStack.tracking);
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const PhIcon(LucideIcons.package, color: AppColors.turquoise, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(order.id,
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _isDone(order.status)
                                ? AppColors.successBg
                                : AppColors.turquoise.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            '${_statusIcon(order.status)} ${store.statusLabel(order.status)}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: _isDone(order.status)
                                  ? AppColors.success
                                  : AppColors.turquoise,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const PhIcon(LucideIcons.calendar, size: 13, color: AppColors.textTertiary),
                        const SizedBox(width: 4),
                        Text(order.date,
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(width: 10),
                        const PhIcon(LucideIcons.layers, size: 13, color: AppColors.textTertiary),
                        const SizedBox(width: 4),
                        Text('${order.items.length} أصناف',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        const Spacer(),
                        Text('${order.total} ₪',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                      ],
                    ),
                    if (order.status == 'PENDING' || order.status == 'طلب جديد') ...[
                      const SizedBox(height: 8),
                      const Divider(color: AppColors.borderLight, height: 1),
                      const SizedBox(height: 6),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: store.isCancellingOrder
                              ? null
                              : () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('تأكيد إلغاء الطلب',
                                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                      content: Text('هل أنت متأكد من رغبتك في إلغاء الطلب رقم ${order.id}؟'),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.of(ctx).pop(false),
                                          child: const Text('تراجع'),
                                        ),
                                        FilledButton(
                                          onPressed: () => Navigator.of(ctx).pop(true),
                                          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
                                          child: const Text('نعم، إلغاء الطلب'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    await store.cancelOrder(order.id);
                                  }
                                },
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.error,
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          ),
                          icon: const PhIcon(LucideIcons.xCircle, size: 14, color: AppColors.error),
                          label: Text(
                            store.isCancellingOrder ? 'جاري الإلغاء...' : 'إلغاء الطلب',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.ctaLabel,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final String? ctaLabel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            PhIcon(icon, size: 48, color: AppColors.borderLight),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 6),
            Text(subtitle,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            if (onTap != null && ctaLabel != null) ...[
              const SizedBox(height: 14),
              FilledButton(
                onPressed: onTap,
                style: FilledButton.styleFrom(backgroundColor: AppColors.turquoise),
                child: Text(ctaLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Wishlist ──────────────────────────────────────────────────────────────

class _Wishlist extends StatelessWidget {
  const _Wishlist({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    final items = store.products.where((p) => store.wishlistIds.contains(p.id)).toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('قائمة المفضلة',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
        const SizedBox(height: 10),
        if (items.isEmpty)
          const _EmptyState(
            icon: LucideIcons.heart,
            title: 'قائمة المفضلة فارغة',
            subtitle: 'أضف منتجات تعجبك لتجدها هنا بسهولة',
          )
        else
          for (final product in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SoftCard(
                onTap: () => store.openProduct(product),
                child: Row(
                  children: [
                    NetImage(url: product.image, width: 48, height: 48, radius: 10),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(product.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w800)),
                          Text('${product.price} ₪',
                              style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.turquoise)),
                        ],
                      ),
                    ),
                    FilledButton(
                      onPressed: product.stock > 0 ? () => store.addToCart(product) : null,
                      style: FilledButton.styleFrom(
                          backgroundColor: AppColors.turquoise,
                          visualDensity: VisualDensity.compact),
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

// ─── Support ───────────────────────────────────────────────────────────────

class _Support extends StatelessWidget {
  const _Support();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('خدمة العملاء والدعم',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
        const SizedBox(height: 4),
        const Text('نحن هنا لمساعدتك في أي وقت',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 14),

        // WhatsApp
        const _SupportCard(
          icon: LucideIcons.phone,
          iconColor: Color(0xFF128C7E),
          bgColor: Color(0x1425D366),
          title: 'محادثة واتساب فورية',
          subtitle: 'إجابات فورية وتنسيق مع فريقنا في رام الله',
          value: '+970 59 900 0000',
          trailing: LucideIcons.externalLink,
          trailingColor: Color(0xFF128C7E),
        ),
        const SizedBox(height: 10),

        // Instagram
        const _SupportCard(
          icon: LucideIcons.globe,
          iconColor: Color(0xFFE1306C),
          bgColor: Color(0x14E1306C),
          title: 'صفحتنا على إنستغرام',
          subtitle: 'تابعنا للعروض الحصرية والجديد',
          value: '@padhouse.ps',
          trailing: LucideIcons.externalLink,
          trailingColor: Color(0xFFE1306C),
        ),
        const SizedBox(height: 10),

        // Email
        const _SupportCard(
          icon: LucideIcons.mail,
          iconColor: AppColors.navy,
          bgColor: AppColors.offWhite,
          title: 'البريد الإلكتروني',
          subtitle: 'نرد خلال 24 ساعة عمل',
          value: 'support@padhouse.ps',
          trailing: LucideIcons.copyCheck,
          trailingColor: AppColors.navy,
        ),
        const SizedBox(height: 14),

        // Working hours
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.turquoise.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.2)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  PhIcon(LucideIcons.clock, size: 15, color: AppColors.turquoise),
                  SizedBox(width: 6),
                  Text('أوقات العمل',
                      style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.turquoise)),
                ],
              ),
              SizedBox(height: 8),
              Text('السبت – الخميس: ٩ ص – ٩ م',
                  style: TextStyle(fontSize: 13, color: AppColors.navy)),
              Text('الجمعة: ٢ م – ٨ م',
                  style: TextStyle(fontSize: 13, color: AppColors.navy)),
            ],
          ),
        ),
      ],
    );
  }
}

class _SupportCard extends StatelessWidget {
  const _SupportCard({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.trailing,
    required this.trailingColor,
  });
  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final String title;
  final String subtitle;
  final String value;
  final IconData trailing;
  final Color trailingColor;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      color: bgColor,
      child: Row(
        children: [
          PhIcon(icon, color: iconColor, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(fontWeight: FontWeight.w800, color: iconColor, fontSize: 14)),
                Text(subtitle,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          PhIcon(trailing, color: trailingColor, size: 18),
        ],
      ),
    );
  }
}

// ─── Notifications ─────────────────────────────────────────────────────────

class _Notifications extends StatelessWidget {
  const _Notifications();

  static const _items = [
    _NotifItem(
      icon: LucideIcons.packageCheck,
      iconColor: AppColors.turquoise,
      title: 'تم تأكيد طلبك #PH-2026-1042',
      body: 'طلبك قيد التجهيز وسيصلك خلال يومي عمل. شكراً لثقتك ببادهاوس!',
      time: 'منذ ٣٠ دقيقة',
      read: false,
    ),
    _NotifItem(
      icon: LucideIcons.tag,
      iconColor: Color(0xFFE1306C),
      title: 'عرض خاص: خصم ١٥٪ على الكيبوردات',
      body: 'استخدم كود KEYBOARD15 لتوفير حتى ٢٤ شيكل على أفضل لوحات المفاتيح.',
      time: 'منذ ساعتين',
      read: false,
    ),
    _NotifItem(
      icon: LucideIcons.packageOpen,
      iconColor: AppColors.navy,
      title: 'تم تحديث كتالوج المنتجات',
      body: 'أضفنا ٥ منتجات جديدة: قلم بادهاوس برو، شاشة ملمس الورق X2، وأكثر.',
      time: 'أمس',
      read: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Text('مركز التنبيهات',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                  color: AppColors.turquoise, borderRadius: BorderRadius.circular(99)),
              child: Text(
                '${_items.where((n) => !n.read).length}',
                style: const TextStyle(
                    color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        for (final item in _items)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              decoration: BoxDecoration(
                color: item.read ? Colors.white : AppColors.turquoise.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: item.read
                        ? AppColors.borderLight
                        : AppColors.turquoise.withValues(alpha: 0.2)),
              ),
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: item.iconColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(child: PhIcon(item.icon, size: 18, color: item.iconColor)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(item.title,
                                  style: TextStyle(
                                      fontWeight: item.read ? FontWeight.w700 : FontWeight.w900,
                                      fontSize: 13)),
                            ),
                            if (!item.read)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                    color: AppColors.turquoise, shape: BoxShape.circle),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(item.body,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary, height: 1.5)),
                        const SizedBox(height: 4),
                        Text(item.time,
                            style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _NotifItem {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String body;
  final String time;
  final bool read;
  const _NotifItem({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.body,
    required this.time,
    required this.read,
  });
}

// ─── Addresses ─────────────────────────────────────────────────────────────

class _Addresses extends StatefulWidget {
  const _Addresses({required this.store});
  final PadhouseController store;

  @override
  State<_Addresses> createState() => _AddressesState();
}

class _AddressesState extends State<_Addresses> {
  late String city = widget.store.checkoutCity;
  late final street = TextEditingController(text: widget.store.checkoutStreet);

  @override
  void dispose() {
    street.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('عنوان التوصيل',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
        const SizedBox(height: 4),
        const Text('العنوان المحفوظ لطلباتك القادمة',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 14),

        // Current address card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.turquoise.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.25)),
          ),
          child: Row(
            children: [
              const PhIcon(LucideIcons.mapPin, color: AppColors.turquoise, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(city,
                        style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.navy)),
                    Text(widget.store.checkoutStreet,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const PhIcon(LucideIcons.checkCircle2, color: AppColors.turquoise, size: 18),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Edit form
        const Text('تعديل العنوان',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.navy)),
        const SizedBox(height: 10),
        const FieldLabel('المدينة'),
        IconField(
          icon: LucideIcons.mapPin,
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: city,
              isExpanded: true,
              items: [
                for (final item in palestinianCities)
                  DropdownMenuItem(
                      value: item.name,
                      child: Text('${item.name} (التوصيل: ${item.fee} ₪)',
                          style: const TextStyle(fontSize: 13))),
              ],
              onChanged: (value) => setState(() => city = value ?? city),
            ),
          ),
        ),
        const SizedBox(height: 10),
        const FieldLabel('العنوان التفصيلي'),
        TextField(
            controller: street,
            maxLines: 2,
            decoration: const InputDecoration(hintText: 'الحي، الشارع، أقرب معلم')),
        const SizedBox(height: 20),
        PrimaryButton(
          label: 'حفظ العنوان',
          icon: LucideIcons.save,
          onPressed: () {
            widget.store.checkoutCity = city;
            widget.store.checkoutStreet = street.text.trim();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('تم حفظ العنوان بنجاح')),
            );
          },
        ),
      ],
    );
  }
}

// ─── Settings ──────────────────────────────────────────────────────────────

class _Settings extends StatelessWidget {
  const _Settings({required this.store});
  final PadhouseController store;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('الإعدادات',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy)),
        const SizedBox(height: 20),

        // App version
        const _SettingsTile(
          icon: LucideIcons.info,
          label: 'إصدار التطبيق',
          value: 'بادهاوس v4.0.0',
        ),
        const Divider(height: 1),
        _SettingsTile(
          icon: LucideIcons.phone,
          label: 'تواصل مع الدعم',
          value: '+970 59 900 0000',
          onTap: () => store.setStack(CustomerStack.support),
        ),
        const Divider(height: 1),
        const _SettingsTile(
          icon: LucideIcons.shieldCheck,
          label: 'سياسة الخصوصية',
          value: 'padhouse.ps/privacy',
        ),
        const Divider(height: 1),
        const _SettingsTile(
          icon: LucideIcons.fileText,
          label: 'الشروط والأحكام',
          value: 'padhouse.ps/terms',
        ),
        const Divider(height: 1),
        const SizedBox(height: 24),

        // About section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.navy, Color(0xFF1E3A5F)],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Column(
            children: [
              Text('بادهاوس',
                  style: TextStyle(
                      color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
              SizedBox(height: 4),
              Text('متجرك المتخصص في ملحقات الآيباد الأصلية',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 13)),
              SizedBox(height: 8),
              Text('فلسطين • توصيل لجميع المحافظات',
                  style: TextStyle(
                      color: AppColors.turquoise, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.turquoise.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(child: PhIcon(icon, size: 17, color: AppColors.turquoise)),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      subtitle: Text(value, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
      trailing: onTap != null
          ? const PhIcon(LucideIcons.chevronLeft, size: 16, color: AppColors.textTertiary)
          : null,
      onTap: onTap,
    );
  }
}

// ─── Admin Body ────────────────────────────────────────────────────────────

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
            const Text('لوحة المؤشرات التنفيذية',
                key: Key('admin-kpis'),
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: AppColors.successBg, borderRadius: BorderRadius.circular(999)),
              child: const Text('مباشر',
                  style: TextStyle(
                      color: AppColors.success, fontWeight: FontWeight.w800, fontSize: 11)),
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
            _kpi(LucideIcons.package, 'المنتجات النشطة', '${store.products.length} صنفاً',
                'كتالوج رسمي'),
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
            Text(hint,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.success, fontWeight: FontWeight.w700)),
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
                  Text('كتالوج المنتجات الرسمي',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  Text('المنتجات الرسمية المعتمدة',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
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
                        Text(product.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                        Text('المخزون: ${product.stock} قطعة • ${product.price} ₪',
                            style: const TextStyle(
                                fontSize: 11, color: AppColors.textSecondary)),
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
        const Text('إدارة المخزون والتوريد',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const Text('تعديل الكميات الفورية لجميع الأصناف',
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
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
                        Text(product.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                        Text('الحد الأدنى: ${product.minThreshold} قطع',
                            style: const TextStyle(
                                fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: product.stock <= product.minThreshold
                          ? AppColors.errorBg
                          : AppColors.successBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${product.stock}',
                        style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: product.stock <= product.minThreshold
                                ? AppColors.error
                                : AppColors.success)),
                  ),
                  const SizedBox(width: 6),
                  TextButton(
                      onPressed: () => store.adjustStock(product.id, 5),
                      child: const Text('+5')),
                  TextButton(
                      onPressed: () => store.adjustStock(product.id, -1),
                      child: const Text('-1')),
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
        const Text('إدارة وتجهيز الطلبات',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        for (final order in store.orders)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SoftCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${order.id} • ${order.customerName}',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  DropdownButton<String>(
                    value: orderStatuses.contains(order.status)
                        ? order.status
                        : orderStatuses.first,
                    isExpanded: true,
                    items: [
                      for (final status in orderStatuses)
                        DropdownMenuItem(value: status, child: Text(status))
                    ],
                    onChanged: (value) {
                      if (value != null) store.updateOrderStatus(order.id, value);
                    },
                  ),
                  Text('${order.city} • ${order.items.length} أصناف • ${order.total} ₪',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
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
    const suggestions = [
      'فحص نواقص المخزون',
      'مقارنة أسعار الكتالوج بالسوق',
      'ملخص مبيعات شهر نوفمبر'
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Row(
          children: [
            PhIcon(LucideIcons.bot, color: AppColors.turquoise, size: 22),
            SizedBox(width: 8),
            Expanded(
                child: Text('مساعد بادهاوس لذكاء الأعمال',
                    style: TextStyle(fontWeight: FontWeight.w800))),
          ],
        ),
        const SizedBox(height: 10),
        for (final message in store.aiChat)
          Align(
            alignment:
                message.sender == 'user' ? Alignment.centerLeft : Alignment.centerRight,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              constraints: const BoxConstraints(maxWidth: 280),
              decoration: BoxDecoration(
                color: message.sender == 'user' ? AppColors.turquoise : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: message.sender == 'user'
                        ? AppColors.turquoise
                        : AppColors.borderLight),
              ),
              child: Text(message.text,
                  style: TextStyle(
                      color: message.sender == 'user' ? Colors.white : AppColors.navy,
                      fontSize: 12,
                      height: 1.45)),
            ),
          ),
        if (store.isAiThinking)
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Text('جاري تحليل قاعدة بيانات الكتالوج...',
                style: TextStyle(color: AppColors.turquoise, fontWeight: FontWeight.w700)),
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
            Expanded(
                child: TextField(
                    controller: prompt,
                    decoration: const InputDecoration(
                        hintText: 'اسأل عن مبيعات أو مخزون أي صنف...'))),
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

// ─── Product Editor Dialog ─────────────────────────────────────────────────

Future<void> showProductEditor(
    BuildContext context, PadhouseController store, Product? product) async {
  final name = TextEditingController(text: product?.name ?? '');
  final price = TextEditingController(text: '${product?.price ?? 50}');
  final stock = TextEditingController(text: '${product?.stock ?? 20}');
  final compatibility =
      TextEditingController(text: product?.compatibility ?? 'جميع أجهزة iPad');
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
                  TextField(
                      controller: price,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'السعر (₪)')),
                  TextField(
                      controller: stock,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'الكمية بالمخزون')),
                  DropdownButton<String>(
                    value: category,
                    isExpanded: true,
                    items: [
                      for (final cat in officialCategories.skip(1))
                        DropdownMenuItem(value: cat.id, child: Text(cat.name)),
                    ],
                    onChanged: (value) => setLocal(() => category = value ?? category),
                  ),
                  TextField(
                      controller: compatibility,
                      decoration: const InputDecoration(labelText: 'التوافق')),
                ],
              ),
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
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
