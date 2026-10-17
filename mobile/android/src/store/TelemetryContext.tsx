import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { NetInfoState } from '@react-native-community/netinfo';
import { INITIAL_TELEMETRY, type TelemetryData } from '../types/telemetry';
import {
  subscribeNetworkState,
  measureHttpLatency,
  fetchPublicIp,
  MEASUREMENT_TARGETS,
  MEASUREMENT_SOURCE_LABELS,
} from '../services/telemetry';

interface TelemetryContextValue {
  data: TelemetryData;
  refresh: () => void;
  isRefreshing: boolean;
}

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

/**
 * Ölçüm aralığı — 30 saniyede bir HTTP gecikmesi ve IP yeniden ölçülür
 */
const REFRESH_INTERVAL_MS = 30_000;

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TelemetryData>(INITIAL_TELEMETRY);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runMeasurements = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [latency, ip] = await Promise.all([
        measureHttpLatency(MEASUREMENT_TARGETS.ping, controller.signal),
        fetchPublicIp(MEASUREMENT_TARGETS.ip, controller.signal),
      ]);

      setData((prev) => ({
        ...prev,
        httpLatency: latency,
        publicIp: ip,
      }));
    } finally {
      setIsRefreshing(false);
      abortRef.current = null;
    }
  }, [isRefreshing]);

  const refresh = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    runMeasurements();
  }, [runMeasurements]);

  // Ağ durumu subscription'ı
  useEffect(() => {
    const unsubscribe = subscribeNetworkState((state: NetInfoState) => {
      setData((prev) => ({
        ...prev,
        network: {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          isWifi: state.type === 'wifi',
          isCellular: state.type === 'cellular',
        },
      }));
    });

    return unsubscribe;
  }, []);

  // İlk ölçüm — mount olduğunda
  useEffect(() => {
    runMeasurements();
  }, []);

  // Periyodik yeniden ölçüm
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      runMeasurements();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return (
    <TelemetryContext.Provider value={{ data, refresh, isRefreshing }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry, TelemetryProvider içinde kullanılmalıdır');
  }
  return ctx;
}
