/**
 * adminApi.ts — Admin-specific API calls
 * Covers: Notifications, Admin Product CRUD, Restock
 */
import { getAccessToken } from './api';

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
