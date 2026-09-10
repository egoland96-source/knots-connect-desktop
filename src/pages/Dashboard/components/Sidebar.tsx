import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, SlidersHorizontal, Fingerprint, Clock, ShieldCheck, Activity, Cpu, Globe, ArrowDown, ArrowUp } from 'lucide-react';
import { useConnectionStore } from '../../../store/connectionStore';

type MenuKey = 'overview' | 'network' | 'identity';

type Props = {
  active?: MenuKey;
  onSelect?: (k: MenuKey) => void;
  isVpnConnected?: boolean;
  vpnServer?: { country: string; city: string; code: string } | null;
};

const MENU: { key: MenuKey; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Status & traffic' },
  { key: 'network', label: 'Network Settings', icon: SlidersHorizontal, desc: 'VPN / DPI / Firewall' },
  { key: 'identity', label: 'Identity', icon: Fingerprint, desc: 'Knots ID & recovery' },
];

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function formatUptime(sec: number | null) {
  if (!sec || sec <= 0) return '—';
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const Sidebar: React.FC<Props> = ({ active = 'overview', onSelect, isVpnConnected = false, vpnServer = null }) => {
  const status = useConnectionStore((s) => s.status);
  const uptime = useConnectionStore((s) => s.uptimeSeconds);
  const bytesReceived = useConnectionStore((s) => s.bytesReceived);
  const bytesSent = useConnectionStore((s) => s.bytesSent);
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const downloadSpeed = useConnectionStore((s) => s.downloadSpeed);
  const uploadSpeed = useConnectionStore((s) => s.uploadSpeed);
  const historyDownload = useConnectionStore((s) => s.historyDownload);
  const historyUpload = useConnectionStore((s) => s.historyUpload);
  const downloadMbps = downloadSpeed > 0 ? (downloadSpeed * 8) / (1024 * 1024) : 0;
  const uploadMbps = uploadSpeed > 0 ? (uploadSpeed * 8) / (1024 * 1024) : 0;

  const protectedBytes = bytesReceived + bytesSent;
  const isConnected = isVpnConnected || status === 'connected';

  const statusMeta = useMemo(() => {
    if (isConnected) return { label: 'CONNECTED', color: '#34D399', bg: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.28)' };
    if (status === 'connecting' || (status as string) === 'disconnecting') return { label: String(status).toUpperCase(), color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' };
    if (status === 'error') return { label: 'ERROR', color: '#FB7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.28)' };
    return { label: 'DISCONNECTED', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.18)' };
  }, [isConnected, status]);

  return (
    <nav
      aria-label="Dashboard navigation"
      style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 14,
        borderRadius: 18,
        background: 'rgba(17,25,40,0.68)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        alignSelf: 'start',
        position: 'sticky',
        top: 16,
        minHeight: 560,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 8px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 6px 18px rgba(59,130,246,0.35)',
          }}
        >
          K
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: '#F8FAFC', lineHeight: 1 }}>KNOTS</div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#A78BFA' }}>CONNECT</div>
        </div>
      </div>

      {/* Menu — refined spacing & active state to match Overview glass language */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {MENU.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect?.(item.key)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 12px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: isActive ? 'rgba(99,102,241,0.28)' : 'transparent',
                background: isActive ? 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(99,102,241,0.14))' : 'transparent',
                color: isActive ? '#E2E8F0' : '#94A3B8',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 180ms ease',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(99,102,241,0.10), 0 4px 16px rgba(99,102,241,0.10)' : 'none',
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="dash-sidebar-active"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 18,
                    borderRadius: 3,
                    background: '#6366F1',
                    boxShadow: '0 0 10px rgba(99,102,241,0.45)',
                  }}
                />
              )}
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: isActive ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#A78BFA' : '#94A3B8',
                  flexShrink: 0,
                }}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: isActive ? 700 : 600, lineHeight: 1 }}>{item.label}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: isActive ? '#CBD5E1' : '#64748B', marginTop: 2 }}>{item.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Session — real telemetry, English, with Live Traffic graph */}
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          background: 'rgba(8,13,22,0.72)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>LIVE SESSION</span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '3px 8px',
              borderRadius: 999,
              background: statusMeta.bg,
              border: `1px solid ${statusMeta.border}`,
              color: statusMeta.color,
            }}
          >
            {statusMeta.label}
          </span>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {isConnected && vpnServer && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
                <Activity size={12} /> Server
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#E2E8F0', fontSize: 12 }}>
                {vpnServer.code} · {vpnServer.city}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <Cpu size={12} /> Engine
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: isConnected ? '#A78BFA' : '#64748B', fontSize: 12 }}>
              WinDivert · {isConnected ? 'ACTIVE' : 'READY'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <Clock size={12} /> Uptime
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#E2E8F0', fontSize: 12 }}>{formatUptime(uptime)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <ShieldCheck size={12} /> Protected
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: isConnected ? '#34D399' : '#E2E8F0', fontSize: 12 }}>{formatBytes(protectedBytes)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <Activity size={12} /> Latency
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#E2E8F0', fontSize: 12 }}>{latencyMs ? `${Math.round(latencyMs)} ms` : '—'}</span>
          </div>
          {isConnected && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
                  <ArrowDown size={12} /> Download
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#E2E8F0', fontSize: 12 }}>{downloadMbps > 0 ? `${downloadMbps.toFixed(1)} Mbps` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
                  <ArrowUp size={12} /> Upload
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#E2E8F0', fontSize: 12 }}>{uploadMbps > 0 ? `${uploadMbps.toFixed(1)} Mbps` : '—'}</span>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#64748B', fontFamily: "'DM Mono', monospace" }}>LIVE TRAFFIC</span>
                <span style={{ fontSize: 9, color: '#475569', fontFamily: "'DM Mono', monospace" }}>{downloadMbps.toFixed(1)} / {uploadMbps.toFixed(1)} Mbps</span>
              </div>
              <div style={{ position: 'relative', height: 64, borderRadius: 10, background: 'rgba(8,13,22,0.9)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', padding: '8px 6px' }}>
                {historyDownload.length > 1 && historyDownload.some((v) => v > 0) ? (
                  <svg width="100%" height="100%" viewBox="0 0 100 32" preserveAspectRatio="none" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="gradUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D399" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0,${32 - Math.min(30, (historyDownload[0] / Math.max(...historyDownload, 1)) * 28)} ${historyDownload.map((v, i) => `L ${(i / (historyDownload.length - 1)) * 100},${32 - (v / Math.max(...historyDownload, 1)) * 28}`).join(' ')} L 100,32 L 0,32 Z`}
                      fill="url(#gradDown)"
                    />
                    <polyline
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={historyDownload.map((v, i) => `${(i / (historyDownload.length - 1)) * 100},${32 - (v / Math.max(...historyDownload, 1)) * 28}`).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#34D399"
                      strokeWidth="1.1"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={0.9}
                      points={historyUpload.map((v, i) => `${(i / (historyUpload.length - 1)) * 100},${32 - (v / Math.max(...historyUpload, 1)) * 28}`).join(' ')}
                    />
                  </svg>
                ) : (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: 10, color: '#475569', fontFamily: "'DM Mono', monospace" }}>Collecting data...</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#60A5FA' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} /> Download</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34D399' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /> Upload</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  margin: '0 auto',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.12)',
                  color: '#3B82F6',
                }}
              >
                <Globe size={20} strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', marginTop: 10 }}>No active session yet.</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 1.5 }}>Connect to a server to start protecting your traffic.</div>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 10,
            height: 1,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div style={{ marginTop: 8, fontSize: 10, color: '#64748B', lineHeight: 1.5, fontFamily: 'DM Mono, monospace' }}>
          Zero-knowledge · No logs · Device-bound
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;

