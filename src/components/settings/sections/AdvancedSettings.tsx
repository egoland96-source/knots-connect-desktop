import React, { useEffect, useRef, useState } from 'react';
import { Bug, FileText, RotateCcw, Activity, Cpu, HardDrive } from 'lucide-react';
import { useConnectionStore } from '../../../store/connectionStore';

const Header: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.18)' }}>
        <Bug size={14} />
      </span>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F8FAFC' }}>{title}</h3>
    </div>
    <p style={{ margin: '6px 0 0 40px', fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>{desc}</p>
  </div>
);

const Row: React.FC<{ title: string; desc: string; control: React.ReactNode }> = ({ title, desc, control }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{desc}</div>
    </div>
    {control}
  </div>
);

// Simple FPS hook
function useFps(enabled: boolean) {
  const [fps, setFps] = useState<number>(0);
  const ref = useRef<number | null>(null);
  const frames = useRef<number[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = (t: number) => {
      frames.current.push(t);
      const now = t;
      frames.current = frames.current.filter((v) => now - v < 1000);
      setFps(frames.current.length);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return fps;
}

const PerformanceOverlay: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const cpuUsage = useConnectionStore((s) => s.cpuUsage);
  const memoryUsage = useConnectionStore((s) => s.memoryUsage);
  const fps = useFps(enabled);

  // Mock GPU if not available
  const [gpu, setGpu] = useState<string>('—');
  useEffect(() => {
    if (!enabled) return;
    // Try to get GPU via WebGL
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
        zIndex: 80,
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HardDrive size={10} /> MEM</span><span style={{ color: '#E2E8F0', fontWeight: 700 }}>{memoryUsage ? `${(memoryUsage).toFixed(0)} MB` : '—'}</span>
        <span>LAT</span><span style={{ color: '#E2E8F0', fontWeight: 700 }}>{latencyMs ? `${Math.round(latencyMs)} ms` : '—'}</span>
        <span>GPU</span><span style={{ color: '#E2E8F0', fontWeight: 700, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gpu}>{gpu}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: '#64748B' }}>Press toggle again to hide • DevTools closed by default</div>
    </div>
  );
};

export const AdvancedSettings: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [showOverlay, setShowOverlay] = useState<boolean>(() => localStorage.getItem('knots:perfOverlay') === '1');
  const [logs, setLogs] = useState<string>('—');

  useEffect(() => {
    localStorage.setItem('knots:perfOverlay', showOverlay ? '1' : '0');
    // Also dispatch event so any global overlay can react
    window.dispatchEvent(new CustomEvent('knots:perfOverlay', { detail: showOverlay }));
    onSaved();
  }, [showOverlay]);

  const handleOpenLogs = async () => {
    try {
      // Try to open logs via IPC if available
      const anyWin = window as any;
      if (anyWin.knots?.openLogs) await anyWin.knots.openLogs();
      else if (anyWin.knots?.openReleases) await anyWin.knots.openReleases();
      setLogs('Logs opened via IPC (if available). Check userData/logs.');
    } catch {
      setLogs('No IPC bridge for logs — check userData folder manually.');
    }
    onSaved();
  };

  const handleReset = async () => {
    if (!confirm('Reset all preferences to defaults?')) return;
    localStorage.clear();
    // Reset stores to defaults where possible
    try {
      const { useConnectionStore } = await import('../../../store/connectionStore');
      // Reset settings via toggle? For now just reload
      location.reload();
    } catch {}
  };

  const handleToggleDevTools = async () => {
    try {
      const anyWin = window as any;
      if (anyWin.knots?.toggleDevTools) await anyWin.knots.toggleDevTools();
      else if (anyWin.windowControls) {
        // Fallback: try to open devtools via Electron remote (if exposed)
        console.warn('toggleDevTools not exposed via IPC');
      }
    } catch {}
  };

  return (
    <div>
      <Header title="Advanced" desc="Diagnostics, logs and reset — for power users. Performance telemetry is hidden by default." />
      <PerformanceOverlay enabled={showOverlay} />

      <Row
        title="Show performance overlay"
        desc="Display FPS, GPU, CPU, LAT and memory as a small overlay. Hidden from the main view by default."
        control={
          <button
            onClick={() => setShowOverlay((v) => !v)}
            role="switch"
            aria-checked={showOverlay}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              border: '1px solid',
              borderColor: showOverlay ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
              background: showOverlay ? '#34D399' : 'rgba(255,255,255,0.10)',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <span style={{ position: 'absolute', top: 2, left: showOverlay ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 160ms ease', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }} />
          </button>
        }
      />

      <Row
        title="Diagnostics"
        desc="Verbose logging for troubleshooting. Requires restart."
        control={
          <button
            onClick={handleToggleDevTools}
            style={{
              padding: '7px 10px',
              borderRadius: 9,
              background: '#111928',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#E2E8F0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open DevTools
          </button>
        }
      />

      <Row
        title="Logs"
        desc="Open the log directory or copy recent logs. No telemetry leaves the device."
        control={
          <button
            onClick={handleOpenLogs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 10px',
              borderRadius: 9,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.18)',
              color: '#3B82F6',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={12} /> Open logs
          </button>
        }
      />
      {logs !== '—' && <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace', marginTop: 6, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>{logs}</div>}

      <div style={{ marginTop: 14, padding: '12px', borderRadius: 12, background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#FB7185' }}>Reset preferences</div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Clears local settings and blocklists — does not delete Knots ID.</div>
        </div>
        <button
          onClick={handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 9,
            background: '#111928',
            border: '1px solid rgba(251,113,133,0.22)',
            color: '#FB7185',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace', lineHeight: 1.5 }}>
        Background #080D16 • Glass #111928 • Active #34D399 • Accent #3B82F6 / #A78BFA — no neon glow, just contrast layers.
      </div>
    </div>
  );
};

export default AdvancedSettings;
