/**
 * adminApi.ts — Admin-specific API calls
 * Covers: Notifications, Admin Product CRUD, Restock
 */
import { getAccessToken, mapBackendProduct } from './api';
import type { Product } from '../types';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

/* ------------------------------------------------------------------ */
/* Shared admin fetch wrapper                                           */
/* ------------------------------------------------------------------ */

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join('، ') : data?.message || `خطأ (${res.status})`;
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export type ForecastHorizon = 7 | 14 | 30 | 60 | 90;
const forecastQuery = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return query.size ? `?${query}` : '';
};
export const adminFetchForecastOverviewApi = () => adminFetch<any>('/forecasting/overview');
export const adminFetchForecastDemandApi = (params: {limit?:number;offset?:number;productId?:string;search?:string} = {}) => adminFetch<any>(`/forecasting/demand${forecastQuery(params)}`);
export const adminFetchStockoutPredictionsApi = (params: {limit?:number;offset?:number;search?:string} = {}) => adminFetch<any>(`/forecasting/stockout-predictions${forecastQuery(params)}`);
export const adminFetchForecastRecommendationsApi = (params: {limit?:number;offset?:number;search?:string} = {}) => adminFetch<any>(`/forecasting/recommendations${forecastQuery(params)}`);
export const adminFetchForecastOverstockApi = (params: {limit?:number;offset?:number;search?:string} = {}) => adminFetch<any>(`/forecasting/overstock${forecastQuery(params)}`);
export const adminFetchForecastTrendsApi = (params: {productId?:string} = {}) => adminFetch<any>(`/forecasting/trends${forecastQuery(params)}`);
export const adminFetchForecastAccuracyApi = () => adminFetch<any>('/forecasting/accuracy');
export const adminFetchProductForecastApi = (productId:string) => adminFetch<any>(`/forecasting/products/${encodeURIComponent(productId)}`);
export const adminOverrideForecastRecommendationApi = (productId:string, recommendedQuantity:number) => adminFetch<any>(`/forecasting/recommendations/${encodeURIComponent(productId)}/override`, {method:'PATCH',body:JSON.stringify({recommendedQuantity})});
export const adminCreateForecastPurchaseOrderApi = (productId:string, supplierId:string, unitCost:number) => adminFetch<any>(`/forecasting/recommendations/${encodeURIComponent(productId)}/create-purchase-order`, {method:'POST',body:JSON.stringify({supplierId,unitCost})});
export const adminFetchInventoryForecastToolDefinitionsApi = () => adminFetch<Array<{name:string;description:string;parameters:Record<string,unknown>}>>('/ai/inventory/forecast-tools');
export const adminExecuteInventoryForecastToolApi = (name:string, args:Record<string,unknown>) => adminFetch<any>(`/ai/inventory/forecast-tools/${encodeURIComponent(name)}`, {method:'POST',body:JSON.stringify(args)});
export const adminGenerateForecastApi = (options:Record<string,unknown> = {}) => adminFetch<any>('/forecasting/generate', {method:'POST',body:JSON.stringify(options)});
export const adminUpdateForecastConfigurationApi = (options:Record<string,unknown>) => adminFetch<any>('/forecasting/configuration', {method:'PATCH',body:JSON.stringify(options)});

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AdminNotificationProduct {
  id: string;
  sku: string;
  nameAr: string;
  nameEn?: string;
  stock: number;
  minStock: number;
  maxStock?: number;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  productId: string | null;
  product?: AdminNotificationProduct | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductFormData {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sku: string;
  categoryId: string;
  basePrice: number;
  salePrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  ipadCompatibility?: string[];
  warrantyMonths?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Notifications API                                                    */
/* ------------------------------------------------------------------ */

export async function adminFetchNotificationsApi(): Promise<{
  notifications: AdminNotification[];
  unreadCount: number;
}> {
  return adminFetch<{ notifications: AdminNotification[]; unreadCount: number }>(
    '/admin/notifications'
  );
}

export async function adminMarkNotificationReadApi(id: string): Promise<AdminNotification> {
  return adminFetch<AdminNotification>(`/admin/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function adminMarkAllNotificationsReadApi(): Promise<{ success: boolean; updatedCount: number }> {
  return adminFetch('/admin/notifications/read-all', { method: 'PATCH' });
}

/* ------------------------------------------------------------------ */
/* Product Admin CRUD                                                   */
/* ------------------------------------------------------------------ */

/**
 * Admin catalog listing. Unlike the storefront call this one:
 *  - asks for inactive products too (admins must be able to re-enable them),
 *  - throws when the request fails so the dashboard can show an error state
 *    instead of silently rendering an empty table,
 *  - tolerates both a bare array and a wrapped payload
 *    (`{ data | items | products: [...] }`).
 */
export async function adminFetchProductsApi(): Promise<Product[]> {
  const payload = await adminFetch<any>('/products?includeInactive=true');
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.products)
    ? payload.products
    : [];

  return list.map(mapBackendProduct);
}

export async function adminCreateProductApi(data: AdminProductFormData): Promise<any> {
  return adminFetch('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateProductApi(id: string, data: Partial<AdminProductFormData>): Promise<any> {
  return adminFetch(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminDeleteProductApi(id: string): Promise<void> {
  return adminFetch(`/products/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Orders (tracking / ETA / Urgent Crisis)                              */
/* ------------------------------------------------------------------ */

export interface AdminOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  product?: { nameAr?: string; sku?: string } | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  grandTotal: number | string;
  createdAt: string;
  user?: { fullName?: string; email?: string; phone?: string | null } | null;
  shippingAddress?: { city: string; street: string; phone?: string | null } | null;
  items?: AdminOrderItem[];
  /* Live tracking / ETA */
  courierLocation?: string | null;
  destinationLocation?: string | null;
  distanceKm?: number | null;
  manualEtaMinutes?: number | null;
  autoEtaMinutes?: number | null;
  etaUpdatedAt?: string | null;
  /* Urgent Crisis */
  isUrgentCrisis: boolean;
  crisisType?: string | null;
  crisisReason?: string | null;
  crisisStartedAt?: string | null;
  crisisResolvedAt?: string | null;
}

export interface AdminOrderTrackingInput {
  courierLocation?: string;
  destinationLocation?: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  manualEtaMinutes?: number;
  notes?: string;
}

export async function adminFetchOrdersApi(): Promise<AdminOrder[]> {
  const payload = await adminFetch<any>('/orders/admin/all');
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return [];
}

export async function adminUpdateOrderTrackingApi(
  orderId: string,
  body: AdminOrderTrackingInput,
): Promise<AdminOrder> {
  return adminFetch<AdminOrder>(`/orders/${orderId}/tracking`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function adminEnableOrderCrisisApi(
  orderId: string,
  body?: { crisisType?: string; crisisReason?: string; notes?: string },
): Promise<AdminOrder> {
  return adminFetch<AdminOrder>(`/orders/${orderId}/crisis`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export async function adminResolveOrderCrisisApi(
  orderId: string,
  notes?: string,
): Promise<AdminOrder> {
  return adminFetch<AdminOrder>(`/orders/${orderId}/crisis`, {
    method: 'DELETE',
    body: JSON.stringify({ notes }),
  });
}

/* ------------------------------------------------------------------ */
/* Suppliers (Purchase Management Module)                               */
/* ------------------------------------------------------------------ */

export type AdminSupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminSupplier {
  id: string;
  name: string;
  company: string | null;
  contactName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  status: AdminSupplierStatus;
  isActive: boolean;
  /** Sum of non-cancelled purchase orders linked to the supplier. */
  totalPurchaseValue: number;
  purchaseOrdersCount: number;
  lastPurchaseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface AdminSupplierDetails extends AdminSupplier {
  purchaseHistory: AdminPurchaseOrder[];
}

export interface AdminSupplierListResult {
  items: AdminSupplier[];
  total: number;
  active: number;
  inactive: number;
  totalPurchaseValue: number;
}

export interface AdminSupplierFormData {
  name: string;
  company?: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  status?: AdminSupplierStatus;
}

export async function adminFetchSuppliersApi(params?: {
  search?: string;
  status?: AdminSupplierStatus;
}): Promise<AdminSupplierListResult> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminSupplierListResult>(`/suppliers${suffix}`);
}

export async function adminFetchSupplierApi(id: string): Promise<AdminSupplierDetails> {
  return adminFetch<AdminSupplierDetails>(`/suppliers/${id}`);
}

export async function adminCreateSupplierApi(data: AdminSupplierFormData): Promise<AdminSupplier> {
  return adminFetch<AdminSupplier>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateSupplierApi(
  id: string,
  data: Partial<AdminSupplierFormData>,
): Promise<AdminSupplier> {
  return adminFetch<AdminSupplier>(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateSupplierStatusApi(
  id: string,
  status: AdminSupplierStatus,
): Promise<AdminSupplier> {
  return adminFetch<AdminSupplier>(`/suppliers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function adminDeleteSupplierApi(id: string): Promise<void> {
  return adminFetch(`/suppliers/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Purchase Orders (Purchase Management Module)                        */
/* ------------------------------------------------------------------ */

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface AdminPurchaseOrderSupplier {
  id: string;
  name: string;
  company: string | null;
  contactName?: string | null;
  phone?: string;
  email?: string | null;
  city?: string | null;
  status?: string;
}

export interface AdminPurchaseOrderCreator {
  id: string;
  fullName: string;
  email?: string;
}

export interface AdminPurchaseOrderLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  discountRate: number;
  taxRate: number;
  discountAmount: number;
  taxAmount: number;
  lineSubtotal: number;
  /** Live stock of the linked product; increases when a receipt is confirmed. */
  currentStock: number | null;
}

export interface AdminPurchaseOrderStatusEntry {
  id: string;
  fromStatus: PurchaseOrderStatus | null;
  toStatus: PurchaseOrderStatus;
  notes: string | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface AdminPurchaseOrderListItem {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  supplier: AdminPurchaseOrderSupplier | null;
  createdBy: AdminPurchaseOrderCreator | null;
  currency: string;
  paymentTerms: string | null;
  orderDate: string;
  expectedAt: string | null;
  receivedAt: string | null;
  itemsCount: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingCost: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPurchaseOrderListResult {
  items: AdminPurchaseOrderListItem[];
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
}

export interface AdminGoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  /** Quantity received in this receipt (not cumulative). */
  quantityReceived: number;
  unitCost: number;
}

export interface AdminGoodsReceipt {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  receivedById: string | null;
  receivedByName: string | null;
  notes: string | null;
  items: AdminGoodsReceiptItem[];
}

export interface AdminPurchaseOrderDetails
  extends Omit<AdminPurchaseOrderListItem, 'itemsCount'> {
  notes: string | null;
  items: AdminPurchaseOrderLine[];
  statusHistory: AdminPurchaseOrderStatusEntry[];
  /** Goods receipts already recorded against this order (newest first). */
  receipts: AdminGoodsReceipt[];
  /** Transitions permitted by the backend state machine for the current status. */
  allowedTransitions: PurchaseOrderStatus[];
}

export interface AdminPurchaseOrderItemInput {
  productId: string;
  orderedQuantity: number;
  unitCost: number;
  discountRate?: number;
  taxRate?: number;
}

export interface AdminPurchaseOrderFormData {
  supplierId: string;
  currency?: string;
  paymentTerms?: string;
  orderDate?: string;
  expectedAt?: string;
  notes?: string;
  shippingCost?: number;
  items: AdminPurchaseOrderItemInput[];
}

export interface AdminReceiveLineInput {
  itemId: string;
  /** Quantity received in this receipt (a positive delta, not the cumulative total). */
  quantityReceived: number;
}

export async function adminFetchPurchaseOrdersApi(params?: {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  search?: string;
  /** ISO date — only orders on/after this date (used by the analytics range). */
  from?: string;
  /** ISO date — only orders on/before this date. */
  to?: string;
}): Promise<AdminPurchaseOrderListResult> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.supplierId) qs.set('supplierId', params.supplierId);
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminPurchaseOrderListResult>(`/purchase-orders${suffix}`);
}

/* ------------------------------------------------------------------ */
/* Purchase Analytics (server-side aggregation over real records)      */
/* ------------------------------------------------------------------ */

export interface AdminPurchaseAnalyticsKpis {
  /** All matching orders (including cancelled). */
  totalOrders: number;
  /** Committed spend: sum of grand totals excluding cancelled orders. */
  totalPurchaseAmount: number;
  pendingApprovalOrders: number;
  approvedOrders: number;
  partiallyReceivedOrders: number;
  /** Orders received in full. */
  completedOrders: number;
  /** Units actually received across non-cancelled orders. */
  totalProductsPurchased: number;
  /** Units ordered but not yet received, on committed orders. */
  outstandingQuantity: number;
}

export interface AdminPurchaseStatusDistributionRow {
  status: PurchaseOrderStatus;
  count: number;
  value: number;
}

export interface AdminPurchaseMonthlySpendingPoint {
  /** Stable `YYYY-MM` key. */
  key: string;
  orders: number;
  total: number;
}

export interface AdminPurchaseTopSupplierRow {
  id: string;
  name: string;
  company: string | null;
  orders: number;
  total: number;
  /** Share of the total committed spend, as a percentage. */
  share: number;
}

export interface AdminPurchaseSupplierPerformanceRow {
  id: string;
  name: string;
  company: string | null;
  orders: number;
  total: number;
  completedOrders: number;
  /** Completed / total orders, as a percentage. */
  completionRate: number;
  receivedQuantity: number;
  outstandingQuantity: number;
  /** Average days between order date and full receipt (null if none completed). */
  avgLeadTimeDays: number | null;
}

export interface AdminPurchaseOutstandingProductRow {
  productId: string;
  productName: string;
  sku: string;
  orders: number;
  orderedQuantity: number;
  receivedQuantity: number;
  outstandingQuantity: number;
}

export interface AdminPurchaseRecentOrderRow {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  supplierName: string | null;
  supplierCompany: string | null;
  currency: string;
  orderDate: string;
  expectedAt: string | null;
  grandTotal: number;
  itemsCount: number;
}

export interface AdminPurchaseAnalyticsFilters {
  from: string | null;
  to: string | null;
  supplierId: string | null;
  status: PurchaseOrderStatus | null;
  productId: string | null;
  topLimit: number;
  months: number;
}

export interface AdminPurchaseAnalyticsResult {
  filters: AdminPurchaseAnalyticsFilters;
  kpis: AdminPurchaseAnalyticsKpis;
  statusDistribution: AdminPurchaseStatusDistributionRow[];
  monthlySpending: AdminPurchaseMonthlySpendingPoint[];
  topSuppliers: AdminPurchaseTopSupplierRow[];
  supplierPerformance: AdminPurchaseSupplierPerformanceRow[];
  outstandingByProduct: AdminPurchaseOutstandingProductRow[];
  recentOrders: AdminPurchaseRecentOrderRow[];
  generatedAt: string;
}

export interface AdminPurchaseAnalyticsParams {
  from?: string;
  to?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  productId?: string;
  topLimit?: number;
  months?: number;
}

/**
 * Server-aggregated purchase analytics. Every figure is computed by the backend
 * from real purchase-order records — nothing is mocked on the client.
 */
export async function adminFetchPurchaseAnalyticsApi(
  params?: AdminPurchaseAnalyticsParams,
): Promise<AdminPurchaseAnalyticsResult> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.supplierId) qs.set('supplierId', params.supplierId);
  if (params?.status) qs.set('status', params.status);
  if (params?.productId) qs.set('productId', params.productId);
  if (params?.topLimit != null) qs.set('topLimit', String(params.topLimit));
  if (params?.months != null) qs.set('months', String(params.months));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminPurchaseAnalyticsResult>(`/purchase-orders/analytics${suffix}`);
}

export async function adminFetchPurchaseOrderApi(id: string): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}`);
}

export async function adminCreatePurchaseOrderApi(
  data: AdminPurchaseOrderFormData,
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdatePurchaseOrderApi(
  id: string,
  data: Partial<AdminPurchaseOrderFormData>,
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminDeletePurchaseOrderApi(id: string): Promise<void> {
  return adminFetch(`/purchase-orders/${id}`, { method: 'DELETE' });
}

/** DRAFT → PENDING_APPROVAL */
export async function adminSubmitPurchaseOrderApi(
  id: string,
  notes?: string,
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/** PENDING_APPROVAL → APPROVED */
export async function adminApprovePurchaseOrderApi(
  id: string,
  notes?: string,
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/** PENDING_APPROVAL → DRAFT (sent back for changes) */
export async function adminRejectPurchaseOrderApi(
  id: string,
  notes?: string,
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/** APPROVED → SENT */
export async function adminSendPurchaseOrderApi(
  id: string,
  notes?: string,
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Confirms a goods receipt. Each line's `quantityReceived` is a positive delta
 * for THIS receipt. On success the backend increases product stock, writes an
 * inventory movement, and advances the order to partially/fully received.
 */
export async function adminReceivePurchaseOrderApi(
  id: string,
  data: { items: AdminReceiveLineInput[]; notes?: string },
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}/receive`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Any non-final state → CANCELLED */
export async function adminCancelPurchaseOrderApi(
  id: string,
  data?: { reason?: string; notes?: string },
): Promise<AdminPurchaseOrderDetails> {
  return adminFetch<AdminPurchaseOrderDetails>(`/purchase-orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

/* ------------------------------------------------------------------ */
/* Purchase Management AI assistant (extends the existing /ai module)  */
/* ------------------------------------------------------------------ */

export type AdminAiReorderPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/** Whether a suggested supplier comes from real purchase history or the active list. */
export type AdminAiSupplierMatchSource = 'HISTORY' | 'SUGGESTED';

export interface AdminAiReorderSupplierOption {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  isPreferred: boolean;
  source: AdminAiSupplierMatchSource;
  purchaseOrdersCount: number;
  lastPurchaseAt: string | null;
}

export interface AdminAiReorderSuggestion {
  productId: string;
  sku: string;
  nameAr: string;
  category: string | null;
  currentStock: number;
  minStock: number;
  maxStock: number;
  avgDailySales: number;
  unitsSoldWindow: number;
  /** Units on orders still awaiting a decision (DRAFT / PENDING_APPROVAL). */
  pendingQuantity: number;
  /** Units committed to a supplier but not yet received (inbound). */
  outstandingQuantity: number;
  inboundQuantity: number;
  projectedStock: number;
  suggestedQuantity: number;
  suggestedUnitCost: number;
  /** True when no cost is recorded — the admin must price the line before sending. */
  needsPricing: boolean;
  estimatedLineCost: number;
  priority: AdminAiReorderPriority;
  reason: string;
  supplierCandidates: AdminAiReorderSupplierOption[];
  preferredSupplier: AdminAiReorderSupplierOption | null;
}

/** Low-stock products already covered by pending/incoming quantities (dedupe evidence). */
export interface AdminAiCoveredRestockItem {
  productId: string;
  sku: string;
  nameAr: string;
  currentStock: number;
  minStock: number;
  pendingQuantity: number;
  outstandingQuantity: number;
  inboundQuantity: number;
  projectedStock: number;
  note: string;
}

export interface AdminAiReorderKpis {
  productsAnalyzed: number;
  productsNeedingRestock: number;
  productsCoveredByInbound: number;
  outOfStockCount: number;
  estimatedTotalCost: number;
  currency: string;
  windowDays: number;
}

export interface AdminAiReorderAnalysisResult {
  generatedAt: string;
  windowDays: number;
  summary: string;
  kpis: AdminAiReorderKpis;
  suggestions: AdminAiReorderSuggestion[];
  covered: AdminAiCoveredRestockItem[];
}

export interface AdminAiDraftPoItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  unitCost: number;
  lineSubtotal: number;
  needsPricing: boolean;
}

export interface AdminAiDraftPoSummary {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  supplier: { id: string; name: string; company: string | null } | null;
  orderDate: string;
  expectedAt: string | null;
  grandTotal: number;
  itemsCount: number;
  items: AdminAiDraftPoItem[];
}

export interface AdminAiSkippedRestockItem {
  productId: string;
  nameAr: string;
  reason: string;
}

export interface AdminAiDraftPurchaseOrderResult {
  reply: string;
  analysis: AdminAiReorderAnalysisResult;
  drafts: AdminAiDraftPoSummary[];
  skipped: AdminAiSkippedRestockItem[];
  /** Always true: AI output is advisory and never auto-executed. */
  requiresApproval: true;
}

export interface AdminAiReorderSuggestionsParams {
  categoryId?: string;
  windowDays?: number;
  limit?: number;
}

export interface AdminAiDraftPurchaseOrderRequest {
  message?: string;
  supplierId?: string;
  productIds?: string[];
  windowDays?: number;
  limit?: number;
  expectedAt?: string;
  notes?: string;
}

/**
 * Read-only reorder analysis straight from the existing AI assistant. Returns
 * products needing restocking, suggested quantities (deduplicated against
 * pending/outstanding purchase orders) and supplier suggestions.
 */
export async function adminFetchAiReorderSuggestionsApi(
  params?: AdminAiReorderSuggestionsParams,
): Promise<AdminAiReorderAnalysisResult> {
  return adminFetch<AdminAiReorderAnalysisResult>('/ai/inventory/reorder-suggestions', {
    method: 'POST',
    body: JSON.stringify(params ?? {}),
  });
}

/**
 * Generates **DRAFT** purchase orders for the products that need restocking.
 * The assistant never approves, sends or confirms receipts — the admin reviews
 * the returned drafts and performs those actions manually.
 */
export async function adminCreateAiDraftPurchaseOrderApi(
  data: AdminAiDraftPurchaseOrderRequest,
): Promise<AdminAiDraftPurchaseOrderResult> {
  return adminFetch<AdminAiDraftPurchaseOrderResult>('/ai/inventory/draft-purchase-order', {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

/* ------------------------------------------------------------------ */
/* Restock (uses PATCH /products/:id/stock — sets absolute qty)        */
/* or uses inventory variant endpoint if available                     */
/* ------------------------------------------------------------------ */

export async function adminRestockProductApi(
  productId: string,
  newStock: number,
  notes?: string,
): Promise<any> {
  // Backend PATCH /products/:id/stock updates the product stock to newStock
  return adminFetch(`/products/${productId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stock: newStock, notes }),
  });
}

/* ------------------------------------------------------------------ */
/* Sales & Profit Analytics (Part 3 dashboard)                         */
/* Server-side aggregation over real orders — nothing is mocked here.   */
/* ------------------------------------------------------------------ */

/** Trend granularity accepted by the analytics endpoints. */
export type AnalyticsGroupBy = 'day' | 'week' | 'month';

/** Canonical currency reported by every analytics endpoint. */
export interface AdminAnalyticsCurrency {
  code: string;
  symbol: string;
}

/** Resolved inclusive UTC window the backend actually applied. */
export interface AdminAnalyticsRangeMeta {
  startDate: string | null;
  endDate: string | null;
  groupBy: AnalyticsGroupBy | null;
  timezone: string;
}

/** Order counts per status/payment value (used by distribution panels). */
export interface AdminAnalyticsStatusRow {
  status: string;
  count: number;
  value: number;
}

/**
 * Sales/profit summary. Mirrors `computeProfitSummary` on the backend:
 * revenue is the money actually charged (cancelled orders excluded), `cogs`
 * is the weighted-average cost of goods sold and `grossProfit` = itemRevenue − cogs.
 */
export interface AdminAnalyticsSalesSummary {
  /** Money charged (`SUM(Order.grandTotal)`) over non-cancelled orders. */
  revenue: number;
  itemRevenue: number;
  discountTotal: number;
  giftCardDiscount: number;
  shipping: number;
  cogs: number;
  /** Product margin: item revenue − cost of goods. */
  grossProfit: number;
  grossMarginPct: number;
  /** Bottom line after discounts/shipping, minus cost of goods. */
  netProfit: number;
  netMarginPct: number;
  unitsSold: number;
  orderCount: number;
  /** Average amount charged per valid order. */
  averageOrderValue: number;
  averageUnitCost: number;
}

/** Point-in-time inventory valuation totals (weighted-average cost). */
export interface AdminAnalyticsInventoryTotals {
  variantCount: number;
  productCount: number;
  totalUnits: number;
  /** `SUM(currentStock × costPrice)` — the at-cost stock value. */
  costValue: number;
  /** `SUM(currentStock × list price)` — value if sold at list price. */
  retailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
  potentialProfit: number;
  potentialMarginPct: number;
}

export interface AdminAnalyticsTrendPoint {
  key: string;
  orderCount: number;
  revenue: number;
}

export interface AdminAnalyticsCategoryRow {
  categoryId: string;
  nameAr: string;
  nameEn: string | null;
  revenue: number;
  cogs: number;
  unitsSold: number;
  orderCount: number;
  share: number;
}

export interface AdminAnalyticsProductRow {
  productId: string;
  sku: string | null;
  nameAr: string;
  nameEn: string | null;
  categoryId: string | null;
  categoryNameAr: string | null;
  /** Primary product image URL (from `ProductImage`), or `null` when absent. */
  imageUrl: string | null;
  unitsSold: number;
  revenue: number;
  cogs: number;
  /** Units whose variant had a recorded cost (`Inventory.costPrice > 0`). */
  costedUnits: number;
  orderCount: number;
}

/**
 * `/analytics/overview` payload — the single source for the dashboard KPIs.
 * Every figure is computed by PostgreSQL against the live tables.
 */
export interface AdminAnalyticsOverviewResult {
  currency: AdminAnalyticsCurrency;
  range: AdminAnalyticsRangeMeta;
  filters: {
    categoryId: string | null;
    groupBy: AnalyticsGroupBy;
    limit: number;
  };
  sales: AdminAnalyticsSalesSummary;
  orders: {
    completedOrders: number;
    cancelledOrders: number;
    statusDistribution: AdminAnalyticsStatusRow[];
    paymentDistribution: AdminAnalyticsStatusRow[];
  };
  inventory: AdminAnalyticsInventoryTotals;
  trend: AdminAnalyticsTrendPoint[];
  topCategories: AdminAnalyticsCategoryRow[];
  topProducts: AdminAnalyticsProductRow[];
  generatedAt: string;
}

export interface AdminAnalyticsOverviewParams {
  /** ISO `YYYY-MM-DD` (whole day, inclusive) or full ISO timestamp. */
  startDate?: string;
  /** ISO `YYYY-MM-DD` (whole day, inclusive) or full ISO timestamp. */
  endDate?: string;
  groupBy?: AnalyticsGroupBy;
  limit?: number;
}

/**
 * Dashboard overview KPIs. Date boundaries are applied to `Order.createdAt`
 * server-side; cancelled orders are never counted and each order counts once.
 */
export async function adminFetchAnalyticsOverviewApi(
  params?: AdminAnalyticsOverviewParams,
): Promise<AdminAnalyticsOverviewResult> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminAnalyticsOverviewResult>(`/analytics/overview${suffix}`);
}

/** `/analytics/inventory-valuation` payload (range-independent snapshot). */
export interface AdminInventoryValuationResult {
  currency: AdminAnalyticsCurrency;
  filters: { categoryId: string | null; sortBy: string; limit: number; page: number };
  totals: AdminAnalyticsInventoryTotals;
  byCategory: Array<{
    categoryId: string;
    nameAr: string;
    variantCount: number;
    totalUnits: number;
    costValue: number;
    retailValue: number;
    share: number;
  }>;
  items: Array<{
    inventoryId: string;
    variantId: string;
    variantSku: string;
    color: string | null;
    productId: string;
    productSku: string;
    nameAr: string;
    nameEn: string | null;
    categoryNameAr: string | null;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    minThreshold: number;
    maxStock: number;
    costPrice: number;
    costValue: number;
    retailValue: number;
    isLowStock: boolean;
    isOverstocked: boolean;
  }>;
  lowStock: Array<{
    inventoryId: string;
    variantId: string;
    productId: string;
    nameAr: string;
    variantSku: string;
    currentStock: number;
    minThreshold: number;
    shortfall: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
  generatedAt: string;
}

/**
 * Current inventory valuation snapshot. This endpoint deliberately takes **no**
 * date range: the Inventory Value KPI is a live snapshot and must not react to
 * the dashboard's historical sales filters.
 */
export async function adminFetchAnalyticsInventoryValuationApi(params: { categoryId?: string; sortBy?: string; limit?: number; page?: number } = {}): Promise<AdminInventoryValuationResult> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') qs.set(key, String(value)); });
  return adminFetch<AdminInventoryValuationResult>(`/analytics/inventory-valuation${qs.size ? `?${qs}` : ''}`);
}

export interface AdminOrdersAnalyticsResult {
  currency: AdminAnalyticsCurrency;
  summary: { totalOrders: number; revenue: number; averageOrderValue: number; grossTotal: number; discounts: number };
  statusDistribution: Array<{ status: string; count: number; value: number }>;
  paymentDistribution: Array<{ status: string; count: number; value: number }>;
  recentOrders: Array<{ id: string; orderNumber: string; status: string; paymentStatus: string; grandTotal: number; itemsCount: number; createdAt: string }>;
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

export interface AdminProductPerformanceResult {
  currency: AdminAnalyticsCurrency;
  products: Array<{ productId: string; sku: string | null; nameAr: string; imageUrl: string | null; categoryId: string; categoryNameAr: string | null; unitsSold: number; revenue: number; cogs: number; costKnown: boolean; profit: number | null; marginPct: number | null; currentStock: number; minStock: number; inventoryValue: number }>;
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

function analyticsQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') qs.set(key, String(value)); });
  return qs.size ? `?${qs}` : '';
}

export function adminFetchAnalyticsOrdersApi(params: { startDate?: string; endDate?: string; categoryId?: string; limit?: number; page?: number } = {}) {
  return adminFetch<AdminOrdersAnalyticsResult>(`/analytics/orders${analyticsQuery(params)}`);
}

export function adminFetchAnalyticsProductPerformanceApi(params: { startDate?: string; endDate?: string; categoryId?: string; sortBy?: string; limit?: number; page?: number } = {}) {
  return adminFetch<AdminProductPerformanceResult>(`/analytics/product-performance${analyticsQuery(params)}`);
}

/* ------------------------------------------------------------------ */
/* Sales Analytics (Part 4 — Over Time / by Category / by Product)      */
/* Same server-side aggregations as Part 3; cancelled orders excluded,  */
/* each order counted once. Nothing below fabricates figures.           */
/* ------------------------------------------------------------------ */

/** Filter block echoed by `/analytics/sales`. */
export interface AdminAnalyticsSalesFilters {
  categoryId: string | null;
  groupBy: AnalyticsGroupBy;
  limit: number;
}

/**
 * `/analytics/sales` payload — trend + category + product breakdowns in a
 * single round-trip. `summary` is the very same `computeProfitSummary` used by
 * `/analytics/overview`, so the chart totals always agree with the dashboard KPIs.
 */
export interface AdminAnalyticsSalesResult {
  currency: AdminAnalyticsCurrency;
  range: AdminAnalyticsRangeMeta;
  filters: AdminAnalyticsSalesFilters;
  summary: AdminAnalyticsSalesSummary;
  statusDistribution: AdminAnalyticsStatusRow[];
  trend: AdminAnalyticsTrendPoint[];
  byCategory: AdminAnalyticsCategoryRow[];
  topProducts: AdminAnalyticsProductRow[];
  generatedAt: string;
}

export interface AdminAnalyticsSalesParams {
  /** ISO `YYYY-MM-DD` (whole day, inclusive) or full ISO timestamp. */
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  groupBy?: AnalyticsGroupBy;
  limit?: number;
}

/** Sales trend + category + product breakdown for the selected window. */
export async function adminFetchAnalyticsSalesApi(
  params?: AdminAnalyticsSalesParams,
): Promise<AdminAnalyticsSalesResult> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.categoryId) qs.set('categoryId', params.categoryId);
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminAnalyticsSalesResult>(`/analytics/sales${suffix}`);
}

/**
 * A product row from `/analytics/best-selling-products`, enriched by the backend
 * with `profit` (line revenue − COGS) and a `share` of the ranked metric.
 *
 * `profit`/`marginPct` are `null` when `costKnown` is false — the product's cost
 * was never captured, so the backend reports no profit rather than fabricating
 * one from a zero/unknown cost.
 */
export interface AdminAnalyticsRankedProductRow extends AdminAnalyticsProductRow {
  /** True when every sold unit resolved to a recorded cost. */
  costKnown: boolean;
  /** Line revenue − COGS, or `null` when the cost is unknown. */
  profit: number | null;
  /** Gross margin %, or `null` when `profit` is unavailable. */
  marginPct: number | null;
  /** Share of the ranked metric (units or revenue) across the returned page. */
  share: number;
}

export interface AdminAnalyticsBestSellingResult {
  currency: AdminAnalyticsCurrency;
  range: AdminAnalyticsRangeMeta;
  filters: { categoryId: string | null; sortBy: string; limit: number; page: number };
  totals: { revenue: number; unitsSold: number };
  products: AdminAnalyticsRankedProductRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
  generatedAt: string;
}

export interface AdminAnalyticsBestSellingParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  sortBy?: 'unitsSold' | 'revenue' | 'orderCount';
  limit?: number;
  page?: number;
}

/** Products ranked by the chosen metric (default: revenue). */
export async function adminFetchAnalyticsBestSellingProductsApi(
  params?: AdminAnalyticsBestSellingParams,
): Promise<AdminAnalyticsBestSellingResult> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.categoryId) qs.set('categoryId', params.categoryId);
  if (params?.sortBy) qs.set('sortBy', params.sortBy);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.page != null) qs.set('page', String(params.page));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminAnalyticsBestSellingResult>(`/analytics/best-selling-products${suffix}`);
}

/* ------------------------------------------------------------------ */
/* Gross Profit Analytics (Part 6 — historical purchase costing)        */
/* COGS is resolved from goods-receipt cost layers as of each sale, not */
/* from the current inventory cost. Units with no purchase history are  */
/* never silently priced — they surface as data-quality warnings.       */
/* ------------------------------------------------------------------ */

/** Costing basis the gross-profit endpoint reports alongside the chain. */
export interface AdminProfitCostBasis {
  /** Costing method applied to historical lines (e.g. `historical-weighted-average`). */
  method: string;
  /** Where the historical purchase cost comes from (`GoodsReceiptItem.unitCost`). */
  source: string;
  /** Method the inventory module itself applies to on-hand stock. */
  inventoryMethod: string;
  /** Cost used only when no purchase history precedes the sale. */
  fallback: string;
}

/**
 * The Gross Sales → Net Sales → Gross Profit chain.
 *
 * `netSales = grossSales − discounts − refunds`, `grossProfit = netSales − cogs`
 * and `grossProfitMarginPct = (grossProfit ÷ netSales) × 100`. This is a **gross**
 * profit figure: salaries, marketing, operating and other overhead costs are not
 * modelled and are never subtracted here.
 */
export interface AdminProfitSummary {
  grossSales: number;
  /** Coupon discount + gift-card discount. */
  discounts: number;
  discountTotal: number;
  giftCardDiscount: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number | null;
  grossProfitMarginPct: number | null;
  unitsSold: number;
  orderCount: number;
  averageOrderValue: number;
  averageUnitCost: number;
  /** Sold units whose cost fell back to the current inventory cost. */
  uncostedUnits: number;
  /** % of sold units priced from real purchase history (0–100). */
  costCoveragePct: number;
}

/** Discounts / refunds / shipping split for the selected window. */
export interface AdminProfitBreakdown {
  discounts: { coupon: number; giftCard: number; total: number; sharePct: number };
  refunds: { total: number; orderCount: number; sharePct: number };
  /** Reported for completeness only — excluded from the gross-profit chain. */
  shipping: number;
}

/** One period of the gross-profit trend. */
export interface AdminProfitTrendPoint {
  key: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number | null;
  marginPct: number | null;
  unitsSold: number;
  orderCount: number;
}

/** A product whose sold units were not fully costed from purchase history. */
export interface AdminProfitAffectedProduct {
  productId: string;
  sku: string | null;
  nameAr: string;
  unitsSold: number;
  uncostedUnits: number;
}

/** Data-quality signals for the gross-profit chain. */
export interface AdminProfitDataQuality {
  /** True when every sold unit was costed from historical purchase records. */
  isComplete: boolean;
  unitsSold: number;
  unitsWithHistory: number;
  uncostedUnits: number;
  costCoveragePct: number;
  affectedProducts: AdminProfitAffectedProduct[];
  /** Human-readable warnings (Arabic) for the dashboard. */
  notes: string[];
}

/** `/analytics/profit` payload. */
export interface AdminProfitAnalyticsResult {
  currency: AdminAnalyticsCurrency;
  range: AdminAnalyticsRangeMeta;
  filters: { categoryId: string | null; groupBy: AnalyticsGroupBy; limit: number };
  costBasis: AdminProfitCostBasis;
  summary: AdminProfitSummary;
  breakdown: AdminProfitBreakdown;
  trend: AdminProfitTrendPoint[];
  dataQuality: AdminProfitDataQuality;
  generatedAt: string;
}

export interface AdminProfitAnalyticsParams {
  /** ISO `YYYY-MM-DD` (whole day, inclusive) or full ISO timestamp. */
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  groupBy?: AnalyticsGroupBy;
  limit?: number;
}

/** Gross-profit chain + trend + data-quality signals for the selected window. */
export async function adminFetchAnalyticsProfitApi(
  params?: AdminProfitAnalyticsParams,
): Promise<AdminProfitAnalyticsResult> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.categoryId) qs.set('categoryId', params.categoryId);
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminFetch<AdminProfitAnalyticsResult>(`/analytics/profit${suffix}`);
}

/** Category option for the analytics filter dropdown (from `/categories`). */
export interface AdminCategoryOption {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string | null;
}

/**
 * Active storefront categories. Backs the category filter so admins can scope
 * the whole section to a single category. Failures degrade to an empty list —
 * the analytics still render unfiltered rather than blocking the dashboard.
 */
export async function adminFetchCategoriesApi(): Promise<AdminCategoryOption[]> {
  const payload = await adminFetch<any>('/categories');
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : [];
  return list
    .map((c: any) => ({
      id: String(c?.id ?? ''),
      slug: String(c?.slug ?? ''),
      nameAr: String(c?.nameAr ?? c?.name ?? ''),
      nameEn: c?.nameEn ?? null,
    }))
    .filter((c: AdminCategoryOption) => c.id.length > 0);
}
