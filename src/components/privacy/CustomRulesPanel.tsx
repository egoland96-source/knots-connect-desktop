import React, { useState } from 'react';
import { Shield, ShieldOff, Plus, X } from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { usePrivacyStore } from '../../store/privacyStore';
import { getEngineCustomDomains } from './customDomains';

export const CustomRulesPanel: React.FC = () => {
  const customCount = usePrivacyStore((s) => s.customCount);
  const whitelistCount = usePrivacyStore((s) => s.whitelistCount);
  const addCustom = usePrivacyStore((s) => s.addCustom);
  const addWhitelist = usePrivacyStore((s) => s.addWhitelist);
  const removeCustom = usePrivacyStore((s) => s.removeCustom);
  const removeWhitelist = usePrivacyStore((s) => s.removeWhitelist);
  const refreshCustom = usePrivacyStore((s) => s.refreshCustom);

  const [tab, setTab] = useState<'blocked' | 'allowed'>('blocked');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const domains = getEngineCustomDomains(usePrivacyStore.getState(), tab);

  const addDomain = async () => {
    const value = input.trim().toLowerCase();
    if (!value) return;
    const ok = tab === 'blocked' ? await addCustom(value) : await addWhitelist(value);
    if (ok) {
      setInput('');
      setError(null);
    } else {
      setError('Invalid or duplicate domain.');
    }
  };

  const removeDomain = async (domain: string) => {
    if (tab === 'blocked') await removeCustom(domain);
    else await removeWhitelist(domain);
    await refreshCustom();
  };

  return (
    <Card padding="var(--space-4)" style={{ marginTop: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(46,213,115,0.1)', color: 'var(--success)' }}>
          <Shield size={18} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Custom Rules</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Your own domain rules — whitelist always wins
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Badge tone="danger">{customCount} blocked</Badge>
          <Badge tone="success">{whitelistCount} allowed</Badge>
        </div>
      </div>

      {/* Sekme anahtarı */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-2)' }}>
        <button
          onClick={() => setTab('blocked')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid ' + (tab === 'blocked' ? 'rgba(239,68,68,0.4)' : 'var(--glass-card-border)'),
            background: tab === 'blocked' ? 'rgba(239,68,68,0.12)' : 'transparent',
            color: tab === 'blocked' ? 'var(--danger)' : 'var(--text-muted)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Blocked Domains
        </button>
        <button
          onClick={() => setTab('allowed')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid ' + (tab === 'allowed' ? 'rgba(46,213,115,0.4)' : 'var(--glass-card-border)'),
            background: tab === 'allowed' ? 'rgba(46,213,115,0.12)' : 'transparent',
            color: tab === 'allowed' ? 'var(--success)' : 'var(--text-muted)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Allowed Domains
        </button>
      </div>

      {/* Ekleme çubuğu */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-2)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDomain()}
          placeholder={tab === 'blocked' ? 'example-tracker.com' : 'example.com'}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-card-border)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        />
        <Button variant="primary" size="sm" icon={Plus} onClick={addDomain}>
          Add
        </Button>
      </div>
      {error && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginBottom: 'var(--space-2)' }}>{error}</div>}

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {domains.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: 'var(--space-1) 0' }}>
            No custom domains yet.
          </div>
        ) : (
          domains.map((item) => (
            <div key={item.domain} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--space-1) 0', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.domain}
              </span>
              <button onClick={() => removeDomain(item.domain)} aria-label="Remove" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          ))
        )}
      </div>

      {tab === 'allowed' && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldOff size={12} strokeWidth={2} />
          Whitelisted domains are never blocked — even if they appear in a filter list.
        </div>
      )}
    </Card>
  );
};

export default CustomRulesPanel;