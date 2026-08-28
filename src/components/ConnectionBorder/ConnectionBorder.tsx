import React, { useRef } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';
import { useConnectionStore } from '../../store/connectionStore';

/**
 * Knots Connect border signature — neon energy travelling on the window frame.
 *
 * The light is BORN at the exact bottom-center of the window and then travels
 * around the outer frame, counter-clockwise:
 *
 *   bottom-center → bottom-left → top-left → top-right → bottom-right → again
 *
 * (alt → sol → üst → sağ → alt). It never enters the UI or the cards — it
 * only runs along the very edge of the window, like a comet with a blue tail.
 *
 * It never stops: while connecting it speeds up, while connected it settles
 * into a slow, calm loop, and when disconnected it keeps travelling but very
 * dim. The path begins at the bottom-center point, so every revolution the
 * light is reborn from there.
 */

// Perimeter starting at the bottom-center, going counter-clockwise
// Use 0..100 viewBox coords — NEVER use % in SVG path d (Chrome throws
// "Expected number, M 50% 100%"). The svg below has viewBox 0 0 100 100.
const TRAVEL_PATH = 'M 50 100 L 0 100 L 0 0 L 100 0 L 100 100 Z';

// path-units (0..100) per millisecond — full loop durations:
// connecting 4.5s, connected 9s, disconnected 14s
const RATES = { connecting: 100 / 4500, active: 100 / 9000, idle: 100 / 14000 };

export const ConnectionBorder: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const active = status === 'connected';
  const connecting = status === 'connecting';

  const stateRef = useRef({ active, connecting });
  stateRef.current = { active, connecting };

  const travel = useMotionValue(0);
  const coreOffset = useMotionValue(0);
  const tailOffset = useMotionValue(10);

  useAnimationFrame((_, delta) => {
    const st = stateRef.current;
    const rate = st.connecting ? RATES.connecting : st.active ? RATES.active : RATES.idle;
    const next = (travel.get() + delta * rate) % 100;
    travel.set(next);
    const o = -next;
    coreOffset.set(o);
    tailOffset.set(o + 10);
  });

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 600 }} aria-hidden>
      {/* Faint static inner ring for window depth — only fades in while connected */}
      <motion.div
        animate={{ opacity: active ? 1 : connecting ? 0.35 : 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 40px rgba(88,197,255,0.05)',
        }}
      />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="knots-border-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.g
          filter="url(#knots-border-glow)"
          animate={{ opacity: active ? 1 : connecting ? 0.55 : 0.1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          {/* Blue comet tail — trails behind the white core */}
          <motion.path
            d={TRAVEL_PATH}
            fill="none"
            stroke="rgba(88,197,255,0.4)"
            strokeWidth={5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray="10 90"
            strokeDashoffset={tailOffset}
          />
          {/* The white light itself */}
          <motion.path
            d={TRAVEL_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={1.6}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray="2.5 97.5"
            strokeDashoffset={coreOffset}
          />
        </motion.g>
      </svg>
    </div>
  );
};

export default ConnectionBorder;
