import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// PadHouse Typography System
/// English: Inter / Poppins
/// Arabic: Tajawal / IBM Plex Sans Arabic
class AppTypography {
  AppTypography._();

  static TextStyle headingLarge({bool isArabic = false, Color color = AppColors.navy}) {
    if (isArabic) {
      return GoogleFonts.ibmPlexSansArabic(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        height: 1.25,
        color: color,
      );
    }
    return GoogleFonts.ibmPlexSansArabic(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      height: 1.25,
      letterSpacing: -0.5,
      color: color,
    );
  }

  static TextStyle headingMedium({bool isArabic = false, Color color = AppColors.navy}) {
    if (isArabic) {
      return GoogleFonts.ibmPlexSansArabic(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        height: 1.3,
        color: color,
      );
    }
    return GoogleFonts.ibmPlexSansArabic(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      height: 1.3,
      letterSpacing: -0.3,
      color: color,
    );
  }

  static TextStyle headingSmall({bool isArabic = false, Color color = AppColors.navy}) {
    if (isArabic) {
      return GoogleFonts.ibmPlexSansArabic(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        height: 1.35,
        color: color,
      );
    }
    return GoogleFonts.ibmPlexSansArabic(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      height: 1.35,
      color: color,
    );
  }

  static TextStyle bodyLarge({bool isArabic = false, Color color = AppColors.textPrimary}) {
    if (isArabic) {
      return GoogleFonts.ibmPlexSansArabic(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: color,
      );
    }
    return GoogleFonts.inter(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 1.5,
      color: color,
    );
  }

  static TextStyle bodyMedium({bool isArabic = false, Color color = AppColors.textPrimary}) {
    if (isArabic) {
      return GoogleFonts.ibmPlexSansArabic(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.45,
        color: color,
      );
    }
    return GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 1.45,
      color: color,
    );
  }

  static TextStyle bodySmall({bool isArabic = false, Color color = AppColors.textSecondary}) {
    if (isArabic) {
      return GoogleFonts.ibmPlexSansArabic(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.4,
        color: color,
      );
    }
    return GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: 1.4,
      color: color,
    );
  }

  static TextStyle labelLarge({bool isArabic = false, Color color = AppColors.navy}) {
    if (isArabic) {
      return GoogleFonts.tajawal(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: color,
      );
    }
    return GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      color: color,
    );
  }
}
