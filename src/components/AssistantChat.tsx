import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { ApiError, sendAssistantMessageApi, type AssistantChatTurn } from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'مرحباً! أنا مساعد بادهاوس الذكي. أخبرني بموديل جهازك أو ما تبحث عنه لأساعدك في اختيار الملحق المناسب.',
};

export const AssistantChat: React.FC = () => {
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
      setMessages((items) => [...items, { role: 'assistant', content: response.answer }]);
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
              <div key={`${index}-${item.role}`} className={`flex ${item.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <p dir="auto" className={`max-w-[88%] whitespace-pre-wrap break-words text-right rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${item.role === 'user' ? 'rounded-tr-sm bg-ph-brand text-white' : 'rounded-tl-sm border border-ph-border bg-white text-ph-ink'}`}>
                  {item.content}
                </p>
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
