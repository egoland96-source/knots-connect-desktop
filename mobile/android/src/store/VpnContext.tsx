import React, { createContext, useContext, useState } from 'react';
import type { VpnStatus } from '../types/telemetry';

interface VpnContextValue {
  status: VpnStatus;
  connect: () => void;
  disconnect: () => void;
}

const VpnContext = createContext<VpnContextValue | undefined>(undefined);

/**
 * VPN durumu
 * 
 * ÖNEMLİ: Bu prototipte gerçek VPN motoru yoktur.
 * Uygulama 'disconnected' durumda başlar; gerçek native VPN motoru 
 * entegre edilene kadar bu state yalnızca UI gösterimidir.
 * Native modül olmadan gerçek tünel açılamaz (Expo Go sınırlaması).
 */
export function VpnProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VpnStatus>('disconnected');

  const connect = () => {
    setStatus('connecting');
    // Gerçek VPN motoru entegre edilene kadar mock bağlantı
    setTimeout(() => setStatus('connected'), 1500);
  };

  const disconnect = () => {
    setStatus('disconnected');
  };

  return (
    <VpnContext.Provider value={{ status, connect, disconnect }}>
      {children}
    </VpnContext.Provider>
  );
}

export function useVpn() {
  const ctx = useContext(VpnContext);
  if (!ctx) {
    throw new Error('useVpn, VpnProvider içinde kullanılmalıdır');
  }
  return ctx;
}
