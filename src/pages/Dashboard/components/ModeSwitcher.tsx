import React from 'react';
import { Network, Zap, Settings2 } from 'lucide-react';

type Mode = 'vpn' | 'dpi';

type Props = {
  mode: Mode;
  onChange: (m: Mode) => void;
  onOpenAdvanced: () => void;
  dpiActive?: boolean;
};

export const ModeSwitcher: React.FC<Props> = ({ mode, onChange, onOpenAdvanced, dpiActive }) => {
  const isVPN = mode === 'vpn';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 16,
        background: 'rgba(17,25,40,0.68)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 4,
          borderRadius: 12,
          background: 'rgba(8,13,22,0.72)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => onChange('vpn')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid',
            borderColor: isVPN ? 'rgba(59,130,246,0.35)' : 'transparent',
            background: isVPN ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'transparent',
            color: isVPN ? '#fff' : '#94A3B8',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: isVPN ? '0 6px 16px rgba(59,130,246,0.28)' : 'none',
            transition: 'all 180ms ease',
          }}
        >
          <Network size={14} strokeWidth={2} /> VPN
        </button>
        <button
          onClick={() => onChange('dpi')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid',
            borderColor: !isVPN ? 'rgba(167,139,250,0.42)' : 'transparent',
            background: !isVPN ? 'rgba(167,139,250,0.16)' : 'transparent',
            color: !isVPN ? '#A78BFA' : '#94A3B8',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: !isVPN ? '0 0 14px rgba(167,139,250,0.22)' : 'none',
            transition: 'all 180ms ease',
          }}
        >
          <Zap size={14} strokeWidth={2} /> DPI Bypass
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={onOpenAdvanced}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          borderRadius: 10,
          border: '1px solid rgba(167,139,250,0.24)',
          background: dpiActive ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.06)',
          color: dpiActive ? '#A78BFA' : '#E2E8F0',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: dpiActive ? '0 0 16px rgba(167,139,250,0.18)' : 'none',
        }}
      >
        <Settings2 size={14} /> Advanced Settings
      </button>
    </div>
  );
};

export default ModeSwitcher;
