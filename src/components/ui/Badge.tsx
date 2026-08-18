import React from 'react';

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLOR: Record<BadgeTone, string> = {
  accent: '#1CC8FF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral: '#94A3B8',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  style?: React.CSSProperties;
  glass?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children, style, glass = true }) => {
  const color = TONE_COLOR[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.3px',
        color,
        background: glass 
          ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.18)`
          : `${color}14`,
        backdropFilter: glass ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: glass ? 'blur(10px)' : 'none',
        border: glass ? `1px solid ${color}40` : `1px solid ${color}33`,
        boxShadow: glass ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;