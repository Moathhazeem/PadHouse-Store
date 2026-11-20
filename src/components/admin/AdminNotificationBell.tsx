import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { adminFetchNotificationsApi } from '../../services/adminApi';

interface AdminNotificationBellProps {
  /** Optional pre-fetched unread count (if managed by parent) */
  unreadCount?: number;
  /** Callback when bell is clicked */
  onClick?: () => void;
  /** Whether to show a border and background styling (e.g. in dashboard) or minimalist (navbar) */
  variant?: 'navbar' | 'dashboard';
  /** Polling interval in ms (default: 30000) */
  pollIntervalMs?: number;
  /** Active indicator flag (e.g. panel is open) */
  active?: boolean;
}

export const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({
  unreadCount: controlledCount,
  onClick,
  variant = 'dashboard',
  pollIntervalMs = 30000,
  active = false,
}) => {
  const [internalCount, setInternalCount] = useState<number>(0);
  const count = controlledCount !== undefined ? controlledCount : internalCount;

  useEffect(() => {
    // Only self-poll if not externally controlled
    if (controlledCount !== undefined) return;

    let mounted = true;
    const fetchUnread = async () => {
      try {
        const { unreadCount } = await adminFetchNotificationsApi();
        if (mounted) setInternalCount(unreadCount);
      } catch {
        // fail silently
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [controlledCount, pollIntervalMs]);

  const baseStyle =
    variant === 'dashboard'
      ? `relative p-2.5 rounded-xl border transition-all duration-200 ${
          active
            ? 'border-ph-brand bg-ph-brand/10 text-ph-brand ring-2 ring-ph-brand/20'
            : 'border-ph-border bg-white text-ph-ink hover:bg-ph-background hover:border-ph-brand/40 shadow-xs'
        }`
      : `relative p-2 rounded-xl transition-all duration-200 ${
          active
            ? 'text-ph-brand bg-ph-brand/10'
            : 'text-ph-ink hover:text-ph-brand hover:bg-ph-background'
        }`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseStyle}
      title="تنبيهات نقص المخزون"
      aria-label={`تنبيهات المخزون (${count} غير مقروء)`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};
