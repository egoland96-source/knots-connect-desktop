import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useConnectionStore } from '../../store/connectionStore';
import { Minus, Square, X, MapPin, Bell, Settings } from 'lucide-react';

const SERVERS: { id: string; name: string }[] = [
  { id: 'nl', name: 'Netherlands · Amsterdam' },
  { id: 'us', name: 'USA · New York' },
  { id: 'de', name: 'Germany · Frankfurt' },
  { id: 'jp', name: 'Japan · Tokyo' },
  { id: 'fr', name: 'France · Paris' },
  { id: 'gb', name: 'UK · London' },
];

const formatUptime = (sec: number | null) => {
  if (!sec) return '00:00:00';
  const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
  const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const secs = (sec % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

const safeNum = (value: number | null | undefined): number => 
  typeof value === 'number' && isFinite(value) ? value : 0;

export const TopBar = React.memo(() => {
  // Read from store - no timers, no local state for connection data
  const status = useConnectionStore((s) => s.status);
  const uptimeSeconds = useConnectionStore((s) => s.uptimeSeconds);
  const [server, setServer] = useState('nl');
  const [open, setOpen] = useState(false);

  const handleMinimize = useCallback(() => window.windowControls.minimize(), []);
  const handleMaximize = useCallback(() => window.windowControls.maximize(), []);
  const handleClose = useCallback(() => window.windowControls.close(), []);

  const isConnected = status === 'connected';
  const statusLabel = isConnected ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Disconnected';
  const statusColor = isConnected ? 'var(--success)' : status === 'connecting' ? 'var(--accent)' : 'var(--text-muted)';

  const selected = SERVERS.find((s) => s.id === server);

  return (
    <div
      className="app-region-drag"
      style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-5)',
        borderBottom: '1px solid var(--glass-card-border)',
        background: 'var(--glass-card-bg)',
        backdropFilter: 'var(--glass-card-blur)',
        WebkitBackdropFilter: 'var(--glass-card-blur)',
        gap: 'var(--space-4)',
        flexShrink: 0,
      }}
    >
      {/* SOL: Bağlantı durumu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: isConnected ? '0 0 10px var(--success)' : 'none',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{statusLabel}</span>
      </div>

      {/* ORTA: Sunucu seçici */}
      <div className="app-region-no-drag" style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--glass-card-bg-light)',
            backdropFilter: 'var(--glass-card-blur)',
            WebkitBackdropFilter: 'var(--glass-card-blur)',
            border: '1px solid var(--glass-card-border)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'border-color 180ms var(--ease), background 180ms var(--ease)',
          }}
        >
          <MapPin size={14} strokeWidth={2} color="var(--accent)" />
          {selected?.name ?? 'Select Server'}
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--glass-card-bg-strong)',
              backdropFilter: 'var(--glass-card-blur-hover)',
              WebkitBackdropFilter: 'var(--glass-card-blur-hover)',
              border: '1px solid var(--glass-card-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--glass-card-shadow-hover)',
              padding: 6,
              minWidth: 240,
              zIndex: 100,
            }}
          >
            {SERVERS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setServer(s.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: server === s.id ? 'rgba(28,200,255,0.12)' : 'transparent',
                  color: server === s.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: server === s.id ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background 150ms var(--ease)',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SAĞ: Notifications + Quick Settings + Süre + pencere kontrolleri */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, justifyContent: 'flex-end' }}>
        {/* Notifications */}
        <button
          aria-label="Notifications"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 150ms var(--ease), color 150ms var(--ease)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Bell size={14} strokeWidth={2} />
        </button>

        {/* Quick Settings */}
        <button
          aria-label="Quick Settings"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 150ms var(--ease), color 150ms var(--ease)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Settings size={14} strokeWidth={2} />
        </button>

        {/* Session Duration */}
        <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
          {formatUptime(useConnectionStore.getState().uptimeSeconds)}
        </span>

        <div className="app-region-no-drag" style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleMinimize}
            aria-label="Minimize"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 150ms var(--ease), color 150ms var(--ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Minus size={14} strokeWidth={2} />
          </button>
          <button
            onClick={handleMaximize}
            aria-label="Maximize"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 150ms var(--ease), color 150ms var(--ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Square size={12} strokeWidth={2} />
          </button>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 150ms var(--ease), color 150ms var(--ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.55)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;