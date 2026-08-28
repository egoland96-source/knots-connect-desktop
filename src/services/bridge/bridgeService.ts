import type { ConnectResult, DisconnectResult, EngineMode, EngineStatus } from './bridgeService.types';

/**
 * DPI bypass motoru (k_main.py) ile konuşan servis katmanı.
 *
 * ÖNEMLİ: Bu dosya artık axios/HTTP KULLANMAZ. Tüm istekler Electron
 * preload'unun (electron/preload.cjs) window.knots altında açtığı IPC
 * fonksiyonları üzerinden main process'e gider.
 */
export const bridgeService = {
  /** Motoru tetikleyip bağlantıyı başlatır. */
  connect: async (serverId?: string): Promise<ConnectResult> => {
    return window.knots.connect(serverId);
  },

  /** Aktif bağlantıyı sonlandırır. */
  disconnect: async (): Promise<DisconnectResult> => {
    return window.knots.disconnect();
  },

  /** Motorun anlık durumunu sorgular. */
  getStatus: async (): Promise<EngineStatus> => {
    const data = await window.knots.getStatus();
    // Güvenlik koruması: data veya data.state boş gelirse arayüzün RETRY döngüsüne girmemesi için fallback değerler üretilir.
    return {
      state: data?.state ?? 'disconnected',
      serverId: data?.server_id ?? null,
      latencyMs: data?.latency_ms ?? null,
      engineMode: data?.engine_mode ?? 'python', // Backend'den gelen snake_case alan camelCase'e dönüştürülüyor
      encryptionMethod: data?.encryption_method ?? 1, // Çoklu şifreleme senkronizasyonu
      uptimeSeconds: data?.uptime_seconds ?? null,
      bypassCount: data?.bypass_count ?? 0,
      bytesReceived: data?.bytes_received ?? 0,
      bytesSent: data?.bytes_sent ?? 0,
      packetsReceived: data?.packets_received ?? 0,
      packetsSent: data?.packets_sent ?? 0,
    };
  },

  /** Aktif motor backend'ini (python | cpp) sorgular. */
  getEngineMode: async (): Promise<EngineMode> => {
    const result = await window.knots.getEngineMode();
    // Eğer gelen veri nesne biçimindeyse ({ mode: 'python' }) içinden mode ayıklanır, yoksa düz string kabul edilir.
    return result && typeof result === 'object' ? result.mode : result;
  },

  /** Motor backend'ini değiştirir (motor çalışırken değiştirilemez). */
  setEngineMode: async (mode: EngineMode): Promise<any> => {
    const result = await window.knots.setEngineMode(mode);
    // React Store'un (Zustand/Redux vb.) state güncellemesini tetikleyebilmesi için backend yanıtı yukarı fırlatılır.
    return result;
  },

  // =========================================================================
  // CANLI AKIŞ VE AYAR ENTEGRASYONLARI
  // =========================================================================

  /** Arka plandan (Python/Electron) akan canlı telemetri verilerini dinler. */
  onTelemetry: (callback: (data: any) => void): (() => void) => {
    if (window.knots && typeof window.knots.onTelemetry === 'function') {
      return window.knots.onTelemetry(callback);
    }
    return () => {}; // Fallback abonelik iptal fonksiyonu
  },

  /** Kayıtlı konfigürasyonu Python/Backend katmanından çeker. */
  getSettings: async (): Promise<Record<string, any> | null> => {
    if (window.knots && typeof window.knots.getSettings === 'function') {
      return window.knots.getSettings();
    }
    return null;
  },

  /** Değiştirilen tekil bir ayarı arka plana kaydeder. */
  updateSetting: async (key: string, value: any): Promise<void> => {
    if (window.knots && typeof window.knots.updateSetting === 'function') {
      return window.knots.updateSetting(key, value);
    }
  },

  /** Aktif DPI tekniklerini backend'e iletir. */
  setDpiTechniques: async (techniques: string[]): Promise<any> => {
    if (window.knots && typeof window.knots.setDpiTechniques === 'function') {
      return window.knots.setDpiTechniques(techniques);
    }
  },

  // =========================================================================
  // YENİ: ÇOKLU ŞİFRELEME YÖNTEMİ IPC ENTEGRASYONLARI
  // =========================================================================

  /** Aktif olan şifreleme yönteminin ID'sini sorgular. */
  getEncryptionMethod: async (): Promise<number> => {
    if (window.knots && typeof window.knots.getEncryptionMethod === 'function') {
      const result = await window.knots.getEncryptionMethod();
      return result && typeof result === 'object' ? result.method_id : result;
    }
    return 1;
  },

  /** Arayüzden seçilen çoklu şifreleme yöntem kimliğini (1: XOR, 2: Swap vb.) kaydeder. */
  setEncryptionMethod: async (methodId: number): Promise<any> => {
    if (window.knots && typeof window.knots.setEncryptionMethod === 'function') {
      return window.knots.setEncryptionMethod(methodId);
    }
  },
};
