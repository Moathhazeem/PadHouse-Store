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
