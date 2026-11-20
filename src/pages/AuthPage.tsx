import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from '../types';
import { PALESTINIAN_CITIES } from '../data/catalog';
import {
  loginApi,
  registerApi,
  validatePhoneApi,
  fetchGovernoratesApi,
  type BackendUser,
} from '../services/api';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onLoginSuccess: (user: AppUser) => void | Promise<void>;
  onNavigate: (page: string) => void;
}

/** Map the backend user record onto the website's session model. */
function mapBackendUser(user: BackendUser, city?: string): AppUser {
  let role: AppUser['role'] = 'customer';
  if (user.role === 'SUPER_ADMIN') role = 'super_admin';
  else if (user.role === 'ADMIN') role = 'admin';

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone || '',
    city: city || '',
    role,
    customerProfileId: user.customerProfileId,
  };
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onLoginSuccess,
  onNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('رام الله والبيرة');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Cities come from the shared backend (المحافظات والمدن) so the storefront
  // and the mobile app always offer the same, verified delivery areas.
  const [cities, setCities] = useState<string[]>(
    PALESTINIAN_CITIES.map((c) => c.name),
  );

  useEffect(() => {
    fetchGovernoratesApi()
      .then((list) => {
        const names = (list || []).flatMap((g) => g.cities.map((c) => c.name));
        if (names.length > 0) setCities(names);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(null);

    const emailTrim = email.trim().toLowerCase();
    const passTrim = password.trim();

    if (!emailTrim || !passTrim) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMsg('يرجى كتابة الاسم الكامل');
        return;
      }
      if (passTrim.length < 6) {
        setErrorMsg('كلمة المرور يجب ألا تقل عن 6 خانات');
        return;
      }
      // Palestinian phone verification (التحقق من أرقام الهواتف الفلسطينية)
      if (phone.trim()) {
        try {
          const res = await validatePhoneApi(phone.trim());
          if (!res.valid) {
            setErrorMsg(res.message || 'يرجى إدخال رقم هاتف فلسطيني صحيح (مثال: 0599123456)');
            return;
          }
        } catch {
          // If the validation service is unreachable we let registration proceed;
          // the backend re-validates the phone on order creation.
        }
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await loginApi(emailTrim, passTrim);
        await onLoginSuccess(mapBackendUser(res.user));
      } else {
        const res = await registerApi({
          fullName: name.trim(),
          email: emailTrim,
          password: passTrim,
          phone: phone.trim() || undefined,
          city,
        });
        await onLoginSuccess(mapBackendUser(res.user, city));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-right">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl p-8 border border-ph-border shadow-xl space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="w-12 h-12 rounded-2xl bg-ph-brand text-white flex items-center justify-center font-black text-xl mx-auto shadow-sm"
          >
            PH
          </motion.div>
          <h1 className="text-2xl font-black text-ph-ink">
            {mode === 'login' ? 'تسجيل الدخول إلى بادهاوس' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-xs text-ph-muted">
            {mode === 'login'
              ? 'أهلاً بك مجدداً! تابع طلباتك وتفضيلاتك بكل سهولة'
              : 'سجل حسابك للاستفادة من تتبع الشحنات وحفظ السلة والمفضلة'}
          </p>
        </div>

        {/* Quick Admin Helper Badge */}
        {mode === 'login' && (
          <div className="p-3 bg-ph-surface-soft border border-ph-border rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-ph-ink block">حساب الإدارة الافتراضي:</span>
              <span className="font-mono text-[11px] text-ph-muted dir-ltr inline-block">admin@gmail.com / 123456789</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@gmail.com');
                setPassword('123456789');
              }}
              className="text-[11px] font-bold text-ph-brand hover:underline px-2.5 py-1 bg-white border border-ph-border rounded-lg shadow-2xs"
            >
              تعبئة تلقائية
            </button>
          </div>
        )}

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-50 border border-red-200 text-[#DC2626] text-xs rounded-xl font-medium"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form with Mode Switch Animation */}
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-ph-ink block mb-1">الاسم الكامل *</label>
                <div className="ph-input-wrapper">
                  <div className="ph-input-icon-start">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد الفلسطيني"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ph-input-field text-right"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-ph-ink block mb-1">البريد الإلكتروني *</label>
              <div className="ph-input-wrapper">
                <div className="ph-input-icon-start">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="ph-input-field text-left font-sans"
                />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-bold text-ph-ink block mb-1">رقم الهاتف (واتساب) *</label>
                  <div className="ph-input-wrapper">
                    <div className="ph-input-icon-start">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="0599123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      dir="ltr"
                      className="ph-input-field text-left font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-ph-ink block mb-1">المدينة / المحافظة *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border border-ph-border rounded-xl px-3 py-2.5 text-xs text-ph-ink focus:outline-none focus:border-ph-brand focus:ring-2 focus:ring-ph-brand/20 transition-all"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-ph-ink block mb-1">كلمة المرور *</label>
              <div className="ph-input-wrapper">
                <div className="ph-input-icon-start">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="ph-input-field text-left font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="ph-input-icon-end text-ph-muted hover:text-ph-ink transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy}
              className="w-full bg-ph-brand hover:bg-ph-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب الآن'}
              </span>
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-ph-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-ph-brand" />
          <span>بياناتك محمية ومشفرة على خوادم بادهاوس</span>
        </div>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-ph-border">
          {mode === 'login' ? (
            <p className="text-xs text-ph-muted">
              ليس لديك حساب بعد؟{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className="text-ph-brand font-bold hover:underline"
              >
                إنشاء حساب جديد
              </button>
            </p>
          ) : (
            <p className="text-xs text-ph-muted">
              لديك حساب بالفعل؟{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="text-ph-brand font-bold hover:underline"
              >
                تسجيل الدخول
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

