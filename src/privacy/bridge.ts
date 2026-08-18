import type { PrivacyBridge } from './lists/FilterListCache';
import { FilterListManager } from './lists/FilterListManager';
import { PrivacyFilterEngine } from './engine/PrivacyFilterEngine';

/**
 * Electron main process ile (CORS'suz net.fetch + disk cache) haberleşen
 * Privacy Bridge implementasyonu. window.knots.privacy yoksa (tarayıcı/dev)
 * güvenli biçimde boş/hazır sürüme düşer; uygulama yine de çalışır.
 */
export interface PrivacyBridgeInstance {
  bridge: PrivacyBridge;
  manager: FilterListManager;
  engine: PrivacyFilterEngine;
}

function bridgeFromWindow(): PrivacyBridge {
  const w = typeof window !== 'undefined' ? (window as any).knots?.privacy : undefined;
  if (!w) {
    return { fetchListUrl: undefined, cacheWrite: undefined, cacheRead: undefined, cacheRemove: undefined };
  }
  return {
    fetchListUrl: w.fetchList ? (url: string) => w.fetchList(url) : undefined,
    cacheWrite: w.cacheWrite ? (name, content) => w.cacheWrite(name, content) : undefined,
    cacheRead: w.cacheRead ? (name: string) => w.cacheRead(name) : undefined,
    cacheRemove: w.cacheRemove ? (name: string) => w.cacheRemove(name) : undefined,
  };
}

export function createPrivacyBridge(): PrivacyBridge {
  return bridgeFromWindow();
}

export function createPrivacyManager(): FilterListManager {
  return new FilterListManager(bridgeFromWindow());
}

export function createPrivacyEngine(manager?: FilterListManager): PrivacyFilterEngine {
  return new PrivacyFilterEngine(manager ?? createPrivacyManager());
}

export function createPrivacyEngineInstance(): PrivacyBridgeInstance {
  const bridge = createPrivacyBridge();
  const manager = new FilterListManager(bridge);
  const engine = new PrivacyFilterEngine(manager);
  return { bridge, manager, engine };
}