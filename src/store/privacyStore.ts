import { create } from 'zustand';
import type {
  BlockCategory,
  FilterDecision,
  FilterDecisionResult,
  FilterEngineStats,
  FilterListMeta,
  PrivacyEvent,
  DataSavedDay,
} from '../privacy';
import { createPrivacyEngineInstance, emptyStats, bytesSavedForCategory, loadHistory, recordBlock, clearHistory } from '../privacy';
import { API_BASE } from '../config/apiEndpoint';

export type CategoryToggle = 'ads' | 'tracker' | 'malware' | 'phishing';

interface ObservedView {
  domain: string;
  score: number;
  level: number;
}

interface PrivacyStoreState {
  initialized: boolean;
  loading: boolean;

  // Usta açma/kapama
  enabled: boolean;

  // Abonelik planı (pro listeler için)
  plan: 'free' | 'pro';

  // Kategori toggle'ları
  categories: Record<CategoryToggle, boolean>;

  // Filtre listeleri
  lists: FilterListMeta[];
  listUpdating: string | null;
  lastListError: string | null;

  // Custom kurallar
  customCount: number;
  whitelistCount: number;

  // İstatistik
  stats: FilterEngineStats;
  events: PrivacyEvent[];
  observed: ObservedView[];

  // Günlük veri kazancı geçmişi (kalıcı)
  history: DataSavedDay[];

  // Son karar (UI gösterimi için)
  lastDecision: FilterDecisionResult | null;

  init: () => Promise<void>;
  setEnabled: (v: boolean) => void;
  toggleCategory: (cat: CategoryToggle) => void;
  decide: (domain: string) => FilterDecisionResult;
  observeExternal: (domain: string, score: number) => void;
  addCustom: (domain: string) => Promise<boolean>;
  removeCustom: (domain: string) => Promise<void>;
  addWhitelist: (domain: string) => Promise<boolean>;
  removeWhitelist: (domain: string) => Promise<void>;
  userDecision: (domain: string, action: 'block' | 'allow' | 'ignore') => Promise<void>;
  refreshCustom: () => Promise<void>;
  updateList: (id: string) => Promise<void>;
  updateAll: () => Promise<void>;
  toggleList: (id: string, enabled: boolean) => Promise<void>;
  setPlan: (plan: 'free' | 'pro') => Promise<void>;
  syncServerLists: () => Promise<void>;
  resetStats: () => void;
  getEngine: () => ReturnType<typeof createPrivacyEngineInstance>['engine'];
}

const CATEGORY_ORDER: CategoryToggle[] = ['ads', 'tracker', 'malware', 'phishing'];

export const usePrivacyStore = create<PrivacyStoreState>()((set, get) => {
  const instance = createPrivacyEngineInstance();
  const engine = instance.engine;
  const manager = instance.manager;

  return {
    initialized: false,
    loading: false,
    enabled: true,
    plan: 'free',
    categories: { ads: true, tracker: true, malware: true, phishing: true },
    lists: [],
    listUpdating: null,
    lastListError: null,
    customCount: 0,
    whitelistCount: 0,
    stats: emptyStats(),
    events: [],
    observed: [],
    history: [],
    lastDecision: null,

    init: async () => {
      if (get().initialized) return;
      set({ loading: true });

      engine.setListManager(manager);
      engine.listenObserved((domain: string, score: number, level: number) => {
        set((s) => ({
          observed: [{ domain, score, level }, ...s.observed.filter((o) => o.domain !== domain)].slice(0, 30),
        }));
      });

      manager.setOnMetaChange((lists: FilterListMeta[]) => set({ lists }));
      await engine.initLocal();
      await manager.initAll();
      await get().refreshCustom();

      set({ initialized: true, loading: false, history: loadHistory() });
    },

    setEnabled: (v) => set({ enabled: v, categories: v ? { ads: true, tracker: true, malware: true, phishing: true } : { ads: false, tracker: false, malware: false, phishing: false } }),

    toggleCategory: (cat) => set((s) => ({ categories: { ...s.categories, [cat]: !s.categories[cat] } })),

    decide: (domain) => {
      const { enabled, categories, history } = get();
      if (!enabled || !domain) {
        return { decision: 'allow' };
      }
      // Açık kategorileri engine'e ilet; kapalı kategori asla blok kaydetmez.
      const enabledCats = (Object.keys(categories) as CategoryToggle[]).filter((c) => categories[c]);
      const result = engine.decide(domain, { enabledCategories: enabledCats });
      const nextHistory = result.decision === 'block' && result.category
        ? recordBlock(history, 1, bytesSavedForCategory(result.category))
        : history;
      set((s) => ({
        lastDecision: result,
        stats: engine.getStats(),
        events: engine.getEvents(),
        history: nextHistory,
      }));
      return result;
    },

    observeExternal: (domain: string, score: number) => {
      const result = engine.decide(domain);
      engine.listenObserved((d: string, sc: number, level: number) => {
        if (d === domain) {
          set((s) => ({ observed: [{ domain: d, score: sc, level }, ...s.observed.filter((o) => o.domain !== d)].slice(0, 30) }));
        }
      });
      set((s) => {
        const nextHistory = result.decision === 'block' && result.category
          ? recordBlock(s.history, 1, bytesSavedForCategory(result.category))
          : s.history;
        return {
          observed: [{ domain, score, level: (score >= 60 ? 2 : score >= 30 ? 1 : 0) as 0 | 1 | 2 | 3 }, ...s.observed.filter((o) => o.domain !== domain)].slice(0, 30),
          history: nextHistory,
        };
      });
    },

    userDecision: async (domain, action) => {
      await engine.userDecision(domain, action);
      set({ lastDecision: null });
      await get().refreshCustom();
      await engine.persist();
    },

    addCustom: async (domain) => {
      const ok = await engine.customBlacklist.add(domain);
      if (ok) {
        await engine.persist();
        await get().refreshCustom();
      }
      return ok;
    },

    removeCustom: async (domain) => {
      await engine.customBlacklist.remove(domain);
      await engine.persist();
      await get().refreshCustom();
    },

    addWhitelist: async (domain) => {
      const ok = await engine.whitelist.add(domain);
      if (ok) {
        await engine.persist();
        await get().refreshCustom();
      }
      return ok;
    },

    removeWhitelist: async (domain) => {
      await engine.whitelist.remove(domain);
      await engine.persist();
      await get().refreshCustom();
    },

    refreshCustom: async () => {
      set({
        customCount: engine.customBlacklist.size,
        whitelistCount: engine.whitelist.size,
        stats: engine.getStats(),
        events: engine.getEvents(),
      });
    },

    updateList: async (id) => {
      set({ listUpdating: id, lastListError: null });
      try {
        await manager.updateList(id);
      } catch (e) {
        set({ lastListError: (e as Error).message });
      } finally {
        set({ listUpdating: null });
      }
      set({ lists: manager.getLists() });
    },

    updateAll: async () => {
      set({ listUpdating: '__all__', lastListError: null });
      try {
        await manager.updateAll();
      } catch (e) {
        set({ lastListError: (e as Error).message });
      } finally {
        set({ listUpdating: null });
      }
      set({ lists: manager.getLists() });
    },

    toggleList: async (id, enabled) => {
      if (enabled) {
        await manager.enableList(id);
      } else {
        await manager.disableList(id);
      }
      set({ lists: manager.getLists() });
    },

    setPlan: async (plan) => {
      manager.setPlan(plan);
      set({ plan });
      if (plan === 'pro') {
        // Pro listeleri etkinleştir ve arka planda güncelle.
        for (const l of manager.getLists()) {
          if (l.pro && !(manager.getList(l.id)?.ready)) {
            void get().updateList(l.id);
          }
        }
      }
      set({ lists: manager.getLists() });
    },

    syncServerLists: async () => {
      try {
        const token = await window.knotsAuth?.getToken();
        // Zero-knowledge Knots IDs (knots_*) ve guest hesaplar backend'e gitmez — lokal liste yeterli
        if (!token || token.startsWith('guest_') || token.startsWith('knots_')) return;
        const res = await fetch(`${API_BASE}/api/v1/lists`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        const data = body?.data as { lists?: { id: string; name: string; url: string; category: string; pro?: boolean }[] } | null;
        if (!data?.lists) return;
        for (const entry of data.lists) {
          const cat = (['ads', 'tracker', 'malware', 'phishing'] as const).find((c) => c === entry.category);
          if (!cat || !entry.url) continue;
          manager.addRemoteList({
            id: entry.id,
            name: entry.name,
            url: entry.url,
            category: cat,
            enabled: false,
            lastUpdated: null,
            ruleCount: 0,
            version: null,
            checksum: null,
            sizeBytes: 0,
            builtIn: false,
            pro: !!entry.pro,
          });
        }
        manager.setPlan(get().plan ?? 'free');
        set({ lists: manager.getLists() });
      } catch {
        // sunucu erişilemezse lokal katalog yeterli
      }
    },

    resetStats: () => {
      engine.resetStats();
      clearHistory();
      set({ stats: emptyStats(), events: [], observed: [], history: [] });
      engine.persist();
    },

    getEngine: () => engine,
  };
});

export type { PrivacyEvent, FilterDecisionResult, FilterEngineStats, FilterListMeta, BlockCategory, FilterDecision };

export const categoryLabel: Record<CategoryToggle, string> = {
  ads: 'Ads',
  tracker: 'Trackers',
  malware: 'Malware',
  phishing: 'Phishing',
};

export const categoryDescription: Record<CategoryToggle, string> = {
  ads: 'Block ad domains, banners and ad scripts',
  tracker: 'Block analytics, pixels and fingerprinting',
  malware: 'Block malware and malicious distribution',
  phishing: 'Block phishing and scam domains',
};
