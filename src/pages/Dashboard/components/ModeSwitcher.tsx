import React from 'react';
import { Shield, Zap, GitFork, Settings2, Sparkles } from 'lucide-react';
import type { OperatingMode } from '../../../services/bridge/bridgeService.types';

type Props = {
  mode: OperatingMode | 'vpn' | 'dpi';
  onChange: (m: OperatingMode) => void;
  onOpenAdvanced: () => void;
  dpiActive?: boolean;
};

export const ModeSwitcher: React.FC<Props> = ({ mode, onChange, onOpenAdvanced, dpiActive }) => {
  // Normalize legacy mode values if any
  const currentMode: OperatingMode = mode === 'vpn' ? 'privacy' : mode === 'dpi' ? 'gaming' : mode;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
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
          gap: 4,
          padding: 3,
          borderRadius: 12,
          background: 'rgba(8,13,22,0.72)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* 1. Gaming Mode */}
        <button
          onClick={() => onChange('gaming')}
          title="Ultra-low ping (0 ms) — direct local route with DPI bypass for gaming"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 12px',
            borderRadius: 9,
            border: '1px solid',
            borderColor: currentMode === 'gaming' ? 'rgba(167,139,250,0.42)' : 'transparent',
            background: currentMode === 'gaming' ? 'rgba(167,139,250,0.18)' : 'transparent',
            color: currentMode === 'gaming' ? '#A78BFA' : '#94A3B8',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: currentMode === 'gaming' ? '0 0 14px rgba(167,139,250,0.22)' : 'none',
            transition: 'all 160ms ease',
          }}
        >
          <Zap size={13} strokeWidth={2.2} /> Gaming (0 ms)
        </button>

        {/* 2. Smart Hybrid Mode */}
        <button
          onClick={() => onChange('hybrid')}
          title="Smart Hybrid — games use direct 0 ms route, social & web traffic goes through IP-masking tunnel"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 14px',
            borderRadius: 9,
            border: '1px solid',
            borderColor: currentMode === 'hybrid' ? 'rgba(52,211,153,0.45)' : 'transparent',
            background:
              currentMode === 'hybrid'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(59,130,246,0.25))'
                : 'transparent',
            color: currentMode === 'hybrid' ? '#34D399' : '#94A3B8',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: currentMode === 'hybrid' ? '0 0 16px rgba(52,211,153,0.28)' : 'none',
            transition: 'all 160ms ease',
            position: 'relative',
          }}
        >
          <GitFork size={13} strokeWidth={2.2} />
          Smart Hybrid
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: 6,
              background: currentMode === 'hybrid' ? '#34D399' : 'rgba(255,255,255,0.08)',
              color: currentMode === 'hybrid' ? '#080D16' : '#94A3B8',
              marginLeft: 2,
            }}
          >
            AUTO
          </span>
        </button>

        {/* 3. Privacy Mode */}
        <button
          onClick={() => onChange('privacy')}
          title="Maximum privacy — all traffic through WireGuard VPN tunnel, IP is masked"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 12px',
            borderRadius: 9,
            border: '1px solid',
            borderColor: currentMode === 'privacy' ? 'rgba(59,130,246,0.4)' : 'transparent',
            background: currentMode === 'privacy' ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'transparent',
            color: currentMode === 'privacy' ? '#fff' : '#94A3B8',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: currentMode === 'privacy' ? '0 6px 16px rgba(59,130,246,0.28)' : 'none',
            transition: 'all 160ms ease',
          }}
        >
          <Shield size={13} strokeWidth={2.2} /> Privacy (VPN)
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={onOpenAdvanced}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid rgba(167,139,250,0.24)',
          background: dpiActive ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.06)',
          color: dpiActive ? '#A78BFA' : '#E2E8F0',
          fontSize: 11.5,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: dpiActive ? '0 0 16px rgba(167,139,250,0.18)' : 'none',
        }}
      >
        <Settings2 size={13} /> Advanced Settings
      </button>
    </div>
  );
};

export default ModeSwitcher;

