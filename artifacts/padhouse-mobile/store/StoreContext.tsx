import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS, type Product } from '@/constants/products';

const STORAGE_KEY = 'padhouse-mobile-demo-v1';

export type CartLine = { productId: string; quantity: number; variant?: string; color?: string };
export type ProfileData = {
  name: string;
  phone: string;
  email: string;
  deviceModel: string;
  address: string;
  area: string;
  notificationsEnabled: boolean;
};
export type DemoOrder = {
  id: string;
  createdAt: string;
  items: CartLine[];
  customer: Pick<ProfileData, 'name' | 'phone' | 'email'>;
  area: string;
  address: string;
  note: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'طلب تجريبي — غير مرسل';
};
export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  productIds?: string[];
  createdAt: string;
};
export type LocalDraft = { id: string; title: string; content: string; createdAt: string };
export type WorkflowLog = { id: string; workflow: string; createdAt: string; status: 'محاكاة محلية' };
type PersistedState = {
  cart: CartLine[];
  favorites: string[];
  compareIds: string[];
  recentSearches: string[];
  orders: DemoOrder[];
  profile: ProfileData;
  chatMessages: ChatMessage[];
  drafts: LocalDraft[];
  workflowLogs: WorkflowLog[];
};

const initialState: PersistedState = {
  cart: [],
  favorites: [],
  compareIds: [],
  recentSearches: [],
  orders: [],
  profile: {
    name: '',
    phone: '',
    email: '',
    deviceModel: '',
    address: '',
    area: 'الضفة الغربية',
    notificationsEnabled: false,
  },
  chatMessages: [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'أهلًا! هذا مساعد متجر تجريبي يعتمد على معلومات الكتالوج المنشورة. لا يؤكد المخزون أو التوافق غير المذكور.',
      createdAt: new Date(0).toISOString(),
    },
  ],
  drafts: [],
  workflowLogs: [],
};

type CheckoutDetails = {
  customer: Pick<ProfileData, 'name' | 'phone' | 'email'>;
  area: string;
  address: string;
  note: string;
  deliveryFee: number;
};

type StoreContextValue = PersistedState & {
  hydrated: boolean;
  storageError: string;
  products: Product[];
  addToCart: (productId: string, variant?: string, color?: string, quantity?: number) => boolean;
  updateQuantity: (productId: string, quantity: number, variant?: string, color?: string) => void;
  removeFromCart: (productId: string, variant?: string, color?: string) => void;
  toggleFavorite: (productId: string) => void;
  toggleCompare: (productId: string) => boolean;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  updateProfile: (profile: Partial<ProfileData>) => void;
  createDemoOrder: (details: CheckoutDetails) => DemoOrder | null;
  sendChatMessage: (text: string) => void;
  saveDraft: (title: string, content: string) => void;
  addWorkflowLog: (workflow: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function localReply(message: string) {
  const value = message.toLocaleLowerCase('ar');

  if (/توصيل|شحن|توصلك|التوصيل/.test(value)) {
    return {
      text: 'المعلومات المنشورة التي راجعناها تذكر رسومًا مرجعية: الضفة الغربية 20₪، القدس 30₪، مناطق 48 70₪، والاستلام من نابلس مجانًا. قد تتغير الرسوم؛ أكّدها مع المتجر قبل الطلب. هذا التطبيق لا يرسل طلبات حقيقية.',
      productIds: [],
    };
  }
  if (/كفالة|ضمان|كفول/.test(value)) {
    return {
      text: 'صفحة قلم PadHouse تذكر كفالة سنة واحدة. لم نجد معلومات كفالة مؤكدة لبقية المنتجات المعروضة. راجع المتجر لتأكيد شروط المنتج الذي اخترته.',
      productIds: ['pencil'],
    };
  }
  if (/قارن|مقارنة/.test(value)) {
    return {
      text: 'يمكنك اختيار منتجين أو أكثر من شاشة المقارنة. سأعرض السعر والمواصفات المنشورة، وأوضح ما لم يتم التحقق منه.',
      productIds: [],
    };
  }
  const product = PRODUCTS.find((item) => value.includes(item.name.toLocaleLowerCase('ar')) || value.includes(item.category.toLocaleLowerCase('ar')));
  if (product) {
    return {
      text: `${product.name}: السعر المرجعي المنشور ${product.price}₪. ${product.compatibility} التوفر والسعر الحالي غير متصلين بالتطبيق.`,
      productIds: [product.id],
    };
  }
  if (/قلم|رسم|دراسة/.test(value)) {
    return {
      text: 'الكتالوج المنشور يتضمن قلم PadHouse بسعر مرجعي 120₪، وتذكر صفحته توافق أجهزة iPad من إصدار 2018 فما بعد وكفالة سنة. تحقّق من موديلك والسعر والتوفر مع المتجر.',
      productIds: ['pencil'],
    };
  }
  if (/كفر|حافظة|حماية/.test(value)) {
    return {
      text: 'توجد كفرات بمقاسات منشورة، لكن توافق موديل iPad المحدد غير موثق هنا. طابق قياس جهازك مع خيارات المنتج أو اسأل المتجر قبل الطلب.',
      productIds: ['clear-case', 'carbon-case'],
    };
  }
  return {
    text: 'لا أستطيع تأكيد هذه المعلومة من الكتالوج المتاح. يمكنك فتح الأسئلة الشائعة أو التواصل مع المتجر عبر موقعه الرسمي. هذه إجابة محلية تجريبية وليست خدمة ذكاء اصطناعي متصلة.',
    productIds: [],
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed && typeof parsed === 'object') {
          setData((current) => ({
            ...current,
            ...parsed,
            cart: Array.isArray(parsed.cart) ? parsed.cart : current.cart,
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : current.favorites,
            compareIds: Array.isArray(parsed.compareIds) ? parsed.compareIds : current.compareIds,
            recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : current.recentSearches,
            orders: Array.isArray(parsed.orders) ? parsed.orders : current.orders,
            chatMessages: Array.isArray(parsed.chatMessages) && parsed.chatMessages.length
              ? parsed.chatMessages
              : current.chatMessages,
            drafts: Array.isArray(parsed.drafts) ? parsed.drafts : current.drafts,
            workflowLogs: Array.isArray(parsed.workflowLogs) ? parsed.workflowLogs : current.workflowLogs,
          }));
        }
      })
      .catch(() => {
        if (alive) setStorageError('تعذر قراءة بياناتك المحلية المحفوظة على هذا الجهاز.');
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      .then(() => setStorageError(''))
      .catch(() => setStorageError('تعذر حفظ التغييرات محليًا على هذا الجهاز.'));
  }, [data, hydrated]);

  const addToCart = useCallback((productId: string, variant?: string, color?: string, quantity = 1) => {
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product || quantity < 1) return false;
    if (product.variants?.length && !variant) return false;
    if (product.colors?.length && !color) return false;
    setData((current) => {
      const existing = current.cart.find((line) =>
        line.productId === productId && line.variant === variant && line.color === color,
      );
      if (existing) {
        return {
          ...current,
          cart: current.cart.map((line) => line === existing ? { ...line, quantity: line.quantity + quantity } : line),
        };
      }
      return { ...current, cart: [...current.cart, { productId, quantity, variant, color }] };
    });
    return true;
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variant?: string, color?: string) => {
    setData((current) => ({
      ...current,
      cart: quantity <= 0
        ? current.cart.filter((line) => !(line.productId === productId && line.variant === variant && line.color === color))
        : current.cart.map((line) =>
            line.productId === productId && line.variant === variant && line.color === color
              ? { ...line, quantity }
              : line,
          ),
    }));
  }, []);

  const removeFromCart = useCallback((productId: string, variant?: string, color?: string) => {
    setData((current) => ({
      ...current,
      cart: current.cart.filter((line) => !(line.productId === productId && line.variant === variant && line.color === color)),
    }));
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setData((current) => ({
      ...current,
      favorites: current.favorites.includes(productId)
        ? current.favorites.filter((idValue) => idValue !== productId)
        : [...current.favorites, productId],
    }));
  }, []);

  const toggleCompare = useCallback((productId: string) => {
    let accepted = true;
    setData((current) => {
      if (current.compareIds.includes(productId)) {
        return { ...current, compareIds: current.compareIds.filter((idValue) => idValue !== productId) };
      }
      if (current.compareIds.length >= 4) {
        accepted = false;
        return current;
      }
      return { ...current, compareIds: [...current.compareIds, productId] };
    });
    return accepted;
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setData((current) => ({
      ...current,
      recentSearches: [trimmed, ...current.recentSearches.filter((item) => item !== trimmed)].slice(0, 8),
    }));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setData((current) => ({ ...current, recentSearches: [] }));
  }, []);

  const updateProfile = useCallback((profile: Partial<ProfileData>) => {
    setData((current) => ({ ...current, profile: { ...current.profile, ...profile } }));
  }, []);

  const createDemoOrder = useCallback((details: CheckoutDetails) => {
    const lines = data.cart.filter((line) => PRODUCTS.some((product) => product.id === line.productId));
    if (!lines.length) return null;
    const subtotal = lines.reduce((sum, line) => {
      const product = PRODUCTS.find((item) => item.id === line.productId);
      return sum + (product?.price ?? 0) * line.quantity;
    }, 0);
    const order: DemoOrder = {
      id: `DEMO-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      items: lines.map((line) => ({ ...line })),
      customer: details.customer,
      area: details.area,
      address: details.address,
      note: details.note,
      subtotal,
      deliveryFee: details.deliveryFee,
      total: subtotal + details.deliveryFee,
      status: 'طلب تجريبي — غير مرسل',
    };
    setData((current) => ({ ...current, orders: [order, ...current.orders], cart: [] }));
    return order;
  }, [data.cart]);

  const sendChatMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = localReply(trimmed);
    const now = new Date().toISOString();
    const userMessage: ChatMessage = { id: id(), role: 'user', text: trimmed, createdAt: now };
    const assistantMessage: ChatMessage = { id: id(), role: 'assistant', text: reply.text, productIds: reply.productIds, createdAt: now };
    setData((current) => {
      const chatMessages: ChatMessage[] = [
        ...current.chatMessages,
        userMessage,
        assistantMessage,
      ];
      return { ...current, chatMessages: chatMessages.slice(-80) };
    });
  }, []);

  const saveDraft = useCallback((title: string, content: string) => {
    setData((current) => ({
      ...current,
      drafts: [{ id: id(), title, content, createdAt: new Date().toISOString() }, ...current.drafts],
    }));
  }, []);

  const addWorkflowLog = useCallback((workflow: string) => {
    const entry: WorkflowLog = { id: id(), workflow, createdAt: new Date().toISOString(), status: 'محاكاة محلية' };
    setData((current) => ({ ...current, workflowLogs: [entry, ...current.workflowLogs].slice(0, 50) }));
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    ...data,
    hydrated,
    storageError,
    products: PRODUCTS,
    addToCart,
    updateQuantity,
    removeFromCart,
    toggleFavorite,
    toggleCompare,
    addRecentSearch,
    clearRecentSearches,
    updateProfile,
    createDemoOrder,
    sendChatMessage,
    saveDraft,
    addWorkflowLog,
  }), [data, hydrated, storageError, addToCart, updateQuantity, removeFromCart, toggleFavorite, toggleCompare, addRecentSearch, clearRecentSearches, updateProfile, createDemoOrder, sendChatMessage, saveDraft, addWorkflowLog]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}
