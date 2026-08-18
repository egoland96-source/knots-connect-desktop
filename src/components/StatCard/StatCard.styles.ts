import type { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'var(--glass-blur)',
    boxShadow: 'var(--shadow-soft)',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  sparkline: {
    flexShrink: 0,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    border: '1px solid var(--border-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
    fontSize: 16,
    flexShrink: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: 700,
  },
  unit: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
};
