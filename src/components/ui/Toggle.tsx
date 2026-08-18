import React from 'react';
import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** iOS tarzı geçiş anahtarı - Glassmorphism / translucent. */
export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, size = 'md' }) => {
  const sizes = {
    sm: { width: 34, height: 20, knob: 16, translate: 15 },
    md: { width: 44, height: 26, knob: 22, translate: 20 },
    lg: { width: 52, height: 30, knob: 26, translate: 24 },
  };

  const s = sizes[size];

  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      style={{
        position: 'relative',
        width: s.width,
        height: s.height,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.15)',
        background: checked 
          ? 'rgba(61, 181, 255, 0.35)' 
          : 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 200ms var(--ease), border-color 200ms var(--ease), box-shadow 200ms var(--ease)',
        flexShrink: 0,
        boxShadow: checked
          ? '0 0 20px rgba(61,181,255,0.18), inset 0 1px 0 rgba(255,255,255,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const target = e.currentTarget as HTMLButtonElement;
          target.style.boxShadow = checked
            ? '0 0 24px rgba(61,181,255,0.24), inset 0 1px 0 rgba(255,255,255,0.3)'
            : '0 0 16px rgba(61,181,255,0.09), inset 0 1px 0 rgba(255,255,255,0.15)';
          target.style.borderColor = 'rgba(255,255,255,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.boxShadow = checked
          ? '0 0 20px rgba(61,181,255,0.18), inset 0 1px 0 rgba(255,255,255,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.1)';
        target.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
    >
      <motion.div
        initial={false}
        animate={{ x: checked ? s.translate : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: s.knob,
          height: s.knob,
          borderRadius: '50%',
          background: checked 
            ? 'linear-gradient(180deg, #EAF5FF 0%, #CFE7FF 100%)'
            : 'linear-gradient(180deg, #EAF5FF 0%, #CFE7FF 100%)',
          boxShadow: checked
            ? '0 2px 8px rgba(0,0,0,0.2), 0 0 12px rgba(61,181,255,0.25)'
            : '0 2px 6px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20, delay: 0.05 }}
            style={{
              width: s.knob * 0.5,
              height: s.knob * 0.3,
              borderBottom: '2px solid var(--accent)',
              borderRight: '2px solid var(--accent)',
              transform: 'rotate(45deg)',
            }}
          />
        )}
      </motion.div>
    </button>
  );
};

export default Toggle;