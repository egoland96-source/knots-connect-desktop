import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { bridgeService } from '../services/bridge/bridgeService';
import type { ConnectionState, EngineMode, OperatingMode, SplitStatus, SplitTunnelingConfig } from '../services/bridge/bridgeService.types';

// =========================================================================
// UTILITY: Safe number handling
// =========================================================================
const safeNum = (value: number | null | undefined): number => 
  typeof value === 'number' && isFinite(value) ? value : 0;

const safeNumFixed = (value: number | null | undefined, decimals: number = 1): string => 
  safeNum(value).toFixed(decimals);

// History limit constant
const HISTORY_LIMIT = 60;

interface TelemetryData {
  downloadSpeed: number;
  uploadSpeed: number;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  latencyMs: number;
  packetLoss: number;
  jitter: number;
  cpuUsage: number;
  memoryUsage: number;
  uptimeSeconds: number;
  status: ConnectionState;
  serverId: string | null;
  engineMode: EngineMode | null;
  encryptionMethod: number;
  // FAZ 3.A — Snapshot alanları (Go / IPC canlı akış)
  ipAddress?: string | null;
  location?: { country: string; city: string; code: string } | null;
  isp?: string | null;
}

// WireGuard durumu — Knots'un kendi sunucusuna tam tünel
export interface WireGuardStatus {
  running: boolean;
  installed: boolean;
  state: string | null;
  server: string | null;
  handshakeSec: number | null;
  transfers: { rxBytes: number; txBytes: number } | null;
}

interface ConnectionStoreState {
  // Connection state
  status: ConnectionState;
  errorMessage: string | null;
  serverId: string | null;
  engineMode: EngineMode | null;
  encryptionMethod: number;
  uptimeSeconds: number | null;

  // Telemetry - current values
  downloadSpeed: number;
  uploadSpeed: number;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  latencyMs: number;
  packetLoss: number;
  jitter: number;
  cpuUsage: number;
  memoryUsage: number;
  bypassCount: number; // Legacy compatibility

  // Snapshot — FAZ 3.A canlı konum/IP/ISP
  ipAddress: string | null;
  location: { country: string; city: string; code: string } | null;
  isp: string | null;

  // Telemetry - history for charts (last 60 samples)
  historyDownload: number[];
  historyUpload: number[];
  historyLatency: number[];
  historyTime: number[]; // timestamps

  // Settings
  settings: {
    autoConnect: boolean;
    killSwitch: boolean;
    dnsLeakProtection: boolean;
    startWithWindows: boolean;
    autoUpdate: boolean;
    aggressiveMode: boolean;
    adblock: boolean;
    wireguardEnabled: boolean;
  };

  // WireGuard
  wgStatus: WireGuardStatus | null;
  wgBusy: boolean;

  // Smart Split Tunneling & Operating Modes
  operatingMode: OperatingMode;
  splitSettings: SplitStatus | null;

  // Actions
  connect: (serverId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  setEngineMode: (mode: EngineMode) => Promise<void>;
  setEncryptionMethod: (methodId: number) => Promise<void>;
  toggleSetting: (key: keyof ConnectionStoreState['settings']) => Promise<void>;
  loadInitialSettings: () => Promise<void>;
  refreshWgStatus: () => Promise<void>;
  setWireGuard: (enabled: boolean) => Promise<void>;
  setOperatingMode: (mode: OperatingMode) => Promise<void>;
  loadSplitSettings: () => Promise<void>;
  updateSplitSettings: (settings: Partial<SplitTunnelingConfig>) => Promise<void>;
  addBypassApp: (app: string) => Promise<void>;
  removeBypassApp: (app: string) => Promise<void>;
  
  // Single global telemetry listener
  initTelemetryListener: () => () => void;
  
  // Internal: handle telemetry update (called by IPC)
  _handleTelemetry: (payload: Partial<TelemetryData>) => void;
}

export const useConnectionStore = create<ConnectionStoreState>()((set, get) => ({
  // Initial state
  status: 'disconnected',
  errorMessage: null,
  serverId: null,
  engineMode: null,
  encryptionMethod: 1,
  uptimeSeconds: null,

  // Telemetry - current values
  downloadSpeed: 0,
  uploadSpeed: 0,
  bytesReceived: 0,
  bytesSent: 0,
  packetsReceived: 0,
  packetsSent: 0,
  latencyMs: 0,
  packetLoss: 0,
  jitter: 0,
  cpuUsage: 0,
  memoryUsage: 0,
  bypassCount: 0,
  ipAddress: null,
  location: null,
  isp: null,

  // History arrays
  historyDownload: [],
  historyUpload: [],
  historyLatency: [],
  historyTime: [],

  settings: {
    autoConnect: false,
    killSwitch: true,
    dnsLeakProtection: true,
    startWithWindows: false,
    autoUpdate: true,
    aggressiveMode: false,
    adblock: true,
    wireguardEnabled: false,
  },

  wgStatus: null,
  wgBusy: false,
  operatingMode: 'hybrid',
  splitSettings: null,

  connect: async (serverId) => {
    set({ status: 'connecting', errorMessage: null });
    try {
      const result = await bridgeService.connect(serverId);
      set({
        status: result.success ? 'connected' : 'error',
        errorMessage: result.success ? null : result.message,
        serverId: result.success ? serverId ?? null : null,
      });
      // Telemetry listener will handle the rest
    } catch (error) {
      set({ status: 'error', errorMessage: (error as Error).message });
    }
  },

  disconnect: async () => {
    // FAZ 3.A — graceful: önce disconnecting, sonra temiz DISCONNECTED
    set({ status: 'disconnecting' as any });
    try {
      await bridgeService.disconnect();
    } catch (e) {
      console.warn('[connectionStore] disconnect RPC failed, forcing disconnected:', (e as Error).message);
    } finally {
      set({
        status: 'disconnected',
        serverId: null,
        errorMessage: null,
        uptimeSeconds: null,
        downloadSpeed: 0,
        uploadSpeed: 0,
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        latencyMs: 0,
        packetLoss: 0,
        jitter: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        bypassCount: 0,
        ipAddress: null,
        location: null,
        isp: null,
      });
    }
  },

  refreshStatus: async () => {
    try {
      const current = await bridgeService.getStatus();
      set({
        status: current.state,
        serverId: current.serverId,
        engineMode: current.engineMode,
        encryptionMethod: current.encryptionMethod ?? get().encryptionMethod,
        uptimeSeconds: current.uptimeSeconds,
        bypassCount: current.bypassCount,
        latencyMs: safeNum(current.latencyMs),
      });
    } catch (error) {
      set({ status: 'error', errorMessage: (error as Error).message });
    }
  },

  setEngineMode: async (mode) => {
    try {
      const result = await bridgeService.setEngineMode(mode);
      const isSuccess = result?.success ?? (result && !result.error);
      const targetMode = result?.mode ?? mode;

      if (isSuccess) {
        set({ engineMode: targetMode, errorMessage: null });
      } else {
        set({ errorMessage: result?.message ?? 'Motor modu değiştirilemedi.' });
      }
    } catch (error) {
      set({ errorMessage: (error as Error).message });
    }
  },

  setEncryptionMethod: async (methodId) => {
    try {
      const result = await bridgeService.setEncryptionMethod(methodId);
      const isSuccess = result?.success ?? true;
      if (isSuccess) {
        set({ encryptionMethod: methodId });
      }
    } catch (error) {
      console.error('Şifreleme yöntemi güncellenirken hata:', error);
    }
  },

  toggleSetting: async (key) => {
    const currentSettings = get().settings;
    const newValue = !currentSettings[key];

    set((state) => ({
      settings: {
        ...state.settings,
        [key]: newValue,
      },
    }));

    try {
      if (typeof bridgeService.updateSetting === 'function') {
        await bridgeService.updateSetting(key, newValue);
      }
    } catch (error) {
      console.error(`Ayar güncellenirken hata oluştu (${key}):`, error);
    }
  },

  loadInitialSettings: async () => {
    try {
      if (typeof bridgeService.getSettings === 'function') {
        const savedSettings = await bridgeService.getSettings();
        if (savedSettings) {
          set((state) => ({
            settings: { ...state.settings, ...savedSettings },
          }));
        }
      }

      const currentMode = await bridgeService.getEngineMode();
      if (currentMode) {
        set({ engineMode: currentMode });
      }

      const currentMethod = await bridgeService.getEncryptionMethod();
      if (currentMethod) {
        set({ encryptionMethod: currentMethod });
      }

      // Split Tunneling & Operating Mode yükle
      await get().loadSplitSettings();

      // WireGuard durumunu da yükle (toggle durumu eşleşsin)
      if (typeof window !== 'undefined' && window.knots?.wgStatus) {
        try {
          const wg = await window.knots.wgStatus();
          set({ wgStatus: wg, settings: { ...get().settings, wireguardEnabled: !!wg.running } });
        } catch {}
      }

      // Mini moddan çıkışta motor hâlâ bağlıysa UI'ı senkronla
      if (typeof bridgeService.getStatus === 'function') {
        const current = await bridgeService.getStatus();
        if (current) {
          set({
            status: current.state,
            serverId: current.serverId,
            engineMode: current.engineMode,
            uptimeSeconds: current.uptimeSeconds,
            bypassCount: current.bypassCount,
            latencyMs: safeNum(current.latencyMs),
          });
        }
      }
    } catch (error) {
      console.error("Başlangıç ayarları ve motor durumu yüklenemedi:", error);
    }
  },

  // WireGuard — sunucuya tam tünel aç/kapat + durum
  refreshWgStatus: async () => {
    try {
      if (typeof window !== 'undefined' && window.knots?.wgStatus) {
        const st = await window.knots.wgStatus();
        set({ wgStatus: st });
      }
    } catch (error) {
      console.error('WireGuard durumu yüklenemedi:', error);
    }
  },

  setWireGuard: async (enabled) => {
    set({ wgBusy: true });
    try {
      if (typeof window !== 'undefined' && window.knots?.wgEnable) {
        const res = await window.knots.wgEnable(enabled);
        if (!res?.success) {
          console.warn('WireGuard değişikliği başarısız:', res?.message);
          // Ayar tutarlılığı için önceki durumu geri yükle
          const stOld = get().wgStatus;
          set({ settings: { ...get().settings, wireguardEnabled: !!stOld?.running } });
        } else {
          set((s) => ({ settings: { ...s.settings, wireguardEnabled: enabled } }));
        }
      }
      await get().refreshWgStatus();
    } catch (error) {
      console.error('WireGuard değiştirilirken hata:', error);
    } finally {
      set({ wgBusy: false });
    }
  },

  // Smart Split Tunneling & Operating Modes
  setOperatingMode: async (mode: OperatingMode) => {
    try {
      set({ operatingMode: mode });
      if (typeof bridgeService.setOperatingMode === 'function') {
        await bridgeService.setOperatingMode(mode);
      }
      await get().refreshWgStatus();
      await get().loadSplitSettings();
    } catch (err) {
      console.error('Operating mode error:', err);
    }
  },

  loadSplitSettings: async () => {
    try {
      if (typeof bridgeService.getSplitSettings === 'function') {
        const split = await bridgeService.getSplitSettings();
        if (split) {
          set({
            splitSettings: split,
            operatingMode: split.operatingMode || get().operatingMode,
          });
        }
      }
    } catch (err) {
      console.error('Split settings load error:', err);
    }
  },

  updateSplitSettings: async (settings: Partial<SplitTunnelingConfig>) => {
    try {
      if (typeof bridgeService.updateSplitSettings === 'function') {
        await bridgeService.updateSplitSettings(settings);
      }
      await get().loadSplitSettings();
    } catch (err) {
      console.error('Update split settings error:', err);
    }
  },

  addBypassApp: async (app: string) => {
    try {
      if (typeof bridgeService.addBypassApp === 'function') {
        await bridgeService.addBypassApp(app);
      }
      await get().loadSplitSettings();
    } catch (err) {
      console.error('Add bypass app error:', err);
    }
  },

  removeBypassApp: async (app: string) => {
    try {
      if (typeof bridgeService.removeBypassApp === 'function') {
        await bridgeService.removeBypassApp(app);
      }
      await get().loadSplitSettings();
    } catch (err) {
      console.error('Remove bypass app error:', err);
    }
  },

  // Internal telemetry handler - called by IPC bridge (FAZ 3.A canlı DOWN/UP + snapshot)
  _handleTelemetry: (payload: Partial<TelemetryData>) => {
    set((state) => {
      const now = Date.now();
      
      // Update current values with safe numbers
      const newDownloadSpeed = safeNum(payload.downloadSpeed);
      const newUploadSpeed = safeNum(payload.uploadSpeed);
      const newLatencyMs = safeNum(payload.latencyMs);
      const newPacketLoss = safeNum(payload.packetLoss);
      const newJitter = safeNum(payload.jitter);
      const newCpuUsage = safeNum(payload.cpuUsage);
      const newMemoryUsage = safeNum(payload.memoryUsage);
      const newBytesReceived = safeNum(payload.bytesReceived);
      const newBytesSent = safeNum(payload.bytesSent);
      const newPacketsReceived = safeNum(payload.packetsReceived);
      const newPacketsSent = safeNum(payload.packetsSent);
      const newUptimeSeconds = safeNum(payload.uptimeSeconds);

      // Update history arrays (limit to HISTORY_LIMIT)
      const newHistoryDownload = [...state.historyDownload, newDownloadSpeed / (1024 * 1024)].slice(-HISTORY_LIMIT); // Convert to MB/s
      const newHistoryUpload = [...state.historyUpload, newUploadSpeed / (1024 * 1024)].slice(-HISTORY_LIMIT); // Convert to MB/s
      const newHistoryLatency = [...state.historyLatency, newLatencyMs].slice(-HISTORY_LIMIT);
      const newHistoryTime = [...state.historyTime, now].slice(-HISTORY_LIMIT);

      // FAZ 3.A — Snapshot & status: Go motoru DISCONNECTED/CONNECTING/CONNECTED akışını doğrudan sürer
      const nextStatus = (payload.status as any) ?? state.status;
      const isDisconnected = nextStatus === 'disconnected' || nextStatus === 'error';
      const snapshotIp = (payload as any).ipAddress ?? (payload as any).ip ?? null;
      const snapshotLocation = (payload as any).location ?? null;
      const snapshotIsp = (payload as any).isp ?? (payload as any).org ?? null;
      const protectedBytes = (payload as any).protectedBytes;

      return {
        // Current telemetry
        downloadSpeed: newDownloadSpeed,
        uploadSpeed: newUploadSpeed,
        bytesReceived: protectedBytes != null ? safeNum(protectedBytes) : newBytesReceived,
        bytesSent: newBytesSent,
        packetsReceived: newPacketsReceived,
        packetsSent: newPacketsSent,
        latencyMs: newLatencyMs,
        packetLoss: newPacketLoss,
        jitter: newJitter,
        cpuUsage: newCpuUsage,
        memoryUsage: newMemoryUsage,
        uptimeSeconds: newUptimeSeconds,
        bypassCount: (protectedBytes != null ? safeNum(protectedBytes) : newBytesReceived) + newBytesSent,
        
        // History for charts
        historyDownload: newHistoryDownload,
        historyUpload: newHistoryUpload,
        historyLatency: newHistoryLatency,
        historyTime: newHistoryTime,
        
        // Status updates
        status: nextStatus,
        serverId: payload.serverId ?? state.serverId,
        engineMode: payload.engineMode ?? state.engineMode,
        encryptionMethod: payload.encryptionMethod ?? state.encryptionMethod,
        // Snapshot — disconnected'ta temizle, aksi halde geleni koru
        ipAddress: isDisconnected ? null : (snapshotIp ?? state.ipAddress),
        location: isDisconnected ? null : (snapshotLocation ?? state.location),
        isp: isDisconnected ? null : (snapshotIsp ?? state.isp),
      };
    });
  },

  // CANLI TELEMETRİ VE KNOTS IPC DİNLEYİCİSİ
  // Tek bir global listener - App.tsx başlangıcında bir kez çağrılır
  initTelemetryListener: () => {
    if (typeof window !== 'undefined' && window.knots?.onTelemetry) {
      const unsubscribe = window.knots.onTelemetry((payload) => {
        // Payload from Go engine via Electron IPC
        get()._handleTelemetry(payload);
      });
      let wgUnsub = () => {};
      if (typeof window.knots.onWgState === 'function') {
        wgUnsub = window.knots.onWgState((payload) => {
          set({ wgStatus: payload, settings: { ...get().settings, wireguardEnabled: !!payload?.running } });
        });
      }
      return () => {
        unsubscribe();
        wgUnsub();
      };
    } 
    else if (typeof bridgeService.onTelemetry === 'function') {
      const unsubscribe = bridgeService.onTelemetry((payload) => {
        get()._handleTelemetry(payload);
      });
      return unsubscribe;
    }

    return () => {};
  },
}));

// =========================================================================
// SELECTOR HOOKS - Use shallow comparison to prevent unnecessary re-renders
// =========================================================================

// Connection status selectors
export const useConnectionStatus = () => useConnectionStore(
  (state) => ({ 
    status: state.status, 
    serverId: state.serverId,
    errorMessage: state.errorMessage,
  }), 
  shallow
);

export const useConnectionMetrics = () => useConnectionStore(
  (state) => ({
    downloadSpeed: state.downloadSpeed,
    uploadSpeed: state.uploadSpeed,
    latencyMs: state.latencyMs,
    packetLoss: state.packetLoss,
    jitter: state.jitter,
    cpuUsage: state.cpuUsage,
    memoryUsage: state.memoryUsage,
    bytesReceived: state.bytesReceived,
    bytesSent: state.bytesSent,
    packetsReceived: state.packetsReceived,
    packetsSent: state.packetsSent,
    uptimeSeconds: state.uptimeSeconds,
    bypassCount: state.bypassCount,
  }),
  shallow
);

// History selectors for charts
export const useDownloadHistory = () => useConnectionStore(
  (state) => state.historyDownload,
  shallow
);

export const useUploadHistory = () => useConnectionStore(
  (state) => state.historyUpload,
  shallow
);

export const useLatencyHistory = () => useConnectionStore(
  (state) => state.historyLatency,
  shallow
);

export const useHistoryTime = () => useConnectionStore(
  (state) => state.historyTime,
  shallow
);

// All history for Statistics page
export const useTelemetryHistory = () => useConnectionStore(
  (state) => ({
    download: state.historyDownload,
    upload: state.historyUpload,
    latency: state.historyLatency,
    time: state.historyTime,
  }),
  shallow
);

// Engine info
export const useEngineInfo = () => useConnectionStore(
  (state) => ({
    engineMode: state.engineMode,
    encryptionMethod: state.encryptionMethod,
  }),
  shallow
);

// Settings
export const useSettings = () => useConnectionStore(
  (state) => state.settings,
  shallow
);

// Telemetry listener initializer (call once in App.tsx)
export const useTelemetryInit = () => useConnectionStore(
  (state) => state.initTelemetryListener,
  shallow
);

export default useConnectionStore;