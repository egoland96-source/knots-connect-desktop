/**
 * Gerçek telemetri servis katmanı
 * 
 * Bu servis yalnızca cihazın gerçek ağ durumunu ve HTTP ölçümlerini sağlar.
 * Gerçek VPN tünel telemetrisi (tünelden geçen baytlar, bağlantı süresi)
 * native VPN motoru gerektirir ve burada ölçülmez.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { Metric } from '../types/telemetry';

/**
 * Ölçüm hedefleri
 * 
 * NOT: Bunlar gerçek ölçüm noktalarıdır. Kendi Knots sunucunuzu 
 * API_URL / PING_URL olarak tanımladığınızda bu değerlerle değiştirin.
 * Gizlilik uygulamasında habersiz üçüncü taraf yoklaması yapılmaz —
 * ölçüm hedefi kullanıcıya gösterilir.
 */
export const MEASUREMENT_TARGETS = {
  /** HTTP gecikmesi ölçümü için kullanılan sunucu */
  ping: 'https://www.cloudflare.com/cdn-cgi/trace',
  /** Genel IP ölçümü için kullanılan servis */
  ip: 'https://api.ipify.org?format=json',
} as const;

/**
 * Ölçüm hedefinin arayüzde gösterilecek adı
 */
export const MEASUREMENT_SOURCE_LABELS = {
  ping: 'Cloudflare trace endpoint',
  ip: 'ipify.org',
} as const;

/**
 * Cihazın gerçek ağ durumunu döndürür
 * NetInfo — VPN bağlantısının kanıtı değildir
 */
export function getCurrentNetworkState() {
  return NetInfo.fetch();
}

/**
 * NetInfo durumunu izlemek için subscription döndürür
 */
export function subscribeNetworkState(
  callback: (state: NetInfoState) => void
) {
  return NetInfo.addEventListener(callback);
}

/**
 * Belirlenen sunucuya HTTP gecikmesi ölçer
 * ICMP ping değildir — HTTP istek/yanıt süresidir
 * 
 * @param endpoint Ölçüm yapılacak sunucu
 * @param signal İptal sinyali
 * @param timeoutMs Zaman aşımı (varsayılan 5s)
 */
export async function measureHttpLatency(
  endpoint: string = MEASUREMENT_TARGETS.ping,
  signal?: AbortSignal,
  timeoutMs: number = 5000
): Promise<Metric<number>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Dış sinyal varsa onu da dinle
  const externalSignal = signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      return {
        value: null,
        measuredAt: null,
        source: MEASUREMENT_SOURCE_LABELS.ping,
        state: 'error',
        error: 'İptal edildi',
      };
    }
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Yanıt gövdesini oku — ölçümün yanıt noktasını netleştirir
    await response.text();
    
    const latency = Date.now() - startTime;
    
    return {
      value: latency,
      measuredAt: startTime,
      source: MEASUREMENT_SOURCE_LABELS.ping,
      state: 'ready',
      error: null,
    };
  } catch (err: any) {
    const message = err.name === 'AbortError' 
      ? 'Zaman aşımı' 
      : err.message || 'Ölçülemedi';
    
    return {
      value: null,
      measuredAt: null,
      source: MEASUREMENT_SOURCE_LABELS.ping,
      state: 'error',
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Genel IP adresini ölçer
 * Ölçüm sunucusunun gördüğü IP'tir — tek başına VPN koruması kanıtı değildir
 */
export async function fetchPublicIp(
  endpoint: string = MEASUREMENT_TARGETS.ip,
  signal?: AbortSignal,
  timeoutMs: number = 5000
): Promise<Metric<string>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      return {
        value: null,
        measuredAt: null,
        source: MEASUREMENT_SOURCE_LABELS.ip,
        state: 'error',
        error: 'İptal edildi',
      };
    }
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ip) {
      throw new Error('IP alanı bulunamadı');
    }
    
    return {
      value: data.ip,
      measuredAt: Date.now(),
      source: MEASUREMENT_SOURCE_LABELS.ip,
      state: 'ready',
      error: null,
    };
  } catch (err: any) {
    const message = err.name === 'AbortError' 
      ? 'Zaman aşımı' 
      : err.message || 'Ölçülemedi';
    
    return {
      value: null,
      measuredAt: null,
      source: MEASUREMENT_SOURCE_LABELS.ip,
      state: 'error',
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Tüm telemetri ölçümlerini çalıştırır
 */
export async function runAllMeasurements(
  signal?: AbortSignal
): Promise<{
  latency: Metric<number>;
  ip: Metric<string>;
}> {
  const [latency, ip] = await Promise.all([
    measureHttpLatency(MEASUREMENT_TARGETS.ping, signal),
    fetchPublicIp(MEASUREMENT_TARGETS.ip, signal),
  ]);
  
  return { latency, ip };
}
