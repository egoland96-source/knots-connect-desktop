export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type EngineMode = 'python' | 'go';

export interface ConnectResult {
  success: boolean;
  message: string;
}

export interface DisconnectResult {
  success: boolean;
  message: string;
}

export interface EngineStatus {
  encryptionMethod: number;
  state: ConnectionState;
  serverId: string | null;
  latencyMs: number | null;
  engineMode: EngineMode | null;
  uptimeSeconds: number | null;
  bypassCount: number;
  bytesReceived: number | null;
  bytesSent: number | null;
  packetsReceived: number | null;
  packetsSent: number | null;
}

export type OperatingMode = 'gaming' | 'hybrid' | 'privacy';

export interface SplitPresets {
  steam: boolean;
  riot: boolean;
  epic: boolean;
  roblox: boolean;
  discordVoice: boolean;
}

export interface SplitTunnelingConfig {
  enabled: boolean;
  autoDetectGames: boolean;
  presets: SplitPresets;
  customApps: string[];
  customIps: { ip: string; mask?: string; name?: string }[];
}

export interface SplitStatus {
  splitTunneling: SplitTunnelingConfig;
  operatingMode: OperatingMode;
  activeRoutesCount: number;
  physicalGateway: string;
}

export interface RunningProcessItem {
  name: string;
  pid: number;
  title: string;
  isGame: boolean;
}
