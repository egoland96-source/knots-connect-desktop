import React from 'react';
import { RefreshCw, ListFilter, Check, Crown, Lock, Shield } from 'lucide-react';
import { Card, Badge, Toggle, Button } from '../../components/ui';
import { usePrivacyStore } from '../../store/privacyStore';
import { useAuthStore } from '../../store/authStore';
import { dpiDomainCount, proDpiExtraCount } from '../../privacy';
import type { FilterListMeta } from '../../privacy';

const CATEGORY_TONE: Record<string, 'accent' | 'warning' | 'danger'> = {
  ads: 'accent',
  tracker: 'warning',
  malware: 'danger',
  phishing: 'danger',
};

const GROUP_ORDER: { key: string; title: string; categories: string[] }[] = [
  { key: 'ads-trackers', title: 'Ads & Trackers', categories: ['ads', 'tracker'] },
  { key: 'threats', title: 'Malware & Threats', categories: ['malware', 'phishing'] },
];

export const FilterListsPanel: React.FC = () => {
  const lists = usePrivacyStore((s) => s.lists);
  const updateList = usePrivacyStore((s) => s.updateList);
  const updateAll = usePrivacyStore((s) => s.updateAll);
  const toggleList = usePrivacyStore((s) => s.toggleList);
  const listUpdating = usePrivacyStore((s) => s.listUpdating);
  const lastListError = usePrivacyStore((s) => s.lastListError);
  const enabled = usePrivacyStore((s) => s.enabled);
  const plan = usePrivacyStore((s) => s.plan);
  const user = useAuthStore((s) => s.user);
  const isFree = plan === 'free';

  const ruleTotal = lists.reduce((acc, l) => acc + (l.ruleCount || 0), 0);
  const proLocked = isFree;

  return (
    <Card padding="var(--space-4)" style={{ marginTop: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28,200,255,0.1)', color: 'var(--accent)' }}>
          <ListFilter size={18} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Filter Lists</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {ruleTotal.toLocaleString()} rules across {lists.length} lists
          </div>
        </div>
        <Button size="sm" variant="glass" icon={RefreshCw} disabled={listUpdating !== null || !enabled} onClick={() => updateAll()}>
          {listUpdating === '__all__' ? 'Updating…' : 'Update All'}
        </Button>
      </div>

      {lastListError && (
        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 'var(--space-2)' }}>
          Liste güncellenemedi: {lastListError}
        </div>
      )}

      {/* DPI DOMAINS — bypass listesi (lokal, bloklama dışı) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-2) 0', borderTop: '1px solid var(--border-subtle)' }}>
        <Shield size={15} strokeWidth={2.2} color="var(--accent)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            DPI Domains
            <Badge tone="neutral" style={{ marginLeft: 8, fontSize: 9, padding: '1px 7px' }}>dpi</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {dpiDomainCount('free').toLocaleString()} ISP-blocked domains · built-in
          </div>
        </div>
        <Badge tone="accent">Bypass</Badge>
      </div>

      {/* PRO DPI DOMAINS — oyun + genişletilmiş sosyal medya (abonelere özel) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-2) 0', borderTop: '1px solid var(--border-subtle)', opacity: proLocked ? 0.6 : 1 }}>
        {proLocked ? (
          <Lock size={14} strokeWidth={2.2} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        ) : (
          <Check size={15} strokeWidth={2.5} color="#2ED573" style={{ flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Pro DPI Domains
            <Badge tone="neutral" style={{ marginLeft: 8, fontSize: 9, padding: '1px 7px' }}>dpi</Badge>
            <Badge tone="accent" style={{ marginLeft: 6, fontSize: 9, padding: '1px 7px' }}>
              <Crown size={8} strokeWidth={2.5} style={{ marginRight: 3, verticalAlign: -1 }} />PRO
            </Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {proDpiExtraCount().toLocaleString()} extra: gaming platforms & social media
          </div>
        </div>
        {proLocked ? (
          <Badge tone="neutral">Locked</Badge>
        ) : (
          <Badge tone="success">Active</Badge>
        )}
      </div>

      {GROUP_ORDER.map((group) => {
        const groupLists = lists.filter((l) => group.categories.includes(l.category));
        if (!groupLists.length) return null;
        return (
          <React.Fragment key={group.key}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)', padding: 'var(--space-2) 0 0', borderTop: '1px solid var(--border-subtle)', marginTop: 'var(--space-2)' }}>
              {group.title}
            </div>
            {groupLists.map((list) => (
              <FilterListRow
                key={list.id}
                list={list}
                enabled={enabled}
                locked={proLocked && !!list.pro}
                updating={listUpdating === list.id}
                onToggle={(v) => toggleList(list.id, v)}
                onUpdate={() => updateList(list.id)}
              />
            ))}
          </React.Fragment>
        );
      })}

      {user && user.id !== 'guest' && user.subscriptionType === 'free' && (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Crown size={14} strokeWidth={2} color="var(--accent)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Pro plan: daha büyük & güncel reklam, tracker ve malware listelerinin kilidini açar.
          </span>
        </div>
      )}
    </Card>
  );
};

const FilterListRow: React.FC<{
  list: FilterListMeta;
  enabled: boolean;
  locked: boolean;
  updating: boolean;
  onToggle: (v: boolean) => void;
  onUpdate: () => void;
}> = ({ list, enabled, locked, updating, onToggle, onUpdate }) => {
  const isOn = list.enabled && enabled && !locked;
  const lastUpdated = list.lastUpdated ? new Date(list.lastUpdated).toLocaleDateString() : 'never';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-2) 0', borderTop: '1px solid var(--border-subtle)', opacity: isOn ? 1 : 0.6 }}>
      {list.pro && locked ? (
        <Lock size={14} strokeWidth={2.2} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      ) : (
        <Check size={15} strokeWidth={2.5} color={isOn ? '#2ED573' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          {list.name}
          <Badge tone={CATEGORY_TONE[list.category] ?? 'neutral'} style={{ marginLeft: 8, fontSize: 9, padding: '1px 7px' }}>
            {list.category}
          </Badge>
          {list.pro && (
            <Badge tone="accent" style={{ marginLeft: 6, fontSize: 9, padding: '1px 7px' }}>
              <Crown size={8} strokeWidth={2.5} style={{ marginRight: 3, verticalAlign: -1 }} />PRO
            </Badge>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {list.ruleCount ? `${list.ruleCount.toLocaleString()} rules` : 'No rules yet'} · updated {lastUpdated}
        </div>
      </div>
      <Button size="sm" variant="ghost" icon={RefreshCw} disabled={updating || !enabled || locked} onClick={onUpdate}>
        {updating ? '…' : 'Update'}
      </Button>
      <Toggle checked={isOn} disabled={!enabled || locked} onChange={() => onToggle(!list.enabled)} size="sm" />
    </div>
  );
};

export default FilterListsPanel;