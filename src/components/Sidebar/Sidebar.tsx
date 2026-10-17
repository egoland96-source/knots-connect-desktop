import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Settings, User, Check, Copy } from 'lucide-react';
import type { PageKey, SidebarProps } from './Sidebar.types';
import { useTranslation } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = React.memo(({ activePage, onNavigate }: SidebarProps) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const knotsId = user?.knotsIdFormatted || user?.id || '7F3A-91C2-6D84-B0E7';
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(knotsId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const items: { key: PageKey; label: string; icon: React.ComponentType<any> }[] = [
    { key: 'dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { key: 'account', label: t('nav.account'), icon: User },
    { key: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav
      className="sidebar"
      style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        borderRight: '1px solid #1E2D38',
        background: '#0B151D',
      }}
    >
      {/* LOGO & TITLE (Spec 1. Product Direction) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px', marginBottom: 32 }}>
        <img
          src="logo.png"
          alt="Knots Connect"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            objectFit: 'cover',
          }}
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#EEF4F5' }}>Knots Connect</div>
          <div style={{ fontSize: 10, color: '#7E949F', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>{t('nav.privateNetwork')}</div>
        </div>
      </div>

      {/* MENÜ */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, padding: 0, margin: 0 }}>
        {items.map((item) => {
          const isActive = item.key === activePage;
          const Icon = item.icon;
          return (
            <li key={item.key} style={{ position: 'relative' }}>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 34,
                    mass: 0.8,
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 8,
                    background: '#14252E',
                    border: '1px solid #29404B',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                    zIndex: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: '0 3px 3px 0',
                      background: '#58BFD2',
                      boxShadow: '0 0 10px rgba(88, 191, 210, 0.6)',
                    }}
                  />
                </motion.div>
              )}

              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? '#58BFD2' : '#7E949F',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'color 160ms ease',
                }}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#58BFD2' : '#7E949F'} />
                </motion.div>
                <span style={{ color: isActive ? '#EEF4F5' : '#7E949F', fontWeight: isActive ? 600 : 500, letterSpacing: '-0.01em' }}>
                  {item.label}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>

      {/* Knots ID Footer (Spec Page 2 & 9) */}
      <div
        onClick={handleCopyId}
        title="Click to copy Knots ID"
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid #1E2D38',
          cursor: 'pointer',
          borderRadius: 6,
          padding: '12px 8px 4px',
          transition: 'background 140ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Knots ID
          </span>
          {copied ? (
            <span style={{ fontSize: 10, color: '#61D1A8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Check size={11} /> {t('account.copied')}
            </span>
          ) : (
            <Copy size={11} color="#7E949F" />
          )}
        </div>
        <div style={{ fontSize: 11.5, fontFamily: "'DM Mono', monospace", color: '#9DB0B7', letterSpacing: '0.04em' }}>
          {knotsId}
        </div>
      </div>
    </nav>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;