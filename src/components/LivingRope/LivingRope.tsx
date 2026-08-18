import React, { useEffect, useRef } from 'react';
import { motion, animate, useAnimationFrame, useMotionValue } from 'framer-motion';

/**
 * Living Rope — the signature of Knots Connect.
 *
 * One entity, one <path>. It never disappears, is never replaced, never
 * pops in. Everything morphs continuously in front of the user's eyes on a
 * single SVG path — no fade-out/fade-in, ever. The animation runs entirely
 * on requestAnimationFrame at 60 FPS: the path is regenerated per frame but
 * nothing re-renders React (only the SVG attribute updates).
 *
 * STABILITY — the rope is a physical chain, not a visualizer. It holds a
 * stable shape and does not vibrate or oscillate on its own. Only changes
 * in network telemetry (ping, jitter, packet loss) cause it to morph: the
 * ping is spring-interpolated (never jumps) and the physical chain responds
 * with weight, tension and elasticity, then SETTLES and becomes still again
 * until the next telemetry change.
 *
 * DPI — the rope is the live network graph:
 *   5–20 ms    almost flat        50–100 ms  wave height grows
 *   20–50 ms   light, smooth wave 100–200 ms harder zigzag
 *   200+ ms    big, distorted waves
 * Amplitude = ping, Frequency = ping, Smoothness = ping. packetLoss adds
 * glitch tugs and flat cuts, jitter adds roughness.
 *
 * VPN — the rope ties itself into an overhand knot.
 *
 * Mode switches relax through a single rope first:
 *   knot → single rope → graph  (and reverse)
 */

const N = 80;
// Transition spring (mode changes) — mildly damped, settles cleanly
const SPRING = { type: 'spring' as const, stiffness: 110, damping: 20, mass: 1 };

// Rope physics — damped so the chain converges and comes to rest
const K_TARGET = 240; // how strongly each point chases the target shape
const K_END = 700; // anchor stiffness for the two rope ends
const FRICTION = 0.9; // velocity retention — strong enough to settle in ~0.5s
const ITER = 5; // distance-constraint relaxation passes

type ShapeId = 'neutral' | 'silhouette' | 'knot' | 'graph';
type Point = [number, number];

interface RopeParams {
  ping: number; // current ping, spring-smoothed (ms)
  avgPing: number; // average ping — stable baseline (ms)
  packetLoss: number; // 0..100
  jitter: number; // ms
}

const ZERO_PARAMS: RopeParams = { ping: 0, avgPing: 0, packetLoss: 0, jitter: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const shapeGenerators: Record<ShapeId, (p: RopeParams) => Point[]> = {
  // Calm resting rope — static, gently curved, no vibration
  neutral: () => {
    const pts: Point[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = 100 + t * 600;
      const y = 80 + Math.sin(t * Math.PI * 2) * 1.5 + Math.sin(t * Math.PI * 4 + 1.2) * 0.7;
      pts.push([x, y]);
    }
    return pts;
  },

  // Upper-body human outline made entirely from one continuous rope
  silhouette: () => {
    const pts: Point[] = [];
    const hx = 400;
    const hy = 46;
    const hr = 30;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      if (t < 0.22) {
        const u = t / 0.22;
        pts.push([265 + u * (334 - 265), 128 - u * (128 - 60)]);
      } else if (t < 0.3) {
        const u = (t - 0.22) / 0.08;
        const x1 = hx - hr * 0.707;
        const y1 = hy + hr * 0.707;
        pts.push([334 + (x1 - 334) * u, 60 + (y1 - 60) * u]);
      } else if (t < 0.7) {
        const u = (t - 0.3) / 0.4;
        const a = ((135 + u * 270) * Math.PI) / 180;
        pts.push([hx + hr * Math.cos(a), hy + hr * Math.sin(a)]);
      } else if (t < 0.78) {
        const u = (t - 0.7) / 0.08;
        const x0 = hx + hr * 0.707;
        const y0 = hy + hr * 0.707;
        pts.push([x0 + (466 - x0) * u, y0 + (60 - y0) * u]);
      } else {
        const u = (t - 0.78) / 0.22;
        pts.push([466 + u * (535 - 466), 60 + u * (128 - 60)]);
      }
    }
    return pts;
  },

  // Overhand knot — holds its shape, still once tied
  knot: () => {
    const pts: Point[] = [];
    const cx = 400;
    const cy = 80;
    const r = 58;
    const c1 = 0.28;
    const c2 = 0.72;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      if (t < c1) {
        const u = t / c1;
        const x = 100 + u * (cx + r - 100);
        const y = cy + Math.sin(u * Math.PI) * 2.2 * (1 - u);
        pts.push([x, y]);
      } else if (t > c2) {
        const u = (t - c2) / (1 - c2);
        const x = cx + r + u * (700 - (cx + r));
        const y = cy + Math.sin(u * Math.PI) * 2.2 * u;
        pts.push([x, y]);
      } else {
        const u = ((t - c1) / (c2 - c1)) * Math.PI * 2;
        const asym = 1 + 0.16 * Math.sin(u * 2);
        const lx = r * Math.cos(u);
        const ly = r * 0.58 * Math.sin(2 * u);
        const x = cx + lx * asym;
        const y = cy + ly;
        pts.push([x, y]);
      }
    }
    return pts;
  },

  // The rope is the live network graph — a static, organic waveform whose
  // amplitude / frequency / smoothness derive from the current telemetry.
  graph: (p) => {
    const pts: Point[] = [];
    const ping = Math.max(5, p.ping);
    const amp = 2 + 30 * (1 - Math.exp(-ping / 95));
    const freqScale = 1 + ping / 180;
    const zig = clamp((ping - 90) / 110, 0, 1);
    const distort = clamp((ping - 160) / 90, 0, 1);
    const loss = clamp(p.packetLoss, 0, 100) / 100;
    const jitAmp = 1 + (p.jitter / 60) * 0.6;
    const freq = (Math.PI / 210) * freqScale;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = 100 + t * 600;
      let v = Math.sin(x * freq) * amp;
      v += Math.sin(x * freq * 2.17 + 1.7) * amp * 0.28 * zig;
      v += Math.sin(x * freq * 0.51 + 0.9) * amp * 0.18 * distort;
      v += Math.sin(x * 0.037 + 2.1) * Math.sin(x * 0.011) * amp * 0.35 * distort;
      const pull = Math.abs(Math.sin(x * 0.007));
      if (pull > 0.92) v += ((pull - 0.92) / 0.08) * amp * 0.8 * loss;
      const cut = loss > 0.35 ? Math.sin(x * 0.005 + 1) : -1;
      if (cut > 0.82) v *= 0.3;
      v *= jitAmp;
      v = clamp(v, -48, 48);
      pts.push([x, 80 + v]);
    }
    return pts;
  },
};

const pointsToPath = (pts: Point[]): string => {
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
};

interface LivingRopeProps {
  mode: 'vpn' | 'dpi';
  active: boolean;
  connecting?: boolean;
  latencyMs?: number | null;
  avgPing?: number | null;
  packetLoss?: number | null;
  jitter?: number | null;
}

export const LivingRope: React.FC<LivingRopeProps> = ({
  mode,
  active,
  connecting = false,
  latencyMs,
  avgPing,
  packetLoss,
  jitter,
}) => {
  const safe = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const pingRef = useRef(0);
  pingRef.current = safe(latencyMs);

  const avgRef = useRef(0);
  avgRef.current = safe(avgPing);

  const lossRef = useRef(0);
  lossRef.current = safe(packetLoss);

  const jitRef = useRef(0);
  jitRef.current = safe(jitter);

  // Spring-smoothed ping — samples never jump between frames
  const smoothPingRef = useRef(0);
  const pingVelRef = useRef(0);

  // Physical chain state
  const posRef = useRef<Point[] | null>(null);
  const prevRef = useRef<Point[] | null>(null);

  const morph = useMotionValue(1);
  const d = useMotionValue(pointsToPath(shapeGenerators.neutral(ZERO_PARAMS)));

  const fromRef = useRef<Point[]>(shapeGenerators.neutral(ZERO_PARAMS));
  const intoRef = useRef<ShapeId>('neutral');
  const sequenceRef = useRef<ShapeId[]>([]);
  const displayedRef = useRef<Point[]>(shapeGenerators.neutral(ZERO_PARAMS));
  const finalTargetRef = useRef<ShapeId>('neutral');
  const morphAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  const stepToNext = () => {
    const seq = sequenceRef.current;
    if (!seq.length) return;
    const next = seq.shift() as ShapeId;
    intoRef.current = next;
    fromRef.current = displayedRef.current.map((p) => [p[0], p[1]] as Point);
    morphAnimRef.current?.stop();
    morph.set(0);
    // Physical spring — the rope stretches and settles with inertia
    morphAnimRef.current = animate(morph, 1, {
      ...SPRING,
      onComplete: () => stepToNext(),
    });
  };

  const shapeTarget: ShapeId =
    !active && !connecting ? 'neutral' : mode === 'dpi' ? 'graph' : 'knot';

  useEffect(() => {
    const prev = finalTargetRef.current;
    if (prev === shapeTarget) return;
    finalTargetRef.current = shapeTarget;
    let seq: ShapeId[];
    if (shapeTarget === 'neutral') {
      seq = ['neutral'];
    } else if (connecting) {
      seq = ['silhouette', shapeTarget];
    } else if (prev === 'neutral') {
      seq = [shapeTarget];
    } else {
      // knot <-> graph relaxes through a single rope first
      seq = ['neutral', shapeTarget];
    }
    sequenceRef.current = seq;
    stepToNext();
  }, [shapeTarget, connecting]);

  useEffect(
    () => () => {
      morphAnimRef.current?.stop();
    },
    []
  );

  useAnimationFrame((_, delta) => {
    // Lazy init of the physical chain
    if (!posRef.current) {
      const init = shapeGenerators.neutral(ZERO_PARAMS);
      posRef.current = init.map((p) => [p[0], p[1]] as Point);
      prevRef.current = init.map((p) => [p[0], p[1]] as Point);
    }

    const dt = Math.min(delta * 0.001, 0.05);
    const dt2 = dt * dt;

    // Critically damped spring toward the effective ping (current + average).
    // No jumps, no overshoot — the rope follows telemetry and settles.
    const target = pingRef.current * 0.7 + avgRef.current * 0.3;
    const K = 120;
    const D = 22;
    const x = smoothPingRef.current;
    pingVelRef.current += ((target - x) * K - pingVelRef.current * D) * dt;
    const nx = x + pingVelRef.current * dt;
    if (Math.abs(target - nx) < 0.05 && Math.abs(pingVelRef.current) < 0.05) {
      smoothPingRef.current = target;
      pingVelRef.current = 0;
    } else {
      smoothPingRef.current = nx;
    }

    const params: RopeParams = {
      ping: Math.max(0, smoothPingRef.current),
      avgPing: avgRef.current,
      packetLoss: lossRef.current,
      jitter: jitRef.current,
    };

    // Composited morph target — the physical chain chases this target.
    const m = Math.max(0, morph.get());
    const shapePts = shapeGenerators[intoRef.current](params);
    const from = fromRef.current;
    const targetPts: Point[] = new Array(N);
    for (let i = 0; i < N; i++) {
      targetPts[i] = [from[i][0] + (shapePts[i][0] - from[i][0]) * m, from[i][1] + (shapePts[i][1] - from[i][1]) * m];
    }

    // --- Verlet chain: weight, tension, elasticity -------------------------
    const restLen: number[] = new Array(N - 1);
    for (let i = 0; i < N - 1; i++) {
      const dx = targetPts[i + 1][0] - targetPts[i][0];
      const dy = targetPts[i + 1][1] - targetPts[i][1];
      restLen[i] = Math.hypot(dx, dy) || 7.6;
    }

    const pos = posRef.current!;
    const prev = prevRef.current!;
    const next: Point[] = new Array(N);
    for (let i = 0; i < N; i++) {
      const k = i === 0 || i === N - 1 ? K_END : K_TARGET;
      const ax = (targetPts[i][0] - pos[i][0]) * k;
      const ay = (targetPts[i][1] - pos[i][1]) * k;
      const vx = (pos[i][0] - prev[i][0]) * FRICTION;
      const vy = (pos[i][1] - prev[i][1]) * FRICTION;
      next[i] = [pos[i][0] + vx + ax * dt2, pos[i][1] + vy + ay * dt2];
    }

    for (let iter = 0; iter < ITER; iter++) {
      for (let i = 0; i < N - 1; i++) {
        const a = next[i];
        const b = next[i + 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - restLen[i]) / dist;
        const ox = dx * diff * 0.5;
        const oy = dy * diff * 0.5;
        a[0] += ox;
        a[1] += oy;
        b[0] -= ox;
        b[1] -= oy;
      }
    }

    prevRef.current = pos;
    posRef.current = next;
    displayedRef.current = next;
    d.set(pointsToPath(next));
  });

  const opacity = connecting ? 0.6 : active ? 0.8 : 0.5;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 700ms var(--ease)',
      }}
    >
      <svg
        viewBox="0 0 800 160"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="living-rope-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feMorphology operator="dilate" radius="3.5" in="SourceGraphic" result="dilate" />
            <feGaussianBlur in="dilate" stdDeviation="4" result="blur" />
            <feFlood floodColor="rgba(61,181,255,0.55)" floodOpacity="1" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The single rope — white core plus blue bloom come from the same path */}
        <motion.path
          d={d}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={0.9}
          filter="url(#living-rope-glow)"
        />
      </svg>
    </div>
  );
};

export default LivingRope;
