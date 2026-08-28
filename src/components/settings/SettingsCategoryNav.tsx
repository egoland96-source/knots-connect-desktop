import React from 'react';
import { PlugZap, Shield, Eye, Palette, SlidersHorizontal } from 'lucide-react';
import type { SettingsCategory } from '../../types/settings';

type Props = {
  active: SettingsCategory;
  onSelect: (c: SettingsCategory) => void;
};

const ITEMS: { key: SettingsCategory; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { key: 'connection', label: 'Connection', icon: PlugZap, desc: 'Engine & behavior' },
  { key: 'security', label: 'Security', icon: Shield, desc: 'Kill switch & leaks' },
  { key: 'local-protection', label: 'Local Protection', icon: Eye, desc: 'Blocklists & stats' },
  { key: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme & window' },
  { key: 'advanced', label: 'Advanced', icon: SlidersHorizontal, desc: 'Diagnostics & logs' },
];

export const SettingsCategoryNav: React.FC<Props> = ({ active, onSelect }) => {
  return (
    <nav
      aria-label="Settings categories"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 220,
        width: 220,
        flexShrink: 0,
      }}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 12px',
              borderRadius: 12,
              border: '1px solid',
              borderColor: isActive ? 'rgba(52,211,153,0.22)' : 'transparent',
              background: isActive ? 'rgba(17,25,40,0.92)' : 'transparent',
              color: isActive ? '#34D399' : '#94A3B8',
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
              transition: 'all 160ms ease',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                display: 'grid',
                placeItems: 'center',
                background: isActive ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#34D399' : '#94A3B8',
                flexShrink: 0,
              }}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? '#E2E8F0' : '#CBD5E1', lineHeight: 1 }}>{item.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: isActive ? '#94A3B8' : '#64748B', marginTop: 2 }}>{item.desc}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default SettingsCategoryNav;
