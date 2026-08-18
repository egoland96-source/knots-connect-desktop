import React from 'react';
import { Activity, ShieldAlert } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { usePrivacyStore } from '../../store/privacyStore';
import type { PrivacyEvent } from '../../privacy';

const CATEGORY_COLOR: Record<string, string> = {
  ads: 'var(--accent)',
  tracker: 'var(--warning)',
  malware: 'var(--danger)',
  phishing: 'var(--danger)',
  custom: '#9333EA',
};

const SOURCE_LABEL: Record<string, string> = {
  'filter-list': 'Filter list',
  'custom-blacklist': 'Custom blacklist',
  whitelist: 'Whitelist',
  observed: 'Observed',
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const LiveProtectionFeed: React.FC = () => {
  const events = usePrivacyStore((s) => s.events);
  const observed = usePrivacyStore((s) => s.observed);
  const enabled = usePrivacyStore((s) => s.enabled);

  return (
    <Card padding="var(--space-4)" style={{ marginTop: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: enabled ? 'var(--warning-subtle)' : 'rgba(255,255,255,0.05)',
            color: enabled ? 'var(--warning)' : 'var(--text-muted)',
          }}
        >
          <Activity size={18} strokeWidth={2} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Live Protection Events</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Most recent blocking &amp; observation activity
          </div>
        </div>
        <Badge tone={enabled ? 'accent' : 'neutral'}>{observed.length} observing</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.length === 0 && observed.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>
            No events yet — browse a site to see the engine in action.
          </div>
        ) : null}

        {events.slice(0, 8).map((ev, i) => (
          <EventRow key={`${ev.domain}-${ev.timestamp}-${i}`} event={ev} />
        ))}

        {observed.slice(0, 6).map((o, i) => (
          <ObservedRow key={`${o.domain}-${i}`} domain={o.domain} score={o.score} />
        ))}
      </div>
    </Card>
  );
};

const EventRow: React.FC<{ event: PrivacyEvent }> = ({ event }) => {
  const color = CATEGORY_COLOR[event.category] ?? 'var(--text-muted)';
  const isBlocked = event.decision === 'block';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-2) 0', borderTop: '1px solid var(--border-subtle)' }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isBlocked ? `${color}18` : 'var(--warning-subtle)',
          color: isBlocked ? color : 'var(--warning)',
          flexShrink: 0,
        }}
      >
        <ShieldAlert size={13} strokeWidth={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.domain}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
          {SOURCE_LABEL[event.source] ?? event.source} · {event.listId}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <Badge tone={isBlocked ? 'danger' : 'neutral'} style={{ fontSize: 9, padding: '1px 7px' }}>
          {isBlocked ? 'BLOCKED' : event.decision.toUpperCase()}
        </Badge>
        <div style={{ fontSize: 10.5, color: color, fontWeight: 600, textTransform: 'capitalize', marginTop: 3 }}>
          {event.category}
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
        {formatTime(event.timestamp)}
      </div>
    </div>
  );
};

const ObservedRow: React.FC<{ domain: string; score: number }> = ({ domain, score }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-2) 0', borderTop: '1px solid var(--border-subtle)' }}>
    <span style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warning-subtle)', color: 'var(--warning)', flexShrink: 0 }}>
      <Activity size={13} strokeWidth={2} />
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {domain}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Observed — awaiting your decision</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <Badge tone={score >= 60 ? 'danger' : score >= 30 ? 'warning' : 'neutral'} style={{ fontSize: 9 }}>
        score {score}
      </Badge>
    </div>
  </div>
);

export default LiveProtectionFeed;