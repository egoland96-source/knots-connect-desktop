import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, Globe, Signal, Zap, Check, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { useConnectionStore } from '../../store/connectionStore';

interface ServerItem {
  id: string;
  code: string;
  country: string;
  city: string;
  flag: string;
  ping: number;
  load: number;
  favorite: boolean;
}

const SERVERS: ServerItem[] = [
  { id: 'nl', code: 'NL', country: 'Netherlands', city: 'Amsterdam', flag: '🇳🇱', ping: 24, load: 35, favorite: true },
  { id: 'us', code: 'US', country: 'United States', city: 'New York', flag: '🇺🇸', ping: 42, load: 60, favorite: false },
  { id: 'de', code: 'DE', country: 'Germany', city: 'Frankfurt', flag: '🇩🇪', ping: 31, load: 45, favorite: true },
  { id: 'jp', code: 'JP', country: 'Japan', city: 'Tokyo', flag: '🇯🇵', ping: 156, load: 75, favorite: false },
  { id: 'fr', code: 'FR', country: 'France', city: 'Paris', flag: '🇫🇷', ping: 28, load: 40, favorite: false },
  { id: 'gb', code: 'GB', country: 'United Kingdom', city: 'London', flag: '🇬🇧', ping: 35, load: 50, favorite: true },
  { id: 'ca', code: 'CA', country: 'Canada', city: 'Toronto', flag: '🇨🇦', ping: 48, load: 55, favorite: false },
  { id: 'sg', code: 'SG', country: 'Singapore', city: 'Singapore', flag: '🇸🇬', ping: 145, load: 65, favorite: false },
  { id: 'ch', code: 'CH', country: 'Switzerland', city: 'Zurich', flag: '🇨🇭', ping: 30, load: 38, favorite: false },
];

const pingColor = (ping: number) => {
  if (ping < 50) return { color: '#22C55E', label: 'Fast' };
  if (ping < 100) return { color: '#3DB5FF', label: 'Good' };
  if (ping < 150) return { color: '#F59E0B', label: 'Fair' };
  return { color: '#EF4444', label: 'Slow' };
};

export const Servers: React.FC = () => {
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>(
    Object.fromEntries(SERVERS.filter((s) => s.favorite).map((s) => [s.id, true])),
  );
  const [onlyFav, setOnlyFav] = useState(false);
  const [connected, setConnected] = useState<string | null>(null);
  const status = useConnectionStore((s) => s.status);
  const serverId = useConnectionStore((s) => s.serverId);

  const filtered = useMemo(() => {
    let list = SERVERS;
    if (onlyFav) list = list.filter((s) => favorites[s.id]);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((s) => s.country.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    return list;
  }, [query, onlyFav, favorites]);

  const avgPing = Math.round(SERVERS.reduce((a, s) => a + s.ping, 0) / SERVERS.length);

  const toggleFav = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sync with actual connection status
  useEffect(() => {
    if (status === 'connected' && serverId) {
      setConnected(serverId);
    } else if (status === 'disconnected') {
      setConnected(null);
    }
  }, [status, serverId]);

  const handleServerClick = (serverId: string) => {
    if (connected === serverId) {
      setConnected(null);
    } else {
      setConnected(serverId);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Servers</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Choose your optimal location</p>
        </div>
      </div>

      <div className="servers-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.5fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
        {/* SOL: Arama + Listeleme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Arama kutusu - Ctrl+K support */}
          <SearchBox
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country, city or code..."
            shortcut="⌘K"
          />

          {/* Sunucu kartları */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {filtered.map((server, i) => {
              const ping = pingColor(server.ping);
              const isFav = !!favorites[server.id];
              const isConnectedServer = connected === server.id;
              const isActuallyConnected = status === 'connected' && serverId === server.id;

              return (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  whileHover={{ y: -2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    background: isActuallyConnected ? 'rgba(34,197,94,0.05)' : 'var(--glass-card-bg)',
                    border: `1px solid ${isActuallyConnected ? 'rgba(34,197,94,0.4)' : isConnectedServer ? 'rgba(34,197,94,0.3)' : 'var(--glass-card-border)'}`,
                    backdropFilter: 'var(--glass-card-blur)',
                    WebkitBackdropFilter: 'var(--glass-card-blur)',
                    boxShadow: 'var(--glass-card-shadow)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3) var(--space-4)',
                    cursor: 'pointer',
                    transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease), background 180ms var(--ease)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isActuallyConnected ? 'rgba(34,197,94,0.08)' : 'var(--glass-card-bg-strong)';
                    e.currentTarget.style.boxShadow = 'var(--glass-card-shadow-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActuallyConnected ? 'rgba(34,197,94,0.05)' : 'var(--glass-card-bg)';
                    e.currentTarget.style.boxShadow = 'var(--glass-card-shadow)';
                  }}
                  onClick={() => handleServerClick(server.id)}
                >
                  {/* Connected indicator - left accent bar */}
                  {isActuallyConnected && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
                        background: 'linear-gradient(180deg, var(--success), #16A34A)',
                      }}
                    />
                  )}

                  {/* Bayrak */}
                  <div style={{ width: 44, height: 34, borderRadius: 8, background: 'var(--glass-card-bg-light)', border: '1px solid var(--glass-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {server.flag}
                  </div>

                  {/* Bilgi */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {server.country} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {server.city}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {server.code} node
                    </div>
                  </div>

                  {/* Yük barı */}
                  <div style={{ width: 90 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Load</span>
                      <span>{server.load}%</span>
                    </div>
                      <div style={{ width: '100%', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${server.load}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, var(--accent), var(--connected-glow))` }} />
                    </div>
                  </div>

                  {/* Ping */}
                  <div style={{ width: 66, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ping.color, boxShadow: `0 0 6px ${ping.color}` }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: ping.color, fontFamily: 'var(--font-mono)' }}>{server.ping} ms</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ping.label}</div>
                  </div>

                  {/* Favori */}
                  <button
                    aria-label="Favori"
                    onClick={(e) => { e.stopPropagation(); toggleFav(server.id); }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: isFav ? '#F59E0B' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 150ms var(--ease), background 150ms var(--ease)' }}
                  >
                    <Star size={17} strokeWidth={2} fill={isFav ? '#F59E0B' : 'none'} />
                  </button>

                  {/* Connected badge - more prominent */}
                  {isActuallyConnected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: 'var(--success)',
                        fontSize: 12,
                        fontWeight: 600,
                        marginLeft: 'auto',
                      }}
                    >
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                      <span>Connected</span>
                    </motion.div>
                  )}

                  {!isActuallyConnected && isConnectedServer && (
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                  )}
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-7)', color: 'var(--text-muted)', fontSize: 13 }}>
                No servers match your search.
              </div>
            )}
          </div>
        </div>

        {/* SAĞ PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Overview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <OverviewRow icon={Globe} label="Total Servers" value={`${filtered.length || SERVERS.length}`} />
              <OverviewRow icon={Globe} label="Countries" value={`${new Set((filtered.length ? filtered : SERVERS).map((s) => s.country)).size || new Set(SERVERS.map((s) => s.country)).size}`} />
              <OverviewRow icon={Signal} label="Average Ping" value={`${avgPing} ms`} />
              <OverviewRow icon={Star} label="Favorites" value={`${Object.values(favorites).filter(Boolean).length}`} />
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Optimal Location</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span style={{ fontSize: 26 }}>🇳🇱</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Amsterdam</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Lowest latency · 24 ms</div>
              </div>
            </div>
            <button
              onClick={() => setOnlyFav(!onlyFav)}
              style={{
                width: '100%',
                marginTop: 'var(--space-3)',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                background: onlyFav ? 'rgba(245,158,11,0.1)' : 'var(--glass-card-bg)',
                color: onlyFav ? '#F59E0B' : 'var(--text-secondary)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 180ms var(--ease)',
              }}
            >
              <Star size={15} strokeWidth={2} fill={onlyFav ? '#F59E0B' : 'none'} />
              {onlyFav ? 'Showing Favorites' : 'Show Favorites Only'}
            </button>
          </Card>

          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Quick Connect</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
              <Zap size={16} strokeWidth={2} color="var(--accent)" />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Connect to the fastest node based on your location.
              </span>
            </div>
            <Badge tone="success" style={{ marginTop: 'var(--space-3)' }}>Recommended</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
};

const OverviewRow: React.FC<{ icon: React.ComponentType<any>; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={15} strokeWidth={1.9} color="var(--text-muted)" />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
    </div>
    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
  </div>
);

// SearchBox component with Ctrl+K support
const SearchBox: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  shortcut: string;
}> = ({ value, onChange, placeholder, shortcut }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--glass-card-bg)',
        backdropFilter: 'var(--glass-card-blur)',
        WebkitBackdropFilter: 'var(--glass-card-blur)',
        border: `1px solid ${focused ? 'var(--border-focus)' : 'var(--glass-card-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 16px',
        transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease)',
        boxShadow: focused
          ? '0 0 0 3px var(--accent-glow), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.2)',
      }}
      onClick={() => document.querySelector('input')?.focus()}
    >
      <Search size={18} strokeWidth={2} color={focused ? 'var(--accent)' : 'var(--text-muted)'} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%' }}
      />
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 4 }}>
        {shortcut}
      </span>
    </div>
  );
};

export default Servers;