import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Activity, Shield, Zap, ArrowDown, ArrowUp, Power, WifiOff, ShieldOff, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ConnectionSnapshot } from '../../../types/connection';
import { useConnectionStore } from '../../../store/connectionStore';

type Props = {
  snapshot: ConnectionSnapshot;
  protocolLabel?: string;
  onToggle: () => void;
  onRetry?: () => void;
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

const Sparkline: React.FC<{ data: number[]; color: string; emptyLabel?: string }> = ({ data, color, emptyLabel }) => {
  const W = 86, H = 22;
  const hasData = data.length > 1 && data.some((v) => v > 0);
  if (!hasData) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35 }}>
        <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#64748B', letterSpacing: '0.08em' }}>{emptyLabel ?? 'No data'}</span>
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block', opacity: 0.9, marginTop: 6 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export const ConnectionOverview: React.FC<Props> = ({ snapshot, protocolLabel = 'Auto', onToggle, onRetry, isToggling = false }) => {
  const historyDownload = useConnectionStore((s) => s.historyDownload);
  const historyUpload = useConnectionStore((s) => s.historyUpload);
  const settings = useConnectionStore((s) => s.settings);

  const isConnected = snapshot.state === 'connected';
  const isConnecting = snapshot.state === 'connecting';
  const isDisconnecting = (snapshot.state as string) === 'disconnecting';
  const isError = snapshot.state === 'error';
  const isBusy = isConnecting || isDisconnecting || !!isToggling;

  const prevStateRef = useRef(snapshot.state);
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = snapshot.state;
    if (prev === 'connected' && !isConnected && !isDisconnecting) {
      setShowReconnectBanner(true);
      const t = setTimeout(() => setShowReconnectBanner(false), 5000);
      return () => clearTimeout(t);
    }
    if (isConnected) setShowReconnectBanner(false);
  }, [snapshot.state, isConnected, isDisconnecting]);

  const statusColor = isConnected ? '#34D399' : isBusy ? '#F59E0B' : isError ? '#FB7185' : '#94A3B8';
  const statusBg = isConnected ? 'rgba(52,211,153,0.14)' : isBusy ? 'rgba(245,158,11,0.12)' : isError ? 'rgba(248,113,133,0.12)' : 'rgba(148,163,184,0.10)';
  const statusBorder = isConnected ? 'rgba(52,211,153,0.28)' : isBusy ? 'rgba(245,158,11,0.28)' : isError ? 'rgba(248,113,133,0.22)' : 'rgba(148,163,184,0.18)';

  const serverLabel = useMemo(() => {
    if (!snapshot.server) return isConnected ? 'Knots Secure Node' : 'Not connected';
    return `${snapshot.server.city ? snapshot.server.city + ', ' : ''}${snapshot.server.country}`;
  }, [snapshot.server, isConnected]);

  const codeLabel = snapshot.server?.code ?? '—';

  const btnConfig = (() => {
    if (isError) return { label: 'Try again', icon: <RefreshCw size={15} strokeWidth={2.4} />, bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: '0 8px 24px rgba(239,68,68,0.28)', textColor: '#fff', action: onRetry ?? onToggle };
    if (isConnected) return { label: 'Disconnect', icon: <Power size={15} strokeWidth={2.4} />, bg: 'rgba(100,116,139,0.16)', shadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', textColor: '#CBD5E1', action: onToggle };
    if (isBusy) return { label: isDisconnecting ? 'Disconnecting...' : 'Connecting...', icon: <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><RefreshCw size={15} strokeWidth={2.4} /></motion.span>, bg: 'rgba(245,158,11,0.16)', shadow: 'none', textColor: '#F59E0B', action: undefined as unknown as () => void };
    return { label: 'Secure connect', icon: <Shield size={15} strokeWidth={2.4} />, bg: 'linear-gradient(135deg, #3B82F6, #6366F1)', shadow: '0 10px 28px rgba(59,130,246,0.30)', textColor: '#fff', action: onToggle };
  })();

  const ipProtected = isConnected;
  const dpiActive = isConnected;
  const latencyText = snapshot.latencyMs && snapshot.latencyMs > 0 ? `${Math.round(snapshot.latencyMs)} ms` : '—';

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
          background: isConnected ? 'linear-gradient(90deg, rgba(52,211,153,0.0), rgba(52,211,153,0.55), rgba(52,211,153,0.0))' : isError ? 'linear-gradient(90deg, rgba(248,113,133,0.0), rgba(248,113,133,0.40), transparent)' : 'linear-gradient(90deg, rgba(59,130,246,0.0), rgba(99,102,241,0.35), rgba(59,130,246,0.0))',
          opacity: 0.9,
        }}
      />

      <AnimatePresence>
        {showReconnectBanner && (
          <motion.div
            key="reconnect-banner"
            initial={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.22 }}
            style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.26)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#FCD34D', fontWeight: 600 }}
          >
            <WifiOff size={13} />
            {isError ? 'Connection failed — engine error.' : isConnecting ? 'Connection lost — reconnecting...' : 'Connection interrupted'}
            <span style={{ opacity: 0.9, fontWeight: 700 }}>· Reconnect</span>
            <button onClick={() => setShowReconnectBanner(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0 2px', lineHeight: 1, fontSize: 13 }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Title */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: isConnected ? 22 : 20, fontWeight: 800, letterSpacing: '-0.02em', color: isConnected ? '#F8FAFC' : '#CBD5E1', lineHeight: 1.15 }}>{serverLabel}</h2>
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#A78BFA',
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.18)',
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            {codeLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: '#64748B', flexWrap: 'wrap' }}>
          <span>{snapshot.ipAddress ?? '—'}</span>
          {snapshot.server?.code && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'inline-block' }} />
              <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.16)', color: '#A78BFA', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em' }}>{snapshot.server.code}</span>
            </>
          )}
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'inline-block' }} />
          <span>{protocolLabel}</span>
        </div>
      </div>

      {/* Softer warning block — only when disconnected and not busy */}
      {!isConnected && !isBusy && !isError && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(249,115,22,0.09)',
            border: '1px solid rgba(249,115,22,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(249,115,22,0.16)',
              border: '1px solid rgba(249,115,22,0.20)',
              color: '#FB923C',
              flexShrink: 0,
            }}
          >
            <ShieldOff size={16} strokeWidth={2} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#FB923C' }}>IP PROTECTION OFF</div>
            <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 2, lineHeight: 1.4 }}>Your traffic is not protected until you connect.</div>
          </div>
        </div>
      )}

      {/* Pills row — real telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            background: ipProtected ? 'rgba(52,211,153,0.10)' : 'rgba(249,115,22,0.10)',
            border: `1px solid ${ipProtected ? 'rgba(52,211,153,0.20)' : 'rgba(249,115,22,0.20)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.07em',
            color: ipProtected ? '#34D399' : '#FB923C',
          }}
        >
          <Shield size={12} /> {ipProtected ? 'IP PROTECTION ACTIVE' : 'IP PROTECTION OFF'}
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.16)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.07em',
            color: '#34D399',
          }}
        >
          <Zap size={12} /> DPI BYPASS {dpiActive ? 'ACTIVE' : 'READY'}
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.07em',
            color: snapshot.latencyMs && snapshot.latencyMs > 0 ? '#E2E8F0' : '#64748B',
          }}
        >
          <Activity size={12} /> LATENCY {latencyText}
        </div>
      </div>

      {/* Live traffic — real history, empty when no data */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
        <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(8,13,22,0.58)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowDown size={11} color="#34D399" strokeWidth={2.5} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: '#64748B' }}>DOWN</span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, fontWeight: 700, marginTop: 3, color: snapshot.downloadBytesPerSecond > 0 ? '#E2E8F0' : '#475569' }}>{formatSpeed(snapshot.downloadBytesPerSecond)}</div>
          <Sparkline data={historyDownload.slice(-24)} color="#34D399" emptyLabel={isConnected ? 'Waiting...' : 'No data'} />
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(8,13,22,0.58)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUp size={11} color="#60A5FA" strokeWidth={2.5} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: '#64748B' }}>UP</span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, fontWeight: 700, marginTop: 3, color: snapshot.uploadBytesPerSecond > 0 ? '#E2E8F0' : '#475569' }}>{formatSpeed(snapshot.uploadBytesPerSecond)}</div>
          <Sparkline data={historyUpload.slice(-24)} color="#60A5FA" emptyLabel={isConnected ? 'Waiting...' : 'No data'} />
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(8,13,22,0.58)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={11} color="#A78BFA" strokeWidth={2.5} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: '#64748B' }}>BYPASS</span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, fontWeight: 700, color: '#E2E8F0', marginTop: 3 }}>{formatBytes(snapshot.protectedBytes)}</div>
          <div style={{ marginTop: 6, fontSize: 9.5, fontFamily: "'DM Mono', monospace", color: settings.adblock ? '#34D399' : '#475569' }}>{settings.adblock ? 'AdBlock ON' : 'AdBlock OFF'}</div>
        </div>
      </div>

      <motion.button
        whileHover={!isBusy ? { scale: 1.01 } : {}}
        whileTap={!isBusy ? { scale: 0.99 } : {}}
        onClick={isBusy ? undefined : btnConfig.action}
        disabled={isBusy}
        style={{
          marginTop: 14,
          width: '100%',
          height: 48,
          borderRadius: 12,
          border: isConnected ? '1px solid rgba(100,116,139,0.18)' : 'none',
          background: btnConfig.bg,
          color: btnConfig.textColor,
          fontSize: 13.5,
          fontWeight: 800,
          letterSpacing: '0.04em',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          boxShadow: btnConfig.shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isBusy && !isError ? 0.78 : 1,
        }}
      >
        {btnConfig.icon}
        {btnConfig.label}
      </motion.button>

      <AnimatePresence>
        {isError && (
          <motion.div key="err" initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 10 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#F87171', fontFamily: "'DM Mono', monospace" }}>
            <AlertTriangle size={12} /> Engine error — check WinDivert / driver status.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionOverview;
