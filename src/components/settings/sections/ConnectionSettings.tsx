import React, { useState, useEffect } from 'react';
import { PlugZap, Network, Zap, RotateCcw, ShieldCheck } from 'lucide-react';
import { useConnectionStore } from '../../../store/connectionStore';

const SectionHeader: React.FC<{ title: string; desc: string; icon?: React.ReactNode }> = ({ title, desc, icon }) => (
  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && (
        <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.18)' }}>
          {icon}
        </span>
      )}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>{title}</h3>
    </div>
    <p style={{ margin: '6px 0 0 40px', fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>{desc}</p>
  </div>
);

const Row: React.FC<{ title: string; desc: string; control: React.ReactNode }> = ({ title, desc, control }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
    </div>
    <div style={{ flexShrink: 0 }}>{control}</div>
  </div>
);

export const ConnectionSettings: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const settings = useConnectionStore((s) => s.settings);
  const engineMode = useConnectionStore((s) => s.engineMode);
  const status = useConnectionStore((s) => s.status);
  const encryptionMethod = useConnectionStore((s) => s.encryptionMethod);
  const setEngineMode = useConnectionStore((s) => s.setEngineMode);
  const setEncryptionMethod = useConnectionStore((s) => s.setEncryptionMethod);
  const toggleSetting = useConnectionStore((s) => s.toggleSetting);
  const setWireGuard = useConnectionStore((s) => s.setWireGuard);
  const wgStatus = useConnectionStore((s) => s.wgStatus);
  const wgBusy = useConnectionStore((s) => s.wgBusy);

  const isLocked = status === 'connected' || status === 'connecting';
  const [encOpen, setEncOpen] = useState(false);
  const ENC_OPTIONS = ['XOR Mask', 'Bit Swap', 'UDP Pad'];
  const encLabel = ENC_OPTIONS[(encryptionMethod ?? 1) - 1] ?? 'XOR Mask';

  // WireGuard toggle durumunda servis durumunu düzenli tazele (her 8 sn)
  useEffect(() => {
    const timer = window.setInterval(() => {
      useConnectionStore.getState().refreshWgStatus();
    }, 8000);
    useConnectionStore.getState().refreshWgStatus();
    return () => window.clearInterval(timer);
  }, []);

  const wgRunning = !!wgStatus?.running;
  const wgHandshakeText =
    wgRunning && wgStatus?.handshakeSec != null
      ? wgStatus.handshakeSec < 60
        ? `${wgStatus.handshakeSec}s`
        : `${Math.round(wgStatus.handshakeSec / 60)}m`
      : null;

  const handleWgToggle = async () => {
    await setWireGuard(!wgRunning);
    onSaved();
  };

  const handleEngineChange = async (mode: 'python' | 'go') => {
    if (isLocked) return;
    await setEngineMode(mode);
    onSaved();
  };
  const handleEncChange = async (idx: number) => {
    await setEncryptionMethod(idx + 1);
    setEncOpen(false);
    onSaved();
  };

  return (
    <div>
      <SectionHeader title="Connection" desc="Bypass engine and reconnection behavior. Engine changes require a disconnected state." icon={<PlugZap size={14} />} />

      {/* Bypass Engine */}
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.18)' }}>
                <Zap size={14} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0' }}>Bypass Engine</span>
              {isLocked && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: 999, background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.22)', color: '#FB7185', fontFamily: 'DM Mono, monospace' }}>
                  🔒 Disconnect required to change
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, marginLeft: 38 }}>Choose the packet processing backend — Go Native (WinDivert) or Python.</div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: 4,
              borderRadius: 12,
              background: 'rgba(8,13,22,0.72)',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: isLocked ? 0.5 : 1,
            }}
          >
            {(['python', 'go'] as const).map((m) => {
              const active = engineMode === m;
              return (
                <button
                  key={m}
                  disabled={isLocked}
                  onClick={() => handleEngineChange(m)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 9,
                    border: '1px solid',
                    borderColor: active ? 'rgba(52,211,153,0.28)' : 'transparent',
                    background: active ? 'rgba(52,211,153,0.14)' : 'transparent',
                    color: active ? '#34D399' : '#94A3B8',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {m === 'go' ? 'Go Native' : 'Python'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Encryption Method */}
      <Row
        title="Encryption Method"
        desc="How outgoing packets are obfuscated (XOR / Bit Swap / UDP Pad)."
        control={
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setEncOpen((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: '#111928',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                minWidth: 140,
                justifyContent: 'space-between',
              }}
            >
              {encLabel} <span style={{ fontSize: 10, color: '#94A3B8' }}>{encOpen ? '▲' : '▼'}</span>
            </button>
            {encOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 160, background: '#111928', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', zIndex: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.32)' }}>
                {ENC_OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => handleEncChange(i)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      border: 'none',
                      background: (encryptionMethod ?? 1) - 1 === i ? 'rgba(52,211,153,0.12)' : 'transparent',
                      color: (encryptionMethod ?? 1) - 1 === i ? '#34D399' : '#94A3B8',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* WireGuard VPN — satın alınan sunucuya tam tünel */}
      <div style={{ marginTop: 6, padding: '14px 14px 12px', borderRadius: 12, background: 'rgba(59,130,246,0.06)', border: `1px solid ${wgRunning ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.14)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: wgRunning ? 'rgba(52,211,153,0.14)' : 'rgba(59,130,246,0.14)', color: wgRunning ? '#34D399' : '#3B82F6', border: `1px solid ${wgRunning ? 'rgba(52,211,153,0.24)' : 'rgba(59,130,246,0.2)'}` }}>
                <ShieldCheck size={14} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.01em' }}>WireGuard VPN</span>
              {wgRunning && wgHandshakeText && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 7px', borderRadius: 999, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.22)', color: '#34D399', fontFamily: 'DM Mono, monospace' }}>
                  HANDSHAKE {wgHandshakeText}
                </span>
              )}
              {!wgRunning && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 7px', borderRadius: 999, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.16)', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                  OFF
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 5, lineHeight: 1.5 }}>
              Full-tunnel to Knots server {wgStatus?.server ? `(${wgStatus.server})` : '(162.35.122.121)'} — bypasses any protocol-level filtering.
            </div>
            {!wgStatus?.installed && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: '#FB7185', lineHeight: 1.4 }}>
                WireGuard Windows hizmeti algılanamadı. Önce «C:\Program Files\WireGuard» kurulu değilse WireGuard uygulamasını kurmayı deneyin.
              </div>
            )}
          </div>

          <button
            onClick={handleWgToggle}
            disabled={wgBusy || !wgStatus?.installed}
            role="switch"
            aria-checked={wgRunning}
            title={wgBusy ? 'İşleniyor...' : undefined}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              border: '1px solid',
              borderColor: wgRunning ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
              background: wgRunning ? '#34D399' : 'rgba(255,255,255,0.10)',
              position: 'relative',
              cursor: wgBusy || !wgStatus?.installed ? 'not-allowed' : 'pointer',
              opacity: wgBusy ? 0.6 : 1,
              transition: 'all 160ms ease',
              flexShrink: 0,
            }}
          >
            <span style={{ position: 'absolute', top: 2, left: wgRunning ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 160ms ease', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }} />
          </button>
        </div>
      </div>

      {/* Toggles */}
      <Row
        title="Auto-Connect"
        desc="Start the shield automatically on launch."
        control={
          <button
            onClick={async () => {
              await toggleSetting('autoConnect');
              onSaved();
            }}
            role="switch"
            aria-checked={!!settings?.autoConnect}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              border: '1px solid',
              borderColor: settings?.autoConnect ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
              background: settings?.autoConnect ? '#34D399' : 'rgba(255,255,255,0.10)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
          >
            <span style={{ position: 'absolute', top: 2, left: settings?.autoConnect ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 160ms ease', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }} />
          </button>
        }
      />

      <Row
        title="Reconnect behavior"
        desc="Automatically retry with exponential backoff if the tunnel drops."
        control={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
            <RotateCcw size={12} /> Auto
          </span>
        }
      />

      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.14)', fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5 }}>
        <span style={{ color: '#3B82F6', fontWeight: 700 }}>Tip:</span> Go Native offers lower latency and DPI bypass; Python is legacy fallback. Encryption changes apply to new handshakes.
      </div>
    </div>
  );
};

export default ConnectionSettings;
