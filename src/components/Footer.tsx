import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Heart,
  ChevronLeft
} from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#0F172A] text-white pt-14 pb-8 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Value Propositions / Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-800">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">توصيل سريع وموثوق</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                توصيل لجميع محافظات الضفة، القدس، وغزة خلال 24-48 ساعة.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">ضمان أصلي حقيقي</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                جميع المنتجات مضمونة مع استبدال فوري في حال أي عيب مصنعي.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">استرجاع واستبدال مرن</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                إمكانية استبدال القطع ومراجعة التوافق مع موديل جهازك بكل سهولة.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">الدفع عند الاستلام</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                ادفع نقداً عند باب منزلك بعد فحص ومعاينة الطرد وسلامته.
              </p>
            </div>
          </div>
        </div>

        {/* Links & Information Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 py-12 border-b border-slate-800 text-right">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2EC4B6] text-white flex items-center justify-center font-black text-base shadow-sm">
                PH
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                بادهاوس — PadHouse
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              المتجر الفلسطيني المتخصص والأول في توفير أرقى ملحقات أجهزة الآيباد، الكيبوردات، الأقلام الذكية، الشاشات الواقية والحوامل الاحترافية بمعايير دقة وضمان لا تضاهى.
            </p>
            <div className="flex flex-col space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2EC4B6]" />
                <span>فلسطين — رام الله والبيرة، وتوصيل لكافة المحافظات</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#2EC4B6]" />
                <span dir="ltr">+970 59 912 3456</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#2EC4B6]" />
                <span>support@padhouse.ps</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider text-[#2EC4B6]">
              روابط المتجر
            </h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  الصفحة الرئيسية
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('products')} className="hover:text-white transition-colors">
                  جميع المنتجات (21 منتج)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('categories')} className="hover:text-white transition-colors">
                  الأقسام والتصنيفات
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('cart')} className="hover:text-white transition-colors">
                  سلة المشتريات
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tracking')} className="hover:text-white transition-colors">
                  تتبع الشحنة الفوري
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider text-[#2EC4B6]">
              خدمة العملاء
            </h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors">
                  من نحن
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  تواصل معنا
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors">
                  الأسئلة الشائعة (FAQ)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orders')} className="hover:text-white transition-colors">
                  سجل طلباتي
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('wishlist')} className="hover:text-white transition-colors">
                  قائمة الرغبات
                </button>
              </li>
            </ul>
          </div>

          {/* Policies & Terms */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider text-[#2EC4B6]">
              السياسات والضمان
            </h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('shipping_policy')} className="hover:text-white transition-colors">
                  سياسة الشحن والتوصيل
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('refund_policy')} className="hover:text-white transition-colors">
                  سياسة الاستبدال والاسترجاع
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('warranty_policy')} className="hover:text-white transition-colors">
                  سياسة الضمان المعتمد
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy_policy')} className="hover:text-white transition-colors">
                  سياسة الخصوصية
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">
                  الشروط والأحكام
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} بادهاوس (PadHouse Palestine). جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>طرق الدفع المتاحة: الدفع عند الاستلام • بال باي (PalPay) • حوالة بنكية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

