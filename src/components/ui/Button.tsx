import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
}

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'rgba(61,181,255,0.18)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(61,181,255,0.28)',
    fontWeight: 700,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 20px rgba(61,181,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(255,255,255,0.15)',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  glass: {
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontWeight: 600,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent',
    fontWeight: 500,
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: 'var(--danger)',
    border: '1px solid rgba(239,68,68,0.3)',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 4px 16px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
};

const SIZES: Record<string, React.CSSProperties> = {
  sm: { padding: '8px 14px', fontSize: 13, borderRadius: 'var(--radius-sm)' },
  md: { padding: '10px 18px', fontSize: 14, borderRadius: 'var(--radius-md)' },
  lg: { padding: '12px 24px', fontSize: 15, borderRadius: 'var(--radius-md)' },
};

const HOVER_VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'rgba(61,181,255,0.28)',
    boxShadow: '0 6px 24px rgba(61,181,255,0.26), inset 0 1px 0 rgba(255,255,255,0.16)',
    borderColor: 'rgba(61,181,255,0.42)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  glass: {
    background: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  danger: {
    background: 'rgba(239,68,68,0.25)',
    borderColor: 'rgba(239,68,68,0.4)',
    boxShadow: '0 6px 24px rgba(239,68,68,0.21), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  full,
  children,
  style,
  ...rest
}) => {
  const baseStyle = {
    ...VARIANTS[variant],
    ...SIZES[size],
  };

  const hoverStyle = HOVER_VARIANTS[variant];

  return (
    <motion.button
      whileHover={{ ...hoverStyle, y: -2, filter: 'brightness(1.05)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        cursor: 'pointer',
        transition: 'all 180ms var(--ease)',
        ...baseStyle,
        ...style,
      }}
      {...(rest as any)}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </motion.button>
  );
};

export default Button;