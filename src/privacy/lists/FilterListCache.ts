/**
 * Offline cache — filtrelis listelerinin ham içeriğini disk üzerinde tutar.
 * Electron main process ile (CORS'suz, net.fetch) haberleşir; internet olmasa
 * bile son çekilen sürüm kullanılabilir.
 */
export interface CacheEntry {
  content: string;
  sizeBytes: number;
}

export interface PrivacyBridge {
  fetchListUrl?: (url: string) => Promise<{ ok: boolean; content?: string; error?: string }>;
  cacheWrite?: (name: string, content: string) => Promise<{ ok: boolean }>;
  cacheRead?: (name: string) => Promise<string | null>;
  cacheRemove?: (name: string) => Promise<{ ok: boolean }>;
}

const LIST_EXTENSION = '.txt';

export class FilterListCache {
  private bridge: PrivacyBridge;

  constructor(bridge: PrivacyBridge) {
    this.bridge = bridge;
  }

  private fileName(listId: string): string {
    return `${encodeURIComponent(listId)}${LIST_EXTENSION}`;
  }

  async read(listId: string): Promise<CacheEntry | null> {
    if (!this.bridge.cacheRead) return null;
    try {
      const content = await this.bridge.cacheRead(this.fileName(listId));
      if (!content) return null;
      return { content, sizeBytes: content.length };
    } catch {
      return null;
    }
  }

  async write(listId: string, content: string): Promise<boolean> {
    if (!this.bridge.cacheWrite) return false;
    try {
      const res = await this.bridge.cacheWrite(this.fileName(listId), content);
      return res?.ok ?? false;
    } catch {
      return false;
    }
  }

  async remove(listId: string): Promise<boolean> {
    if (!this.bridge.cacheRemove) return false;
    try {
      const res = await this.bridge.cacheRemove(this.fileName(listId));
      return res?.ok ?? false;
    } catch {
      return false;
    }
  }

  /** Liste içeriğini main process üzerinden indirir (CORS'suz). */
  async download(url: string): Promise<CacheEntry | null> {
    if (!this.bridge.fetchListUrl) return null;
    try {
      const res = await this.bridge.fetchListUrl(url);
      if (!res?.ok || !res.content) return null;
      return { content: res.content, sizeBytes: res.content.length };
    } catch {
      return null;
    }
  }
}