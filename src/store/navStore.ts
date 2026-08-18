import { create } from 'zustand';
import type { PageKey } from '../components/Sidebar';

interface NavState {
  page: PageKey;
  navigate: (page: PageKey) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  page: 'dashboard',
  navigate: (page) => set({ page }),
}));