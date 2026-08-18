import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { bridgeService } from '../services/bridge/bridgeService';
import type { ConnectionState, EngineMode } from '../services/bridge/bridgeService.types';

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
  };

  // Actions
  connect: (serverId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  setEngineMode: (mode: EngineMode) => Promise<void>;
  setEncryptionMethod: (methodId: number) => Promise<void>;
  toggleSetting: (key: keyof ConnectionStoreState['settings']) => Promise<void>;
  loadInitialSettings: () => Promise<void>;
  
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
  },

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
    try {
      await bridgeService.disconnect();
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
    } catch (error) {
      console.error("Başlangıç ayarları ve motor durumu yüklenemedi:", error);
    }
  },

  // Internal telemetry handler - called by IPC bridge
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

      return {
        // Current telemetry
        downloadSpeed: newDownloadSpeed,
        uploadSpeed: newUploadSpeed,
        bytesReceived: newBytesReceived,
        bytesSent: newBytesSent,
        packetsReceived: newPacketsReceived,
        packetsSent: newPacketsSent,
        latencyMs: newLatencyMs,
        packetLoss: newPacketLoss,
        jitter: newJitter,
        cpuUsage: newCpuUsage,
        memoryUsage: newMemoryUsage,
        uptimeSeconds: newUptimeSeconds,
        bypassCount: newBytesReceived + newBytesSent, // Legacy compatibility
        
        // History for charts
        historyDownload: newHistoryDownload,
        historyUpload: newHistoryUpload,
        historyLatency: newHistoryLatency,
        historyTime: newHistoryTime,
        
        // Status updates
        status: payload.status ?? state.status,
        serverId: payload.serverId ?? state.serverId,
        engineMode: payload.engineMode ?? state.engineMode,
        encryptionMethod: payload.encryptionMethod ?? state.encryptionMethod,
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
      return unsubscribe;
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