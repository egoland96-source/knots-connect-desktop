import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  trend?: number[];
  color?: string;
  colorGlow?: string;
  large?: boolean;
  glass?: boolean;
}

/** İkon + değer + mini grafik içeren büyük metrik kartı. */
export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color = 'var(--accent)',
  colorGlow = 'var(--accent-glow)',
  large = false,
  glass = true,
}) => {
  const baseStyle = glass
    ? {
        background: 'var(--glass-card-bg)',
        backdropFilter: 'var(--glass-card-blur)',
        WebkitBackdropFilter: 'var(--glass-card-blur)',
        border: '1px solid var(--glass-card-border)',
        boxShadow: 'var(--glass-card-shadow)',
      }
    : {
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
      };

  const hoverStyle = glass
    ? {
        boxShadow: 'var(--glass-card-shadow-hover)',
        background: 'var(--glass-card-bg-strong)',
        backdropFilter: 'var(--glass-card-blur-hover)',
        WebkitBackdropFilter: 'var(--glass-card-blur-hover)',
        borderColor: 'rgba(255,255,255,0.12)',
      }
    : {
        boxShadow: 'var(--shadow-card-hover)',
      };

  return (
    <motion.div
      whileHover={{
        y: -4,
        ...hoverStyle,
        borderColor: glass ? 'rgba(255,255,255,0.15)' : colorGlow,
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        ...baseStyle,
        borderRadius: 'var(--radius-lg)',
        padding: large ? 'var(--space-6)' : 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: large ? 'var(--space-4)' : 'var(--space-3)',
        minHeight: large ? 180 : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <motion.span
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 400, damping: 17 }}
          style={{
            width: large ? 48 : 40,
            height: large ? 48 : 40,
            borderRadius: large ? 14 : 12,
            background: glass ? 'rgba(255,255,255,0.06)' : `${color}14`,
            backdropFilter: glass ? 'var(--glass-card-blur)' : 'none',
            WebkitBackdropFilter: glass ? 'var(--glass-card-blur)' : 'none',
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <Icon size={large ? 22 : 19} strokeWidth={large ? 2.1 : 1.9} />
        </motion.span>
        {trend && (
          <Sparkline data={trend} width={large ? 110 : 88} height={large ? 36 : 30} stroke={color} />
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: large ? 12 : 11, fontWeight: 600, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: large ? 32 : 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: large ? 6 : 4, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: large ? 13 : 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </motion.div>
  );
};

export default StatCard;