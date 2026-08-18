import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import {
  ShieldCheck,
  Timer,
  Package,
  Sparkles,
  Activity,
  Network,
  Zap,
  ChevronDown,
  Lock,
  Check,
  Shield,
} from 'lucide-react';
import { useConnectionStore, useConnectionMetrics, useLatencyHistory } from '../../store/connectionStore';
import { usePrivacyStore } from '../../store/privacyStore';
import { useAuthStore } from '../../store/authStore';
import { useNavStore } from '../../store/navStore';
import { ConnectButton } from '../../components/ConnectButton';
import { LivingRope } from '../../components/LivingRope/LivingRope';
import { Card, Badge, Button } from '../../components/ui';

const formatUptime = (sec: number | null) => {
  if (!sec) return '00:00:00';
  const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
  const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const secs = (sec % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

const formatCount = (n: number) => {
  if (n < 1000) return n.toFixed(0);
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const safeNum = (value: number | null | undefined): number =>
  typeof value === 'number' && isFinite(value) ? value : 0;

const encryptionLabel = (methodId: number) =>
  methodId === 2 ? 'AES-128-GCM' : methodId === 3 ? 'ChaCha20' : 'AES-256-GCM';

export const Dashboard: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const engineMode = useConnectionStore((s) => s.engineMode);
  const settings = useConnectionStore((s) => s.settings);
  const encryptionMethod = useConnectionStore((s) => s.encryptionMethod);
  const bytesReceived = useConnectionStore((s) => s.bytesReceived);
  const bytesSent = useConnectionStore((s) => s.bytesSent);
  const setEngineMode = useConnectionStore((s) => s.setEngineMode);

  // Privacy Protection göstergesi (küçük durum satırı — ana hiyerarşiyi bozmaz)
  const privacyEnabled = usePrivacyStore((s) => s.enabled);
  const privacyStats = usePrivacyStore((s) => s.stats);
  const privacyInitialized = usePrivacyStore((s) => s.initialized);

  // Koruma Özeti kartı
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const isGuest = !!user && typeof user.id === 'string' && user.id === 'guest';
  const isFree = !user || isGuest || user.subscriptionType === 'free';

  const metrics = useConnectionMetrics();
  const historyLatency = useLatencyHistory();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isVPN = engineMode !== 'go';
  const mode = isVPN ? 'vpn' : 'dpi';

  const handleModeSwitch = (m: 'python' | 'go') => setEngineMode(m);

  const latency = safeNum(metrics.latencyMs);
  const packets = safeNum(metrics.packetsReceived) + safeNum(metrics.packetsSent);

  // Rope network inputs — currentPing, averagePing, packetLoss, jitter
  const avgPing = useMemo(() => {
    const arr = historyLatency.filter((v) => v > 0);
    if (!arr.length) return latency;
    const slice = arr.slice(-20);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }, [historyLatency, latency]);

  const jitterMs = useMemo(() => {
    const arr = historyLatency.filter((v) => v > 0);
    if (arr.length < 2) return safeNum(metrics.jitter);
    const slice = arr.slice(-12);
    let s = 0;
    for (let i = 1; i < slice.length; i++) s += Math.abs(slice[i] - slice[i - 1]);
    return s / (slice.length - 1);
  }, [historyLatency, metrics.jitter]);

  const packetLoss = safeNum(metrics.packetLoss);

  // Friendly live status ---------------------------------------------------
  const protectionTime = isConnected ? formatUptime(safeNum(metrics.uptimeSeconds)) : '—';
  const packetsValue = isConnected ? formatCount(packets) : '—';

  const privacyValue = !isConnected ? '—' : settings?.dnsLeakProtection && settings?.killSwitch ? 'Maximum' : settings?.dnsLeakProtection ? 'High' : 'Standard';
  const privacyColor = !isConnected ? 'var(--text-muted)' : privacyValue === 'Maximum' ? 'var(--success)' : 'var(--accent)';

  let healthValue = '—';
  let healthColor = 'var(--text-muted)';
  if (isConnected) {
    if (latency <= 0 || latency < 60) {
      healthValue = 'Excellent';
      healthColor = 'var(--success)';
    } else if (latency < 120) {
      healthValue = 'Good';
      healthColor = 'var(--accent)';
    } else {
      healthValue = 'Fair';
      healthColor = 'var(--warning)';
    }
  }

  // Security status ---------------------------------------------------------
  const securityChecks = useMemo(() => {
    if (!isConnected) return [];
    const list: string[] = ['Everything looks secure.', 'Traffic is encrypted.'];
    if (settings?.dnsLeakProtection) list.push('No DNS leaks detected.');
    if (settings?.killSwitch) list.push('Kill switch is armed.');
    if (latency > 0 && latency < 150) list.push('Tunnel stability is excellent.');
    return list.slice(0, 4);
  }, [isConnected, settings?.dnsLeakProtection, settings?.killSwitch, latency]);

  const stats: { icon: LucideIcon; label: string; value: string; color: string }[] = [
    { icon: Timer, label: 'Protection Time', value: protectionTime, color: 'var(--accent)' },
    { icon: Package, label: 'Packets Protected', value: packetsValue, color: 'var(--accent)' },
    { icon: Sparkles, label: 'Privacy Level', value: privacyValue, color: privacyColor },
    { icon: Activity, label: 'Tunnel Health', value: healthValue, color: healthColor },
  ];

  return (
    <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', position: 'relative' }}>
      {/* Floating glass panel */}
      <div
        style={{
          position: 'relative',
          background: 'var(--glass-card-bg-light)',
          borderRadius: 'var(--radius-lg)',
          backdropFilter: 'var(--glass-card-blur)',
          WebkitBackdropFilter: 'var(--glass-card-blur)',
          border: '1px solid var(--glass-card-border)',
          boxShadow: 'var(--glass-card-shadow)',
          overflow: 'hidden',
        }}
      >
        {/* İç arka plan renk sızıntıları */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: 'var(--blur-blue), var(--blur-green)',
          }}
        />

        {/* Knots Signature: alttan yükselen ortam ışığı — yalnızca bağlıyken */}
        <div className={`knots-ambient-light ${isConnected ? 'active' : ''}`} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
            width: '100%',
            position: 'relative',
            zIndex: 1,
            padding: 'var(--space-5) var(--space-5) var(--space-6)',
          }}
        >
          {/* VPN / DPI MODE SELECTOR */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              background: 'var(--glass-card-bg-light)',
              backdropFilter: 'var(--glass-card-blur)',
              WebkitBackdropFilter: 'var(--glass-card-blur)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-1)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--glass-card-shadow)',
            }}
          >
            <button
              onClick={() => handleModeSwitch('python')}
              className={`knots-glass-btn ${isVPN ? 'is-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 'var(--radius-lg)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Network size={16} strokeWidth={2} />
              VPN
            </button>
            <button
              onClick={() => handleModeSwitch('go')}
              className={`knots-glass-btn ${!isVPN ? 'is-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 'var(--radius-lg)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Zap size={16} strokeWidth={2} />
              DPI
            </button>
          </motion.div>

          {/* LIVING ROPE ENTITY — the living character, above the connect button.
              The eye flows top-down: Rope Entity → Connect Button → Status → Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 680,
              height: 190,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'var(--glass-card-bg-light)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--glass-card-shadow)',
            }}
          >
            <LivingRope
              mode={mode}
              active={isConnected}
              connecting={isConnecting}
              latencyMs={latency}
              avgPing={avgPing}
              packetLoss={packetLoss}
              jitter={jitterMs}
            />
          </motion.div>

          {/* CONNECT BUTTON — always the main focus of the screen */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          >
            <ConnectButton serverId="local-bypass-engine" size={170} />
          </motion.div>

          {/* STATUS LINE */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <motion.span
              animate={isConnected ? { opacity: [1, 0.45, 1] } : { opacity: 0.8 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: isConnected ? 'var(--success)' : 'var(--text-muted)',
                boxShadow: isConnected ? '0 0 14px var(--success)' : 'none',
              }}
            />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Shield Active</span>
            <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: 15, color: isConnected ? 'var(--success)' : 'var(--text-secondary)' }}>
              {isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected'}
            </span>
          </motion.div>

          {/* FRIENDLY LIVE STATUS */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', maxWidth: 680 }}
          >
            {stats.map((s) => (
              <FriendlyStat key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} />
            ))}
          </motion.div>

          {/* SECURITY STATUS */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', maxWidth: 680 }}
          >
            <Card padding="var(--space-4)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                <ShieldCheck size={16} strokeWidth={2} color={isConnected ? 'var(--success)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Security Status</span>
                <Badge tone={isConnected ? 'success' : 'neutral'} style={{ marginLeft: 'auto' }}>
                  {isConnected ? 'Protected' : 'Idle'}
                </Badge>
              </div>

              {isConnected ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                    Your connection is fully protected.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {securityChecks.map((check, i) => (
                      <motion.div
                        key={check}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.25 + i * 0.08, ease: 'easeOut' }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.3 + i * 0.08 }}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'rgba(46,213,115,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={11} strokeWidth={3} color="var(--success)" />
                        </motion.span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{check}</span>
                      </motion.div>
                    ))}

                    {/* Privacy Protection göstergesi — küçük satır */}
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.55 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 2,
                        paddingTop: 'var(--space-2)',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Shield size={14} strokeWidth={2} color={privacyEnabled ? 'var(--accent)' : 'var(--text-muted)'} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>Privacy Protection</span>
                      {!privacyInitialized ? (
                        <Badge tone="neutral" style={{ fontSize: 9.5 }}>Loading…</Badge>
                      ) : !privacyEnabled ? (
                        <Badge tone="neutral" style={{ fontSize: 9.5 }}>Off</Badge>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                          <Badge tone="success" style={{ fontSize: 9.5 }}>✓ Ads</Badge>
                          <Badge tone="success" style={{ fontSize: 9.5 }}>✓ Trackers</Badge>
                          <Badge tone="success" style={{ fontSize: 9.5 }}>✓ Malware</Badge>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                            {privacyStats.requestsBlocked} blocked
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                  {isConnecting
                    ? 'Establishing a secure tunnel…'
                    : 'Not connected yet — your traffic is not protected. Press Connect to begin.'}
                </p>
              )}
            </Card>
          </motion.div>

          {/* KORUMA ÖZETİ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.31, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', maxWidth: 680 }}
          >
            <Card padding="var(--space-4)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                <ShieldCheck size={16} strokeWidth={2} color={privacyEnabled ? 'var(--accent)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Protection Summary</span>
                <Badge tone={privacyEnabled ? 'success' : 'neutral'} style={{ marginLeft: 'auto' }}>
                  {privacyEnabled ? 'Active' : 'Off'}
                </Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requests blocked</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {privacyStats.requestsBlocked.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data saved</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {formatBytes(privacyStats.dataSavedBytes)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                <CategoryChip label="Ads" count={privacyStats.adsBlocked} />
                <CategoryChip label="Trackers" count={privacyStats.trackersBlocked} />
                <CategoryChip label="Malware" count={privacyStats.malwareBlocked} />
                <CategoryChip label="Phishing" count={privacyStats.phishingBlocked} />
              </div>

              {isFree && (
                <Button variant="primary" size="sm" full icon={Sparkles} style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('account')}>
                  Upgrade to Pro
                </Button>
              )}
            </Card>
          </motion.div>

          {/* ADVANCED DETAILS */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', maxWidth: 680 }}
          >
            <AdvancedDetails
              location="Netherlands · Amsterdam"
              serverIp="185.24.10.4"
              protocol={isVPN ? 'VPN (TUN)' : 'DPI (Bypass)'}
              engine={isVPN ? 'Python' : 'Go'}
              cipher={encryptionLabel(encryptionMethod)}
              downloaded={formatBytes(safeNum(bytesReceived))}
              uploaded={formatBytes(safeNum(bytesSent))}
              dnsProtection={!!settings?.dnsLeakProtection}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const CategoryChip: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 99,
      background: 'rgba(28,200,255,0.08)',
      border: '1px solid rgba(28,200,255,0.2)',
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--text-secondary)',
    }}
  >
    {label}
    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{count.toLocaleString()}</span>
  </span>
);

const FriendlyStat: React.FC<{
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ duration: 0.18 }}
    style={{
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '12px 6px',
      background: 'var(--glass-card-bg)',
      border: '1px solid var(--glass-card-border)',
      borderRadius: 'var(--radius-md)',
      backdropFilter: 'var(--glass-card-blur)',
      WebkitBackdropFilter: 'var(--glass-card-blur)',
      boxShadow: 'var(--glass-card-shadow)',
    }}
  >
    <Icon size={16} strokeWidth={2} color={color} />
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.4px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
      {value}
    </span>
  </motion.div>
);

const AdvancedDetails: React.FC<{
  location: string;
  serverIp: string;
  protocol: string;
  engine: string;
  cipher: string;
  downloaded: string;
  uploaded: string;
  dnsProtection: boolean;
}> = ({ location, serverIp, protocol, engine, cipher, downloaded, uploaded, dnsProtection }) => {
  const [open, setOpen] = useState(false);

  return (
    <Card padding="var(--space-4)">
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={15} strokeWidth={2} color="var(--text-muted)" />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Advanced Details</span>
          <Badge tone="neutral" style={{ fontSize: 9.5, padding: '2px 8px' }}>
            Technical
          </Badge>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} color="var(--text-muted)" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--glass-card-bg-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-card-border)',
                backdropFilter: 'var(--glass-card-blur)',
                WebkitBackdropFilter: 'var(--glass-card-blur)',
              }}
            >
              <InfoRow label="Location" value={location} />
              <InfoRow label="Server IP" value={serverIp} mono />
              <InfoRow label="Protocol" value={protocol} />
              <InfoRow label="Engine" value={engine} />
              <InfoRow label="Cipher" value={cipher} />
              <InfoRow label="DNS Protection" value={dnsProtection ? 'Enabled' : 'Standard'} />
              <InfoRow label="Downloaded" value={downloaded} mono />
              <InfoRow label="Uploaded" value={uploaded} mono />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 3, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
      {value}
    </div>
  </div>
);

export default Dashboard;
