import React from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldCheck, WifiOff, Bell, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => string;
  remove: (id: string) => void;
}

const ICONS: Record<ToastType, React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: '#2ED573',
  warning: '#FFB020',
  danger: '#EF4444',
  info: '#3DB5FF',
};

const TITLES: Record<ToastType, string> = {
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
  info: 'Info',
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          // ICONS[toast.type] doğrudan JSX etiketi olarak kullanılamıyor -
          // önce bir değişkene atayıp öyle kullanmamız gerekiyor.
          const ToastIcon = ICONS[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onAnimationComplete={() => {
                if (toast.duration !== 0) {
                  setTimeout(() => remove(toast.id), toast.duration ?? 4000);
                }
              }}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                minWidth: 280,
                maxWidth: 380,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--glass-card-bg)',
                border: `1px solid ${COLORS[toast.type]}44`,
                boxShadow: 'var(--shadow-pop), 0 0 24px ' + COLORS[toast.type] + '33',
                backdropFilter: 'var(--glass-card-blur)',
                WebkitBackdropFilter: 'var(--glass-card-blur)',
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: COLORS[toast.type] + '1a',
                  color: COLORS[toast.type],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ToastIcon size={14} strokeWidth={2.2} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{toast.title ?? TITLES[toast.type]}</div>
                {toast.message && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{toast.message}</div>}
              </div>
              <button
                onClick={() => remove(toast.id)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 150ms var(--ease), color 150ms var(--ease)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
};

/** Kolay kullanım için hook. */
export const useToast = () => {
  const add = useToastStore((s) => s.add);
  const remove = useToastStore((s) => s.remove);

  return {
    success: (title: string, message?: string, duration?: number) => add({ type: 'success', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) => add({ type: 'warning', title, message, duration }),
    danger: (title: string, message?: string, duration?: number) => add({ type: 'danger', title, message, duration }),
    info: (title: string, message?: string, duration?: number) => add({ type: 'info', title, message, duration }),
    remove,
  };
};

/** Özel VPN bildirimleri - app içinde doğrudan kullan. */
export const notify = {
  connected: () => useToastStore.getState().add({ type: 'success', title: 'Connected', message: 'Secure tunnel established', duration: 4000 }),
  disconnected: () => useToastStore.getState().add({ type: 'info', title: 'Disconnected', message: 'Shield deactivated', duration: 3000 }),
  connecting: () => useToastStore.getState().add({ type: 'info', title: 'Connecting', message: 'Establishing secure tunnel…', duration: 0 }),
  dnsProtected: () => useToastStore.getState().add({ type: 'success', title: 'DNS Protection', message: 'DNS leak protection enabled', duration: 3000 }),
  killSwitchArmed: () => useToastStore.getState().add({ type: 'success', title: 'Kill Switch Armed', message: 'Traffic blocked on disconnect', duration: 3000 }),
  error: (msg: string) => useToastStore.getState().add({ type: 'danger', title: 'Connection Failed', message: msg, duration: 6000 }),
  serverSwitched: (name: string) => useToastStore.getState().add({ type: 'success', title: 'Server Switched', message: `Now connected to ${name}`, duration: 3000 }),
};

export default ToastContainer;