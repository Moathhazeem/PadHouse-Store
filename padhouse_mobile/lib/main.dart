import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'state/padhouse_controller.dart';

class AppScrollBehavior extends MaterialScrollBehavior {
  const AppScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.stylus,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.unknown,
      };
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: PadHouseApp(),
    ),
  );
}

class PadHouseApp extends ConsumerStatefulWidget {
  const PadHouseApp({super.key});

  @override
  ConsumerState<PadHouseApp> createState() => _PadHouseAppState();
}

class _PadHouseAppState extends ConsumerState<PadHouseApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(padhouseProvider).bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'بادهاوس',
      debugShowCheckedModeBanner: false,
      // Strict White Light Theme with Tajawal globally
      theme: AppTheme.lightTheme(isArabic: true),
      themeMode: ThemeMode.light,
      scrollBehavior: const AppScrollBehavior(),
      routerConfig: appRouter,
      supportedLocales: const [
        Locale('ar', 'PS'), // Arabic (Palestine) RTL
        Locale('ar', ''),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      locale: const Locale('ar', 'PS'), // Strict Arabic Localization (RTL)
    );
  }
}
