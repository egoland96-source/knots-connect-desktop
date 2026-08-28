import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useConnectionStore } from '../../store/connectionStore';
import { useConnection } from '../../hooks/useConnection';
import { useDpiStore } from '../../store/dpiStore';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import { MiniGlobe } from '../../components/MiniGlobe';
import { DashboardShell } from './components/DashboardShell';
import { Sidebar as DashboardSidebar } from './components/Sidebar';
import { ConnectionOverview } from './components/ConnectionOverview';
import { ModeSwitcher } from './components/ModeSwitcher';
import { AdvancedDpiDrawer } from './components/AdvancedDpiDrawer';
import { ServerMap } from './components/ServerMap';
import type { ConnectionSnapshot, ServerNode } from '../../types/connection';

// Spec palette tokens for this dashboard
// Main bg #080D16, glass rgba(17,25,40,.68) blur 12px, active #34D399, gradient #3B82F6→#6366F1, DPI #A78BFA

const MAP_NODES: ServerNode[] = [
  { id: 'nl', country: 'Netherlands', city: 'Amsterdam', code: 'NL', lat: 52.37, lon: 4.9, count: 3, ping: 24, load: 35 },
  { id: 'de', country: 'Germany', city: 'Frankfurt', code: 'DE', lat: 50.11, lon: 8.68, count: 5, ping: 31, load: 45 },
  { id: 'us', country: 'United States', city: 'New York', code: 'US', lat: 40.71, lon: -74.0, count: 4, ping: 42, load: 60 },
  { id: 'jp', country: 'Japan', city: 'Tokyo', code: 'JP', lat: 35.68, lon: 139.76, count: 2, ping: 156, load: 75 },
  { id: 'gb', country: 'United Kingdom', city: 'London', code: 'GB', lat: 51.5, lon: -0.12, count: 3, ping: 35, load: 50 },
  { id: 'fr', country: 'France', city: 'Paris', code: 'FR', lat: 48.86, lon: 2.35, count: 2, ping: 28, load: 40 },
  { id: 'sg', country: 'Singapore', city: 'Singapore', code: 'SG', lat: 1.35, lon: 103.81, count: 3, ping: 145, load: 65 },
  { id: 'ch', country: 'Switzerland', city: 'Zurich', code: 'CH', lat: 47.37, lon: 8.54, count: 2, ping: 30, load: 38 },
];

export const Dashboard: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const engineMode = useConnectionStore((s) => s.engineMode);
  const setEngineMode = useConnectionStore((s) => s.setEngineMode);
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const bytesReceived = useConnectionStore((s) => s.bytesReceived);
  const bytesSent = useConnectionStore((s) => s.bytesSent);
  const downloadSpeed = useConnectionStore((s) => s.downloadSpeed);
  const uploadSpeed = useConnectionStore((s) => s.uploadSpeed);
  const encryptionMethod = useConnectionStore((s) => s.encryptionMethod);
  const uptimeSeconds = useConnectionStore((s) => s.uptimeSeconds);

  const { toggleConnection } = useConnection();
  const activeTechniques = useDpiStore((s) => s.activeTechniques);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || (status as string) === 'disconnecting';
  const isVPN = engineMode !== 'go';
  const mode: 'vpn' | 'dpi' = isVPN ? 'vpn' : 'dpi';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'overview' | 'network' | 'identity'>('overview');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Real geo for IP display
  const [realGeo, setRealGeo] = useState<{ ip: string; country: string; org: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data && data.ip) setRealGeo({ ip: data.ip, country: data.country_name || data.country, org: data.org || data.asn || '' });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const displayIp = isConnected ? '185.24.10.4' : realGeo?.ip ?? '176.88.147.242';
  const displayCountry = isConnected ? 'Netherlands' : realGeo?.country ?? 'Türkiye';
  const displayProvider = isConnected ? 'Knots Secure' : realGeo?.org ?? 'Turkcell Superonline';

  const selectedNode = useMemo(() => MAP_NODES.find((n) => n.id === selectedNodeId) ?? null, [selectedNodeId]);

  // Snapshot for ConnectionOverview
  const snapshot: ConnectionSnapshot = useMemo(() => {
    // Map status to ConnectionState (store uses 'disconnected'|'connecting'|'connected'|'error' ; spec adds 'disconnecting')
    const state = (status === 'connecting' ? 'connecting' : status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'disconnected') as ConnectionSnapshot['state'];
    const server = isConnected
      ? selectedNode
        ? { country: selectedNode.country, city: selectedNode.city ?? '', code: selectedNode.code }
        : { country: 'Netherlands', city: 'Amsterdam', code: 'NL' }
      : null;
    return {
      state,
      server,
      latencyMs: latencyMs || null,
      ipAddress: displayIp,
      protectedBytes: (bytesReceived || 0) + (bytesSent || 0),
      uploadBytesPerSecond: uploadSpeed || 0,
      downloadBytesPerSecond: downloadSpeed || 0,
    };
  }, [status, isConnected, selectedNode, latencyMs, displayIp, bytesReceived, bytesSent, uploadSpeed, downloadSpeed]);

  const protocolLabel = useMemo(() => {
    const enc = encryptionMethod === 2 ? 'AES-128-GCM' : encryptionMethod === 3 ? 'ChaCha20' : 'AES-256-GCM';
    return isVPN ? `VPN • ${enc}` : `DPI Bypass • ${enc}`;
  }, [isVPN, encryptionMethod]);

  const handleModeSwitch = (m: 'vpn' | 'dpi') => {
    const target: 'python' | 'go' = m === 'vpn' ? 'python' : 'go';
    setEngineMode(target);
    // If switching to DPI, hint to open drawer
    if (m === 'dpi' && activeTechniques.length <= 1) {
      // keep drawer closed initially; user can open via button
    }
  };

  // For sidebar live summary + map default
  const defaultLat = isConnected ? 52.37 : 39.0;
  const defaultLon = isConnected ? 4.9 : 35.0;

  return (
    <DashboardShell>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 240px) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* LEFT: Dashboard Sidebar with live summary */}
        <DashboardSidebar active={activeMenu} onSelect={setActiveMenu} />

        {/* RIGHT: Main stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <AnnouncementsBanner />

          {/* Overview is the hero — always visible. Network/Identity tabs swap content below it. */}
          <ConnectionOverview
            snapshot={snapshot}
            protocolLabel={protocolLabel}
            onToggle={() => toggleConnection(selectedNodeId ?? undefined)}
            isToggling={isConnecting}
          />

          <ModeSwitcher mode={mode} onChange={handleModeSwitch} onOpenAdvanced={() => setDrawerOpen(true)} dpiActive={!isVPN} />

          {/* Map — overview + network both show map; identity shows placeholder */}
          {activeMenu !== 'identity' ? (
            <ServerMap
              nodes={MAP_NODES}
              activeId={selectedNodeId}
              onSelect={(n) => setSelectedNodeId(n?.id ?? null)}
              onConnect={(id) => toggleConnection(id)}
              isConnected={isConnected}
              defaultLat={defaultLat}
              defaultLon={defaultLon}
            />
          ) : (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: 'rgba(17,25,40,0.68)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.32)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Identity</div>
              <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 6 }}>Knots ID ve kurtarma anahtarınız bu cihazda saklı. Ayarlar → Hesap bölümünden yedekleyebilirsiniz.</div>
            </div>
          )}

          {/* Bottom status bar — IP / Ülke / Sağlayıcı */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
              padding: 14,
              background: 'rgba(17,25,40,0.68)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              boxShadow: '0 10px 24px rgba(0,0,0,0.32)',
              position: 'relative',
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>IP ADRESİNİZ</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>{displayIp}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>ÜLKE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginTop: 4 }}>{displayCountry}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>HİZMET SAĞLAYICI</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginTop: 4 }}>{displayProvider}</div>
            </div>

            <div
              style={{
                gridColumn: '1 / -1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                justifySelf: 'start',
                padding: '5px 10px',
                borderRadius: 999,
                background: isConnected ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.10)',
                border: `1px solid ${isConnected ? 'rgba(52,211,153,0.24)' : 'rgba(148,163,184,0.16)'}`,
                fontSize: 11,
                fontWeight: 700,
                color: isConnected ? '#34D399' : '#94A3B8',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.06em',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? '#34D399' : '#94A3B8', boxShadow: isConnected ? '0 0 10px rgba(52,211,153,0.55)' : 'none' }} />
              {isConnected ? 'TUNNEL ENCRYPTED' : 'NOT PROTECTED'}
            </div>
          </motion.div>

          {/* Mini globe kept as delightful detail — bottom-right of page, not inside map card */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <MiniGlobe lat={defaultLat} lon={defaultLon} markerLat={defaultLat} markerLon={defaultLon} size={64} />
          </div>
        </div>
      </div>

      <AdvancedDpiDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </DashboardShell>
  );
};

export default Dashboard;
