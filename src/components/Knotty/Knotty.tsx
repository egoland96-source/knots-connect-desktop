import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Knotty — the Knots Connect mascot.
 *
 * A living entity made of a white, smooth, shiny rope.
 * Never a cartoon character: no arms, no legs, no clothes, no face.
 *
 * VPN mode — the rope ties a knot on itself. Not static: it constantly
 * moves very slightly, stretching and relaxing as if breathing, while a
 * calm blue energy flows from bottom to top inside the rope.
 *
 * DPI mode — the rope extends into a head-and-shoulders silhouette with
 * no facial details. The form stays completely white and its undulation
 * reacts to the real latency: low ping keeps it almost flat, high ping
 * makes the rope wave proportionally. The user feels the connection
 * without reading numbers.
 */

const ROPE = '#F2F7FF';
const ROPE_SHADE = 'rgba(201,216,236,0.55)';
const ROPE_HIGHLIGHT = 'rgba(255,255,255,0.5)';

const safeNum = (value: number | null | undefined): number =>
  typeof value === 'number' && isFinite(value) ? value : 0;

interface KnottyProps {
  mode: 'vpn' | 'dpi';
  active: boolean;
  connecting?: boolean;
  latencyMs?: number | null;
  size?: number;
}

export const Knotty: React.FC<KnottyProps> = ({ mode, active, connecting = false, latencyMs, size = 200 }) => {
  const glowOpacity = active ? [0.5, 0.8, 0.5] : connecting ? [0.3, 0.55, 0.3] : [0.2, 0.32, 0.2];

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Soft glow */}
      <motion.div
        animate={{ opacity: glowOpacity, scale: [1, 1.05, 1] }}
        transition={{ duration: active ? 4 : 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: -26,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(61,181,255,0.32) 0%, rgba(61,181,255,0.11) 45%, transparent 70%)',
          filter: 'blur(10px)',
          zIndex: 0,
        }}
      />

      {/* Tiny floating */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        {/* Slow breathing */}
        <motion.div
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '100%', height: '100%' }}
        >
          <AnimatePresence mode="wait">
            {mode === 'vpn' ? <KnotSVG key="knot" /> : <DpiSVG key="dpi" latencyMs={latencyMs} />}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

/* =====================================================================
   VPN — the rope ties a knot on itself
   ===================================================================== */
const KNOT_PATH = 'M 100 40 A 58 58 0 0 1 130 152 A 30 30 0 0 1 70 152 A 58 58 0 0 0 100 40 Z';

const KnotSVG: React.FC = () => (
  <motion.svg
    key="knot"
    viewBox="0 0 200 200"
    width="100%"
    height="100%"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.97 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    style={{ display: 'block' }}
  >
    <defs>
      <filter id="knotty-energy" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* The knot is never static: gentle breathing + slight constant movement */}
    <motion.g
      animate={{ scaleY: [1, 1.045, 1], rotate: [-1, 1, -1] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '50% 50%', transformBox: 'fill-box' }}
    >
      {/* Shadow */}
      <motion.path d={KNOT_PATH} fill="none" stroke="rgba(6,17,30,0.35)" strokeWidth={20} strokeLinejoin="round" transform="translate(0 3)" />
      {/* Rope base */}
      <motion.path d={KNOT_PATH} fill="none" stroke={ROPE} strokeWidth={16} strokeLinejoin="round" />
      {/* Rope twist texture */}
      <motion.path d={KNOT_PATH} fill="none" stroke={ROPE_SHADE} strokeWidth={16} strokeLinejoin="round" strokeDasharray="2 9" />
      <motion.path
        d={KNOT_PATH}
        fill="none"
        stroke={ROPE_HIGHLIGHT}
        strokeWidth={16}
        strokeLinejoin="round"
        strokeDasharray="2 9"
        strokeDashoffset={5}
        opacity={0.4}
      />

      {/* Blue energy flowing inside the rope — slow, never distracting */}
      <motion.g filter="url(#knotty-energy)">
        <motion.path
          d={KNOT_PATH}
          fill="none"
          stroke="rgba(61,181,255,0.30)"
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="4 21"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.path
          d={KNOT_PATH}
          fill="none"
          stroke="#3DB5FF"
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="4 21"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
      </motion.g>
    </motion.g>
  </motion.svg>
);

/* =====================================================================
   DPI — the rope extends into a head-and-shoulders silhouette.
   Its waves react to real latency: low ping ≈ flat, high ping ≈ flowing.
   ===================================================================== */
const buildDpiPath = (w: number): string =>
  [
    'M 100 14',
    'C 60 14 52 44 52 70',
    'L 52 94',
    'C 38 98 24 104 24 124',
    'C 24 132 32 134 40 130',
    `C 48 150 58 152 72 ${150 + w * 12}`,
    `C 86 ${148 + w * 16} 95 152 100 ${150 + w * 12}`,
    `C 105 152 114 ${148 + w * 16} 128 ${150 + w * 12}`,
    'C 142 152 152 150 160 130',
    'C 168 134 176 132 176 124',
    'C 176 104 162 98 148 94',
    'L 148 70',
    'C 148 44 140 14 100 14',
    'Z',
  ].join(' ');

const DpiSVG: React.FC<{ latencyMs?: number | null }> = ({ latencyMs }) => {
  const latency = safeNum(latencyMs);
  const wave = latency <= 0 ? 0 : Math.max(0, Math.min(1, (latency - 40) / 120));
  const d = useMemo(() => buildDpiPath(wave), [wave]);

  return (
    <motion.svg
      key="dpi"
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -6 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="knotty-dpi-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DCEAF8" />
        </linearGradient>
      </defs>

      <motion.g
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '50% 62%', transformBox: 'fill-box' }}
      >
        {/* Shadow */}
        <motion.path d={d} fill="rgba(6,17,30,0.30)" transform="translate(0 3)" />
        {/* Body — stays completely white */}
        <motion.path d={d} fill="url(#knotty-dpi-body)" animate={{ d }} transition={{ duration: 1.1, ease: 'easeOut' }} />

        {/* Subtle rope threads */}
        <motion.path d="M 72 122 L 66 158" stroke={ROPE_HIGHLIGHT} strokeWidth="2" strokeLinecap="round" fill="none" />
        <motion.path d="M 100 96 L 100 160" stroke={ROPE_HIGHLIGHT} strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.7} />
        <motion.path d="M 128 122 L 134 158" stroke={ROPE_HIGHLIGHT} strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Gentle energy rising inside the extended rope */}
        <motion.path
          d="M 100 172 L 100 44"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 16"
          opacity={0.5}
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </motion.g>
    </motion.svg>
  );
};

export default Knotty;
