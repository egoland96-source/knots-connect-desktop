import React, { useMemo, useState } from 'react';
import { Search, Plus, Trash2, Shield, X } from 'lucide-react';
import { usePrivacyStore } from '../../store/privacyStore';
import type { BlocklistCategory } from '../../types/settings';

type Props = {
  open: boolean;
  onClose: () => void;
};

const categoryColor: Record<BlocklistCategory, string> = {
  ads: '#34D399',
  trackers: '#A78BFA',
  malware: '#FB7185',
};

export const BlocklistManagerModal: React.FC<Props> = ({ open, onClose }) => {
  const lists = usePrivacyStore((s) => s.lists);
  const toggleList = usePrivacyStore((s) => s.toggleList);
  const addCustom = usePrivacyStore((s) => s.addCustom);
  const removeCustom = usePrivacyStore((s) => s.removeCustom);
  const addWhitelist = usePrivacyStore((s) => s.addWhitelist);
  const removeWhitelist = usePrivacyStore((s) => s.removeWhitelist);
  const whitelistCount = usePrivacyStore((s) => s.whitelistCount);
  const customCount = usePrivacyStore((s) => s.customCount);

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<BlocklistCategory | 'all'>('all');
  const [newDomain, setNewDomain] = useState('');
  const [whiteDomain, setWhiteDomain] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (lists as any[]).filter((l) => {
      const matchesCat = cat === 'all' || (l.category === cat || (l.category === 'tracker' && cat === 'trackers'));
      const matchesQuery = !q || String(l.name ?? l.id).toLowerCase().includes(q) || String(l.id).toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [lists, query, cat]);

  if (!open) return null;

  const handleAddCustom = async () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    const ok = await addCustom(d);
    if (ok) setNewDomain('');
  };
  const handleAddWhite = async () => {
    const d = whiteDomain.trim().toLowerCase();
    if (!d) return;
    const ok = await addWhitelist(d);
    if (ok) setWhiteDomain('');
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(2,6,13,0.58)', backdropFilter: 'blur(10px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#111928',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.42)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#111928', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.18)' }}>
              <Shield size={14} />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC' }}>Blocklist Manager</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{filtered.length} lists • {customCount} custom • {whitelistCount} whitelisted</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.06)', color: '#E2E8F0', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Search size={14} color="#94A3B8" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lists or domains…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E2E8F0', fontSize: 12.5 }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'ads', 'trackers', 'malware'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c as any)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 9,
                    border: '1px solid',
                    borderColor: cat === c ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.08)',
                    background: cat === c ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                    color: cat === c ? '#34D399' : '#94A3B8',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflow: 'auto', paddingRight: 2 }}>
            {filtered.map((l: any) => {
              const enabled = !!l.enabled;
              const catKey = (l.category === 'tracker' ? 'trackers' : l.category) as BlocklistCategory;
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: enabled ? categoryColor[catKey] ?? '#34D399' : '#64748B' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name ?? l.id}</span>
                      <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'DM Mono, monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>{catKey}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, fontFamily: 'DM Mono, monospace' }}>
                      {(l.ruleCount ?? 0).toLocaleString()} rules • {l.lastUpdated ? new Date(l.lastUpdated).toISOString().slice(0, 10) : '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleList(l.id, !enabled)}
                    role="switch"
                    aria-checked={enabled}
                    style={{
                      width: 44,
                      height: 26,
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: enabled ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
                      background: enabled ? '#34D399' : 'rgba(255,255,255,0.10)',
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: enabled ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 160ms ease', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }} />
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 12 }}>No lists match.</div>}
          </div>

          {/* Custom block + whitelist */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F8FAFC' }}>Custom block</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Add a domain to always block.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="ads.example.com" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#080D16', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', fontSize: 12, outline: 'none' }} />
                <button onClick={handleAddCustom} style={{ padding: '8px 10px', borderRadius: 8, background: '#111928', border: '1px solid rgba(52,211,153,0.22)', color: '#34D399', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                  <Plus size={12} /> Add
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>{customCount} custom rules</div>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F8FAFC' }}>Whitelist</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Never block these domains.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={whiteDomain} onChange={(e) => setWhiteDomain(e.target.value)} placeholder="trusted.example.com" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#080D16', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', fontSize: 12, outline: 'none' }} />
                <button onClick={handleAddWhite} style={{ padding: '8px 10px', borderRadius: 8, background: '#111928', border: '1px solid rgba(167,139,250,0.22)', color: '#A78BFA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                  <Plus size={12} /> Allow
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>{whitelistCount} whitelisted</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlocklistManagerModal;
