import React from 'react';
import { ShieldCheck, ShieldOff, Check } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { usePrivacyStore, categoryLabel, categoryDescription } from '../../store/privacyStore';
import { Toggle } from '../../components/ui';

const STATUS_COLORS = {
  active: '#2ED573',
  idle: '#94A3B8',
};

export const PrivacyProtectionPanel: React.FC = () => {
  const enabled = usePrivacyStore((s) => s.enabled);
  const setEnabled = usePrivacyStore((s) => s.setEnabled);
  const categories = usePrivacyStore((s) => s.categories);
  const toggleCategory = usePrivacyStore((s) => s.toggleCategory);
  const stats = usePrivacyStore((s) => s.stats);
  const initialized = usePrivacyStore((s) => s.initialized);

  const activeCount = (Object.values(categories) as boolean[]).filter(Boolean).length;

  return (
    <Card padding="var(--space-4)" style={{ marginTop: 'var(--space-3)' }}>
      {/* Başlık satırı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: enabled ? 'var(--success-subtle)' : 'rgba(255,255,255,0.05)',
            color: enabled ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          {enabled ? <ShieldCheck size={18} strokeWidth={2} /> : <ShieldOff size={18} strokeWidth={2} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Privacy Protection</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Local filtering engine — ads, trackers, malware &amp; phishing
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone={enabled ? 'success' : 'neutral'}>
            {enabled ? (initialized ? `Protection Active · ${activeCount}/4` : 'Loading…') : 'Off'}
          </Badge>
          <Toggle checked={enabled} onChange={() => setEnabled(!enabled)} />
        </div>
      </div>

      {/* Canlı istatistik özeti */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <MiniStat label="Ads" value={stats.adsBlocked} color="var(--accent)" />
        <MiniStat label="Trackers" value={stats.trackersBlocked} color="var(--warning)" />
        <MiniStat label="Malware" value={stats.malwareBlocked} color="var(--danger)" />
        <MiniStat label="Phishing" value={stats.phishingBlocked} color="var(--danger)" />
      </div>

      {/* Kategori toggle'ları */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {(Object.keys(categories) as (keyof typeof categories)[]).map((cat) => {
          const isOn = categories[cat];
          return (
            <div
              key={cat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 'var(--space-2) 0',
                borderTop: '1px solid var(--border-subtle)',
                opacity: enabled ? 1 : 0.55,
                transition: 'opacity 180ms var(--ease)',
              }}
            >
              <Check
                size={15}
                strokeWidth={2.5}
                color={isOn && enabled ? '#2ED573' : 'var(--text-muted)'}
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{categoryLabel[cat]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{categoryDescription[cat]}</div>
              </div>
              <Toggle
                checked={isOn && enabled}
                disabled={!enabled}
                onChange={() => toggleCategory(cat)}
                size="sm"
              />
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
        Local-only: kurallar ve istatistikler yalnızca bu cihazda tutulur; hiçbir telemetry/analytics gönderilmez.
      </div>
    </Card>
  );
};

const MiniStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div
    style={{
      padding: 'var(--space-2)',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--glass-card-border)',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 17, fontWeight: 700, color }}>{value.toLocaleString()}</div>
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>
      {label}
    </div>
  </div>
);

export default PrivacyProtectionPanel;