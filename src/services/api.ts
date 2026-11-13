import { Order, Product } from '../types';
import { FALLBACK_PRODUCTS } from '../data/catalog';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const TOKEN_KEY = 'padhouse_token_v1';
const REFRESH_KEY = 'padhouse_refresh_token_v1';

/* ------------------------------------------------------------------ */
/* Token storage (shared with the mobile app through the same backend) */
/* ------------------------------------------------------------------ */

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken?: string | null, refreshToken?: string | null) {
  try {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {}
}

export function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

/* --------------------------- Error type --------------------------- */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* --------------------------- Core fetch --------------------------- */

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { method = 'GET', body, auth = true, query } = options;

  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.', 0);
  }

  if (res.status === 401 && auth && retry && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
    clearTokens();
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join('، ')
      : data?.message || `حدث خطأ غير متوقع (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

/* ----------------------------- Auth ------------------------------ */

export interface BackendUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  customerProfileId: string;
}

export interface AuthResponse {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>(
    '/auth/login',
    { method: 'POST', body: { email, password }, auth: false },
  );
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function registerApi(payload: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  street?: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function fetchMeApi(): Promise<BackendUser> {
  return apiFetch<BackendUser>('/auth/me');
}

/* --------------------------- Catalog ------------------------------ */

export function mapBackendProduct(item: any): Product {
  return {
    id: item.id || item.sku || `prod-${Math.random()}`,
    sku: item.sku || 'PH-GEN',
    name: item.nameAr || item.name || 'منتج بادهاوس',
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    categories:
      Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories
        : ['cat_others'],
    price: Number(item.price) || 0,
    originalPrice:
      Number(item.originalPrice) || Number(item.price) || 0,
    stock: typeof item.stock === 'number' ? item.stock : 0,
    minThreshold: typeof item.minThreshold === 'number' ? item.minThreshold : 5,
    compatibility: item.compatibility || 'جميع أجهزة iPad المدعومة',
    compatibilityList: item.compatibilityList,
    rating: Number(item.rating) || 0,
    reviewsCount: Number(item.reviewsCount) || 0,
    image:
      item.image ||
      item.images?.[0] ||
      'https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg',
    images:
      Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [item.image].filter(Boolean),
    description: item.description || '',
    colors:
      Array.isArray(item.colors) && item.colors.length > 0 ? item.colors : ['افتراضي'],
    variants: item.variants,
    warranty: item.warranty,
    features: item.features,
    specs: item.specs,
  };
}

export async function fetchProductsApi(query?: {
  category?: string;
  search?: string;
  compatibility?: string;
  featured?: boolean;
}): Promise<Product[]> {
  try {
    const data = await apiFetch<any>('/products', { auth: false, query: query as any });
    if (Array.isArray(data) && data.length > 0) {
      return data.map(mapBackendProduct);
    }
    return FALLBACK_PRODUCTS;
  } catch (err) {
    console.warn('[PadHouse API] Backend unavailable, using verified local catalog fallback', err);
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchCategoriesApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/categories', { auth: false });
  } catch {
    return [];
  }
}

export async function fetchIpadModelsApi(): Promise<string[]> {
  try {
    return await apiFetch<string[]>('/products/ipad-models', { auth: false });
  } catch {
    return [];
  }
}

/* ----------------------------- Cart ------------------------------- */

export interface BackendCartLine {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  color: string;
  price: number;
  quantity: number;
  total: number;
  image: string;
  availableStock: number;
  inStock: boolean;
}

export interface BackendCart {
  cartId: string;
  items: BackendCartLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string | null;
}

export async function fetchCartApi(): Promise<BackendCart> {
  return apiFetch<BackendCart>('/cart');
}

export async function addCartItemApi(body: {
  productId: string;
  quantity: number;
  selectedColor?: string;
  variantId?: string;
}): Promise<BackendCart> {
  return apiFetch<BackendCart>('/cart/items', { method: 'POST', body });
}

export async function updateCartItemApi(itemId: string, quantity: number): Promise<BackendCart> {
  return apiFetch<BackendCart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: { quantity },
  });
}

export async function removeCartItemApi(itemId: string): Promise<BackendCart> {
  return apiFetch<BackendCart>(`/cart/items/${itemId}`, { method: 'DELETE' });
}

export async function clearCartApi(): Promise<BackendCart> {
  return apiFetch<BackendCart>('/cart', { method: 'DELETE' });
}

/* ---------------------------- Coupons ----------------------------- */

export interface CouponApplyResult {
  applied: boolean;
  couponCode: string;
  discount: number;
  freeShipping: boolean;
  subtotal?: number;
  message?: string;
}

/**
 * Applies a coupon to the signed-in customer's shared backend cart.
 * The backend validates the code against the real cart subtotal and business
 * rules, so the client must not send a subtotal of its own.
 */
export async function applyCouponApi(code: string): Promise<CouponApplyResult> {
  return apiFetch<CouponApplyResult>('/coupons/apply', {
    method: 'POST',
    body: { code },
  });
}

export async function removeCouponApi(): Promise<BackendCart> {
  return apiFetch<BackendCart>('/coupons/apply', { method: 'DELETE' });
}

export async function fetchActiveCouponsApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/coupons/active', { auth: false });
  } catch {
    return [];
  }
}

/* --------------------------- Delivery ----------------------------- */

export interface DeliveryCity {
  name: string;
  fee: number;
  etaDays: string;
}

export interface DeliveryZone {
  governorateId: string;
  governorate: string;
  region: string;
  city: string;
  fee: number;
  etaDays: string;
}

export interface Governorate {
  id: string;
  nameAr: string;
  region: string;
  cities: DeliveryCity[];
}

export interface PaymentMethodInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  enabled: boolean;
}

export interface StorePolicySection {
  titleAr: string;
  summaryAr: string;
  detailsAr: string[];
}

export interface StorePolicies {
  exchange: StorePolicySection;
  return: StorePolicySection;
  warranty: StorePolicySection;
  support: { phone: string; whatsapp: string; whatsappUrl: string };
}

export async function fetchGovernoratesApi(): Promise<Governorate[]> {
  try {
    return await apiFetch<Governorate[]>('/delivery/governorates', { auth: false });
  } catch {
    return [];
  }
}

export async function fetchDeliveryZonesApi(): Promise<DeliveryZone[]> {
  try {
    return await apiFetch<DeliveryZone[]>('/delivery/zones', { auth: false });
  } catch {
    return [];
  }
}

export async function fetchDeliveryQuoteApi(
  city: string,
): Promise<{ available: boolean; city: string; fee: number; etaDays?: string; message?: string }> {
  return apiFetch('/delivery/quote', { auth: false, query: { city } });
}

export async function validatePhoneApi(
  phone: string,
): Promise<{ valid: boolean; normalized?: string; formatted?: string; message?: string }> {
  return apiFetch('/delivery/validate-phone', { method: 'POST', body: { phone }, auth: false });
}

export async function fetchPaymentMethodsApi(): Promise<PaymentMethodInfo[]> {
  try {
    return await apiFetch<PaymentMethodInfo[]>('/delivery/payment-methods', { auth: false });
  } catch {
    return [];
  }
}

export async function fetchPoliciesApi(): Promise<StorePolicies | null> {
  try {
    return await apiFetch<StorePolicies>('/delivery/policies', { auth: false });
  } catch {
    return null;
  }
}

/* ---------------------------- Orders ------------------------------ */

/** Decimal columns are serialized as strings by the API. */
type Decimal = number | string;

export interface BackendOrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  unitPrice: Decimal;
  quantity: number;
  totalPrice: Decimal;
  product?: {
    id: string;
    sku?: string;
    nameAr?: string;
    images?: { url: string }[];
  } | null;
  variant?: { id: string; color?: string | null } | null;
}

export interface BackendOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: Decimal;
  shippingFee: Decimal;
  discountTotal: Decimal;
  giftCardCode?: string | null;
  giftCardDiscount: Decimal;
  grandTotal: Decimal;
  customerNotes?: string | null;
  createdAt: string;
  user?: { fullName?: string; email?: string; phone?: string | null } | null;
  shippingAddress?: { city: string; street: string; phone?: string | null } | null;
  items: BackendOrderItem[];
  statusHistory?: { status: string; notes?: string | null; createdAt: string }[];
  pointsEarned?: number;
}

export interface OrderStatusInfo {
  status: string;
  labelAr: string;
}

/**
 * Mirror of the backend contract in `src/orders/dto/order.dto.ts`.
 * `GET /orders/statuses` is authoritative at runtime; this only keeps the UI
 * readable while that request is in flight.
 */
export const ORDER_STATUS_FALLBACK: OrderStatusInfo[] = [
  { status: 'PENDING', labelAr: 'طلب جديد' },
  { status: 'UNDER_REVIEW', labelAr: 'قيد التأكيد' },
  { status: 'CONFIRMED', labelAr: 'تم التأكيد' },
  { status: 'PREPARING', labelAr: 'قيد التجهيز' },
  { status: 'SHIPPED', labelAr: 'خرج للتوصيل' },
  { status: 'DELIVERED', labelAr: 'تم التسليم' },
  { status: 'CANCELLED', labelAr: 'ملغي' },
];

/** Order status codes that are part of the linear fulfilment timeline. */
export const ORDER_TIMELINE_STATUSES = ORDER_STATUS_FALLBACK.filter(
  (s) => s.status !== 'CANCELLED',
).map((s) => s.status);

export async function fetchOrderStatusesApi(): Promise<OrderStatusInfo[]> {
  try {
    return await apiFetch<OrderStatusInfo[]>('/orders/statuses', { auth: false });
  } catch {
    return [];
  }
}

export async function createOrderApi(body: {
  city: string;
  street: string;
  phone?: string;
  paymentMethod: string;
  couponCode?: string;
  giftCardCode?: string;
  customerNotes?: string;
}): Promise<BackendOrder> {
  return apiFetch<BackendOrder>('/orders', { method: 'POST', body });
}

export async function fetchMyOrdersApi(): Promise<BackendOrder[]> {
  return apiFetch<BackendOrder[]>('/orders/my');
}

export async function fetchOrderApi(idOrNumber: string): Promise<BackendOrder> {
  return apiFetch<BackendOrder>(`/orders/${encodeURIComponent(idOrNumber)}`);
}

export async function cancelOrderApi(orderId: string, reason?: string): Promise<BackendOrder> {
  return apiFetch<BackendOrder>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'PATCH',
    body: { reason },
  });
}

export async function fetchMyWarrantiesApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/orders/warranties/my');
  } catch {
    return [];
  }
}

/** Parse a decimal that the API may serialize as a string. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Convert a backend order into the website's Order model.
 * Shared by the orders history, the checkout success screen and tracking.
 * The Arabic status label is resolved from `GET /orders/statuses` when the
 * caller passes the loaded `statuses` list.
 */
export function backendOrderToOrder(
  b: BackendOrder,
  products: Product[],
  statuses?: OrderStatusInfo[],
): Order {
  const labelFor = (code: string) =>
    statuses?.find((s) => s.status === code)?.labelAr ||
    ORDER_STATUS_FALLBACK.find((s) => s.status === code)?.labelAr ||
    code;

  return {
    id: b.orderNumber || b.id,
    orderNumber: b.orderNumber || b.id,
    date: b.createdAt ? new Date(b.createdAt).toLocaleString('ar-EG') : 'الآن',
    items: (b.items || []).map((it) => {
      const known = products.find((p) => p.id === it.productId);
      const price = toNumber(it.unitPrice);
      const image = it.product?.images?.[0]?.url || '';
      const name = it.product?.nameAr || known?.name || it.productId;
      const color = it.variant?.color || '';
      const product: Product =
        known ||
        ({
          id: it.productId,
          sku: it.product?.sku || it.productId,
          name,
          categories: ['cat_others'],
          price,
          originalPrice: price,
          stock: 0,
          minThreshold: 5,
          // Compatibility is only ever taken from verified product records.
          compatibility: '',
          rating: 0,
          reviewsCount: 0,
          image,
          images: image ? [image] : [],
          description: '',
          colors: color ? [color] : [],
        } as Product);
      return { product, quantity: it.quantity, color, price };
    }),
    customerName: b.user?.fullName || '',
    customerPhone: b.user?.phone || b.shippingAddress?.phone || '',
    city: b.shippingAddress?.city || '',
    address: b.shippingAddress?.street || '',
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    subtotal: toNumber(b.subtotal),
    shipping: toNumber(b.shippingFee),
    discount: toNumber(b.discountTotal),
    giftCardDiscount: toNumber(b.giftCardDiscount),
    total: toNumber(b.grandTotal),
    statusCode: b.status,
    status: labelFor(b.status),
    pointsEarned: b.pointsEarned,
    statusHistory: (b.statusHistory || []).map((h) => ({
      status: h.status,
      labelAr: labelFor(h.status),
      notes: h.notes || undefined,
      createdAt: h.createdAt,
    })),
    createdAt: b.createdAt,
  };
}

/* -------------------------- Engagement ---------------------------- */

export async function fetchWishlistApi(): Promise<{ productId: string; product?: any }[]> {
  try {
    return await apiFetch<any[]>('/wishlist');
  } catch {
    return [];
  }
}

export async function addWishlistApi(productId: string): Promise<void> {
  await apiFetch('/wishlist', { method: 'POST', body: { productId } });
}

export async function removeWishlistApi(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
}

export async function fetchRecentlyViewedApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/recently-viewed');
  } catch {
    return [];
  }
}

export async function addRecentlyViewedApi(productId: string): Promise<void> {
  try {
    await apiFetch('/recently-viewed', { method: 'POST', body: { productId } });
  } catch {}
}

export async function createStockAlertApi(
  productId: string,
  email: string,
): Promise<{ message?: string }> {
  return apiFetch('/stock-alerts', {
    method: 'POST',
    body: { productId, email },
    auth: false,
  });
}

/* ---------------------------- Reviews ---------------------------- */

export interface ReviewSummary {
  reviews: any[];
  averageRating: number;
  total: number;
  distribution?: Record<string, number>;
}

export async function fetchReviewsApi(productId: string): Promise<ReviewSummary> {
  try {
    return await apiFetch<ReviewSummary>('/reviews', { auth: false, query: { productId } });
  } catch {
    return { reviews: [], averageRating: 0, total: 0 };
  }
}

export async function createReviewApi(body: {
  productId: string;
  rating: number;
  comment?: string;
}): Promise<any> {
  return apiFetch('/reviews', { method: 'POST', body });
}

/* ---------------------- Bundles & Flash Sales --------------------- */

export async function fetchBundlesApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/bundles', { auth: false });
  } catch {
    return [];
  }
}

export async function fetchFlashSalesApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/flash-sales', { auth: false });
  } catch {
    return [];
  }
}

/* ------------------------ Recommendations ------------------------ */

export async function fetchForYouApi(): Promise<any[]> {
  try {
    return await apiFetch<any[]>('/recommendations/for-you');
  } catch {
    return [];
  }
}

export async function fetchRelatedApi(productId: string): Promise<any[]> {
  try {
    return await apiFetch<any[]>(`/recommendations/related/${productId}`, { auth: false });
  } catch {
    return [];
  }
}

export async function fetchFbtApi(productId: string): Promise<any[]> {
  try {
    return await apiFetch<any[]>(
      `/recommendations/frequently-bought-together/${productId}`,
      { auth: false },
    );
  } catch {
    return [];
  }
}

export async function fetchIpadSetupApi(model: string): Promise<any> {
  try {
    return await apiFetch<any>('/recommendations/ipad-setup', {
      auth: false,
      query: { model },
    });
  } catch {
    return null;
  }
}

/* ---------------------- Loyalty, Referral, Gift ------------------- */

export async function fetchLoyaltyApi(): Promise<any> {
  try {
    return await apiFetch('/loyalty');
  } catch {
    return null;
  }
}

export async function redeemLoyaltyApi(points: number): Promise<any> {
  return apiFetch('/loyalty/redeem', { method: 'POST', body: { points } });
}

export async function fetchReferralsApi(): Promise<any> {
  try {
    return await apiFetch('/referrals');
  } catch {
    return null;
  }
}

export async function applyReferralApi(code: string, refereeEmail?: string): Promise<any> {
  return apiFetch('/referrals/apply', {
    method: 'POST',
    body: { code, refereeEmail },
  });
}

export async function fetchGiftCardBalanceApi(
  code: string,
): Promise<{ valid: boolean; balance?: number; message?: string }> {
  return apiFetch(`/gift-cards/${encodeURIComponent(code)}/balance`);
}
