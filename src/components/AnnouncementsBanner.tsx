import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';
import * as api from '../services/admin/adminApi';

const TONE: Record<string, { bg: string; border: string; color: string }> = {
  info: { bg: 'rgba(61,181,255,0.12)', border: 'rgba(61,181,255,0.3)', color: 'var(--accent)' },
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
  danger: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: 'var(--danger)' },
};

export const AnnouncementsBanner: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('knots_ann_dismissed') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    api.publicAnnouncements()
      .then((d: any[]) => setList(Array.isArray(d) ? d.filter((a) => a.active) : []))
      .catch(() => setList([]));
  }, []);

  const visible = list.filter((a) => !dismissed.includes(a.id));

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('knots_ann_dismissed', JSON.stringify(next));
  };

  return (
    <AnimatePresence>
      {visible.map((a) => {
        const t = TONE[a.severity] || TONE.info;
        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 13,
            }}
          >
            <Megaphone size={16} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{a.title}</strong>
              {a.body ? <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{a.body}</div> : null}
            </div>
            <button onClick={() => dismiss(a.id)} aria-label="Dismiss"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
              <X size={15} />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
};

export default AnnouncementsBanner;
