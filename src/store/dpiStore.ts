import { create } from 'zustand';
import { bridgeService } from '../services/bridge/bridgeService';

export type DpiTechnique = 
  | 'sni-split' | 'ttl-fake' | 'out-of-order' 
  | 'header-swap' | 'window-limit' | 'rst-filter' 
  | 'split-wire' | 'zero-cipher';

interface DpiStore {
  activeTechniques: DpiTechnique[];
  toggleTechnique: (tech: DpiTechnique) => void;
  getFlags: () => string[];
}

export const useDpiStore = create<DpiStore>((set, get) => ({
  activeTechniques: ['sni-split'],
  toggleTechnique: (tech) => {
    set((state) => {
      const isCurrentlyActive = state.activeTechniques.includes(tech);
      const newTechniques = isCurrentlyActive
        ? state.activeTechniques.filter((t) => t !== tech)
        : [...state.activeTechniques, tech];
      
      // Update IPC
      bridgeService.setDpiTechniques(newTechniques);

      return {
        activeTechniques: newTechniques,
      };
    });
  },
  getFlags: () => get().activeTechniques.map((t) => `--${t}`),
}));
