export interface ConnectResult {
  success: boolean;
  message: string;
}

export interface DisconnectResult {
  success: boolean;
  message: string;
}

export interface EngineStatusPayload {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  server_id: string | null;
  latency_ms: number | null;
  engine_mode: 'python' | 'go' | null;
  uptime_seconds: number | null;
  bypass_count: number;
  encryption_method?: number | null;
  bytes_received?: number | null;
  bytes_sent?: number | null;
  packets_received?: number | null;
  packets_sent?: number | null;
}

export interface EngineModeResult {
  mode: 'python' | 'go';
  success: boolean;
  message: string;
}

/** Arka plandan süzülen canlı akış bildirimi */
export interface TelemetryPayload {
  bypassCount?: number;
  latencyMs?: number;
  uptimeSeconds?: number;
  status?: 'disconnected' | 'connecting' | 'connected' | 'error';
  downMbps?: number;
  upMbps?: number;
}

export interface PrivacyBridgeApi {
  fetchList?: (url: string) => Promise<{ ok: boolean; content?: string; error?: string }>;
  cacheWrite?: (name: string, content: string) => Promise<{ ok: boolean }>;
  cacheRead?: (name: string) => Promise<string | null>;
  cacheRemove?: (name: string) => Promise<{ ok: boolean }>;
}

export interface KnotsIdentityResult {
  success: boolean;
  knotsId: string;
  knotsIdRaw: string;
  mnemonic: string;
  message?: string;
}

export interface KnotsBridgeApi {
  // Zero-knowledge anonymous identity (brifing: window.knots.auth / window.knots.init)
  auth?: (knotsId: string) => Promise<KnotsIdentityResult>;
  init?: () => Promise<KnotsIdentityResult>;
  mnemonicRecover?: (payload: { mnemonic: string } | string) => Promise<KnotsIdentityResult>;
  getIdentity?: () => Promise<{ knotsId: string; knotsIdRaw: string; mnemonic: string; createdAt: string } | null>;
  // legacy alias
  knotsAuth?: (knotsId: string) => Promise<KnotsIdentityResult>;
  knotsInit?: () => Promise<KnotsIdentityResult>;

  copyId?: (id: string) => Promise<{ success: boolean }>;
  mnemonicGenerate?: () => Promise<{ mnemonic: string; knotsId: string }>;
  qrGenerate?: () => Promise<any>;
  engineSet?: (mode: string) => Promise<any>;
  dpiSet?: (options: any) => Promise<any>;
  shieldSet?: (enabled: boolean) => Promise<any>;
  dohSet?: (provider: string) => Promise<any>;
  splitSet?: (enabled: boolean) => Promise<any>;

  connect: (serverId?: string) => Promise<ConnectResult>;
  disconnect: () => Promise<DisconnectResult>;
  getStatus: () => Promise<EngineStatusPayload>;
  getEngineMode: () => Promise<{ mode: 'python' | 'go' }>;
  setEngineMode: (mode: 'python' | 'go') => Promise<EngineModeResult>;
  getEncryptionMethod?: () => Promise<{ method_id: number } | number>;
  setEncryptionMethod?: (methodId: number) => Promise<any>;
  setDpiTechniques?: (techniques: string[]) => Promise<any>;
  getHWID?: () => Promise<string | null>;

  // === CANLI AKIŞ VE DİNLENME KANALLARI ===
  onTelemetry: (callback: (data: TelemetryPayload) => void) => () => void;
  onSystemAlert?: (callback: (info: { title: string; body: string; ts?: number }) => void) => () => void;
  onMiniMode?: (callback: (m: { active: boolean }) => void) => () => void;
  miniStatus?: () => Promise<{ active: boolean }>;
  getSettings?: () => Promise<Record<string, any> | null>;
  updateSetting?: (key: string, value: any) => Promise<void>;

  // === WIREGUARD VPN (sunucuya tam tünel) ===
  wgStatus?: () => Promise<{
    running: boolean;
    installed: boolean;
    state: string | null;
    server: string | null;
    handshakeSec: number | null;
    transfers: { rxBytes: number; txBytes: number } | null;
  }>;
  wgEnable?: (enabled: boolean) => Promise<{ success: boolean; message?: string }>;
  onWgState?: (callback: (data: {
    running: boolean;
    installed: boolean;
    state: string | null;
    server: string | null;
    handshakeSec: number | null;
    transfers: { rxBytes: number; txBytes: number } | null;
  }) => void) => () => void;

  // === SMART SPLIT TUNNELING & OPERATING MODES ===
  getSplitSettings?: () => Promise<any>;
  updateSplitSettings?: (settings: any) => Promise<any>;
  setOperatingMode?: (mode: string) => Promise<any>;
  getRunningProcesses?: () => Promise<any[]>;
  addBypassApp?: (appName: string) => Promise<any>;
  removeBypassApp?: (appName: string) => Promise<any>;

  // === PRIVACY PROTECTION ===
  privacy?: PrivacyBridgeApi;

  // === OTOMATİK GÜNCELLEME ===
  onUpdateStatus?: (callback: (info: { status: 'downloading' | 'ready' | 'error'; version: string; detail?: string }) => void) => () => void;
  openReleases?: () => void;
  installUpdate?: () => Promise<void>;
  rollbackUpdate?: () => Promise<void>;
  toggleDevTools?: () => Promise<void>;
  openLogs?: () => Promise<void>;
}

export interface WindowControlsApi {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  enterMini?: () => Promise<void>;
  exitMini?: () => Promise<void>;
  hideToTray?: () => Promise<void>;
  showFromTray?: () => Promise<void>;
}

declare global {
  interface Window {
    knots: KnotsBridgeApi;
    windowControls: WindowControlsApi;
  }
}