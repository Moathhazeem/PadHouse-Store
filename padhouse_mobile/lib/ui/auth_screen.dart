import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../data/catalog.dart';
import '../state/padhouse_controller.dart';
import 'widgets.dart';

/// Splash Screen mirroring PadHouse brand identity
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (!isTest) {
      _timer = Timer(const Duration(milliseconds: 1400), () {
        if (mounted) {
          final store = ref.read(padhouseProvider);
          if (store.user == null) {
            store.continueAsGuest();
          }
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 84,
                  height: 84,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.turquoise, AppColors.turquoiseDark],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.turquoise.withValues(alpha: 0.35),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Text(
                    'PH',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'بادهاوس | PadHouse',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.offWhite,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: const Text(
                    'متجر بادهاوس فلسطين 🇵🇸 • ملحقات الآيباد المعتمدة',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.turquoise,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  '21 منتجاً أصلياً • توصيل لكافة المدن • دفع عند الاستلام',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
                ),
                const SizedBox(height: 36),
                FilledButton.icon(
                  onPressed: () => ref.read(padhouseProvider).continueAsGuest(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.turquoise,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const PhIcon(LucideIcons.arrowRight, size: 16, color: Colors.white),
                  label: const Text(
                    'ابدأ التسوق الآن',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Interactive Onboarding Experience
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _page = 0;

  final _slides = const [
    (
      icon: LucideIcons.sparkles,
      title: 'ملحقات الآيباد الأكثر طلباً في فلسطين',
      desc: 'أقلام بادهاوس الذكية، شاشات ملمس الورق PaperFeel، كيبوردات مع تاتش باد وحافظات أصلية معتمدة.',
    ),
    (
      icon: LucideIcons.truck,
      title: 'توصيل سريع لكافة المحافظات والقدس',
      desc: 'خدمة التوصيل السريع لكافة المدن (رام الله، نابلس، الخليل، جنين، القدس، غزة...) مع الدفع عند الاستلام.',
    ),
    (
      icon: LucideIcons.shieldCheck,
      title: 'نظام إدارة احترافي ولوحة تحكم شاملة',
      desc: 'تحكم فوري بالمخزون للـ 21 منتجاً، تحديث حالات الشحن، ومساعد الذكاء الاصطناعي لحسابات الإدارة.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final slide = _slides[_page];
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: AppColors.turquoise, borderRadius: BorderRadius.circular(12)),
                    child: const Text('PH', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                  ),
                  TextButton(
                    onPressed: () => ref.read(padhouseProvider).continueAsGuest(),
                    child: const Text('تخطي / زائر', style: TextStyle(color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
              const Spacer(),
              Container(
                width: 90,
                height: 90,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.turquoise.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: PhIcon(slide.icon, size: 44, color: AppColors.turquoise),
              ),
              const SizedBox(height: 24),
              Text(
                slide.title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.navy),
              ),
              const SizedBox(height: 12),
              Text(
                slide.desc,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.6),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (int i = 0; i < _slides.length; i++)
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: _page == i ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _page == i ? AppColors.turquoise : AppColors.borderLight,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                ],
              ),
              const Spacer(),
              PrimaryButton(
                label: _page < _slides.length - 1 ? 'التالي' : 'ابدأ التسوق في بادهاوس',
                icon: LucideIcons.arrowRight,
                onPressed: () {
                  if (_page < _slides.length - 1) {
                    setState(() => _page++);
                  } else {
                    ref.read(padhouseProvider).continueAsGuest();
                  }
                },
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () {
                  // Switch to AuthScreen login
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const AuthScreen()),
                  );
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  side: const BorderSide(color: AppColors.borderLight),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('تسجيل الدخول / إنشاء حساب', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.navy)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Authentication Screen mirroring the web version
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({
    super.key,
    this.initialRegisterMode = false,
    this.prefillAdmin = false,
  });

  final bool initialRegisterMode;
  final bool prefillAdmin;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  late bool registerMode = widget.initialRegisterMode;
  bool showPassword = false;
  String? error;

  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  final phone = TextEditingController();
  final regEmail = TextEditingController();
  final regPassword = TextEditingController();
  String city = palestinianCities.first.name;

  @override
  void initState() {
    super.initState();
    if (widget.prefillAdmin) {
      email.text = superAdminEmail;
      password.text = superAdminPass;
    }
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    name.dispose();
    phone.dispose();
    regEmail.dispose();
    regPassword.dispose();
    super.dispose();
  }

  void _login() {
    final message = ref.read(padhouseProvider).login(email.text, password.text);
    setState(() => error = message);
  }

  void _register() {
    final message = ref.read(padhouseProvider).register(
          name: name.text,
          email: regEmail.text,
          phone: phone.text,
          city: city,
          password: regPassword.text,
        );
    setState(() => error = message);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: AppColors.turquoise, borderRadius: BorderRadius.circular(14)),
                  child: const Text('PH', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.offWhite,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: const Text('متجر بادهاوس فلسطين 🇵🇸', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.turquoise)),
                ),
              ],
            ),
            const SizedBox(height: 18),
            // Onboarding highlights banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.offWhite,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: const Row(
                children: [
                  PhIcon(LucideIcons.sparkles, size: 16, color: AppColors.turquoise),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'الكتالوج المعتمد: 21 منتجاً مخصصاً لأجهزة iPad بأسعار الشيكل (₪) مع شحن سريع.',
                      style: TextStyle(fontSize: 11, color: AppColors.navy, fontWeight: FontWeight.w600, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Text(
              registerMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول إلى بادهاوس',
              key: const Key('auth-title'),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            const SizedBox(height: 6),
            Text(
              registerMode
                  ? 'انضم إلينا للتسوق والحصول على أسرع توصيل في فلسطين'
                  : 'المتجر الفلسطيني المتخصص لملحقات الآيباد المعتمدة',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 16),
            if (error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.errorBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFEE2E2)),
                ),
                child: Row(
                  children: [
                    const PhIcon(LucideIcons.alertCircle, size: 16, color: AppColors.error),
                    const SizedBox(width: 8),
                    Expanded(child: Text(error!, style: const TextStyle(fontSize: 12, color: AppColors.error))),
                  ],
                ),
              ),
            if (!registerMode) ...[
              Container(
                key: const Key('admin-credentials'),
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFDCFCE7)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const PhIcon(LucideIcons.shieldCheck, size: 14, color: AppColors.success),
                        const SizedBox(width: 6),
                        const Expanded(
                          child: Text('بيانات حساب المسؤول العام:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF166534))),
                        ),
                        TextButton(
                          key: const Key('admin-autofill'),
                          onPressed: () {
                            setState(() {
                              email.text = superAdminEmail;
                              password.text = superAdminPass;
                            });
                          },
                          style: TextButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.success,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                            minimumSize: const Size(0, 28),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text('تعبئة تلقائية', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Directionality(
                      textDirection: TextDirection.ltr,
                      child: Text('adimn123@gmail.com / 123456', style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF166534))),
                    ),
                  ],
                ),
              ),
              const FieldLabel('البريد الإلكتروني'),
              IconField(
                icon: LucideIcons.mail,
                child: TextField(
                  key: const Key('login-email'),
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: bareInput('name@domain.com'),
                ),
              ),
              const SizedBox(height: 12),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  FieldLabel('كلمة المرور'),
                  Text('نسيت كلمة المرور؟', style: TextStyle(fontSize: 11, color: AppColors.turquoise, fontWeight: FontWeight.w700)),
                ],
              ),
              IconField(
                icon: LucideIcons.keyRound,
                child: TextField(
                  key: const Key('login-password'),
                  controller: password,
                  obscureText: !showPassword,
                  decoration: bareInput(
                    '••••••',
                    suffix: IconButton(
                      onPressed: () => setState(() => showPassword = !showPassword),
                      icon: PhIcon(showPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: AppColors.textTertiary),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              PrimaryButton(keyId: const Key('login-submit'), label: 'تسجيل الدخول', icon: LucideIcons.arrowRight, onPressed: _login),
            ] else ...[
              const FieldLabel('الاسم الكامل'),
              IconField(icon: LucideIcons.user, child: TextField(controller: name, decoration: bareInput('أحمد الفلسطيني'))),
              const SizedBox(height: 12),
              const FieldLabel('البريد الإلكتروني'),
              IconField(icon: LucideIcons.mail, child: TextField(controller: regEmail, decoration: bareInput('name@domain.ps'))),
              const SizedBox(height: 12),
              const FieldLabel('رقم الهاتف (واتساب)'),
              IconField(icon: LucideIcons.phone, child: TextField(controller: phone, decoration: bareInput('+970 59...'))),
              const SizedBox(height: 12),
              const FieldLabel('المدينة'),
              IconField(
                icon: LucideIcons.mapPin,
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: city,
                    isExpanded: true,
                    items: [
                      for (final c in palestinianCities) DropdownMenuItem(value: c.name, child: Text(c.name, style: const TextStyle(fontSize: 13))),
                    ],
                    onChanged: (value) => setState(() => city = value ?? city),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const FieldLabel('كلمة المرور (6 خانات على الأقل)'),
              IconField(
                icon: LucideIcons.keyRound,
                child: TextField(controller: regPassword, obscureText: !showPassword, decoration: bareInput('••••••')),
              ),
              const SizedBox(height: 16),
              PrimaryButton(keyId: const Key('register-submit'), label: 'إنشاء الحساب', icon: LucideIcons.arrowRight, onPressed: _register),
            ],
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                key: const Key('toggle-auth'),
                onPressed: () => setState(() {
                  registerMode = !registerMode;
                  error = null;
                }),
                child: Text(
                  registerMode ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد',
                  style: const TextStyle(color: AppColors.turquoise, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Divider(color: Color(0xFFF1F5F9)),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('continue-guest'),
              onPressed: () => ref.read(padhouseProvider).continueAsGuest(),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
                backgroundColor: AppColors.offWhite,
                padding: const EdgeInsets.symmetric(vertical: 12),
                side: const BorderSide(color: AppColors.borderLight),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const PhIcon(LucideIcons.arrowRight, size: 14, color: AppColors.textSecondary),
              label: const Text('المتابعة كزائر بدون تسجيل', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ],
        ),
      ),
    );
  }
}
