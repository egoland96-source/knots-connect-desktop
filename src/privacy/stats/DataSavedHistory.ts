/**
 * Veri kazancı geçmişi — engellenen istekleri ve tahmini tasarrufu günlük
 * bucket'larda localStorage'da tutar (basit JSON, Electron'da kalıcı).
 * Günlük / haftalık / aylık kırılım buradan beslenir.
 */

export interface DataSavedDay {
  date: string;
  blocked: number;
  bytes: number;
}

const STORAGE_KEY = 'knots.dataSaved.v1';
const MAX_DAYS = 90;

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function loadHistory(): DataSavedDay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d) => d && typeof d.date === 'string' && typeof d.blocked === 'number')
      .slice(-MAX_DAYS);
  } catch {
    return [];
  }
}

function saveHistory(history: DataSavedDay[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_DAYS)));
  } catch {
    // sessizce geç
  }
}

/** Bugünün bucket'ına bir blok kaydı ekler. */
export function recordBlock(history: DataSavedDay[], blocked: number, bytes: number): DataSavedDay[] {
  const key = todayKey();
  const idx = history.findIndex((d) => d.date === key);
  let next: DataSavedDay[];
  if (idx === -1) {
    next = [...history, { date: key, blocked, bytes }];
  } else {
    next = history.map((d, i) => (i === idx ? { ...d, blocked: d.blocked + blocked, bytes: d.bytes + bytes } : d));
  }
  saveHistory(next);
  return next.slice(-MAX_DAYS);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessizce geç
  }
}

/** Son `days` güne ait bucket'ları döndürür (en eskiden en yeniye). */
export function sliceDays(history: DataSavedDay[], days: number): DataSavedDay[] {
  return history.slice(-days);
}

export function sumRange(history: DataSavedDay[], days: number): { blocked: number; bytes: number } {
  return sliceDays(history, days).reduce(
    (acc, d) => ({ blocked: acc.blocked + d.blocked, bytes: acc.bytes + d.bytes }),
    { blocked: 0, bytes: 0 },
  );
}