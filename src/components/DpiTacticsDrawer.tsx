import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDpiStore, DpiTechnique } from '../store/dpiStore';

const TECHNIQUES: { id: DpiTechnique; label: string }[] = [
  { id: 'sni-split', label: 'SNI Split' },
  { id: 'ttl-fake', label: 'TTL Fake' },
  { id: 'out-of-order', label: 'Out-of-Order' },
  { id: 'header-swap', label: 'Header Swap' },
  { id: 'window-limit', label: 'Window Limit' },
  { id: 'rst-filter', label: 'RST Filter' },
  { id: 'split-wire', label: 'SplitWire' },
  { id: 'zero-cipher', label: 'Zero-Cipher' },
];

export const DpiTacticsDrawer: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const { activeTechniques, toggleTechnique } = useDpiStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{
            marginLeft: '12px',
            padding: '12px',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(12,22,38,0.78)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            maxWidth: '400px',
          }}
        >
          {TECHNIQUES.map((tech) => {
            const isActive = activeTechniques.includes(tech.id);
            return (
              <button
                key={tech.id}
                onClick={() => toggleTechnique(tech.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  background: isActive ? 'rgba(61,181,255,0.15)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 0 8px rgba(61,181,255,0.3)' : 'none',
                }}
              >
                {tech.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
