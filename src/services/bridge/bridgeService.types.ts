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
