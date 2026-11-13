import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// PadHouse Typography System
/// Arabic Only: Tajawal / Cairo
class AppTypography {
  AppTypography._();

  static TextStyle headingLarge({Color color = AppColors.navy}) {
    return GoogleFonts.tajawal(
      fontSize: 28,
      fontWeight: FontWeight.w800,
      height: 1.25,
      color: color,
    );
  }

  static TextStyle headingMedium({Color color = AppColors.navy}) {
    return GoogleFonts.tajawal(
      fontSize: 22,
      fontWeight: FontWeight.w800,
      height: 1.3,
      color: color,
    );
  }

  static TextStyle headingSmall({Color color = AppColors.navy}) {
    return GoogleFonts.tajawal(
      fontSize: 18,
      fontWeight: FontWeight.w700,
      height: 1.35,
      color: color,
    );
  }

  static TextStyle bodyLarge({Color color = AppColors.textPrimary}) {
    return GoogleFonts.tajawal(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      height: 1.5,
      color: color,
    );
  }

  static TextStyle bodyMedium({Color color = AppColors.textPrimary}) {
    return GoogleFonts.tajawal(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      height: 1.5,
      color: color,
    );
  }

  static TextStyle bodySmall({Color color = AppColors.textSecondary}) {
    return GoogleFonts.tajawal(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: 1.4,
      color: color,
    );
  }

  static TextStyle labelLarge({Color color = AppColors.navy}) {
    return GoogleFonts.tajawal(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: color,
    );
  }

  static TextStyle buttonText({Color color = Colors.white}) {
    return GoogleFonts.tajawal(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      color: color,
    );
  }
}
