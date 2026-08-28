import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, Shield, Zap, ArrowDown, ArrowUp, Power } from 'lucide-react';
import type { ConnectionSnapshot } from '../../../types/connection';

type Props = {
  snapshot: ConnectionSnapshot;
  protocolLabel?: string; // e.g. "WireGuard / DPI" or "VPN / DPI"
  onToggle: () => void;
  isToggling?: boolean;
};

function formatBytes(n: number) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function formatSpeed(bps: number) {
  if (!bps) return '0 B/s';
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

export const ConnectionOverview: React.FC<Props> = ({ snapshot, protocolLabel = 'Auto', onToggle, isToggling }) => {
  const isConnected = snapshot.state === 'connected';
  const isConnecting = snapshot.state === 'connecting' || snapshot.state === 'disconnecting';
  const statusColor = isConnected ? '#34D399' : isConnecting ? '#F59E0B' : snapshot.state === 'error' ? '#FB7185' : '#94A3B8';
  const statusBg = isConnected ? 'rgba(52,211,153,0.14)' : isConnecting ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.10)';
  const statusBorder = isConnected ? 'rgba(52,211,153,0.28)' : isConnecting ? 'rgba(245,158,11,0.28)' : 'rgba(148,163,184,0.18)';

  const serverLabel = useMemo(() => {
    if (!snapshot.server) return isConnected ? 'Knots Secure Node' : 'Not connected';
    return `${snapshot.server.city ? snapshot.server.city + ', ' : ''}${snapshot.server.country}`;
  }, [snapshot.server, isConnected]);

  const codeLabel = snapshot.server?.code ?? '—';

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        background: 'rgba(17,25,40,0.68)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: 18,
      }}
    >
      {/* Active glow — only when connected */}
      {isConnected && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 20,
            border: '1px solid rgba(52,211,153,0.22)',
            boxShadow: '0 0 28px rgba(52,211,153,0.18), inset 0 0 30px rgba(52,211,153,0.06)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Gradient accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          background: isConnected ? 'linear-gradient(90deg, rgba(52,211,153,0.0), rgba(52,211,153,0.55), rgba(52,211,153,0.0))' : 'linear-gradient(90deg, rgba(59,130,246,0.0), rgba(99,102,241,0.35), rgba(59,130,246,0.0))',
          opacity: 0.9,
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: isConnected ? '0 0 14px rgba(52,211,153,0.75)' : isConnecting ? '0 0 10px rgba(245,158,11,0.5)' : 'none',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.14em',
              padding: '5px 10px',
              borderRadius: 999,
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              color: statusColor,
            }}
          >
            {snapshot.state.toUpperCase()}
          </span>
          {snapshot.latencyMs != null && snapshot.latencyMs > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
              <Activity size={12} /> {Math.round(snapshot.latencyMs)} ms
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: '#64748B' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Shield size={12} color={isConnected ? '#34D399' : '#64748B'} /> {protocolLabel}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ color: '#94A3B8' }}>{snapshot.ipAddress ?? '—'}</span>
        </div>
      </div>

      {/* Main hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', marginTop: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC', lineHeight: 1.1 }}>{serverLabel}</h2>
            <span
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#A78BFA',
                background: 'rgba(167,139,250,0.12)',
                border: '1px solid rgba(167,139,250,0.22)',
                padding: '3px 8px',
                borderRadius: 999,
              }}
            >
              {codeLabel}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94A3B8' }}>
              <MapPin size={14} /> {serverLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94A3B8' }}>
              <Zap size={14} /> {protocolLabel} • {snapshot.latencyMs ? `${Math.round(snapshot.latencyMs)} ms` : '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94A3B8' }}>
              <Shield size={14} /> {formatBytes(snapshot.protectedBytes)} protected
            </div>
          </div>

          {/* Live traffic */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(8,13,22,0.62)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                <ArrowDown size={12} color="#34D399" /> DOWN
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12.5, fontWeight: 700, color: '#E2E8F0' }}>{formatSpeed(snapshot.downloadBytesPerSecond)}</span>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(8,13,22,0.62)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                <ArrowUp size={12} color="#60A5FA" /> UP
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12.5, fontWeight: 700, color: '#E2E8F0' }}>{formatSpeed(snapshot.uploadBytesPerSecond)}</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 180 }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onToggle}
            disabled={!!isToggling}
            style={{
              width: 180,
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: isConnected ? 'rgba(148,163,184,0.14)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
              color: isConnected ? '#E2E8F0' : '#fff',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.04em',
              cursor: isToggling ? 'not-allowed' : 'pointer',
              boxShadow: isConnected ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : '0 10px 24px rgba(59,130,246,0.30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isToggling ? 0.7 : 1,
            }}
          >
            <Power size={16} strokeWidth={2.2} />
            {isConnected ? 'Bağlantıyı Kes' : isConnecting ? 'Bağlanıyor…' : 'Güvenli Bağlan'}
          </motion.button>
          <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', color: isConnected ? '#34D399' : '#64748B' }}>
            {isConnected ? '● Encrypted tunnel active' : '○ Tap to secure'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConnectionOverview;
