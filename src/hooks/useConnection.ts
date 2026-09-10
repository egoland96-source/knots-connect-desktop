import { useCallback } from 'react';
import { useConnectionStore } from '../store/connectionStore';

/**
 * ConnectButton ve diğer UI bileşenlerinin store ile arasındaki tek giriş noktası.
 * Bileşenleri Zustand'ın implementasyon detaylarından izole eder.
 *
 * İki mod:
 *  - VPN  (engineMode !== 'go'): gerçek WireGuard tüneli (satın alınan sunucu).
 *    Başlat/Durdur = Windows WireGuard servisinin açılıp kapanması.
 *  - DPI  (engineMode === 'go'): yerel DPI bypass motoru (k_main.exe).
 */
export const useConnection = () => {
  const status = useConnectionStore((state) => state.status);
  const errorMessage = useConnectionStore((state) => state.errorMessage);
  const engineMode = useConnectionStore((state) => state.engineMode);
  const wgStatus = useConnectionStore((state) => state.wgStatus);
  const wgBusy = useConnectionStore((state) => state.wgBusy);
  const storeConnect = useConnectionStore((state) => state.connect);
  const storeDisconnect = useConnectionStore((state) => state.disconnect);
  const setWireGuard = useConnectionStore((state) => state.setWireGuard);

  const isVpnMode = engineMode !== 'go';
  // VPN modunda bağlılık WireGuard'ın gerçek durumundan gelir.
  const isConnected = isVpnMode ? !!wgStatus?.running : status === 'connected';

  const toggleConnection = useCallback(
    async (serverId?: string) => {
      if (isVpnMode) {
        // VPN modu → gerçek WireGuard tünelini aç/kapat
        if (wgBusy) return;
        if (wgStatus?.running) {
          await setWireGuard(false);
        } else {
          await setWireGuard(true);
        }
        return;
      }
      // DPI modu → yerel bypass motoru
      if (status === 'connected') {
        await storeDisconnect();
        return;
      }
      if (status === 'disconnected' || status === 'error') {
        await storeConnect(serverId);
      }
    },
    [isVpnMode, wgBusy, wgStatus, status, setWireGuard, storeConnect, storeDisconnect],
  );

  return { status, errorMessage, engineMode, toggleConnection, isConnected, isVpnMode };
};