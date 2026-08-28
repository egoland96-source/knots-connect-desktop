import { create } from 'zustand';
import { bridgeService } from '../services/bridge/bridgeService';

export type DnsMode = 'local' | 'cloudflare';

interface DnsStoreState {
  mode: DnsMode;
  loading: boolean;
  setMode: (m: DnsMode) => Promise<void>;
  load: () => Promise<void>;
}

export const useDnsStore = create<DnsStoreState>()((set, get) => ({
  mode: 'local',
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const s: any = await (bridgeService as any).getSettings?.();
      if (s?.dnsMode === 'cloudflare' || s?.dnsMode === 'local') {
        set({ mode: s.dnsMode });
      } else {
        // localStorage fallback
        const ls = localStorage.getItem('knots:dnsMode') as DnsMode | null;
        if (ls === 'cloudflare' || ls === 'local') set({ mode: ls });
      }
    } finally {
      set({ loading: false });
    }
  },

  setMode: async (m) => {
    set({ mode: m });
    localStorage.setItem('knots:dnsMode', m);
    try {
      await (bridgeService as any).updateSetting?.('dnsMode', m);
    } catch {}
    // Go backend'e de bildir (ileride pkg/dns kullanacak)
    try {
      const w: any = window as any;
      if (w.knots?.setDnsMode) await w.knots.setDnsMode(m);
    } catch {}
  },
}));
