import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../data/catalog.dart';

bool get skipNetworkImages =>
    WidgetsBinding.instance.runtimeType.toString().contains('Test');

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
  const NetImage({super.key, required this.url, this.width, this.height, this.radius = 12});

  final String url;
  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: AppColors.offWhite,
      alignment: Alignment.center,
      child: const PhIcon(LucideIcons.package, color: AppColors.turquoise, size: 22),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        width: width,
        height: height,
        child: skipNetworkImages
            ? placeholder
            : Image.network(
                url,
                width: width,
                height: height,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => placeholder,
              ),
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
      color: active ? AppColors.turquoise.withValues(alpha: 0.1) : AppColors.offWhite,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: active ? AppColors.turquoise.withValues(alpha: 0.35) : AppColors.borderLight),
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
          border: Border.all(color: AppColors.turquoise.withValues(alpha: 0.4)),
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
