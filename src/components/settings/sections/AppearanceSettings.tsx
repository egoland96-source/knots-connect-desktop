import React, { useEffect, useState } from 'react';
import { Palette, Monitor, Moon } from 'lucide-react';

const Header: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.18)' }}>
        <Palette size={14} />
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

export const AppearanceSettings: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [accent, setAccent] = useState<'blue' | 'violet'>(() => (localStorage.getItem('knots:accent') as any) ?? 'blue');
  const [windowOpacity, setWindowOpacity] = useState<number>(() => Number(localStorage.getItem('knots:winOpacity') ?? 100));

  useEffect(() => {
    localStorage.setItem('knots:accent', accent);
    document.documentElement.setAttribute('data-accent', accent);
    onSaved();
  }, [accent]);

  useEffect(() => {
    localStorage.setItem('knots:winOpacity', String(windowOpacity));
    onSaved();
  }, [windowOpacity]);

  return (
    <div>
      <Header title="Appearance" desc="Window chrome and theme — Dark-Tech is the only supported theme for now." />

      <Row
        title="Theme"
        desc="Dark-Tech (#080D16) — high contrast layers, no neon glow."
        control={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, background: '#111928', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0', fontSize: 12, fontWeight: 700 }}>
            <Moon size={12} /> Dark-Tech
          </span>
        }
      />

      <Row
        title="Accent"
        desc="Used for active states and links."
        control={
          <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 10, background: 'rgba(8,13,22,0.72)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['blue', 'violet'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setAccent(c)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  border: '1px solid',
                  borderColor: accent === c ? (c === 'blue' ? 'rgba(59,130,246,0.35)' : 'rgba(167,139,250,0.35)') : 'transparent',
                  background: c === 'blue' ? '#3B82F6' : '#A78BFA',
                  boxShadow: accent === c ? '0 0 12px rgba(0,0,0,0.18)' : 'none',
                  cursor: 'pointer',
                }}
                aria-label={c}
              />
            ))}
          </div>
        }
      />

      <Row
        title="Window translucency"
        desc="Subtle glass intensity for panels."
        control={
          <input
            type="range"
            min={80}
            max={100}
            value={windowOpacity}
            onChange={(e) => setWindowOpacity(Number(e.target.value))}
            style={{ width: 140, accentColor: '#3B82F6' }}
          />
        }
      />

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(17,25,40,0.68)', border: '1px solid rgba(255,255,255,0.06)', color: '#94A3B8', fontSize: 12, lineHeight: 1.5 }}>
        <Monitor size={14} /> Preview: panels use <span style={{ color: '#E2E8F0', fontWeight: 700 }}>#111928</span> glass — active states <span style={{ color: '#34D399', fontWeight: 700 }}>#34D399</span>.
      </div>
    </div>
  );
};

export default AppearanceSettings;
