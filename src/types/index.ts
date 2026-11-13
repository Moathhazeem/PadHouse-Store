export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  colorHex?: string;
  stock: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  categories: string[];
  price: number;
  originalPrice: number;
  stock: number;
  minThreshold: number;
  compatibility: string;
  compatibilityList?: string[];
  rating: number;
  reviewsCount: number;
  image: string;
  images?: string[];
  description: string;
  colors: string[];
  variants?: ProductVariant[];
  warranty?: string;
  features?: string[];
  specs?: Record<string, string>;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  /** Backend cart line id — present when the cart is sourced from the shared backend. */
  cartItemId?: string;
  variantId?: string;
  /** Live stock reported by the backend for the selected variant. */
  availableStock?: number;
}

export interface AppUser {
  id?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: 'super_admin' | 'admin' | 'customer' | 'guest';
  token?: string;
  customerProfileId?: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  color: string;
  price: number;
}

export interface OrderStatusHistoryEntry {
  status: string;
  labelAr?: string;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  /** Human readable backend order number, e.g. PH-2026-8169137. */
  orderNumber?: string;
  date: string;
  items: OrderItem[];
  customerName: string;
  customerPhone: string;
  city: string;
  address: string;
  /** Backend payment method enum (CASH_ON_DELIVERY, PALPAY, ...). */
  paymentMethod: string;
  paymentStatus?: string;
  subtotal: number;
  shipping: number;
  discount: number;
  giftCardDiscount?: number;
  total: number;
  /** Canonical backend status code (PENDING, CONFIRMED, ...). */
  statusCode?: string;
  /** Arabic status label, always provided by the backend. */
  status: string;
  pointsEarned?: number;
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt?: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  itemCount?: number;
}
