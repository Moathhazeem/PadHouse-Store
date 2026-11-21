import React from 'react';
import { Phone, Mail, MapPin, ChevronLeft } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-ph-brand-dark text-white pt-10 pb-6 border-t border-ph-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">


        {/* Links & Information Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 py-8 border-b border-ph-border text-right">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-ph-brand text-white flex items-center justify-center font-black text-base shadow-sm">
                PH
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                بادهاوس — PadHouse
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed max-w-sm">
              المتجر الفلسطيني المتخصص والأول في توفير أرقى ملحقات أجهزة الآيباد، الكيبوردات، الأقلام الذكية، الشاشات الواقية والحوامل الاحترافية بمعايير دقة وضمان لا تضاهى.
            </p>
            <div className="flex flex-col space-y-2 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ph-brand" />
                <span>فلسطين — رام الله والبيرة، وتوصيل لكافة المحافظات</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-ph-brand" />
                <span dir="ltr">+970 59 912 3456</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-ph-brand" />
                <span>support@padhouse.ps</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider text-ph-brand">
              روابط المتجر
            </h5>
            <ul className="space-y-2 text-xs text-white/80">
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
            <h5 className="text-xs font-bold text-white uppercase tracking-wider text-ph-brand">
              خدمة العملاء
            </h5>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <button onClick={() => onNavigate('about')} className="rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ph-brand/70">
                  من نحن
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ph-brand/70">
                  تواصل معنا
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ph-brand/70">
                  الأسئلة الشائعة (FAQ)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orders')} className="rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ph-brand/70">
                  سجل طلباتي
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('wishlist')} className="rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ph-brand/70">
                  قائمة الرغبات
                </button>
              </li>
            </ul>
          </div>

          {/* Policies & Terms */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider text-ph-brand">
              السياسات والضمان
            </h5>
            <ul className="space-y-2 text-xs text-white/80">
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
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-white/80 gap-4">
          <p>© {new Date().getFullYear()} بادهاوس (PadHouse Palestine). جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>طرق الدفع المتاحة: الدفع عند الاستلام • بال باي (PalPay) • حوالة بنكية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

