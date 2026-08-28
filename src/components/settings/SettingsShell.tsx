import React, { useState } from 'react';
import { SettingsCategoryNav } from './SettingsCategoryNav';
import type { SettingsCategory } from '../../types/settings';
import { ConnectionSettings } from './sections/ConnectionSettings';
import { SecuritySettings } from './sections/SecuritySettings';
import { LocalProtectionSettings } from './sections/LocalProtectionSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { AdvancedSettings } from './sections/AdvancedSettings';

export const SettingsShell: React.FC = () => {
  const [active, setActive] = useState<SettingsCategory>('connection');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1080,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ padding: '4px 2px 0' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#F8FAFC' }}>Settings</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>Tune your shield and connection preferences — changes save automatically.</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px minmax(0,1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            padding: 10,
            borderRadius: 16,
            background: '#111928',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
            position: 'sticky',
            top: 16,
          }}
        >
          <SettingsCategoryNav active={active} onSelect={setActive} />
        </div>

        <div
          style={{
            minWidth: 0,
            padding: 18,
            borderRadius: 16,
            background: 'rgba(17,25,40,0.68)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.32)',
            minHeight: 520,
          }}
        >
          {active === 'connection' && <ConnectionSettings onSaved={() => showToast('✓ Preferences saved')} />}
          {active === 'security' && <SecuritySettings onSaved={() => showToast('✓ Preferences saved')} />}
          {active === 'local-protection' && <LocalProtectionSettings onSaved={() => showToast('✓ Preferences saved')} />}
          {active === 'appearance' && <AppearanceSettings onSaved={() => showToast('✓ Preferences saved')} />}
          {active === 'advanced' && <AdvancedSettings onSaved={() => showToast('✓ Preferences saved')} />}
        </div>
      </div>

      {/* Toast — sağ üstte sakin bildirim */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 60,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(17,25,40,0.92)',
            border: '1px solid rgba(52,211,153,0.28)',
            color: '#34D399',
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.02em',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default SettingsShell;
