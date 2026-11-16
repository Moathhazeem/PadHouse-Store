import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shimmer/shimmer.dart';

import '../core/network/api_client.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../data/catalog.dart';
import '../state/padhouse_controller.dart';

bool get skipNetworkImages =>
    WidgetsBinding.instance.runtimeType.toString().contains('Test');

String resolveImageUrl(String url) {
  final value = url.trim();
  if (kIsWeb && (value.startsWith('https://padhouse.ps/') || value.startsWith('http://padhouse.ps/'))) {
    final apiBase = ApiClient.baseUrl.replaceFirst(RegExp(r'/+$'), '');
    return '$apiBase/products/image?url=${Uri.encodeComponent(value)}';
  }
  return ApiClient.resolveImageUrl(value);
}

class PhIcon extends StatelessWidget {
  const PhIcon(this.icon, {super.key, this.size = 18, this.color, this.stroke = 1.75});

  final IconData icon;
  final double size;
  final Color? color;
  final double stroke;

  @override
  Widget build(BuildContext context) {
    return Icon(icon, size: size, color: color, weight: stroke);
  }
}

IconData categoryIcon(String id) {
  switch (id) {
    case 'cat_pens':
      return LucideIcons.penTool;
    case 'cat_cases':
      return LucideIcons.shield;
    case 'cat_keyboards':
      return LucideIcons.keyboard;
    case 'cat_stands':
      return LucideIcons.maximize2;
    case 'cat_chargers':
      return LucideIcons.zap;
    case 'cat_others':
      return LucideIcons.package;
    default:
      return LucideIcons.layoutGrid;
  }
}

class NetImage extends StatelessWidget {
  const NetImage({super.key, required this.url, this.width, this.height, this.radius = 12, this.fit = BoxFit.cover});

  final String url;
  final double? width;
  final double? height;
  final double radius;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: AppColors.offWhite,
      alignment: Alignment.center,
      child: const PhIcon(LucideIcons.package, color: AppColors.turquoise, size: 22),
    );
    final cleanUrl = url.trim();
    if (cleanUrl.isEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: placeholder,
      );
    }

    final safeUrl = resolveImageUrl(cleanUrl);

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        width: width,
        height: height,
        child: skipNetworkImages
            ? placeholder
            : Image.network(
                safeUrl,
                width: width,
                height: height,
                fit: fit,
                errorBuilder: (_, __, ___) => placeholder,
              ),
      ),
    );
  }
}

class CompatibilityBadge extends StatelessWidget {
  const CompatibilityBadge({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 190),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.mintLight,
        border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textDirection: TextDirection.rtl,
        style: const TextStyle(color: AppColors.evergreen, fontSize: 10, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class SoftCard extends StatelessWidget {
  const SoftCard({super.key, required this.child, this.padding, this.onTap, this.color});

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final box = Container(
      padding: padding ?? const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color ?? Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16), child: box),
    );
  }
}

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.store, required this.product});

  final PadhouseController store;
  final Product product;

  @override
  Widget build(BuildContext context) {
    final isWishlisted = store.wishlistIds.contains(product.id);
    final outOfStock = product.stock <= 0;
    final hasDiscount = product.originalPrice > product.price;

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => store.openProduct(product),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(color: AppColors.offWhite, child: NetImage(url: product.image, width: double.infinity, radius: 0, fit: BoxFit.contain)),
                    if (outOfStock)
                      Container(
                        color: Colors.white.withValues(alpha: 0.8),
                        alignment: Alignment.center,
                        child: const Text('نفدت الكمية',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.error)),
                      )
                    else if (hasDiscount)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.error, borderRadius: BorderRadius.circular(6)),
                          child: const Text('خصم',
                              style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                        ),
                      ),
                    Positioned(
                      top: 4,
                      left: 4,
                      child: InkWell(
                        onTap: () => store.toggleWishlist(product.id),
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: PhIcon(
                            isWishlisted ? LucideIcons.heartCrack : LucideIcons.heart,
                            size: 14,
                            color: isWishlisted ? AppColors.error : AppColors.textTertiary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, height: 1.35, color: AppColors.navy),
                    ),
                    const SizedBox(height: 5),
                    CompatibilityBadge(label: product.compatibility),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        const PhIcon(LucideIcons.star, size: 12, color: AppColors.starGold),
                        const SizedBox(width: 3),
                        Text('${product.rating}',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                        const SizedBox(width: 6),
                        Text('(${product.reviewsCount})',
                            style: const TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Directionality(
                                textDirection: TextDirection.ltr,
                                child: Text('${product.price} ₪', style: AppTypography.latin(fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.emerald)),
                              ),
                              if (hasDiscount) ...[
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text('${product.originalPrice} ₪',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors.textTertiary,
                                          decoration: TextDecoration.lineThrough)),
                                ),
                              ],
                            ],
                          ),
                        ),
                        FilledButton.icon(
                          onPressed: outOfStock ? null : () => store.addToCart(product),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.turquoise,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: AppColors.offWhiteAlt,
                            disabledForegroundColor: AppColors.textTertiary,
                            minimumSize: const Size(0, 32),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            visualDensity: VisualDensity.compact,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                          ),
                          icon: const PhIcon(LucideIcons.shoppingCart, size: 13),
                          label: Text(outOfStock ? 'غير متوفر' : 'أضف للسلة',
                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.ctaLabel,
    this.onCta,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? ctaLabel;
  final VoidCallback? onCta;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(color: AppColors.offWhite, shape: BoxShape.circle),
              child: Center(child: PhIcon(icon, size: 32, color: AppColors.turquoise)),
            ),
            const SizedBox(height: 14),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.navy)),
            const SizedBox(height: 6),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5)),
            if (onCta != null && ctaLabel != null) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onCta,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.turquoise,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: Text(ctaLabel!, style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}


class SkeletonLoader extends StatelessWidget {
  const SkeletonLoader({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(14),
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.72,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) => Shimmer.fromColors(
        baseColor: AppColors.offWhiteAlt,
        highlightColor: Colors.white,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              Expanded(child: Container(color: Colors.white)),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 12, width: 90, color: Colors.white),
                    const SizedBox(height: 8),
                    Container(height: 14, width: double.infinity, color: Colors.white),
                    const SizedBox(height: 8),
                    Container(height: 36, width: double.infinity, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.icon, this.keyId});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Key? keyId;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        key: keyId,
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: onPressed == null ? AppColors.offWhiteAlt : AppColors.turquoise,
          foregroundColor: onPressed == null ? AppColors.textTertiary : Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            if (icon != null) ...[
              const SizedBox(width: 8),
              PhIcon(icon!, size: 16, color: onPressed == null ? AppColors.textTertiary : Colors.white),
            ],
          ],
        ),
      ),
    );
  }
}


class AppButton extends PrimaryButton {
  const AppButton({super.key, required super.label, required super.onPressed, super.icon, super.keyId});
}

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.navy)),
    );
  }
}

class IconField extends StatelessWidget {
  const IconField({
    super.key,
    required this.icon,
    required this.child,
  });

  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          PhIcon(icon, size: 16, color: AppColors.textTertiary),
          const SizedBox(width: 8),
          Expanded(child: child),
        ],
      ),
    );
  }
}


class AppInput extends StatelessWidget {
  const AppInput({
    super.key,
    required this.label,
    required this.icon,
    required this.child,
    this.helperText,
    this.errorText,
  });

  final String label;
  final IconData icon;
  final Widget child;
  final String? helperText;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label),
        IconField(icon: icon, child: child),
        if (errorText != null)
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 4, top: 5),
            child: Text(errorText!, style: const TextStyle(color: AppColors.error, fontSize: 12)),
          )
        else if (helperText != null)
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 4, top: 5),
            child: Text(helperText!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ),
      ],
    );
  }
}

InputDecoration bareInput(String hint, {Widget? suffix}) {
  return InputDecoration(
    hintText: hint,
    suffixIcon: suffix,
    isDense: true,
    filled: false,
    border: InputBorder.none,
    enabledBorder: InputBorder.none,
    focusedBorder: InputBorder.none,
    contentPadding: const EdgeInsets.symmetric(vertical: 12),
  );
}

class CategoryChips extends StatelessWidget {
  const CategoryChips({super.key, required this.selected, required this.onSelect});

  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(
        dragDevices: {
          PointerDeviceKind.touch,
          PointerDeviceKind.mouse,
          PointerDeviceKind.stylus,
          PointerDeviceKind.trackpad,
          PointerDeviceKind.unknown,
        },
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        child: Row(
          children: [
            for (final cat in officialCategories) ...[
              _Chip(
                label: cat.name,
                icon: categoryIcon(cat.id),
                active: selected == cat.id,
                onTap: () => onSelect(cat.id),
              ),
              const SizedBox(width: 8),
            ],
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.icon, required this.active, required this.onTap});

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.turquoise : AppColors.textSecondary;
    return Material(
      color: active ? AppColors.turquoise.withValues(alpha: 0.12) : AppColors.offWhite,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: active ? AppColors.turquoise : AppColors.borderLight),
          ),
          child: Row(
            children: [
              PhIcon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 12, fontWeight: active ? FontWeight.w700 : FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

class ToastBanner extends StatelessWidget {
  const ToastBanner({super.key, required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.navy,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: AppColors.turquoise),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const PhIcon(LucideIcons.checkCircle2, size: 16, color: AppColors.turquoise),
            const SizedBox(width: 8),
            Flexible(
              child: Text(message, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
