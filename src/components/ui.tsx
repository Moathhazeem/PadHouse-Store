import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, LoaderCircle, Minus, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function useScrollReveal<T extends HTMLElement>(delayMs = 0) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    className: `ph-reveal${isVisible ? ' ph-reveal--visible' : ''}`,
    style: { '--ph-reveal-delay': `${delayMs}ms` } as React.CSSProperties,
  };
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`ph-button ph-button--${variant} ${size !== 'md' ? `ph-button--${size}` : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, id, className = '', ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = helperText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props['aria-describedby'], helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      {label && <label className="ph-input-label" htmlFor={inputId}>{label}</label>}
      <input
        {...props}
        ref={ref}
        id={inputId}
        className={`ph-input ${className}`.trim()}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
      />
      {error && <p className="ph-input-error" id={errorId} role="alert">{error}</p>}
      {!error && helperText && <p className="ph-input-help" id={helpId}>{helperText}</p>}
    </div>
  );
});

export function CompatibilityBadge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`ph-compatibility ${className}`.trim()}>{children}</span>;
}

export function SkeletonLoader({
  variant = 'product-grid',
  count = 6,
  className = '',
}: {
  variant?: 'product-grid' | 'product-card' | 'line' | 'detail';
  count?: number;
  className?: string;
}) {
  if (variant === 'line') {
    return <span aria-hidden="true" className={`ph-skeleton block h-4 w-full ${className}`.trim()} />;
  }

  if (variant === 'detail') {
    return (
      <div aria-label="جارٍ تحميل المحتوى" aria-busy="true" className={`grid gap-6 md:grid-cols-2 ${className}`.trim()}>
        <div className="ph-skeleton aspect-square w-full" />
        <div className="space-y-4 py-2">
          <span className="ph-skeleton block h-4 w-1/3" />
          <span className="ph-skeleton block h-8 w-4/5" />
          <span className="ph-skeleton block h-4 w-full" />
          <span className="ph-skeleton block h-4 w-5/6" />
          <span className="ph-skeleton mt-8 block h-12 w-1/2" />
        </div>
      </div>
    );
  }

  const cards = Array.from({ length: Math.max(1, count) }, (_, index) => (
    <div key={index} className="overflow-hidden rounded-2xl border border-ph-border bg-ph-surface p-0">
      <div className="ph-skeleton aspect-square w-full rounded-none" />
      <div className="space-y-3 p-4">
        <span className="ph-skeleton block h-3 w-2/5" />
        <span className="ph-skeleton block h-5 w-4/5" />
        <span className="ph-skeleton block h-4 w-1/2" />
        <span className="ph-skeleton mt-4 block h-10 w-full" />
      </div>
    </div>
  ));

  return variant === 'product-card' ? (
    <div aria-label="جارٍ تحميل المنتج" aria-busy="true" className={className}>{cards[0]}</div>
  ) : (
    <div aria-label="جارٍ تحميل المنتجات" aria-busy="true" className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}>
      {cards}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-ph-border bg-ph-surface px-6 py-12 text-center shadow-xs ${className}`.trim()}>
      {icon && (
        <div className="mb-4 flex justify-center">
          <div className="ph-floating flex h-16 w-16 items-center justify-center rounded-2xl bg-ph-background text-ph-brand border border-ph-border shadow-xs">
            {icon}
          </div>
        </div>
      )}
      <h2 className="text-base font-bold text-ph-ink">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ph-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
}

const toastBg: Record<NonNullable<ToastProps['type']>, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-[#1CA89E]',
};

const ToastIcon: React.FC<{ type: NonNullable<ToastProps['type']> }> = ({ type }) => {
  if (type === 'success') return <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />;
  if (type === 'error') return <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />;
  return <Info className="h-5 w-5 shrink-0" aria-hidden="true" />;
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onDismiss }) => {
  return (
    <motion.div
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 min-w-72 rounded-2xl shadow-lg flex items-center gap-3 px-4 py-3 text-white ${toastBg[type]}`}
    >
      <ToastIcon type={type} />
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="إغلاق"
          className="shrink-0 rounded-full p-0.5 hover:bg-white/20 transition-colors duration-150"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
};

// ─── PageWrapper ──────────────────────────────────────────────────────────────

export const PageWrapper: React.FC<{ children: React.ReactNode; pageKey: string }> = ({ children, pageKey }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// ─── QuantityControl ──────────────────────────────────────────────────────────

interface QuantityControlProps {
  value: number;
  min?: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export const QuantityControl: React.FC<QuantityControlProps> = ({
  value,
  min = 1,
  max = 99,
  onIncrement,
  onDecrement,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-0" role="group" aria-label="الكمية">
      <motion.button
        type="button"
        onClick={onDecrement}
        disabled={disabled || value <= min}
        whileTap={{ scale: 0.88 }}
        aria-label="تقليل الكمية"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ph-border bg-white text-ph-ink hover:border-ph-brand hover:text-ph-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
      >
        <Minus className="h-3.5 w-3.5" />
      </motion.button>
      <span className="min-w-8 text-center font-bold text-sm text-ph-ink select-none">
        {value}
      </span>
      <motion.button
        type="button"
        onClick={onIncrement}
        disabled={disabled || value >= max}
        whileTap={{ scale: 0.88 }}
        aria-label="زيادة الكمية"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ph-border bg-white text-ph-ink hover:border-ph-brand hover:text-ph-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
      >
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  );
};

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export const SkeletonCard: React.FC = () => (
  <div className="ph-product-card overflow-hidden">
    <div className="ph-skeleton aspect-square w-full" />
    <div className="p-4 space-y-3">
      <div className="ph-skeleton h-4 w-3/4 rounded" />
      <div className="ph-skeleton h-4 w-1/2 rounded" />
      <div className="ph-skeleton h-8 w-full rounded-lg mt-4" />
    </div>
  </div>
);
