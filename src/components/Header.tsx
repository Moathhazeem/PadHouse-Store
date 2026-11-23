import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
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
  FileText,
  Bell,
  Settings,
  Tag,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OFFICIAL_CATEGORIES } from '../data/catalog';
import { SearchBar } from './SearchBar';
import { AppUser, Product } from '../types';
import {
  fetchMyNotificationsApi,
  markMyNotificationReadApi,
  markAllMyNotificationsReadApi,
  type UserNotification,
} from '../services/api';

/** Arabic relative-time label for a notification timestamp. */
function relativeAr(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `منذ ${diffH} ساعة`;
  return `منذ ${Math.floor(diffH / 24)} يوم`;
}

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  currentUser: AppUser | null;
  activePage: string;
  /** Full catalog, used by the search bar for instant results and suggestions. */
  products: Product[];
  onNavigate: (page: string, params?: any) => void;
  onSearch: (query: string) => void;
  onSelectProduct: (product: Product) => void;
  onLogout: () => void;
  /** True while the shared backend cart is being updated. */
  cartSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  currentUser,
  activePage,
  products,
  onNavigate,
  onSearch,
  onSelectProduct,
  onLogout,
  cartSyncing = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  /* ── Admin check (used by the account dropdown) ── */
  const isAdmin = currentUser && ['super_admin', 'admin'].includes(currentUser.role);

  /* ── Customer notifications bell + drawer ── */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');

  const loadMyNotifications = useCallback(async () => {
    if (!currentUser) return;
    setNotifLoading(true);
    try {
      const { notifications: list, unreadCount } = await fetchMyNotificationsApi();
      setNotifications(list);
      setNotifUnread(unreadCount);
      setNotifError('');
    } catch (error: any) {
      setNotifications([]);
      setNotifUnread(0);
      setNotifError(error?.message || 'تعذر تحميل التنبيهات');
    } finally {
      setNotifLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setNotifUnread(0);
      setNotifError('');
      return;
    }
    loadMyNotifications();
    const timer = setInterval(loadMyNotifications, 30_000);
    return () => clearInterval(timer);
  }, [currentUser, loadMyNotifications]);

  /** Visual treatment (icon + colors) for each notification category. */
  const notifStyle = (type: string) => {
    switch (type) {
      case 'URGENT_CRISIS':
        return { icon: AlertTriangle, color: '#EF4444', bg: '#EF44441A' };
      case 'CRISIS_RESOLVED':
      case 'ORDER_ARRIVED':
        return { icon: CheckCircle2, color: '#16A34A', bg: '#16A34A14' };
      case 'PROMOTION':
        return { icon: Tag, color: '#D97706', bg: '#D9770614' };
      case 'ORDER_CONFIRMATION':
        return { icon: PackageCheck, color: '#0EA5A4', bg: '#0EA5A414' };
      case 'ORDER_APPROACHING':
        return { icon: Truck, color: '#4F46E5', bg: '#4F46E514' };
      case 'CART_REMINDER':
        return { icon: ShoppingBag, color: '#D97706', bg: '#D9770614' };
      default:
        return { icon: Truck, color: '#0EA5A4', bg: '#0EA5A414' };
    }
  };

  const handleOpenNotification = async (n: UserNotification) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setNotifUnread((c) => Math.max(0, c - 1));
      try {
        await markMyNotificationReadApi(n.id);
      } catch {}
    }
    setNotifOpen(false);
    if (n.type === 'CART_REMINDER') {
      onNavigate('cart');
    } else if (n.orderId) {
      onNavigate('tracking', { orderId: n.orderId });
    } else if (n.type === 'PROMOTION') {
      onNavigate('products');
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setNotifUnread(0);
    try {
      await markAllMyNotificationsReadApi();
    } catch {}
  };

  const handleSearchSubmit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    onSearch(q);
    onNavigate('search', { query: q });
  };

  // Cart badge pop animation on cartCount change
  useEffect(() => {
    const badge = badgeRef.current;
    if (!badge || cartCount === 0) return;
    badge.classList.remove('ph-badge-pop');
    // Force reflow to restart animation
    void badge.offsetWidth;
    badge.classList.add('ph-badge-pop');
    const timer = setTimeout(() => {
      badge.classList.remove('ph-badge-pop');
    }, 500);
    return () => clearTimeout(timer);
  }, [cartCount]);

  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -6 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -6 },
  };

  const dropdownTransition = { duration: 0.15, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] border-b border-ph-border">
      {/* Main Desktop / Mobile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-ph-ink hover:bg-white rounded-lg transition-colors duration-200"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <motion.button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-right group"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="w-10 h-10 rounded-xl bg-ph-brand text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                PH
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-ph-ink tracking-tight leading-none group-hover:text-ph-brand transition-colors duration-200">
                  بادهاوس
                </span>
                <span className="text-[10px] text-ph-muted font-semibold mt-0.5 tracking-wider">
                  PADHOUSE • ملحقات آيباد
                </span>
              </div>
            </motion.button>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchBar
              products={products}
              onSelectProduct={onSelectProduct}
              onSubmit={handleSearchSubmit}
            />
          </div>

          <button onClick={() => onNavigate('products')} className="hidden sm:inline-flex shrink-0 items-center rounded-xl border border-ph-brand px-3 py-2 text-xs font-bold text-ph-brand hover:bg-ph-brand hover:text-white transition-colors duration-200">جميع المنتجات</button>
          {/* Actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* User Account / Profile */}
            <div className="relative">
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl hover:bg-white transition-colors duration-200 border border-transparent hover:border-ph-border"
                  >
                    <div className="w-8 h-8 rounded-full bg-ph-brand text-white flex items-center justify-center font-bold text-xs">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden lg:flex flex-col text-right">
                      <span className="text-xs font-bold text-ph-ink leading-tight line-clamp-1">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] text-ph-muted">حسابي</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-ph-muted hidden lg:inline" />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={dropdownTransition}
                        style={{ transformOrigin: 'top right' }}
                        className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-ph-border py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-ph-border">
                          <p className="text-xs font-bold text-ph-ink">{currentUser.name}</p>
                          <p className="text-[11px] text-ph-muted truncate">{currentUser.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('profile');
                          }}
                          className="w-full text-right px-4 py-2 text-xs text-ph-ink hover:bg-white hover:text-ph-brand flex items-center justify-between transition-colors duration-200"
                        >
                          لوحة التحكم والبيانات
                          <User className="w-3.5 h-3.5 text-ph-muted" />
                        </button>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('orders');
                          }}
                          className="w-full text-right px-4 py-2 text-xs text-ph-ink hover:bg-white hover:text-ph-brand flex items-center justify-between transition-colors duration-200"
                        >
                          طلباتي السابقة
                          <Truck className="w-3.5 h-3.5 text-ph-muted" />
                        </button>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('tracking');
                          }}
                          className="w-full text-right px-4 py-2 text-xs text-ph-ink hover:bg-white hover:text-ph-brand flex items-center justify-between transition-colors duration-200"
                        >
                          تتبع الطلب
                          <ArrowRight className="w-3.5 h-3.5 text-ph-muted" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onNavigate('admin');
                            }}
                            className="w-full text-right px-4 py-2 text-xs text-ph-brand font-bold hover:bg-ph-brand/5 flex items-center justify-between transition-colors duration-200"
                          >
                            لوحة إدارة المتجر
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="border-t border-ph-border mt-1 pt-1">
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onLogout();
                            }}
                            className="w-full text-right px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors duration-200"
                          >
                            تسجيل الخروج
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-1.5 text-xs font-bold text-ph-ink hover:text-ph-brand py-2 px-3 rounded-xl hover:bg-white transition-colors duration-200"
                >
                  <User className="w-4 h-4 text-ph-brand" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </button>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              onClick={() => onNavigate('wishlist')}
              className="relative p-2.5 rounded-xl text-ph-ink hover:text-ph-brand hover:bg-white transition-colors duration-200"
              title="المفضلة"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-ph-brand text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Customer Notifications Bell + Drawer */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    if (!notifOpen) loadMyNotifications();
                  }}
                  className="relative p-2.5 rounded-xl text-ph-ink hover:text-ph-brand hover:bg-white transition-colors duration-200"
                  title="التنبيهات"
                  aria-label="التنبيهات"
                >
                  <Bell className="w-5 h-5" />
                  {notifUnread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ph-brand px-1 text-[10px] font-black text-white">
                      {notifUnread > 99 ? '99+' : notifUnread}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <>
                      {/* click-away backdrop */}
                      <button
                        aria-label="إغلاق"
                        onClick={() => setNotifOpen(false)}
                        className="fixed inset-0 z-40 cursor-default"
                      />
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={dropdownTransition}
                        style={{ transformOrigin: 'top left' }}
                        className="absolute left-0 mt-2 w-[340px] sm:w-[380px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-ph-border z-50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-ph-border">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-ph-ink">مركز التنبيهات</span>
                            {notifUnread > 0 && (
                              <span className="bg-ph-brand text-white text-[10px] font-black rounded-full px-2 py-0.5">
                                {notifUnread}
                              </span>
                            )}
                          </div>
                          {notifUnread > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[11px] font-bold text-ph-brand hover:underline"
                            >
                              تحديد الكل كمقروء
                            </button>
                          )}
                        </div>

                        <div className="max-h-[380px] overflow-y-auto">
                          {notifLoading && notifications.length === 0 ? (
                            <div className="py-10 text-center text-xs text-ph-muted">جارٍ التحميل…</div>
                          ) : notifications.length === 0 ? (
                            <div className="py-10 px-6 text-center">
                              <Inbox className="w-8 h-8 text-ph-muted mx-auto mb-2" />
                              <p className="text-xs font-bold text-ph-ink">{notifError || 'لا توجد تنبيهات حالياً'}</p>
                              {!notifError && <p className="text-[11px] text-ph-muted mt-1">ستظهر هنا تحديثات طلباتك والعروض وحالات الطوارئ.</p>}
                            </div>
                          ) : (
                            notifications.map((n) => {
                              const style = notifStyle(n.type);
                              const Icon = style.icon;
                              return (
                                <button
                                  key={n.id}
                                  onClick={() => handleOpenNotification(n)}
                                  className={`w-full text-right px-4 py-3 flex items-start gap-3 border-b border-ph-border/60 transition-colors duration-200 hover:bg-ph-brand/5 ${
                                    n.isRead ? 'bg-white' : 'bg-ph-brand/[0.04]'
                                  }`}
                                >
                                  <span
                                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: style.bg, color: style.color }}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                      <span
                                        className={`text-xs leading-tight line-clamp-1 ${
                                          n.isRead ? 'font-bold text-ph-ink' : 'font-black text-ph-ink'
                                        }`}
                                      >
                                        {n.title}
                                      </span>
                                      {!n.isRead && (
                                        <span className="shrink-0 w-2 h-2 rounded-full bg-ph-brand" />
                                      )}
                                    </span>
                                    <span className="block text-[11px] text-ph-muted leading-relaxed mt-1 line-clamp-2">
                                      {n.message}
                                    </span>
                                    <span className="block text-[10px] text-ph-muted/80 mt-1">
                                      {relativeAr(n.createdAt)}
                                    </span>
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Shopping Cart Button */}
            <button
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-sm group"
            >
              <div className="relative">
                <ShoppingBag className={`w-4 h-4 text-white group-hover:scale-110 transition-transform ${cartSyncing ? 'animate-pulse' : ''}`} />
                {cartCount > 0 && (
                  <span
                    ref={badgeRef}
                    key={cartCount}
                    className="ph-cart-badge absolute -top-2 -right-2 bg-white text-ph-brand text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                  >
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
          <SearchBar
            products={products}
            onSelectProduct={onSelectProduct}
            onSubmit={handleSearchSubmit}
            placeholder="ابحث في المتجر..."
          />
        </div>
      </div>

      {/* 3. Desktop Category Navigation Bar */}
      {false && <nav className="hidden md:block bg-white border-t border-ph-border px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('home')}
              className={`py-3 px-3.5 text-xs font-bold transition-colors duration-200 ${
                activePage === 'home'
                  ? 'text-ph-brand border-b-2 border-ph-brand'
                  : 'text-ph-ink hover:text-ph-brand'
              }`}
            >
              الرئيسية
            </button>

            <button
              onClick={() => onNavigate('products')}
              className={`py-3 px-3.5 text-xs font-bold transition-colors duration-200 ${
                activePage === 'products'
                  ? 'text-ph-brand border-b-2 border-ph-brand'
                  : 'text-ph-ink hover:text-ph-brand'
              }`}
            >
              جميع المنتجات
            </button>

            <div className="relative group">
              <button
                onClick={() => onNavigate('categories')}
                className="py-3 px-3.5 text-xs font-bold text-ph-ink group-hover:text-ph-brand flex items-center gap-1 transition-colors duration-200"
              >
                <span>التصنيفات المعتمدة</span>
                <ChevronDown className="w-3.5 h-3.5 text-ph-muted group-hover:text-ph-brand" />
              </button>

              {/* Mega Dropdown */}
              <div className="absolute right-0 top-full hidden group-hover:grid grid-cols-3 gap-2 w-[540px] bg-white rounded-2xl shadow-2xl border border-ph-border p-4 z-50">
                {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onNavigate('products', { category: cat.id })}
                    className="p-3 text-right rounded-xl hover:bg-white border border-transparent hover:border-ph-border transition-all text-right"
                  >
                    <span className="block text-xs font-bold text-ph-ink mb-1 hover:text-ph-brand">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-ph-muted line-clamp-2 leading-relaxed">
                      {cat.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigate('products', { category: 'cat_pens' })}
              className="py-3 px-3 text-xs font-medium text-ph-muted hover:text-ph-brand transition-colors duration-200"
            >
              أقلام بادهاوس
            </button>

            <button
              onClick={() => onNavigate('products', { category: 'cat_keyboards' })}
              className="py-3 px-3 text-xs font-medium text-ph-muted hover:text-ph-brand transition-colors duration-200"
            >
              كيبوردات الآيباد
            </button>

            <button
              onClick={() => onNavigate('products', { category: 'cat_cases' })}
              className="py-3 px-3 text-xs font-medium text-ph-muted hover:text-ph-brand transition-colors duration-200"
            >
              الكفرات والحقائب
            </button>

            <button
              onClick={() => onNavigate('products', { category: 'cat_others' })}
              className="py-3 px-3 text-xs font-medium text-ph-muted hover:text-ph-brand transition-colors duration-200"
            >
              شاشات الورق PaperFeel
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('faq')}
              className="text-xs text-ph-muted hover:text-ph-brand transition-colors duration-200 font-medium"
            >
              الأسئلة الشائعة
            </button>
            <span className="text-ph-muted">•</span>
            <button
              onClick={() => onNavigate('about')}
              className="text-xs text-ph-muted hover:text-ph-brand transition-colors duration-200 font-medium"
            >
              من نحن
            </button>
          </div>
        </div>
      </nav>}

      {/* 4. Mobile Menu Drawer — animated with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white/95 border-t border-ph-border px-4 py-4 space-y-3"
          >
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('home');
                }}
                className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200"
              >
                الصفحة الرئيسية
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('products');
                }}
                className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200"
              >
                جميع المنتجات (21 منتج)
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('categories');
                }}
                className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200"
              >
                تصفح الأقسام والتصنيفات
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('orders');
                }}
                className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200"
              >
                طلباتي السابقة
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('tracking');
                }}
                className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200"
              >
                تتبع شحنة
              </button>
              <button onClick={() => { setMobileMenuOpen(false); onNavigate('about'); }} className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200">من نحن</button>
              <button onClick={() => { setMobileMenuOpen(false); onNavigate('faq'); }} className="text-right py-2 px-3 text-sm font-bold text-ph-ink hover:bg-white rounded-lg transition-colors duration-200">الأسئلة الشائعة</button>
            </div>

            <div className="border-t border-ph-border pt-3 flex flex-col space-y-1">
              <span className="text-[11px] font-bold text-ph-muted px-3">التصنيفات</span>
              {OFFICIAL_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('products', { category: cat.id });
                  }}
                  className="text-right py-1.5 px-3 text-xs text-ph-muted hover:text-ph-brand transition-colors duration-200"
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="border-t border-ph-border pt-3 flex flex-col space-y-1 text-xs text-ph-muted">
              <button onClick={() => { setMobileMenuOpen(false); onNavigate('about'); }} className="text-right py-1 px-3 transition-colors duration-200">من نحن</button>
              <button onClick={() => { setMobileMenuOpen(false); onNavigate('contact'); }} className="text-right py-1 px-3 transition-colors duration-200">تواصل معنا</button>
              <button onClick={() => { setMobileMenuOpen(false); onNavigate('faq'); }} className="text-right py-1 px-3 transition-colors duration-200">الأسئلة الشائعة</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
