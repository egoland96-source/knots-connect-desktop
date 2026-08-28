export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export type ConnectionSnapshot = {
  state: ConnectionState;
  server: {
    country: string;
    city: string;
    code: string;
  } | null;
  latencyMs: number | null;
  ipAddress: string | null;
  protectedBytes: number;
  uploadBytesPerSecond: number;
  downloadBytesPerSecond: number;
};

/** Map node used by ServerMap */
export type ServerNode = {
  id: string;
  country: string;
  city?: string;
  code: string;
  lat: number;
  lon: number;
  ping: number;
  load: number;
  count?: number;
};
