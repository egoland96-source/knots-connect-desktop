import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectionStore } from '../store/connectionStore';

const statusColor = (s: string) =>
  s === 'connected' ? 'var(--success, #34D399)' :
  s === 'connecting' ? 'var(--accent, #1CC8FF)' :
  'var(--text-muted, #7C8CA3)';

const statusLabel = (s: string) =>
  s === 'connected' ? 'ON' : s === 'connecting' ? '...' : 'OFF';

export const MiniModeOverlay: React.FC = () => {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);

  useEffect(() => {
    if (!window.knots?.onTelemetry) return;
    const off = window.knots.onTelemetry((d: any) => {
      if (typeof d.downloadSpeed === 'number') setDown(d.downloadSpeed);
      if (typeof d.uploadSpeed === 'number') setUp(d.uploadSpeed);
      if (typeof d.status === 'string') setStatus(d.status);
    });
    return () => { off?.(); };
  }, []);

  useEffect(() => {
    const off = window.knots?.onMiniMode?.((m: any) => setActive(!!m?.active));
    if (off) return () => off();
    const id = setInterval(async () => {
      try {
        const res = await window.knots?.miniStatus?.();
        if (res) setActive(!!res.active);
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              window.windowControls?.exitMini?.();
            }}
            style={{
              position: 'relative',
              width: 64,
              height: 64,
              borderRadius: 14,
              background: 'var(--glass-card-bg-strong, rgba(20,26,38,0.95))',
              backdropFilter: 'var(--glass-card-blur)',
              WebkitBackdropFilter: 'var(--glass-card-blur)',
              border: '1px solid var(--glass-card-border, rgba(255,255,255,0.12))',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            title="KNOTS · tıklayıp uygulamayı aç"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
                color: '#fff',
                letterSpacing: 0.5,
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              }}
            >
              K
            </div>
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: statusColor(status),
                boxShadow: `0 0 10px ${statusColor(status)}`,
                border: '2px solid var(--glass-card-bg-strong, rgba(20,26,38,0.95))',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 70,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              KNOTS · {statusLabel(status)}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 86,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 9,
                color: 'rgba(255,255,255,0.55)',
                textAlign: 'center',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              ↓ {down > 1048576 ? (down / 1048576).toFixed(1) + ' MB/s' : (down / 1024).toFixed(0) + ' KB/s'}
              <br />↑ {up > 1048576 ? (up / 1048576).toFixed(1) + ' MB/s' : (up / 1024).toFixed(0) + ' KB/s'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MiniModeOverlay;
