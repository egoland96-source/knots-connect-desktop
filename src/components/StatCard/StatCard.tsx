import React, { useMemo } from 'react';
import { styles } from './StatCard.styles';
import type { StatCardProps } from './StatCard.types';

const DEFAULT_TREND = [20, 35, 28, 45, 40, 60, 52, 70, 65, 80];

/** Dashboard ve Statistics sayfalarında tekrar kullanılan tekil metrik kartı. */
export const StatCard = React.memo(({ label, value, unit, glyph, trend = DEFAULT_TREND }: StatCardProps) => {
  const path = useMemo(() => {
    if (trend.length < 2) return null;
    const w = 72;
    const h = 28;
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const range = max - min || 1;
    const step = w / (trend.length - 1);
    return trend
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
      .join(' ');
  }, [trend]);

  return (
    <div style={styles.container}>
      <div style={styles.iconCircle} aria-hidden="true">
        {glyph}
      </div>
      <div style={styles.textBlock}>
        <div style={styles.label}>{label}</div>
        <div style={styles.valueRow}>
          <span style={styles.value}>{value}</span>
          {unit && <span style={styles.unit}>{unit}</span>}
        </div>
      </div>
      {path && (
        <svg width="72" height="28" viewBox="0 0 72 28" style={styles.sparkline} aria-hidden="true">
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
});

StatCard.displayName = 'StatCard';
