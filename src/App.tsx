import React, { useState, useEffect, useCallback } from 'react';
import { Product, CartItem, Order, AppUser } from './types';
import { FALLBACK_PRODUCTS, OFFICIAL_CATEGORIES } from './data/catalog';
import {
  fetchProductsApi,
  fetchCartApi,
  addCartItemApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
  fetchMyOrdersApi,
  cancelOrderApi,
  fetchWishlistApi,
  addWishlistApi,
  removeWishlistApi,
  clearTokens,
  getAccessToken,
  backendOrderToOrder,
  type BackendCart,
} from './services/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartAndCheckoutPage } from './pages/CartAndCheckoutPage';
import { AuthPage } from './pages/AuthPage';
import { TrackingPage } from './pages/TrackingPage';
import { StaticPages } from './pages/StaticPages';
import { UserProfilePage } from './pages/UserProfilePage';
import { ProductCard } from './components/ProductCard';
import { CheckCircle2, ChevronLeft, Heart } from 'lucide-react';

/** Convert a backend cart (shared with the mobile app) into renderable cart items. */
function backendCartToItems(cart: BackendCart | null, products: Product[]): CartItem[] {
  if (!cart?.items) return [];
  return cart.items.map((line) => {
    const known = products.find((p) => p.id === line.productId || p.sku === line.productId);
    const product: Product = known
      ? { ...known, price: line.price }
      : {
          id: line.productId,
          sku: line.productId,
          name: line.productName,
          categories: ['cat_others'],
          price: line.price,
          originalPrice: line.price,
          stock: line.availableStock,
          minThreshold: 5,
          compatibility: 'جميع أجهزة iPad المدعومة',
          rating: 0,
          reviewsCount: 0,
          image: line.image,
          images: [line.image],
          description: '',
          colors: [line.color].filter(Boolean),
        };
    return {
      product,
      quantity: line.quantity,
      selectedColor: line.color,
      cartItemId: line.id,
      variantId: line.variantId,
      availableStock: line.availableStock,
    };
  });
}

export default function App() {
  // Products state (loads from backend API, falls back cleanly)
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product>(FALLBACK_PRODUCTS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Page Routing State
  const [activePage, setActivePage] = useState<
    | 'home'
    | 'products'
    | 'categories'
    | 'product_details'
    | 'search'
    | 'cart'
    | 'checkout'
    | 'wishlist'
    | 'login'
    | 'register'
    | 'profile'
    | 'orders'
    | 'tracking'
    | 'about'
    | 'contact'
    | 'faq'
    | 'shipping_policy'
    | 'refund_policy'
    | 'warranty_policy'
    | 'privacy_policy'
    | 'terms'
  >('home');

  // User Authentication
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('padhouse_current_user_v2');
      // Only trust the saved session when a backend token also exists.
      return saved && getAccessToken() ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Shopping Cart & Wishlist
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('padhouse_cart_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('padhouse_wishlist_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Orders (real backend records only — no seeded/demo orders)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('padhouse_orders_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartSyncing, setCartSyncing] = useState(false);

  // Order selected for direct tracking (e.g. from the orders list / checkout)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem('padhouse_cart_v3', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('padhouse_wishlist_v3', JSON.stringify(wishlistIds));
    } catch {}
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem('padhouse_orders_v3', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('padhouse_current_user_v2', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('padhouse_current_user_v2');
      }
    } catch {}
  }, [currentUser]);

  // Fetch backend products on mount
  useEffect(() => {
    fetchProductsApi().then((data) => {
      if (data && data.length > 0) {
        setProducts(data);
      }
    });
  }, []);

  /* ------------------------------------------------------------------ */
  /* Shared backend cart (identical cart on the website and mobile app)  */
  /* ------------------------------------------------------------------ */

  const applyBackendCart = useCallback(
    (backendCart: BackendCart | null) => {
      setCart(backendCartToItems(backendCart, products));
    },
    [products],
  );

  const refreshBackendCart = useCallback(async (): Promise<BackendCart | null> => {
    try {
      const backendCart = await fetchCartApi();
      applyBackendCart(backendCart);
      return backendCart;
    } catch {
      return null;
    }
  }, [applyBackendCart]);

  const refreshBackendOrders = useCallback(async () => {
    try {
      const list = await fetchMyOrdersApi();
      if (Array.isArray(list)) {
        setOrders(list.map((o) => backendOrderToOrder(o, products)));
      }
    } catch {}
  }, [products]);

  const refreshBackendWishlist = useCallback(async () => {
    try {
      const list = await fetchWishlistApi();
      if (Array.isArray(list)) {
        setWishlistIds(list.map((w: any) => w.productId).filter(Boolean));
      }
    } catch {}
  }, []);

  /**
   * After a successful login/registration:
   * push any guest cart into the shared backend cart, then load it back.
   */
  const adoptSessionForUser = useCallback(
    async (guestCart: CartItem[]) => {
      for (const line of guestCart) {
        try {
          await addCartItemApi({
            productId: line.product.id,
            quantity: line.quantity,
            selectedColor: line.selectedColor || undefined,
            variantId: line.variantId,
          });
        } catch {
          // Skip lines that can no longer be fulfilled (out of stock / removed).
        }
      }
      await refreshBackendCart();
      await refreshBackendOrders();
      await refreshBackendWishlist();
    },
    [refreshBackendCart, refreshBackendOrders, refreshBackendWishlist],
  );

  /* ------------------------------ Cart ------------------------------ */

  const addToCart = async (product: Product, color?: string, qty = 1) => {
    if (!currentUser) {
      if (product.stock <= 0) {
        showToast('عذراً، هذه القطعة نفدت من المخزون حالياً');
        return;
      }
      const chosenColor = color || product.colors[0] || 'افتراضي';
      setCart((prev) => {
        const existing = prev.find(
          (i) => i.product.id === product.id && i.selectedColor === chosenColor,
        );
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id && i.selectedColor === chosenColor
              ? { ...i, quantity: i.quantity + qty }
              : i,
          );
        }
        return [...prev, { product, quantity: qty, selectedColor: chosenColor }];
      });
      showToast(`تمت إضافة "${product.name}" إلى السلة`);
      return;
    }

    // Logged in: the shared backend cart is the single source of truth.
    setCartSyncing(true);
    try {
      const backendCart = await addCartItemApi({
        productId: product.id,
        quantity: qty,
        selectedColor: color || product.colors[0] || undefined,
      });
      applyBackendCart(backendCart);
      showToast(`تمت إضافة "${product.name}" إلى السلة`);
    } catch (err: any) {
      showToast(err?.message || 'تعذر إضافة المنتج إلى السلة');
    } finally {
      setCartSyncing(false);
    }
  };

  const updateCartQty = async (productId: string, color: string, delta: number) => {
    const line = cart.find((i) => i.product.id === productId && i.selectedColor === color);
    if (!line) return;
    const nextQty = line.quantity + delta;

    if (!currentUser || !line.cartItemId) {
      setCart((prev) =>
        prev
          .map((item) => {
            if (item.product.id === productId && item.selectedColor === color) {
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
      );
      return;
    }

    setCartSyncing(true);
    try {
      const backendCart =
        nextQty <= 0
          ? await removeCartItemApi(line.cartItemId)
          : await updateCartItemApi(line.cartItemId, nextQty);
      applyBackendCart(backendCart);
    } catch (err: any) {
      showToast(err?.message || 'تعذر تحديث الكمية');
      await refreshBackendCart();
    } finally {
      setCartSyncing(false);
    }
  };

  const removeFromCart = async (productId: string, color: string) => {
    const line = cart.find((i) => i.product.id === productId && i.selectedColor === color);
    if (currentUser && line?.cartItemId) {
      setCartSyncing(true);
      try {
        const backendCart = await removeCartItemApi(line.cartItemId);
        applyBackendCart(backendCart);
        showToast('تم حذف المنتج من السلة');
      } catch (err: any) {
        showToast(err?.message || 'تعذر حذف المنتج');
      } finally {
        setCartSyncing(false);
      }
      return;
    }
    setCart((prev) => prev.filter((i) => !(i.product.id === productId && i.selectedColor === color)));
    showToast('تم حذف المنتج من السلة');
  };

  const clearCart = async () => {
    if (currentUser) {
      try {
        const backendCart = await clearCartApi();
        applyBackendCart(backendCart);
      } catch {
        setCart([]);
      }
      return;
    }
    setCart([]);
  };

  /* ---------------------------- Wishlist ---------------------------- */

  const toggleWishlist = async (productId: string) => {
    const exists = wishlistIds.includes(productId);

    if (!currentUser) {
      setWishlistIds((prev) => (exists ? prev.filter((id) => id !== productId) : [...prev, productId]));
      showToast(exists ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة');
      return;
    }

    try {
      if (exists) {
        await removeWishlistApi(productId);
        setWishlistIds((prev) => prev.filter((id) => id !== productId));
        showToast('تمت الإزالة من المفضلة');
      } else {
        await addWishlistApi(productId);
        setWishlistIds((prev) => [...prev, productId]);
        showToast('تمت الإضافة إلى المفضلة');
      }
    } catch (err: any) {
      showToast(err?.message || 'تعذر تحديث المفضلة');
    }
  };

  /* --------------------------- Navigation --------------------------- */

  const navigateTo = (page: string, params?: any) => {
    if (params?.category) {
      setSelectedCategory(params.category);
    }
    if (params?.query) {
      setSearchQuery(params.query);
    }
    if (page === 'tracking' && params?.orderId) {
      setTrackingOrderId(params.orderId);
    }
    setActivePage(page as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    navigateTo('product_details');
  };

  /**
   * Called by the checkout page after the backend has created the order.
   * The backend already cleared the shared cart and decremented stock, so we
   * simply re-read both from the API to stay consistent across platforms.
   */
  const handleOrderPlaced = async (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    await refreshBackendCart();
    await refreshBackendOrders();
  };

  // Track order cancellation in progress
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const handleCancelOrder = async (order: Order) => {
    const orderIdentifier = order.orderNumber || order.id;
    const confirmed = window.confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب (${orderIdentifier})؟`);
    if (!confirmed) return;

    setCancellingOrderId(order.id);
    try {
      await cancelOrderApi(order.id);
      showToast(`تم إلغاء الطلب (${orderIdentifier}) بنجاح واسترجاع المخزون`);
      await refreshBackendOrders();
      // Also refresh product catalog so restored stock is immediately reflected in UI
      const updatedProducts = await fetchProductsApi();
      if (updatedProducts && updatedProducts.length > 0) {
        setProducts(updatedProducts);
      }
    } catch (err: any) {
      showToast(err?.message || 'تعذر إلغاء الطلب');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const totalCartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] font-['Tajawal','IBM_Plex_Sans_Arabic',sans-serif] flex flex-col selection:bg-[#2EC4B6]/20"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl border border-[#2EC4B6]/40 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-[#2EC4B6]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Professional Desktop-first Header */}
      <Header
        cartCount={totalCartCount}
        wishlistCount={wishlistIds.length}
        currentUser={currentUser}
        activePage={activePage}
        onNavigate={navigateTo}
        cartSyncing={cartSyncing}
        onSearch={(q) => {
          setSearchQuery(q);
          navigateTo('search', { query: q });
        }}
        onLogout={() => {
          clearTokens();
          setCurrentUser(null);
          setCart([]);
          setWishlistIds([]);
          setOrders([]);
          showToast('تم تسجيل الخروج بنجاح');
          navigateTo('home');
        }}
      />

      {/* Page Content View Router */}
      <main className="flex-1 w-full">
        {/* 1. Homepage */}
        {activePage === 'home' && (
          <HomePage
            products={products}
            wishlistIds={wishlistIds}
            onSelectProduct={handleSelectProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            onNavigate={navigateTo}
          />
        )}

        {/* 2. All Products & Search Results */}
        {(activePage === 'products' || activePage === 'search') && (
          <ProductsPage
            products={products}
            selectedCategory={selectedCategory}
            wishlistIds={wishlistIds}
            searchQuery={activePage === 'search' ? searchQuery : ''}
            onSelectProduct={handleSelectProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {/* 3. Categories Hub Page */}
        {activePage === 'categories' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-right">
            <div className="mb-8 border-b border-slate-100 pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A]">أقسام وتصنيفات المتجر</h1>
              <p className="text-xs text-slate-500 mt-1">تصفح أقسام ملحقات الآيباد المعتمدة مع الضمان والتوافق</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {OFFICIAL_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => navigateTo('products', { category: cat.id })}
                  className="bg-[#F8FAFC] hover:bg-white p-6 rounded-3xl border border-slate-100 hover:border-[#2EC4B6]/40 hover:shadow-xl transition-all duration-300 cursor-pointer space-y-3 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-[#2EC4B6] text-[#0F172A] group-hover:text-white flex items-center justify-center font-bold text-base shadow-xs transition-colors">
                    {cat.name.slice(0, 2)}
                  </div>
                  <h3 className="text-base font-black text-[#0F172A] group-hover:text-[#2EC4B6] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {cat.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2EC4B6] pt-2">
                    <span>تصفح المنتجات</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Product Details */}
        {activePage === 'product_details' && (
          <ProductDetailsPage
            product={selectedProduct}
            allProducts={products}
            wishlistIds={wishlistIds}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            onSelectProduct={handleSelectProduct}
            onNavigate={navigateTo}
            currentUser={currentUser}
          />
        )}

        {/* 5. Cart and Checkout */}
        {(activePage === 'cart' || activePage === 'checkout') && (
          <CartAndCheckoutPage
            cart={cart}
            currentUser={currentUser}
            products={products}
            onUpdateQty={updateCartQty}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onOrderPlaced={handleOrderPlaced}
            onCartRefreshed={applyBackendCart}
            onNavigate={navigateTo}
          />
        )}

        {/* 6. Wishlist Page */}
        {activePage === 'wishlist' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-right">
            <div className="mb-8 border-b border-slate-100 pb-4">
              <h1 className="text-2xl font-black text-[#0F172A]">قائمة المنتجات المفضلة</h1>
              <p className="text-xs text-slate-500 mt-1">القطع التي قمت بحفظها لشرائها لاحقاً</p>
            </div>

            {wishlistIds.length === 0 ? (
              <div className="bg-[#F8FAFC] rounded-2xl p-12 text-center border border-slate-100 space-y-3">
                <Heart className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-[#0F172A]">قائمة المفضلة فارغة حالياً</p>
                <button
                  onClick={() => navigateTo('products')}
                  className="bg-[#2EC4B6] text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  استكشف المنتجات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {products
                  .filter((p) => wishlistIds.includes(p.id))
                  .map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      isWishlisted={true}
                      onSelect={handleSelectProduct}
                      onAddToCart={addToCart}
                      onToggleWishlist={toggleWishlist}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 7. Auth: Login & Register */}
        {(activePage === 'login' || activePage === 'register') && (
          <AuthPage
            initialMode={activePage === 'register' ? 'register' : 'login'}
            onLoginSuccess={async (u) => {
              const guestCart = cart;
              setCurrentUser(u);
              showToast(`أهلاً بك ${u.name}!`);
              await adoptSessionForUser(guestCart);
              navigateTo('home');
            }}
            onNavigate={navigateTo}
          />
        )}

        {/* 8. User Profile */}
        {activePage === 'profile' && (
          <UserProfilePage
            currentUser={currentUser}
            orders={orders}
            onNavigate={navigateTo}
            onLogout={() => {
              clearTokens();
              setCurrentUser(null);
              setCart([]);
              setWishlistIds([]);
              setOrders([]);
              showToast('تم تسجيل الخروج');
              navigateTo('home');
            }}
          />
        )}

        {/* 9. Orders History */}
        {activePage === 'orders' && (
          <div className="max-w-4xl mx-auto px-4 py-10 text-right space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-[#0F172A]">سجل طلباتي</h1>
                <p className="text-xs text-slate-500 mt-1">متابعة كافة الطلبات السابقة وحالات التوصيل</p>
              </div>
              {currentUser && (
                <button
                  onClick={refreshBackendOrders}
                  className="bg-white border border-slate-200 text-[#0F172A] text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  تحديث
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="bg-[#F8FAFC] rounded-2xl p-10 text-center border border-slate-100">
                <p className="text-xs text-slate-400">لا توجد طلبات مسجلة حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono text-sm font-bold text-[#0F172A]">{o.orderNumber || o.id}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">{o.date}</span>
                      </div>
                      <span className="bg-[#2EC4B6]/10 text-[#2EC4B6] font-bold text-xs px-3 py-1 rounded-full self-start sm:self-auto">
                        {o.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-slate-600">
                          <span>{it.product.name} ({it.color}) × {it.quantity}</span>
                          <span className="font-bold text-[#0F172A]">{it.price * it.quantity} ₪</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-between sm:items-center text-xs">
                      <span className="text-slate-500">العنوان: {o.city} — {o.address}</span>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {(o.statusCode === 'PENDING' || o.status === 'طلب جديد') && (
                          <button
                            disabled={cancellingOrderId === o.id}
                            onClick={() => handleCancelOrder(o)}
                            className="text-rose-500 font-bold hover:underline disabled:opacity-50"
                          >
                            {cancellingOrderId === o.id ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                          </button>
                        )}
                        <button
                          onClick={() => navigateTo('tracking', { orderId: o.orderNumber || o.id })}
                          className="text-[#2EC4B6] font-bold hover:underline"
                        >
                          تتبع الطلب
                        </button>
                        <span className="font-black text-sm text-[#0F172A]">المجموع: {o.total} ₪</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 10. Order Tracking */}
        {activePage === 'tracking' && (
          <TrackingPage
            orders={orders}
            currentUser={currentUser}
            initialOrderId={trackingOrderId}
            onNavigate={navigateTo}
          />
        )}

        {/* 11. Static Informational & Policy Pages */}
        {(activePage === 'about' ||
          activePage === 'contact' ||
          activePage === 'faq' ||
          activePage === 'shipping_policy' ||
          activePage === 'refund_policy' ||
          activePage === 'warranty_policy' ||
          activePage === 'privacy_policy' ||
          activePage === 'terms') && (
          <StaticPages pageType={activePage} onNavigate={navigateTo} />
        )}
      </main>

      {/* Main Professional E-commerce Footer */}
      <Footer onNavigate={navigateTo} />
    </div>
  );
}
