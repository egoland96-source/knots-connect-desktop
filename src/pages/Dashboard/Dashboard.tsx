import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { useConnection } from '../../hooks/useConnection';
import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import { DashboardShell } from './components/DashboardShell';
import { Sidebar as DashboardSidebar } from './components/Sidebar';
import { ConnectionOverview } from './components/ConnectionOverview';
import { ModeSwitcher } from './components/ModeSwitcher';
import type { OperatingMode } from '../../services/bridge/bridgeService.types';
import { AdvancedDpiDrawer } from './components/AdvancedDpiDrawer';
import { ServerMap } from './components/ServerMap';
import type { ConnectionSnapshot, ServerNode } from '../../types/connection';
import { useTranslation } from '../../store/languageStore';

// Spec palette — Clean Trust + Kernel Character

// bg #080D16, glass rgba(17,25,40,.68) blur 12px, active #34D399, accent #3B82F6->#6366F1, DPI #A78BFA



// Only real servers (matches screenshots + purchased WG node elsewhere). Keep list minimal.

const MAP_NODES: ServerNode[] = [

  { id: 'nl', country: 'Netherlands', city: 'Amsterdam', code: 'NL', lat: 52.37, lon: 4.9, count: 3, ping: 12, load: 35 },

  { id: 'de', country: 'Germany', city: 'Frankfurt', code: 'DE', lat: 50.11, lon: 8.68, count: 2, ping: 18, load: 42 },

  { id: 'fi', country: 'Finland', city: 'Helsinki', code: 'FI', lat: 60.17, lon: 24.93, count: 2, ping: 36, load: 28 },

];

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
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

  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const storeServerId = useConnectionStore((s) => s.serverId);
  const connectedNodeId = isConnected ? (isVpnMode ? 'wg-us' : (storeServerId || 'nl')) : null;
  const activeNodeId = selectedNodeId ?? connectedNodeId;

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
    return activeNodeId ? MAP_NODES_ALL.find((n) => n.id === activeNodeId) ?? null : null;
  }, [activeNodeId]);
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

  // Harita varsayılan konumu — VPN bağlıysa ABD sunucusu, DPI modunda Hollanda, aksi halde yerel konum
  const defaultLat = isConnected ? (isVpnMode ? 40.7862 : 52.37) : 39.0;
  const defaultLon = isConnected ? (isVpnMode ? -74.0743 : 4.9) : 35.0;

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%', padding: '0 8px' }}>
        {/* Top Header: CONNECTION MAP & Live Status (Spec Page 5 & 6) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('dashboard.connection')}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#EEF4F5', marginTop: 4, letterSpacing: '-0.02em' }}>
              {isConnected ? t('dashboard.connectedTitle') : t('dashboard.disconnectedTitle')}
            </div>
            <div style={{ fontSize: 13, color: '#9DB0B7', marginTop: 2 }}>
              {isConnected
                ? operatingMode === 'gaming'
                  ? t('dashboard.gamingDesc')
                  : operatingMode === 'hybrid'
                  ? t('dashboard.hybridDesc')
                  : t('dashboard.privateDesc')
                : t('dashboard.unprotectedDesc')}
            </div>
          </div>

          {/* Right-side compact metadata: ● On · 12 ms (Spec Page 6) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, background: '#111D26', border: '1px solid #1E2D38' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isConnected ? '#61D1A8' : '#7E949F',
                boxShadow: isConnected ? '0 0 8px #61D1A8' : 'none',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: isConnected ? '#61D1A8' : '#7E949F', fontFamily: 'Inter, sans-serif' }}>
              {isConnected ? t('common.on') : t('common.off')}
            </span>
            {isConnected && (
              <>
                <span style={{ color: '#4B5E68', fontSize: 12 }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9DB0B7', fontFamily: "'DM Mono', monospace" }}>
                  {latencyMs && latencyMs > 0 ? `${Math.round(latencyMs)} ms` : '12 ms'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Real Geographic Map of Europe (Spec Page 6 & 7) */}
        <div style={{ marginBottom: 24 }}>
          <ServerMap
            nodes={MAP_NODES_ALL}
            activeId={activeNodeId}
            onSelect={(n) => setSelectedNodeId(n?.id ?? null)}
            onConnect={async (id, mode) => {
                // 1. Modu önce kaydet (await ile store güncellensin)
                await setOperatingModeAction(mode);
                // 2. Şimdi bağlan — useConnection hook'u doğru modu okuyacak
                await toggleConnection(id);
              }}
            isConnected={isConnected}
            defaultLat={defaultLat}
            defaultLon={defaultLon}
            connectLabel={isVpnMode ? 'Connect via WireGuard' : 'Connect via DPI'}
            connection={mapConnection}
          />
        </div>

        {/* Overview details below map: Flat horizontal rows (Spec Page 8) */}
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #1E2D38', marginBottom: 28 }}>
          {/* Row 1: Private Route */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1E2D38' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('dashboard.privateRoute')}
              </div>
              <div style={{ fontSize: 13, color: '#9DB0B7', marginTop: 2 }}>
                {isConnected ? t('dashboard.privateRouteConnected') : t('dashboard.privateRouteDisconnected')}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isConnected ? '#61D1A8' : '#7E949F' }}>
              {isConnected ? t('dashboard.secured') : t('dashboard.inactive')}
            </div>
          </div>

          {/* Row 2: Network Restrictions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1E2D38' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('dashboard.networkRestrictions')}
              </div>
              <div style={{ fontSize: 13, color: '#9DB0B7', marginTop: 2 }}>
                {operatingMode === 'privacy'
                  ? t('dashboard.bypassedVpn')
                  : t('dashboard.bypassedDpi')}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#58BFD2' }}>
              {t('dashboard.handled')} · {operatingMode === 'privacy' ? t('dashboard.vpnTunnel') : t('dashboard.dpiBypas')}
            </div>
          </div>

          {/* Row 3: Mode Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1E2D38' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('dashboard.activeMode')}
              </div>
              <div style={{ fontSize: 13, color: '#9DB0B7', marginTop: 2 }}>
                {operatingMode === 'gaming' && t('dashboard.gamingModeDesc')}
                {operatingMode === 'privacy' && t('dashboard.privacyModeDesc')}
                {operatingMode === 'hybrid' && t('dashboard.hybridModeDesc')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
              {(['gaming', 'privacy', 'hybrid'] as const).map((m) => {
                const isCurrent = operatingMode === m;
                return (
                  <div key={m} style={{ position: 'relative' }}>
                    {isCurrent && (
                      <motion.div
                        layoutId="dashboard-mode-active"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 6,
                          background: 'rgba(88,191,210,0.14)',
                          border: '1px solid #58BFD2',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleModeSwitch(m)}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: '1px solid transparent',
                        background: 'transparent',
                        color: isCurrent ? '#58BFD2' : '#7E949F',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'color 140ms ease',
                      }}
                    >
                      {{ gaming: t('dashboard.gaming'), privacy: t('dashboard.privacy'), hybrid: t('dashboard.hybrid') }[m]}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Action: Restrained Blue-to-Cyan Full Width Button (Spec Page 8 & 9) */}
        <div>
          <motion.button
            whileHover={{ scale: 1.006, filter: 'brightness(1.05)' }}
            whileTap={{ scale: 0.985 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => toggleConnection(selectedNodeId ?? undefined)}
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 8,
              border: 'none',
              background: isConnected
                ? 'rgba(38,60,70,0.6)'
                : 'linear-gradient(135deg, #287FB9, #4FB9CF)',
              color: '#EEF4F5',
              fontSize: 14,
              fontWeight: 600,
              cursor: isConnecting ? 'wait' : 'pointer',
              boxShadow: 'none',
              transition: 'background 160ms ease, opacity 160ms ease',
              opacity: isConnecting ? 0.6 : 1,
            }}
          >
            {isConnecting ? t('dashboard.connecting') : isConnected ? t('dashboard.disconnect') : t('dashboard.connect')}
          </motion.button>
        </div>
      </div>

      <AdvancedDpiDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </DashboardShell>
  );
};

export default Dashboard;


