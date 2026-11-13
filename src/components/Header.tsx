import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  X,
  Phone,
  ShieldCheck,
  Truck,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
  FileText
} from 'lucide-react';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { AppUser } from '../types';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  currentUser: AppUser | null;
  activePage: string;
  onNavigate: (page: string, params?: any) => void;
  onSearch: (query: string) => void;
  onLogout: () => void;
  /** True while the shared backend cart is being updated. */
  cartSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  currentUser,
  activePage,
  onNavigate,
  onSearch,
  onLogout,
  cartSyncing = false
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearch(searchVal.trim());
      onNavigate('search', { query: searchVal.trim() });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFFFF] shadow-[0_2px_12px_rgba(15,23,42,0.06)] border-b border-[#F1F5F9]">
      {/* 1. Announcement Bar */}
      <div className="bg-[#0F172A] text-white text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#2EC4B6] font-medium">
              <Truck className="w-3.5 h-3.5" />
              توصيل سريع لكافة المدن والبلدات في الضفة والقدس وغزة
            </span>
            <span className="hidden md:inline text-slate-400">•</span>
            <span className="hidden md:flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />
              ضمان استبدال فوري ودفع آمن عند الاستلام
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <button
              onClick={() => onNavigate('tracking')}
              className="hover:text-[#2EC4B6] transition-colors flex items-center gap-1"
            >
              تتبع شحنتك
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => onNavigate('contact')}
              className="hover:text-[#2EC4B6] transition-colors flex items-center gap-1"
            >
              <Phone className="w-3 h-3 text-[#2EC4B6]" />
              خدمة العملاء: 0599123456
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Desktop / Mobile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-right group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2EC4B6] text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                PH
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-[#0F172A] tracking-tight leading-none group-hover:text-[#2EC4B6] transition-colors">
                  بادهاوس
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5 tracking-wider">
                  PADHOUSE • ملحقات آيباد
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="ابحث عن قلم بادهاوس، كفر آيباد برو، كيبورد، شاشة PaperFeel..."
                className="w-full bg-[#F8FAFC] text-[#0F172A] placeholder-slate-400 text-sm rounded-xl py-2.5 pr-11 pl-24 border border-slate-200 focus:outline-none focus:border-[#2EC4B6] focus:bg-white focus:ring-2 focus:ring-[#2EC4B6]/20 transition-all"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button
                type="submit"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-[#2EC4B6] hover:bg-[#25a99d] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
              >
                بحث
              </button>
            </form>
          </div>

          {/* Actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* User Account / Profile */}
            <div className="relative">
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden lg:flex flex-col text-right">
                      <span className="text-xs font-bold text-[#0F172A] leading-tight line-clamp-1">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] text-slate-500">حسابي</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:inline" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-[#0F172A]">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full text-right px-4 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2EC4B6] flex items-center justify-between"
                      >
                        لوحة التحكم والبيانات
                        <User className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate('orders');
                        }}
                        className="w-full text-right px-4 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2EC4B6] flex items-center justify-between"
                      >
                        طلباتي السابقة
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate('tracking');
                        }}
                        className="w-full text-right px-4 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2EC4B6] flex items-center justify-between"
                      >
                        تتبع الطلب
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full text-right px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          تسجيل الخروج
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] hover:text-[#2EC4B6] py-2 px-3 rounded-xl hover:bg-[#F8FAFC] transition-colors"
                >
                  <User className="w-4 h-4 text-[#2EC4B6]" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </button>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              onClick={() => onNavigate('wishlist')}
              className="relative p-2.5 rounded-xl text-[#0F172A] hover:text-[#2EC4B6] hover:bg-[#F8FAFC] transition-colors"
              title="المفضلة"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-sm group"
            >
              <div className="relative">
                <ShoppingBag className={`w-4 h-4 text-[#2EC4B6] group-hover:scale-110 transition-transform ${cartSyncing ? 'animate-pulse' : ''}`} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#2EC4B6] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">{cartSyncing ? 'جارٍ المزامنة…' : 'السلة'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="mt-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="ابحث في المتجر..."
              className="w-full bg-[#F8FAFC] text-sm rounded-xl py-2 pr-10 pl-20 border border-slate-200 focus:outline-none focus:border-[#2EC4B6]"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <button
              type="submit"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-[#2EC4B6] text-white text-xs px-2.5 py-1 rounded-lg"
            >
              بحث
            </button>
          </form>
        </div>
      </div>

      {/* 3. Desktop Category Navigation Bar */}
      <nav className="hidden md:block bg-[#F8FAFC] border-t border-[#F1F5F9] px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('home')}
              className={`py-3 px-3.5 text-xs font-bold transition-colors ${
                activePage === 'home'
                  ? 'text-[#2EC4B6] border-b-2 border-[#2EC4B6]'
                  : 'text-[#0F172A] hover:text-[#2EC4B6]'
              }`}
            >
              الرئيسية
            </button>

            <button
              onClick={() => onNavigate('products')}
              className={`py-3 px-3.5 text-xs font-bold transition-colors ${
                activePage === 'products'
                  ? 'text-[#2EC4B6] border-b-2 border-[#2EC4B6]'
                  : 'text-[#0F172A] hover:text-[#2EC4B6]'
              }`}
            >
              جميع المنتجات
            </button>

            <div className="relative group">
              <button
                onClick={() => onNavigate('categories')}
                className="py-3 px-3.5 text-xs font-bold text-[#0F172A] group-hover:text-[#2EC4B6] flex items-center gap-1 transition-colors"
              >
                <span>التصنيفات المعتمدة</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2EC4B6]" />
              </button>

              {/* Mega Dropdown */}
              <div className="absolute right-0 top-full hidden group-hover:grid grid-cols-3 gap-2 w-[540px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50">
                {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onNavigate('products', { category: cat.id })}
                    className="p-3 text-right rounded-xl hover:bg-[#F8FAFC] border border-transparent hover:border-slate-100 transition-all text-right"
                  >
                    <span className="block text-xs font-bold text-[#0F172A] mb-1 hover:text-[#2EC4B6]">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigate('products', { category: 'cat_pens' })}
              className="py-3 px-3 text-xs font-medium text-slate-600 hover:text-[#2EC4B6] transition-colors"
            >
              أقلام بادهاوس
            </button>

            <button
              onClick={() => onNavigate('products', { category: 'cat_keyboards' })}
              className="py-3 px-3 text-xs font-medium text-slate-600 hover:text-[#2EC4B6] transition-colors"
            >
              كيبوردات الآيباد
            </button>

            <button
              onClick={() => onNavigate('products', { category: 'cat_cases' })}
              className="py-3 px-3 text-xs font-medium text-slate-600 hover:text-[#2EC4B6] transition-colors"
            >
              الكفرات والحقائب
            </button>

            <button
              onClick={() => onNavigate('products', { category: 'cat_others' })}
              className="py-3 px-3 text-xs font-medium text-slate-600 hover:text-[#2EC4B6] transition-colors"
            >
              شاشات الورق PaperFeel
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('faq')}
              className="text-xs text-slate-500 hover:text-[#2EC4B6] transition-colors font-medium"
            >
              الأسئلة الشائعة
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('about')}
              className="text-xs text-slate-500 hover:text-[#2EC4B6] transition-colors font-medium"
            >
              من نحن
            </button>
          </div>
        </div>
      </nav>

      {/* 4. Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 animate-in slide-in-from-top-3">
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('home');
              }}
              className="text-right py-2 px-3 text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg"
            >
              الصفحة الرئيسية
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('products');
              }}
              className="text-right py-2 px-3 text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg"
            >
              جميع المنتجات (21 منتج)
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('categories');
              }}
              className="text-right py-2 px-3 text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg"
            >
              تصفح الأقسام والتصنيفات
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('orders');
              }}
              className="text-right py-2 px-3 text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg"
            >
              طلباتي السابقة
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('tracking');
              }}
              className="text-right py-2 px-3 text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg"
            >
              تتبع شحنة
            </button>
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-col space-y-1">
            <span className="text-[11px] font-bold text-slate-400 px-3">التصنيفات</span>
            {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('products', { category: cat.id });
                }}
                className="text-right py-1.5 px-3 text-xs text-slate-600 hover:text-[#2EC4B6]"
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-col space-y-1 text-xs text-slate-500">
            <button onClick={() => { setMobileMenuOpen(false); onNavigate('about'); }} className="text-right py-1 px-3">من نحن</button>
            <button onClick={() => { setMobileMenuOpen(false); onNavigate('contact'); }} className="text-right py-1 px-3">تواصل معنا</button>
            <button onClick={() => { setMobileMenuOpen(false); onNavigate('faq'); }} className="text-right py-1 px-3">الأسئلة الشائعة</button>
          </div>
        </div>
      )}
    </header>
  );
};

