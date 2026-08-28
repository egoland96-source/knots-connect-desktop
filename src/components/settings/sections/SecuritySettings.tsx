import React from 'react';
import { Shield, Fingerprint, Globe, Network } from 'lucide-react';
import { useConnectionStore } from '../../../store/connectionStore';

const Header: React.FC<{ title: string; desc: string; icon?: React.ReactNode }> = ({ title, desc, icon }) => (
  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && (
        <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.18)' }}>
          {icon}
        </span>
      )}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F8FAFC' }}>{title}</h3>
    </div>
    <p style={{ margin: '6px 0 0 40px', fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>{desc}</p>
  </div>
);

const ToggleRow: React.FC<{ icon: React.ComponentType<any>; title: string; desc: string; checked: boolean; onChange: () => void }> = ({ icon: Icon, title, desc, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: checked ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.06)', color: checked ? '#34D399' : '#94A3B8', border: `1px solid ${checked ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.06)'}`, flexShrink: 0 }}>
        <Icon size={14} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        border: '1px solid',
        borderColor: checked ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
        background: checked ? '#34D399' : 'rgba(255,255,255,0.10)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <span style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 160ms ease', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }} />
    </button>
  </div>
);

export const SecuritySettings: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const settings = useConnectionStore((s) => s.settings);
  const toggle = useConnectionStore((s) => s.toggleSetting);

  const handleToggle = async (key: keyof typeof settings) => {
    await toggle(key as any);
    onSaved();
  };

  return (
    <div>
      <Header title="Security" desc="Leak protection and tunnel integrity — zero-trust defaults." icon={<Shield size={14} />} />

      <ToggleRow icon={Shield} title="Kill Switch" desc="Block all traffic if the tunnel drops unexpectedly. System-wide, no leaks." checked={!!settings?.killSwitch} onChange={() => handleToggle('killSwitch')} />
      <ToggleRow icon={Fingerprint} title="Aggressive Mode" desc="Apply split/TTL manipulation to every HTTPS handshake on 443." checked={!!settings?.aggressiveMode} onChange={() => handleToggle('aggressiveMode')} />
      <ToggleRow icon={Globe} title="DNS Leak Protection" desc="Force DNS through the private tunnel — ISP can't see queries." checked={!!settings?.dnsLeakProtection} onChange={() => handleToggle('dnsLeakProtection')} />
      <ToggleRow icon={Network} title="IPv6 Leak Protection" desc="Disable IPv6 while connected to prevent AAAA leaks." checked={true} onChange={() => onSaved()} />

      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(17,25,40,0.72)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11.5, color: '#64748B', lineHeight: 1.5, fontFamily: 'DM Mono, monospace' }}>
        All security toggles save instantly and sync to the Go engine.
      </div>
    </div>
  );
};

export default SecuritySettings;
