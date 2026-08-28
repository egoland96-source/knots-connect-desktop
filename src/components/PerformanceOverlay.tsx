import React, { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, HardDrive } from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';

function useFps(enabled: boolean) {
  const [fps, setFps] = useState(0);
  const frames = useRef<number[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = (t: number) => {
      frames.current.push(t);
      frames.current = frames.current.filter((v) => t - v < 1000);
      setFps(frames.current.length);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return fps;
}

export const PerformanceOverlay: React.FC = () => {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('knots:perfOverlay') === '1');
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const cpuUsage = useConnectionStore((s) => s.cpuUsage);
  const memoryUsage = useConnectionStore((s) => s.memoryUsage);
  const fps = useFps(enabled);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'boolean') setEnabled(detail);
      else setEnabled(localStorage.getItem('knots:perfOverlay') === '1');
    };
    window.addEventListener('knots:perfOverlay' as any, handler as any);
    window.addEventListener('storage', handler as any);
    return () => {
      window.removeEventListener('knots:perfOverlay' as any, handler as any);
      window.removeEventListener('storage', handler as any);
    };
  }, []);

  const [gpu, setGpu] = useState('—');
  useEffect(() => {
    if (!enabled) return;
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') as any) || canvas.getContext('experimental-webgl');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      if (dbg) setGpu(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).split(' ').slice(0, 2).join(' '));
      else setGpu('WebGL');
    } catch {
      setGpu('—');
    }
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 90,
        width: 220,
        padding: 10,
        borderRadius: 12,
        background: 'rgba(8,13,22,0.88)',
        border: '1px solid rgba(52,211,153,0.22)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.38)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'DM Mono, monospace',
        fontSize: 11,
        lineHeight: 1.6,
        color: '#94A3B8',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: '0.1em', color: '#34D399', marginBottom: 6 }}>DIAGNOSTICS OVERLAY</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={10} /> FPS</span><span style={{ color: '#E2E8F0', fontWeight: 700 }}>{fps}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Cpu size={10} /> CPU</span><span style={{ color: '#E2E8F0', fontWeight: 700 }}>{cpuUsage ? `${cpuUsage.toFixed(0)}%` : '—'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HardDrive size={10} /> MEM</span><span style={{ color: '#E2E8F0', fontWeight: 700 }}>{memoryUsage ? `${memoryUsage.toFixed(0)} MB` : '—'}</span>
        <span>LAT</span><span style={{ color: '#E2E8F0', fontWeight: 700 }}>{latencyMs ? `${Math.round(latencyMs)} ms` : '—'}</span>
        <span>GPU</span><span style={{ color: '#E2E8F0', fontWeight: 700, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gpu}>{gpu}</span>
      </div>
    </div>
  );
};

export default PerformanceOverlay;
