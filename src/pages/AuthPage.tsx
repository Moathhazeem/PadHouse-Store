import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
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
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2EC4B6] text-white flex items-center justify-center font-black text-xl mx-auto shadow-sm">
            PH
          </div>
          <h1 className="text-2xl font-black text-[#0F172A]">
            {mode === 'login' ? 'تسجيل الدخول إلى بادهاوس' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-xs text-slate-500">
            {mode === 'login'
              ? 'أهلاً بك مجدداً! تابع طلباتك وتفضيلاتك بكل سهولة'
              : 'سجل حسابك للاستفادة من تتبع الشحنات وحفظ السلة والمفضلة'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">الاسم الكامل *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد الفلسطيني"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2EC4B6] focus:bg-white"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">البريد الإلكتروني *</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2EC4B6] focus:bg-white text-left dir-ltr"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">رقم الهاتف (واتساب) *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="0599123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2EC4B6] focus:bg-white text-left dir-ltr"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">المدينة / المحافظة *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2EC4B6] focus:bg-white"
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
            <label className="text-xs font-bold text-[#0F172A] block mb-1">كلمة المرور *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2EC4B6] focus:bg-white text-left dir-ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#0F172A] hover:bg-[#2EC4B6] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب الآن'}
            </span>
          </button>
        </form>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />
          <span>بياناتك محمية ومشفرة على خوادم بادهاوس</span>
        </div>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-slate-100">
          {mode === 'login' ? (
            <p className="text-xs text-slate-500">
              ليس لديك حساب بعد؟{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className="text-[#2EC4B6] font-bold hover:underline"
              >
                إنشاء حساب جديد
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              لديك حساب بالفعل؟{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="text-[#2EC4B6] font-bold hover:underline"
              >
                تسجيل الدخول
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
