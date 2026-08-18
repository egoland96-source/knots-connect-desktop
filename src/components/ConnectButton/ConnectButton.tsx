import React, { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useConnection } from '../../hooks/useConnection';
import type { ConnectButtonProps } from './ConnectButton.types';

/**
 * Knots Connect button — the brand's own design language, working together
 * with the Living Rope entity instead of imitating any other VPN client.
 *
 * A matte-glass circle with a single rope-knot glyph:
 *  - disconnected : calm matte glass, soft blue inner glow, breathing hint.
 *                   Grows on hover, sinks slightly on press.
 *  - connecting   : cyan arc spins around the knot while the rope ties.
 *  - connected    : keeps the dark theme — only a thin cyan/mint ring with a
 *                   continuously breathing glow. The knot stays the identity.
 */

type ButtonState = 'connected' | 'connecting' | 'error' | 'disconnected';

const STATE: Record<ButtonState, { label: string; accent: string; glow: string; inner: string }> = {
  disconnected: {
    label: 'Connect',
    accent: '#4FD1FF',
    glow: 'rgba(61,181,255,0.22)',
    inner: 'radial-gradient(circle at 50% 40%, rgba(79,209,255,0.14), rgba(79,209,255,0.04) 60%, transparent 75%)',
  },
  connecting: {
    label: 'Connecting…',
    accent: '#4FD1FF',
    glow: 'rgba(79,209,255,0.32)',
    inner: 'radial-gradient(circle at 50% 40%, rgba(79,209,255,0.22), rgba(79,209,255,0.06) 60%, transparent 75%)',
  },
  connected: {
    label: 'Connected',
    accent: '#5EEAD4',
    glow: 'rgba(94,234,212,0.30)',
    inner: 'radial-gradient(circle at 50% 40%, rgba(94,234,212,0.16), rgba(94,234,212,0.05) 60%, transparent 75%)',
  },
  error: {
    label: 'Retry',
    accent: '#F87171',
    glow: 'rgba(248,113,113,0.26)',
    inner: 'radial-gradient(circle at 50% 40%, rgba(248,113,113,0.16), rgba(248,113,113,0.05) 60%, transparent 75%)',
  },
};

export const ConnectButton = React.memo(({ serverId, size = 200 }: ConnectButtonProps) => {
  const { status, toggleConnection } = useConnection();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const state = STATE[status === 'error' ? 'error' : status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected'];
  const isConnecting = status === 'connecting';
  const isConnected = status === 'connected';

  const handleClick = useCallback(() => {
    toggleConnection(serverId);
  }, [toggleConnection, serverId]);

  return (
    <div style={{ position: 'relative', width: size + 64, height: size + 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Thin breathing halo — born from the rope, calm when idle */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 0 1px ${state.glow}`,
            `0 0 48px 6px ${state.glow}`,
            `0 0 0 1px ${state.glow}`,
          ],
        }}
        transition={{ duration: isConnected ? 3.6 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: size + 4,
          height: size + 4,
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {/* Slow rotating knot-work ring — the rope's fine weave */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: size + 28,
          height: size + 28,
          borderRadius: '50%',
          border: `1.5px dashed ${state.accent}33`,
          opacity: isConnected ? 0.55 : 0.35,
        }}
      />

      {/* Connecting — cyan arcs wrapping the knot */}
      <AnimatePresence>
        {isConnecting && (
          <motion.div
            key="arc"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              width: size + 16,
              height: size + 16,
              borderRadius: '50%',
              border: '2.5px solid transparent',
              borderTopColor: state.accent,
              borderRightColor: state.accent,
              opacity: 0.85,
              filter: 'blur(1.5px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* The knot — matte glass, never a plain green disc */}
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 26 }}
        onClick={handleClick}
        disabled={isConnecting}
        aria-label={`VPN durumu: ${state.label}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: 'var(--text-primary)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.3px',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          boxShadow: `
            0 0 60px ${state.glow},
            inset 0 1px 1px rgba(255,255,255,0.10),
            inset 0 -24px 48px rgba(0,0,0,0.35)
          `,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      >
        {/* Inner blue / mint glow — breathes when connected */}
        <motion.div
          animate={
            isConnected
              ? { opacity: [0.55, 1, 0.55], scale: [0.96, 1, 0.96] }
              : { opacity: [0.5, 0.8, 0.5] }
          }
          transition={{ duration: isConnected ? 3.4 : 4.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: state.inner,
            pointerEvents: 'none',
          }}
        />

        {/* Thin cyan/mint ring inside the glass edge */}
        <motion.div
          animate={{ opacity: isConnected ? [0.4, 0.9, 0.4] : 0.35 }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 3,
            borderRadius: '50%',
            border: `1px solid ${isConnected ? 'rgba(94,234,212,0.5)' : 'rgba(255,255,255,0.14)'}`,
            boxShadow: isConnected ? 'inset 0 0 18px rgba(94,234,212,0.14)' : 'none',
            pointerEvents: 'none',
          }}
        />

        <AnimatePresence mode="wait">
          {isConnecting ? (
            <motion.div
              key="spinner"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={30} strokeWidth={2.4} color={state.accent} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="knot"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              <KnotGlyph accent={state.accent} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.span
          key={state.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {state.label}
        </motion.span>

        {/* Status dot */}
        <motion.div
          animate={{
            opacity: isConnected ? [1, 0.5, 1] : 0,
            scale: isConnected ? [1, 1.25, 1] : 0.6,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: 16,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isConnected ? '#5EEAD4' : 'transparent',
            boxShadow: isConnected ? '0 0 12px #5EEAD4' : 'none',
          }}
        />
      </motion.button>
    </div>
  );
});

/**
 * The rope-knot glyph — the same living-rope identity as the background
 * entity, drawn as a single continuous strand.
 */
const KnotGlyph: React.FC<{ accent: string }> = ({ accent }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 18 C 9 20, 16 17, 16 12.5 C 16 8.5, 12 7.5, 10 9 C 8 10.5, 8.5 13.5, 11 13 C 13.5 12.5, 16 10.5, 16.5 7.5" />
  </svg>
);

ConnectButton.displayName = 'ConnectButton';

export default ConnectButton;
