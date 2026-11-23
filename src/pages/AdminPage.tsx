/**
 * AdminPage.tsx — PadHouse Admin Dashboard
 * Connects to NestJS Inventory & Notification APIs
 *
 * Requirements:
 * 1. Admin Product Management (stock, minStock, maxStock + stock status badges)
 * 2. Dedicated Low-Stock Alerts / Notifications panel + Notification Bell
 * 3. Quick restock actions and modal integration
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Layers,
  LineChart,
  Loader2,
  PackageCheck,
  PackageX,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  Truck,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AppUser, Product } from '../types';
import {
  adminFetchNotificationsApi,
  adminMarkNotificationReadApi,
  adminMarkAllNotificationsReadApi,
  adminFetchProductsApi,
  adminCreateProductApi,
  adminUpdateProductApi,
  adminDeleteProductApi,
  adminRestockProductApi,
  type AdminNotification,
  type AdminProductFormData,
} from '../services/adminApi';
import {
  AdminNotificationBell,
  AdminLowStockPanel,
  AdminProductFormModal,
  AdminInventoryTable,
  AdminRestockModal,
  AdminOrdersPanel,
  AdminSuppliersPanel,
  AdminPurchaseOrdersPanel,
  AdminPurchaseDashboard,
  AdminGoodsReceiptPanel,
  AdminPurchaseAnalytics,
  AdminSalesAnalytics,
  AdminProfitAnalytics,
  AdminBestSellingProducts,
  AdminAiReorderPanel,
  AdminInventoryOrdersAnalytics,
  type AdminRestockTarget,
  type PurchaseSection,
  calculateStockStatus,
} from '../components/admin';

interface AdminPageProps {
  currentUser: AppUser | null;
  onNavigate: (page: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, onNavigate }) => {
  /* ── Section navigation ── */
  const [section, setSection] = useState<PurchaseSection>('inventory');
  /** Order id to auto-open when handing off from another purchase section. */
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingAnalyticsOrderId, setPendingAnalyticsOrderId] = useState<string | null>(null);

  const openOrderInPurchaseOrders = (orderId: string) => {
    setPendingOrderId(orderId);
    setSection('purchase-orders');
  };

  /* ── Products state ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');

  /* ── Notifications state ── */
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(true);

  /* ── Modals ── */
  const [formModal, setFormModal] = useState<{ mode: 'add' | 'edit'; product?: Product } | null>(
    null,
  );
  const [restockTarget, setRestockTarget] = useState<AdminRestockTarget | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /* ── Toast notifications ── */
  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'err' } | null>(null);
  const showToast = (message: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load notifications from NestJS ── */
  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { notifications: list, unreadCount: count } = await adminFetchNotificationsApi();
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Fail gracefully
    } finally {
      setNotifLoading(false);
    }
  }, []);

  /* ── Load products from NestJS (admin scope: includes inactive products) ── */
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await adminFetchProductsApi();
      setProducts(data);
      setProductsError(null);
    } catch (err: any) {
      const message = err?.message || 'تعذر جلب المنتجات من الخادم';
      setProducts([]);
      setProductsError(message);
      showToast(message, 'err');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadNotifications();

    // Auto-poll notifications every 30 seconds
    pollingTimerRef.current = setInterval(loadNotifications, 30_000);
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [loadProducts, loadNotifications]);

  /* ── Handlers ── */
  const handleSaveProduct = async (data: AdminProductFormData, id?: string) => {
    if (id) {
      await adminUpdateProductApi(id, data);
      showToast('تم تحديث بيانات المنتج ومستويات المخزون بنجاح');
    } else {
      await adminCreateProductApi(data);
      showToast('تمت إضافة المنتج الجديد وضبط مستويات المخزون');
    }
    await Promise.all([loadProducts(), loadNotifications()]);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await adminDeleteProductApi(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('تم حذف المنتج بنجاح');
    } catch (err: any) {
      showToast(err?.message || 'تعذر حذف المنتج', 'err');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await adminMarkNotificationReadApi(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await adminMarkAllNotificationsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast('تم تحديد جميع الإشعارات كمقروءة');
    } catch {}
  };

  const handleRestockConfirm = async (
    target: AdminRestockTarget,
    addQty: number,
    notes: string,
  ) => {
    const newStock = target.stock + addQty;
    await adminRestockProductApi(target.id, newStock, notes);

    // If restocking was triggered from a notification, mark that notification read
    if (target.notificationId) {
      await adminMarkNotificationReadApi(target.notificationId).catch(() => {});
    }

    showToast(`تمت إضافة ${addQty} قطعة إلى "${target.nameAr}" (المخزون الجديد: ${newStock})`);
    await Promise.all([loadProducts(), loadNotifications()]);
  };

  // Convert an AdminNotification to RestockTarget
  const openRestockFromNotification = (n: AdminNotification) => {
    if (!n.product) return;
    setRestockTarget({
      id: n.product.id,
      nameAr: n.product.nameAr,
      sku: n.product.sku,
      stock: n.product.stock,
      minStock: n.product.minStock,
      maxStock: n.product.maxStock,
      notificationId: n.id,
    });
  };

  // Convert a Product to RestockTarget
  const openRestockFromProduct = (p: Product) => {
    setRestockTarget({
      id: p.id,
      nameAr: p.nameAr || p.name,
      sku: p.sku,
      stock: p.stock,
      minStock: (p as any).minStock ?? p.minThreshold ?? 5,
      maxStock: (p as any).maxStock ?? 100,
    });
  };

  /* ── Role Authorization Guard ── */
  const isAuthorized =
    currentUser &&
    ['super_admin', 'admin', 'SUPER_ADMIN', 'ADMIN'].includes(currentUser.role as string);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6" dir="rtl">
        <XCircle className="h-14 w-14 text-red-500" />
        <h2 className="text-xl font-black text-ph-ink">غير مصرح بالوصول</h2>
        <p className="text-xs text-ph-muted max-w-sm">
          هذه الصفحة مخصصة للمديرين وإدارة المخزون. يرجى تسجيل الدخول بحساب مسؤول.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  /* ── Statistics counts ── */
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => calculateStockStatus(p) === 'out_of_stock').length;
  const lowStockCount = products.filter((p) => calculateStockStatus(p) === 'low_stock').length;
  const healthyCount = products.filter((p) => calculateStockStatus(p) === 'healthy').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8" dir="rtl">
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl px-6 py-3 text-white text-sm font-bold shadow-2xl flex items-center gap-2 ${
              toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {formModal && (
          <AdminProductFormModal
            mode={formModal.mode}
            initial={
              formModal.product
                ? {
                    id: formModal.product.id,
                    nameAr: formModal.product.nameAr || formModal.product.name,
                    nameEn: formModal.product.nameEn || '',
                    sku: formModal.product.sku,
                    basePrice: formModal.product.originalPrice || formModal.product.price,
                    salePrice:
                      formModal.product.price !== formModal.product.originalPrice
                        ? formModal.product.price
                        : undefined,
                    stock: formModal.product.stock,
                    minStock:
                      (formModal.product as any).minStock ?? formModal.product.minThreshold ?? 5,
                    maxStock: (formModal.product as any).maxStock ?? 100,
                    descriptionAr: formModal.product.description,
                    ipadCompatibility: formModal.product.compatibilityList ?? [],
                  }
                : undefined
            }
            onSave={handleSaveProduct}
            onClose={() => setFormModal(null)}
          />
        )}

        {restockTarget && (
          <AdminRestockModal
            target={restockTarget}
            onConfirm={handleRestockConfirm}
            onClose={() => setRestockTarget(null)}
          />
        )}

        {deleteConfirmId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ph-modal-backdrop"
            onClick={() => setDeleteConfirmId(null)}
          >
            <div
              className="rounded-3xl bg-white p-6 shadow-2xl max-w-sm w-full text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-ph-ink">حذف المنتج من المستودع</h3>
              <p className="text-xs text-ph-muted leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا المنتج وسجلاته؟ لن تتمكن من استرجاعه لاحقاً.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(deleteConfirmId)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                >
                  نعم، احذف المنتج
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 border border-ph-border text-ph-ink font-bold py-2.5 rounded-xl text-xs hover:bg-ph-background transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Page Header & Quick Actions ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-ph-ink tracking-tight">
              لوحة إدارة المنتجات والمخزون
            </h1>
            <span className="rounded-md bg-ph-brand/10 text-ph-brand px-2 py-0.5 text-xs font-bold">
              Mini ERP
            </span>
          </div>
          <p className="text-xs text-ph-muted mt-1">
            متابعة دقيقة لأرصدة المستودع، التنبيهات الذكية عند وصول الحد الأدنى، وإعادة التوريد السريع
          </p>
        </div>

        <div className="flex items-center gap-3">
          {section === 'inventory' && (
            <>
              {/* Notification Bell with unread badge */}
              <AdminNotificationBell
                unreadCount={unreadCount}
                active={notifPanelOpen}
                onClick={() => setNotifPanelOpen((prev) => !prev)}
                variant="dashboard"
              />

              <button
                type="button"
                onClick={() => setFormModal({ mode: 'add' })}
                className="flex items-center gap-2 bg-ph-brand hover:bg-ph-brand-hover text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة منتج جديد</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Section Tabs ── */}
      <div className="flex items-center gap-1.5 border-b border-ph-border -mt-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSection('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'inventory'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>المنتجات والمخزون</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('sales-analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'sales-analytics'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <LineChart className="h-4 w-4" />
          <span>المبيعات والأرباح</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('profit-analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'profit-analytics'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>تحليلات الأرباح</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('inventory-orders-analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${section === 'inventory-orders-analytics' ? 'border-ph-brand text-ph-brand' : 'border-transparent text-ph-muted hover:text-ph-ink'}`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>المخزون والطلبات</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('best-selling')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'best-selling'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>الأكثر مبيعاً</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('purchase-dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'purchase-dashboard'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>لوحة المشتريات</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'suppliers'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>إدارة الموردين</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('purchase-orders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'purchase-orders'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>أوامر الشراء</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('ai-reorder')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'ai-reorder'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>مساعد المشتريات الذكي</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('goods-receipts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'goods-receipts'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <PackageCheck className="h-4 w-4" />
          <span>استلام البضائع</span>
        </button>
        <button
          type="button"
          onClick={() => setSection('purchase-analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px whitespace-nowrap ${
            section === 'purchase-analytics'
              ? 'border-ph-brand text-ph-brand'
              : 'border-transparent text-ph-muted hover:text-ph-ink'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>تحليلات المشتريات</span>
        </button>
      </div>

      {section === 'sales-analytics' ? (
        <AdminSalesAnalytics onToast={showToast} />
      ) : section === 'inventory-orders-analytics' ? (
        <AdminInventoryOrdersAnalytics onOpenOrder={(id) => { setPendingAnalyticsOrderId(id); setSection('inventory'); }} />
      ) : section === 'profit-analytics' ? (
        <AdminProfitAnalytics onToast={showToast} />
      ) : section === 'best-selling' ? (
        <AdminBestSellingProducts onToast={showToast} />
      ) : section === 'purchase-dashboard' ? (
        <AdminPurchaseDashboard onToast={showToast} onNavigate={setSection} />
      ) : section === 'suppliers' ? (
        <AdminSuppliersPanel onToast={showToast} />
      ) : section === 'purchase-orders' ? (
        <AdminPurchaseOrdersPanel
          onToast={showToast}
          initialOrderId={pendingOrderId}
          onInitialOrderConsumed={() => setPendingOrderId(null)}
        />
      ) : section === 'goods-receipts' ? (
        <AdminGoodsReceiptPanel onToast={showToast} onOpenOrder={openOrderInPurchaseOrders} />
      ) : section === 'purchase-analytics' ? (
        <AdminPurchaseAnalytics onToast={showToast} />
      ) : section === 'ai-reorder' ? (
        <AdminAiReorderPanel onToast={showToast} onOpenOrder={openOrderInPurchaseOrders} />
      ) : (
        <>
      {/* ── KPI Stat Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ph-border bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ph-muted mb-2">
            <span className="text-xs font-bold">إجمالي المنتجات</span>
            <Layers className="h-4 w-4 text-ph-brand" />
          </div>
          <p className="text-2xl font-black text-ph-ink font-mono">{totalProducts}</p>
          <span className="text-[10px] text-ph-muted mt-1 block">مسجلة في الكتالوج</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold">مخزون صحي</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono">{healthyCount}</p>
          <span className="text-[10px] text-emerald-700 mt-1 block">أعلى من الحد الأدنى</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">تنبيهات نقص المخزون</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 font-mono">{lowStockCount}</p>
          <span className="text-[10px] text-amber-700 mt-1 block">يحتاج توريداً عاجلاً</span>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-800 mb-2">
            <span className="text-xs font-bold">أصناف نفدت بالكامل</span>
            <PackageX className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-800 font-mono">{outOfStockCount}</p>
          <span className="text-[10px] text-red-700 mt-1 block">تظهر بشريط نفدت الكمية للعملاء</span>
        </div>
      </div>

      {/* ── Orders Tracking / ETA / Urgent Crisis Panel ── */}
      <AdminOrdersPanel onToast={showToast} initialOrderId={pendingAnalyticsOrderId} onInitialOrderConsumed={() => setPendingAnalyticsOrderId(null)} />

      {/* ── Collapsible Low-Stock Alerts Panel ── */}
      <AnimatePresence>
        {notifPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <AdminLowStockPanel
              notifications={notifications}
              unreadCount={unreadCount}
              loading={notifLoading}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onRestock={openRestockFromNotification}
              onRefresh={loadNotifications}
              onClose={() => setNotifPanelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inventory Management Table ── */}
      <section aria-labelledby="inventory-table-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="inventory-table-title" className="text-base font-black text-ph-ink">
            جدول المستودع ومستويات الأمان (Stock & Thresholds)
          </h2>
          <span className="text-xs text-ph-muted">
            إجمالي السجلات: <strong className="font-mono text-ph-ink">{products.length}</strong>
          </span>
        </div>

        <AdminInventoryTable
          products={products}
          loading={productsLoading}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onRefresh={loadProducts}
          onEdit={(product) => setFormModal({ mode: 'edit', product })}
          onDelete={(id) => setDeleteConfirmId(id)}
          onQuickRestock={openRestockFromProduct}
        />

        {productsError && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <div className="flex items-start gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black">تعذر تحميل قائمة المنتجات</p>
                <p className="text-[11px] text-red-700 mt-0.5">{productsError}</p>
                <p className="text-[10px] text-red-600/80 mt-1">
                  تأكد من تشغيل الخادم (npm run dev:all) ومن تنفيذ بيانات البذور (seed).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadProducts}
              disabled={productsLoading}
              className="shrink-0 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${productsLoading ? 'animate-spin' : ''}`} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
};
