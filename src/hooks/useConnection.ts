import { useCallback } from 'react';
import { useConnectionStore } from '../store/connectionStore';

/**
 * ConnectButton ve diğer UI bileşenlerinin store ile arasındaki tek giriş noktası.
 * Bileşenleri Zustand'ın implementasyon detaylarından izole eder.
 */
export const useConnection = () => {
  const status = useConnectionStore((state) => state.status);
  const errorMessage = useConnectionStore((state) => state.errorMessage);
  const engineMode = useConnectionStore((state) => state.engineMode);
  const storeConnect = useConnectionStore((state) => state.connect);
  const storeDisconnect = useConnectionStore((state) => state.disconnect);

  const toggleConnection = useCallback(
    async (serverId?: string) => {
      if (status === 'connected') {
        await storeDisconnect();
        return;
      }
      if (status === 'disconnected' || status === 'error') {
        await storeConnect(serverId);
      }
    },
    [status, storeConnect, storeDisconnect],
  );

  return { status, errorMessage, engineMode, toggleConnection };
};
