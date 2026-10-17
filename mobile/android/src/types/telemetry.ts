/**
 * Telemetri tipleri
 * Her ölçümün değeri, ölçüm zamanı, kaynağı ve durumu saklanır.
 * Ölçülemeyen değerler null'dır; sahte/rastgele değer kullanılmaz.
 */

export type VpnStatus = 'disconnected' | 'connecting' | 'connected';

export type MetricState = 'unavailable' | 'measuring' | 'ready' | 'error';

export interface Metric<T> {
  value: T | null;
  measuredAt: number | null;
  source: string | null;
  state: MetricState;
  error?: string | null;
}

/**
 * Ölçülebilecek telemetri alanları.
 * VPN tünel sayaçları (bağlantı süresi, tünelden geçen baytlar) 
 * gerçek VPN motoru gerektirdiğinden burada yoktur — null gösterilir.
 */
export interface TelemetryData {
  /** Cihazın ağ durumu (NetInfo) — VPN kanıtı değildir */
  network: {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
    isWifi: boolean | null;
    isCellular: boolean | null;
  };
  /** Belirlenen sunucuya HTTP gecikmesi (ms) — ICMP ping değil */
  httpLatency: Metric<number>;
  /** Ölçüm sunucusunun gördüğü genel IP — VPN koruması kanıtı değildir */
  publicIp: Metric<string>;
}

export const INITIAL_TELEMETRY: TelemetryData = {
  network: {
    isConnected: null,
    isInternetReachable: null,
    type: null,
    isWifi: null,
    isCellular: null,
  },
  httpLatency: {
    value: null,
    measuredAt: null,
    source: null,
    state: 'unavailable',
    error: null,
  },
  publicIp: {
    value: null,
    measuredAt: null,
    source: null,
    state: 'unavailable',
    error: null,
  },
};

export function formatMetric<T>(metric: Metric<T>): string {
  switch (metric.state) {
    case 'ready':
      return String(metric.value);
    case 'measuring':
      return 'Ölçülüyor…';
    case 'error':
      return 'Ölçülemedi';
    default:
      return '—';
  }
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return `${Math.round(ms)} ms`;
}
