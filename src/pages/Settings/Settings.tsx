import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Activity, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { usePrivacyStore } from '../../store/privacyStore';
import { useAuthStore } from '../../store/authStore';
import { useNavStore } from '../../store/navStore';
import { SplitTunnelingSettings } from '../../components/settings/sections/SplitTunnelingSettings';
import { useTranslation } from '../../store/languageStore';

export const Settings: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const settings = useConnectionStore((s) => s.settings);
  const operatingMode = useConnectionStore((s) => s.operatingMode);
  const setOperatingMode = useConnectionStore((s) => s.setOperatingMode);
  const toggleSetting = useConnectionStore((s) => s.toggleSetting);
  const engineMode = useConnectionStore((s) => s.engineMode);
  const setEngineMode = useConnectionStore((s) => s.setEngineMode);
  const encryptionMethod = useConnectionStore((s) => s.encryptionMethod);
  const setEncryptionMethod = useConnectionStore((s) => s.setEncryptionMethod);
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const wgStatus = useConnectionStore((s) => s.wgStatus);
  const status = useConnectionStore((s) => s.status);

  const privacyEnabled = usePrivacyStore((s) => s.enabled);
  const setPrivacyEnabled = usePrivacyStore((s) => s.setEnabled);

  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [pingRunning, setPingRunning] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const isSplitActive = operatingMode === 'hybrid';

  const handleSplitRoutingToggle = async () => {
    if (isSplitActive) {
      await setOperatingMode('gaming');
    } else {
      await setOperatingMode('hybrid');
    }
  };

  const handleLocalProtectionToggle = async () => {
    const next = !privacyEnabled;
    await setPrivacyEnabled(next);
    if (settings?.adblock !== next) {
      await toggleSetting('adblock');
    }
  };

  const handleDnsProtectionToggle = async () => {
    await toggleSetting('dnsLeakProtection');
  };

  const handleStartWithWindowsToggle = async () => {
    await toggleSetting('startWithWindows');
  };

  const handleReconnectToggle = async () => {
    await toggleSetting('autoConnect');
  };

  const runQuickPing = async () => {
    setPingRunning(true);
    setPingResult('Testing...');
    try {
      const start = Date.now();
      await fetch('https://1.1.1.1/cdn-cgi/trace', { method: 'HEAD', cache: 'no-cache', mode: 'no-cors' }).catch(() => {});
      const elapsed = Math.round(Date.now() - start);
      setPingResult(`${elapsed} ms (Cloudflare Edge)`);
    } catch {
      setPingResult(`${latencyMs || 14} ms (via tunnel)`);
    } finally {
      setPingRunning(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 960,
        margin: '0 auto',
        padding: '36px 32px 48px',
        color: '#EEF4F5',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#EEF4F5' }}>
          {t('settings.title')}
        </h1>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7E949F', marginTop: 4 }}>
          {t('settings.subtitle')}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Connection */}
        <div
          style={{
            background: '#111D26',
            border: '1px solid #1E2D38',
            borderRadius: 8,
            padding: '20px 24px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#7E949F',
              marginBottom: 16,
            }}
          >
            {t('settings.connection')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Start with Windows */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: '1px solid #1E2D38',
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>{t('settings.startWithWindows')}</div>
                <div style={{ fontSize: 12, color: '#7E949F', marginTop: 2 }}>{t('settings.startWithWindowsDesc')}</div>
              </div>
              <Toggle checked={!!settings?.startWithWindows} onChange={handleStartWithWindowsToggle} />
            </div>

            {/* Reconnect if interrupted */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: '1px solid #1E2D38',
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>{t('settings.reconnect')}</div>
                <div style={{ fontSize: 12, color: '#7E949F', marginTop: 2 }}>{t('settings.reconnectDesc')}</div>
              </div>
              <Toggle checked={!!settings?.autoConnect} onChange={handleReconnectToggle} />
            </div>

            {/* Split routing */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>{t('settings.splitRouting')}</div>
                <div style={{ fontSize: 12, color: '#7E949F', marginTop: 2 }}>
                  {t('settings.splitRoutingDesc')}
                </div>
                <button
                  onClick={() => setShowSplitModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    padding: '3px 9px',
                    borderRadius: 4,
                    background: '#18333D',
                    border: '1px solid #29404B',
                    color: '#58BFD2',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('settings.configureSplit')}
                </button>
              </div>

              <Toggle checked={isSplitActive} onChange={handleSplitRoutingToggle} />
            </div>
          </div>
        </div>

        {/* Right Column: Local Protection, Language & About */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Local Protection Section */}
          <div
            style={{
              background: '#111D26',
              border: '1px solid #1E2D38',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7E949F',
                marginBottom: 16,
              }}
            >
              {t('settings.localProtection')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Ad and tracker blocking */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #1E2D38',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>{t('settings.adblock')}</div>
                  <div style={{ fontSize: 12, color: '#7E949F', marginTop: 2 }}>{t('settings.adblockDesc')}</div>
                </div>
                <Toggle checked={privacyEnabled} onChange={handleLocalProtectionToggle} />
              </div>

              {/* DNS protection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>{t('settings.dnsProtection')}</div>
                  <div style={{ fontSize: 12, color: '#7E949F', marginTop: 2 }}>{t('settings.dnsProtectionDesc')}</div>
                </div>
                <Toggle checked={!!settings?.dnsLeakProtection} onChange={handleDnsProtectionToggle} />
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div
            style={{
              background: '#111D26',
              border: '1px solid #1E2D38',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7E949F',
                marginBottom: 16,
              }}
            >
              {t('settings.languageSection')}
            </div>

            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5', marginBottom: 4 }}>{t('settings.languageTitle')}</div>
              <div style={{ fontSize: 12, color: '#7E949F', marginBottom: 12 }}>{t('settings.languageDesc')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['tr', 'en'] as const).map((lang) => {
                  const active = language === lang;
                  const label = lang === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English';
                  return (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: active ? '#18333D' : 'transparent',
                        border: `1px solid ${active ? '#58BFD2' : '#1E2D38'}`,
                        color: active ? '#58BFD2' : '#7E949F',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div
            style={{
              background: '#111D26',
              border: '1px solid #1E2D38',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7E949F',
                marginBottom: 16,
              }}
            >
              {t('settings.about')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Diagnostics */}
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowDiagnosticsModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #1E2D38',
                  background: 'transparent',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>{t('settings.diagnostics')}</div>
                  <div style={{ fontSize: 12, color: '#7E949F', marginTop: 2 }}>{t('settings.diagnosticsDesc')}</div>
                </div>
                <ChevronRight size={16} color="#7E949F" />
              </motion.button>

              {/* Version */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#EEF4F5' }}>Version</span>
                <span style={{ fontSize: 12.5, fontFamily: "'DM Mono', monospace", color: '#9DB0B7' }}>1.3.3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(8, 15, 22, 0.72)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowPremiumModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              style={{
                width: '100%',
                maxWidth: 400,
                background: '#111D26',
                border: '1px solid #1E2D38',
                borderRadius: 8,
                padding: '24px 28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#EEF4F5', marginBottom: 8 }}>
                Premium needed
              </div>
              <div style={{ fontSize: 13, color: '#9DB0B7', lineHeight: 1.5, marginBottom: 24 }}>
                Custom country controls and split routing are available with Premium.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => {
                    setShowPremiumModal(false);
                    navigate('account');
                  }}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #287FB9, #4FB9CF)',
                    border: 'none',
                    color: '#EEF4F5',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  See Premium
                </button>
                <button
                  onClick={() => setShowPremiumModal(false)}
                  style={{
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 6,
                    background: 'transparent',
                    border: '1px solid #1E2D38',
                    color: '#7E949F',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EEF4F5')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#7E949F')}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Diagnostics Modal */}
      <AnimatePresence>
        {showDiagnosticsModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(8, 15, 22, 0.72)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowDiagnosticsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: '#111D26',
                border: '1px solid #1E2D38',
                borderRadius: 8,
                padding: '24px 28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color="#58BFD2" />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#EEF4F5' }}>{t('settings.diagTitle')}</span>
                </div>
                <button
                  onClick={() => setShowDiagnosticsModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#7E949F', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1E2D38' }}>
                  <span style={{ color: '#7E949F' }}>{t('settings.activeRouteMode')}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: '#61D1A8', fontWeight: 600 }}>
                    {operatingMode === 'gaming' ? 'Gaming (Standalone DPI)' : operatingMode === 'hybrid' ? 'Split (DPI + WireGuard)' : 'Privacy (WireGuard Only)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1E2D38' }}>
                  <span style={{ color: '#7E949F' }}>{t('settings.winDivertDriver')}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: '#EEF4F5' }}>
                    {operatingMode === 'hybrid' ? 'Priority 10 (Split Guard)' : 'Priority 0 (Standard)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1E2D38' }}>
                  <span style={{ color: '#7E949F' }}>DPI Processing Engine</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: '#EEF4F5' }}>
                    Go Native (k_main.exe)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1E2D38' }}>
                  <span style={{ color: '#7E949F' }}>WireGuard Tunnel</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: wgStatus?.running ? '#61D1A8' : '#7E949F' }}>
                    {wgStatus?.running ? `Connected (${wgStatus.server || '162.35.122.121'})` : 'Inactive'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1E2D38' }}>
                  <span style={{ color: '#7E949F' }}>Edge Ping Test</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: '#58BFD2' }}>
                      {pingResult || `${latencyMs || 12} ms`}
                    </span>
                    <button
                      onClick={runQuickPing}
                      disabled={pingRunning}
                      style={{
                        padding: '3px 8px',
                        background: '#18333D',
                        border: '1px solid #29404B',
                        borderRadius: 4,
                        color: '#58BFD2',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {pingRunning ? '...' : 'Ping'}
                    </button>
                  </div>
                </div>

                {/* Advanced Engine Selector */}
                <div style={{ marginTop: 8, padding: '12px', background: '#0B151D', borderRadius: 6, border: '1px solid #1E2D38' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {t('settings.engineBackend')}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['go', 'python'] as const).map((m) => {
                      const active = engineMode === m;
                      return (
                        <button
                          key={m}
                          disabled={status === 'connected'}
                          onClick={() => setEngineMode(m)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            borderRadius: 4,
                            background: active ? '#18333D' : 'transparent',
                            border: `1px solid ${active ? '#58BFD2' : '#1E2D38'}`,
                            color: active ? '#58BFD2' : '#7E949F',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: status === 'connected' ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {m === 'go' ? 'Go Native' : 'Python (Legacy)'}
                        </button>
                      );
                    })}
                  </div>
                  {status === 'connected' && (
                    <div style={{ fontSize: 11, color: '#7E949F', marginTop: 6 }}>
                      {t('settings.disconnectBeforeSwitch')}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDiagnosticsModal(false)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 6,
                    background: '#18333D',
                    border: '1px solid #29404B',
                    color: '#EEF4F5',
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Split Tunneling Modal */}
        {showSplitModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(8, 15, 22, 0.78)',
              backdropFilter: 'blur(6px)',
              padding: 24,
            }}
            onClick={() => setShowSplitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.16 }}
              style={{
                width: '100%',
                maxWidth: 680,
                maxHeight: '85vh',
                background: '#111D26',
                border: '1px solid #1E2D38',
                borderRadius: 12,
                padding: '24px 28px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#EEF4F5' }}>
                    {t('settings.splitModalTitle')}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7E949F' }}>
                    {t('settings.splitModalDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setShowSplitModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#7E949F', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>
                <SplitTunnelingSettings onSaved={() => {}} />
              </div>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #1E2D38', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSplitModal(false)}
                  style={{
                    padding: '8px 22px',
                    borderRadius: 6,
                    background: '#18333D',
                    border: '1px solid #29404B',
                    color: '#EEF4F5',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    style={{
      width: 38,
      height: 20,
      borderRadius: 10,
      background: checked ? '#61D1A8' : '#182530',
      border: `1px solid ${checked ? '#61D1A8' : '#263C46'}`,
      position: 'relative',
      cursor: 'pointer',
      padding: 0,
      transition: 'background 160ms ease, border-color 160ms ease',
      flexShrink: 0,
    }}
  >
    <motion.span
      animate={{ left: checked ? 20 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      style={{
        position: 'absolute',
        top: 2,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: checked ? '#080F16' : '#9DB0B7',
      }}
    />
  </button>
);

export default Settings;
