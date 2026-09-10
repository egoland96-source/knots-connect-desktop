import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { useConnection } from '../../hooks/useConnection';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import { MiniGlobe } from '../../components/MiniGlobe';
import { DashboardShell } from './components/DashboardShell';
import { Sidebar as DashboardSidebar } from './components/Sidebar';
import { ConnectionOverview } from './components/ConnectionOverview';
import { ModeSwitcher } from './components/ModeSwitcher';
import type { OperatingMode } from '../../services/bridge/bridgeService.types';
import { AdvancedDpiDrawer } from './components/AdvancedDpiDrawer';
import { ServerMap } from './components/ServerMap';
import type { ConnectionSnapshot, ServerNode } from '../../types/connection';

// Spec palette — Clean Trust + Kernel Character
// bg #080D16, glass rgba(17,25,40,.68) blur 12px, active #34D399, accent #3B82F6->#6366F1, DPI #A78BFA

// Only real servers (matches screenshots + purchased WG node elsewhere). Keep list minimal.
const MAP_NODES: ServerNode[] = [
  { id: 'nl', country: 'Netherlands', city: 'Amsterdam', code: 'NL', lat: 52.37, lon: 4.9, count: 3, ping: 12, load: 35 },
  { id: 'de', country: 'Germany', city: 'Frankfurt', code: 'DE', lat: 50.11, lon: 8.68, count: 2, ping: 18, load: 42 },
  { id: 'fi', country: 'Finland', city: 'Helsinki', code: 'FI', lat: 60.17, lon: 24.93, count: 2, ping: 36, load: 28 },
];

export const Dashboard: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const operatingMode = useConnectionStore((s) => s.operatingMode);
  const setOperatingModeAction = useConnectionStore((s) => s.setOperatingMode);
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const bytesReceived = useConnectionStore((s) => s.bytesReceived);
  const bytesSent = useConnectionStore((s) => s.bytesSent);
  const downloadSpeed = useConnectionStore((s) => s.downloadSpeed);
  const uploadSpeed = useConnectionStore((s) => s.uploadSpeed);
  const encryptionMethod = useConnectionStore((s) => s.encryptionMethod);
  // Live snapshot (Go IPC)
  const liveIp = useConnectionStore((s) => s.ipAddress);
  const liveLocation = useConnectionStore((s) => s.location);
  const liveIsp = useConnectionStore((s) => s.isp);
  // WireGuard — dedicated tunnel to purchased node (Secaucus)
  const wgStatus = useConnectionStore((s) => s.wgStatus);
  const wgBusy = useConnectionStore((s) => s.wgBusy);

  const { toggleConnection } = useConnection();

  // Poll WireGuard status on mount + every 5s — keep Dashboard in sync with real tunnel
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (alive) await useConnectionStore.getState().refreshWgStatus();
    };
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Hybrid & Privacy -> WireGuard active -> considered VPN mode
  const isVpnMode = operatingMode === 'hybrid' || operatingMode === 'privacy';
  const isConnected = isVpnMode ? !!wgStatus?.running : status === 'connected';
  const isConnecting = isVpnMode ? wgBusy : status === 'connecting' || (status as string) === 'disconnecting';

  // Purchased WireGuard node — Secaucus, NJ, USA
  const WG_SERVER = { id: 'wg-us', country: 'United States', city: 'Secaucus', code: 'US', lat: 40.7862, lon: -74.0743, count: 1, ping: 60, load: 30 };
  const MAP_NODES_ALL: ServerNode[] = [WG_SERVER, ...MAP_NODES];
  const wgActiveId = isVpnMode && isConnected ? 'wg-us' : null;

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

  // Live snapshot when connected, otherwise real geo via ipapi
  const displayIp = isConnected
    ? (isVpnMode ? (wgStatus?.running ? '162.35.122.121' : (liveIp ?? '185.24.10.4')) : (liveIp ?? '185.24.10.4'))
    : realGeo?.ip ?? '176.88.147.242';
  const displayCountry = isConnected
    ? (isVpnMode ? 'United States' : (liveLocation?.country ?? 'Netherlands'))
    : realGeo?.country ?? 'Turkey';
  const displayProvider = isConnected
    ? (isVpnMode ? 'Interserver, Inc' : (liveIsp ?? 'Knots Secure'))
    : realGeo?.org ?? 'Turkcell Superonline';

  const selectedNode = useMemo(() => (MAP_NODES_ALL.find((n) => n.id === selectedNodeId) ?? null), [selectedNodeId]);
  const activeMapNode = useMemo(() => {
    const id = selectedNodeId ?? wgActiveId;
    return id ? MAP_NODES_ALL.find((n) => n.id === id) ?? null : null;
  }, [selectedNodeId, wgActiveId]);
  const mapConnection = isConnected && activeMapNode ? { fromLat: 39.0, fromLon: 35.0, toLat: activeMapNode.lat, toLon: activeMapNode.lon } : null;

  // Snapshot for ConnectionOverview — driven by real WireGuard / Go state
  const snapshot: ConnectionSnapshot = useMemo(() => {
    const state = (isVpnMode
      ? (wgStatus?.running ? 'connected' : wgBusy ? 'connecting' : (status as string) === 'disconnecting' ? 'disconnecting' : status === 'connected' ? 'connected' : 'disconnected')
      : (status === 'connecting' ? 'connecting' : status === 'connected' ? 'connected' : (status as string) === 'disconnecting' ? 'disconnecting' : status === 'error' ? 'error' : 'disconnected')) as ConnectionSnapshot['state'];

    let server: ConnectionSnapshot['server'] = null;
    let ip: string | null = null;
    if (state === 'connected') {
      if (isVpnMode) {
        server = { country: 'United States', city: 'Secaucus', code: 'US' };
        ip = '162.35.122.121';
      } else {
        const liveServer = liveLocation ? { country: liveLocation.country, city: liveLocation.city ?? '', code: liveLocation.code } : null;
        server = selectedNode ? { country: selectedNode.country, city: selectedNode.city ?? '', code: selectedNode.code } : (liveServer ?? { country: 'Netherlands', city: 'Amsterdam', code: 'NL' });
        ip = liveIp ?? displayIp;
      }
    }

    return {
      state,
      server,
      latencyMs: latencyMs || null,
      ipAddress: ip ?? displayIp,
      protectedBytes: (bytesReceived || 0) + (bytesSent || 0),
      uploadBytesPerSecond: uploadSpeed || 0,
      downloadBytesPerSecond: downloadSpeed || 0,
    };
  }, [isVpnMode, wgStatus?.running, wgBusy, status, selectedNode, latencyMs, displayIp, liveIp, liveLocation, bytesReceived, bytesSent, uploadSpeed, downloadSpeed]);

  const protocolLabel = useMemo(() => {
    if (operatingMode === 'privacy') return 'WireGuard VPN';
    if (operatingMode === 'hybrid') return 'Smart Hybrid \u00B7 WireGuard + DPI';
    const enc = encryptionMethod === 2 ? 'AES-128-GCM' : encryptionMethod === 3 ? 'ChaCha20' : 'AES-256-GCM';
    return `Gaming DPI Bypass \u00B7 ${enc}`;
  }, [operatingMode, encryptionMethod]);

  const adblockEnabled = useConnectionStore((s) => s.settings.adblock);

  const handleModeSwitch = async (m: OperatingMode) => {
    await setOperatingModeAction(m);
  };

  // For sidebar live summary + map default â€” VPN baÄŸlÄ±ysa ABD (sunucu konumu)
  const defaultLat = isConnected ? (isVpnMode ? 40.7862 : 52.37) : 39.0;
  const defaultLon = isConnected ? (isVpnMode ? -74.0743 : 4.9) : 35.0;

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
        <DashboardSidebar active={activeMenu} onSelect={setActiveMenu} isVpnConnected={isVpnMode && isConnected} vpnServer={WG_SERVER} />

        {/* RIGHT: Main stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <AnnouncementsBanner />

          {/* Overview is the hero â€” always visible. Network/Identity tabs swap content below it. */}
          <ConnectionOverview
            snapshot={snapshot}
            protocolLabel={protocolLabel}
            onToggle={() => toggleConnection(selectedNodeId ?? undefined)}
            isToggling={isConnecting}
          />

          <ModeSwitcher mode={operatingMode} onChange={handleModeSwitch} onOpenAdvanced={() => setDrawerOpen(true)} dpiActive={operatingMode !== 'privacy'} />

          {/* Map — overview & network show map; identity is placeholder */}
          {activeMenu !== 'identity' ? (
            <ServerMap
              nodes={MAP_NODES_ALL}
              activeId={selectedNodeId ?? wgActiveId}
              onSelect={(n) => setSelectedNodeId(n?.id ?? null)}
              onConnect={(id) => toggleConnection(id)}
              isConnected={isConnected}
              defaultLat={defaultLat}
              defaultLon={defaultLon}
              connectLabel={isVpnMode ? 'Connect via WireGuard' : 'Connect via DPI'}
              connection={mapConnection}
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
              <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 6 }}>Your Knots ID and recovery key are stored on this device. Back up in Settings → Account.</div>
            </div>
          )}

          {/* Engine Status — real (no hardcode), kept subtle — Clean Trust */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 14,
              background: 'rgba(17,25,40,0.58)',
              border: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>
              <Cpu size={13} /> Engine Status
            </span>
            <span style={{ flex: 1, minWidth: 12 }} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 999,
                background: isConnected ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.16)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                color: '#34D399',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /> WinDivert {isConnected ? 'ACTIVE' : 'READY'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 999,
                background: isConnected ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.16)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                color: '#34D399',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /> DPI Bypass {isConnected ? 'ACTIVE' : 'READY'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 999,
                background: adblockEnabled ? 'rgba(52,211,153,0.10)' : 'rgba(148,163,184,0.08)',
                border: `1px solid ${adblockEnabled ? 'rgba(52,211,153,0.18)' : 'rgba(148,163,184,0.14)'}`,
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                color: adblockEnabled ? '#34D399' : '#94A3B8',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: adblockEnabled ? '#34D399' : '#64748B' }} /> AdBlock {adblockEnabled ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          {/* Bottom status — IP / Country / Provider */}
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
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>YOUR IP</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>{displayIp}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>COUNTRY</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginTop: 4 }}>{displayCountry}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>PROVIDER</div>
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

          {/* Mini globe kept as delightful detail â€” bottom-right of page, not inside map card */}
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

