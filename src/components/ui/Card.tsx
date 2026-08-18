import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  hover?: boolean;
  padding?: string;
  glass?: boolean;
  children?: React.ReactNode;
}

/**
 * Premium ortak kart bileşeni. Tüm sayfalarda aynı yüzey,
 * radius, border ve gölge davranışını garanti eder.
 */
export const Card: React.FC<CardProps> = ({
  hover = false,
  padding,
  glass = true,
  style,
  children,
  ...rest
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
      className="knots-card"
      whileHover={hover ? { ...hoverStyle, y: -3 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        ...baseStyle,
        borderRadius: 'var(--radius-lg)',
        padding: padding ?? 'var(--space-5)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export default Card;