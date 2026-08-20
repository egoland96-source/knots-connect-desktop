import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from './components/TopBar/TopBar';
import { Sidebar } from './components/Sidebar';
import type { PageKey } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Servers } from './pages/Servers/Servers';
import { Statistics } from './pages/Statistics/Statistics';
import { Settings } from './pages/Settings/Settings';
import { Account } from './pages/Account/Account';
import { AuthPage } from './components/auth/AuthPage';
import { VerifyEmailScreen } from './components/auth/VerifyEmailScreen';
import { ConnectionBorder } from './components/ConnectionBorder/ConnectionBorder';
import { useTelemetryInit } from './store/connectionStore';
import { useConnectionStore } from './store/connectionStore';
import { usePrivacyStore } from './store/privacyStore';
import { useAuthStore } from './store/authStore';
import { useNavStore } from './store/navStore';

type UpdateState = { status: 'downloading' | 'ready' | 'error'; version?: string; detail?: string } | null;

const PAGES: Record<PageKey, React.ComponentType> = {
  dashboard: Dashboard,
  servers: Servers,
  statistics: Statistics,
  settings: Settings,
  account: Account,
};

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export const App = () => {
  const activePage = useNavStore((s) => s.page);
  const navigate = useNavStore((s) => s.navigate);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [updateState, setUpdateState] = useState<UpdateState>(null);
  const ActivePageComponent = PAGES[activePage];
  const initTelemetry = useTelemetryInit();
  const initPrivacy = usePrivacyStore((s) => s.init);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    const unsubscribe = initTelemetry();
    useConnectionStore.getState().loadInitialSettings();
    return () => unsubscribe();
  }, [initTelemetry]);

  // Privacy Protection motorunu (filtre listeleri + cache) tek seferde başlat
  useEffect(() => {
    initPrivacy();
  }, [initPrivacy]);

  // Abonelik planını privacy motoruna yansıt (pro listeleri). Auth sonrası çalışır.
  useEffect(() => {
    const isPaid = !!user && user.id !== 'guest' && user.subscriptionType !== 'free';
    const plan = isPaid ? 'pro' : 'free';
    usePrivacyStore.getState().setPlan(plan);
    if (user && user.id !== 'guest') {
      void usePrivacyStore.getState().syncServerLists();
    }
  }, [user]);

  // Otomatik güncelleme durumunu dinle (paketli sürümde aktif)
  useEffect(() => {
    const unsubscribe = window.knots?.onUpdateStatus?.((info) => setUpdateState(info));
    return () => unsubscribe?.();
  }, []);

  // Run restoreSession ONLY ONCE on app startup
  useEffect(() => {
    let cancelled = false;
    restoreSession().then(() => {
      if (cancelled) return;
      const currentAuth = useAuthStore.getState().isAuthenticated;
      setAuthState(currentAuth ? 'authenticated' : 'unauthenticated');
    }).catch((err) => {
      if (!cancelled) {
        setAuthState('unauthenticated');
      }
    });
    return () => { cancelled = true; };
  }, [restoreSession]);

  // Sync authState with isAuthenticated changes (login, guest login, logout)
  useEffect(() => {
    if (!initialized) return;
    setAuthState(isAuthenticated ? 'authenticated' : 'unauthenticated');
  }, [isAuthenticated, initialized]);

  if (authState === 'loading') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-secondary, #7C8CA3)', fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AuthPage />;
  }

  if (user && !user.emailVerified && !accessToken?.startsWith('guest_')) {
    return <VerifyEmailScreen />;
  }

  return (
    <div className="app-shell">
      <AnimatePresence mode="wait">
        <motion.div
          key="app"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <TopBar />
          {updateState && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                background: 'linear-gradient(90deg, rgba(28,200,255,0.12), rgba(14,143,214,0.08))',
                borderBottom: '1px solid rgba(28,200,255,0.25)',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                {updateState.status === 'downloading' && `Downloading update v${updateState.version}…`}
                {updateState.status === 'ready' && `Update v${updateState.version} ready — restart to install.`}
                {updateState.status === 'error' &&
                  `Update check failed${updateState.detail ? `: ${updateState.detail}` : ''} — please try again later.`}
              </span>
              {updateState.status === 'ready' && (
                <button
                  onClick={() => window.knots?.installUpdate?.()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--accent)',
                    color: 'var(--text-inverse)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Restart & Install
                </button>
              )}
            </div>
          )}
          <div className="app-body">
            <Sidebar activePage={activePage} onNavigate={navigate} />
            <main className="app-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <ActivePageComponent />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </motion.div>
      </AnimatePresence>
      <ConnectionBorder />
    </div>
  );
};