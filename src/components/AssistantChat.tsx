import React, { useEffect, useRef, useState } from 'react';
import { Bot, LogIn, MessageCircle, Send, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import {
  ApiError,
  sendAssistantMessageApi,
  type AssistantChatAction,
  type AssistantChatTurn,
  type BackendCart,
} from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Set on assistant replies so the bubble can show action-specific feedback. */
  action?: AssistantChatAction;
  /** Order number, present when the assistant created an order. */
  orderNumber?: string;
  /** True when the action needs the customer to sign in first. */
  requiresAuth?: boolean;
}

interface AssistantChatProps {
  /**
   * Called after the assistant adds an item. Receives the fresh cart snapshot
   * the backend returned with the reply so the caller can apply it immediately
   * (no extra round-trip). Falls back to `null` when no snapshot was included.
   */
  onCartUpdated?: (cart?: BackendCart | null) => void;
  /** Called after the assistant places an order so the order history can be reloaded. */
  onOrderCreated?: () => void;
  /** Lets the chat route the customer to login / tracking when needed. */
  onNavigate?: (page: string, params?: { orderId?: string }) => void;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'مرحباً! أنا مساعد بادهاوس الذكي. أخبرني بموديل جهازك أو ما تبحث عنه، ويمكنك أن تقول "ضيفه للسلة" للإضافة فقط أو "بدي أشتري" لإتمام الطلب مباشرةً.',
};

export const AssistantChat: React.FC<AssistantChatProps> = ({
  onCartUpdated,
  onOrderCreated,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading, isOpen]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isLoading) return;

    const previous = messages.filter((item) => item !== WELCOME).slice(-12);
    const history: AssistantChatTurn[] = previous.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      content: item.content,
    }));
    setMessages((items) => [...items, { role: 'user', content: message }]);
    setDraft('');
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 50_000);
    try {
      const response = await sendAssistantMessageApi(message, history, controller.signal);

      // Apply the cart snapshot the assistant returned so the shared cart
      // (navbar badge + cart page) updates immediately, without a page reload
      // or a second round-trip that could silently fail.
      if (response.action === 'ADDED_TO_CART') onCartUpdated?.(response.cart ?? null);
      if (response.action === 'ORDER_CREATED') onOrderCreated?.();

      const orderNumber =
        response.order && typeof response.order === 'object' && 'orderNumber' in response.order
          ? String((response.order as { orderNumber?: string }).orderNumber || '')
          : undefined;

      setMessages((items) => [
        ...items,
        {
          role: 'assistant',
          content: response.answer,
          action: response.action,
          orderNumber: orderNumber || undefined,
          requiresAuth: response.requiresAuth,
        },
      ]);
    } catch (error) {
      const content = controller.signal.aborted
        ? 'تأخر الرد قليلاً. يرجى المحاولة مرة أخرى.'
        : error instanceof ApiError
          ? error.message
          : 'تعذّر الاتصال بالمساعد حالياً. يرجى المحاولة بعد قليل.';
      setMessages((items) => [...items, { role: 'assistant', content }]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <section className="ph-chat-panel fixed bottom-20 right-3 left-3 z-50 flex h-[min(65vh,560px)] flex-col overflow-hidden rounded-2xl border border-ph-border bg-white shadow-2xl sm:left-auto sm:right-6 sm:w-[380px]" aria-label="محادثة مساعد بادهاوس" aria-live="polite">
          <header className="flex items-center gap-3 bg-ph-brand px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Bot className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">مساعد بادهاوس الذكي</h2>
              <p className="text-[11px] text-white/85">توصيات المنتجات والتوافق</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 transition hover:bg-white/15" aria-label="إغلاق المحادثة"><X className="h-4 w-4" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ph-background p-3">
            {messages.map((item, index) => (
              <div key={`${index}-${item.role}`} className={`flex flex-col ${item.role === 'user' ? 'items-start' : 'items-end'}`}>
                <p dir="auto" className={`max-w-[88%] whitespace-pre-wrap break-words text-right rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${item.role === 'user' ? 'rounded-tr-sm bg-ph-brand text-white' : 'rounded-tl-sm border border-ph-border bg-white text-ph-ink'}`}>
                  {item.content}
                </p>

                {item.action === 'ADDED_TO_CART' && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ph-brand/10 px-2.5 py-1 text-[11px] font-bold text-ph-brand">
                    <ShoppingCart className="h-3.5 w-3.5" /> تمت الإضافة إلى السلة فقط
                  </span>
                )}

                {item.action === 'ORDER_CREATED' && (
                  <span className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ph-brand/10 px-2.5 py-1 text-[11px] font-bold text-ph-brand">
                      <ShoppingBag className="h-3.5 w-3.5" /> تم إنشاء الطلب
                    </span>
                    {item.orderNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onNavigate?.('tracking', { orderId: item.orderNumber });
                        }}
                        className="rounded-full border border-ph-brand px-2.5 py-1 text-[11px] font-bold text-ph-brand transition hover:bg-ph-brand hover:text-white"
                      >
                        تتبع الطلب
                      </button>
                    )}
                  </span>
                )}

                {item.action === 'NEEDS_INFO' && item.requiresAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.('login');
                    }}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ph-brand px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-ph-brand-hover"
                  >
                    <LogIn className="h-3.5 w-3.5" /> تسجيل الدخول للمتابعة
                  </button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-end"><div className="rounded-2xl rounded-tl-sm border border-ph-border bg-white px-4 py-3 text-sm text-ph-muted" role="status">جارٍ كتابة الرد…</div></div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-ph-border bg-white p-3">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} disabled={isLoading} placeholder="اسأل عن منتج أو توافقه…" className="min-w-0 flex-1 rounded-xl border border-ph-border bg-white px-3 py-2 text-sm text-ph-ink outline-none focus:border-ph-brand" aria-label="رسالتك للمساعد" />
            <button type="submit" disabled={isLoading || !draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ph-brand text-white transition active:scale-95 disabled:opacity-50" aria-label="إرسال الرسالة"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      )}

      {!isOpen && (
        <button type="button" onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ph-brand text-white shadow-[0_8px_24px_rgba(28,168,158,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(28,168,158,0.38)] active:scale-[0.97]" aria-label="افتح مساعد بادهاوس" aria-expanded={false}>
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
    </>
  );
};
