import 'package:flutter/material.dart';

/// PadHouse palette and functional colors shared by the mobile UI.
class AppColors {
  AppColors._();

  static const Color white = Color(0xFFFFFFFF);
  static const Color turquoise = Color(0xFF1CA89E);
  static const Color forest = Color(0xFF0F3D3A);

  // Surfaces
  static const Color primaryBackground = Color(0xFFF8FAFC);
  static const Color surfaceWhite = white;
  static const Color secondaryBackground = Color(0xFFF8FAFC);
  static const Color offWhite = Color(0xFFF8FAFC);
  static const Color offWhiteAlt = Color(0xFFF8FAFC);

  // Brand aliases retained for existing widgets.
  static const Color emerald = turquoise;
  static const Color mint = turquoise;
  static const Color evergreen = Color(0xFF0F172A);
  static const Color mintLight = Color(0xFFF8FAFC);
  static const Color turquoiseLight = mintLight;
  static const Color turquoiseDark = turquoise;
  static const Color turquoiseHover = turquoise;

  // Charcoal typography; forest is reserved for footer sections.
  static const Color navy = Color(0xFF0F172A);
  static const Color navyLight = Color(0xFF1E293B);
  static const Color navyMuted = Color(0xFF334155);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textTertiary = Color(0xFF94A3B8);
  static const Color textOnEmerald = white;
  static const Color textOnTurquoise = white;

  // Soft borders and elevation.
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color cardShadow = Color(0x0A0F172A);
  static const Color borderFocus = turquoise;
  static const Color divider = Color(0xFFF1F5F9);

  // Functional states keep their familiar meanings.
  static const Color success = Color(0xFF16A34A);
  static const Color successBg = Color(0xFFF0FDF4);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color error = Color(0xFFDC2626);
  static const Color errorBg = Color(0xFFFEF2F2);

  /// “Urgent Crisis” (red alert) accent — reusable across order tracking,
  /// checkpoint/road-closure delays and other emergency contexts.
  static const Color crisis = Color(0xFFEF4444);
  static const Color crisisBg = Color(0x14EF4444);
  static const Color info = turquoise;
  static const Color infoBg = Color(0xFFF0FDFA);
  static const Color starGold = Color(0xFFF59E0B);
}
