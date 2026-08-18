import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Server, BarChart3, Settings, User, LogOut } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { useAuthStore } from '../../store/authStore';
import type { PageKey, SidebarProps } from './Sidebar.types';
import { Badge } from '../ui';

const NAV_ITEMS: { key: PageKey; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'servers', label: 'Servers', icon: Server },
  { key: 'statistics', label: 'Statistics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'account', label: 'Account', icon: User },
];

export const Sidebar = React.memo(({ activePage, onNavigate }: SidebarProps) => {
  const status = useConnectionStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  const displayName = user?.username || 'Operator';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'connected':
        return { text: 'Connected', tone: 'success' as const };
      case 'connecting':
        return { text: 'Connecting…', tone: 'accent' as const };
      case 'error':
        return { text: 'Error', tone: 'danger' as const };
      default:
        return { text: 'Disconnected', tone: 'neutral' as const };
    }
  }, [status]);

  return (
    <nav
      style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-4) var(--space-3)',
        borderRight: '1px solid var(--glass-card-border)',
        background: 'linear-gradient(180deg, rgba(14,22,38,0.5), rgba(9,17,31,0.5))',
        backdropFilter: 'var(--glass-blur)',
      }}
    >
{/* LOGO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <motion.img
          src="/logo.png"
          alt="Knots Connect"
          whileHover={{ rotate: 8, scale: 1.05 }}
          transition={{ duration: 0.2 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            objectFit: 'cover',
            boxShadow: '0 4px 14px rgba(61,181,255,0.18)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.3px', color: 'var(--text-primary)' }}>Knots Connect</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '1px', fontWeight: 600 }}>Secure Internet</div>
        </div>
      </div>

      {/* MENÜ */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activePage;
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <button
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: isActive ? 'var(--glass-accent)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isActive ? 'inset 0 0 0 1px rgba(61,181,255,0.12)' : 'none',
                  transition: 'background 180ms var(--ease), color 180ms var(--ease), box-shadow 180ms var(--ease)',
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  style={{
                       position: 'absolute',
                       left: 0,
                       top: 0,
                       bottom: 0,
                       margin: 'auto',
                       height: 20,
                       width: 3,
                       borderRadius: 3,
                       background: 'var(--accent)',
                       boxShadow: '0 0 12px rgba(61,181,255,0.33)',
                     }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      {/* ALT: KULLANICI KARTI */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--glass-card-bg)',
          backdropFilter: 'var(--glass-card-blur)',
          WebkitBackdropFilter: 'var(--glass-card-blur)',
          border: '1px solid var(--glass-card-border)',
          boxShadow: 'var(--glass-card-shadow)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-active))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-inverse)',
            fontWeight: 700,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {avatarLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </div>
          <Badge tone={statusLabel.tone} style={{ marginTop: 3, fontSize: 9.5, padding: '2px 8px' }}>
            {statusLabel.text}
          </Badge>
        </div>
        <button
          aria-label="Çıkış"
          title="Çıkış yap"
          onClick={async () => {
            if (!confirmLogout) {
              setConfirmLogout(true);
              setTimeout(() => setConfirmLogout(false), 3000);
              return;
            }
            await logout();
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: 'none',
            background: confirmLogout ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: confirmLogout ? 'var(--danger)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 150ms var(--ease), color 150ms var(--ease)',
          }}
          onMouseEnter={(e) => { if (!confirmLogout) { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = 'var(--danger)'; } }}
          onMouseLeave={(e) => { if (!confirmLogout) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>
      {confirmLogout && (
        <div style={{ fontSize: 11, color: 'var(--danger)', padding: '4px 2px 0', textAlign: 'center' }}>
          Tekrar tıkla — çıkış yapılacak
        </div>
      )}
    </nav>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;