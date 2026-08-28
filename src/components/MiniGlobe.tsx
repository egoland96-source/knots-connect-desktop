// @ts-nocheck
import { useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlasRaw from 'world-atlas/countries-110m.json?raw';

type Props = {
  lat: number;
  lon: number;
  markerLat?: number;
  markerLon?: number;
  size?: number;
  onCenterChange?: (lat: number, lon: number) => void;
};

export const MiniGlobe = ({ lat, lon, markerLat, markerLon, size = 96, onCenterChange }: Props) => {
  const width = 120;
  const height = 120;
  const scale = 18;
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startCenter = useRef({ lat, lon });
  const mLat = markerLat ?? lat;
  const mLon = markerLon ?? lon;

  let countries: any[] = [];
  let useRealMap = false;
  try {
    const data: any = JSON.parse((worldAtlasRaw as unknown as string));
    const src = (data as any).default || data;
    const feats = (feature as any)(src, src.objects.countries).features;
    if (feats && feats.length > 20) {
      countries = feats;
      useRealMap = true;
    }
  } catch {}

  // Globe viewport = main map's viewport (where you're looking)
  const projection = geoMercator().scale(scale).translate([width / 2, height / 2]).center([lon, lat]);
  const path = geoPath(projection as any);
  // Blue dot = server/user location (fixed at the country)
  const dot = projection([mLon, mLat] as any) as [number, number] | null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onCenterChange) return;
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startCenter.current = { lat, lon };
    const onWinMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - startPos.current.x;
      const dy = ev.clientY - startPos.current.y;
      const dLon = (-dx / scale) * (180 / Math.PI);
      const dLat = (dy / scale) * (180 / Math.PI);
      const newLon = startCenter.current.lon + dLon;
      const newLat = Math.max(-72, Math.min(72, startCenter.current.lat + dLat));
      onCenterChange(newLat, newLon);
    };
    const onWinUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onWinMove);
      window.removeEventListener('mouseup', onWinUp);
    };
    window.addEventListener('mousemove', onWinMove);
    window.addEventListener('mouseup', onWinUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 32% 28%, #1e2e4f 0%, #0e1a2e 52%, #070d1a 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
        cursor: onCenterChange ? 'grab' : 'default',
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width={size} height={size} style={{ display: 'block' }}>
        <defs>
          <clipPath id="mini-globe-clip">
            <circle cx={width / 2} cy={height / 2} r={width / 2 - 2} />
          </clipPath>
          <radialGradient id="mini-globe-shade" cx="32%" cy="28%" r="78%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.13)" />
            <stop offset="58%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.34)" />
          </radialGradient>
        </defs>

        <circle cx={width / 2} cy={height / 2} r={width / 2 - 1} fill="#0e1a2e" />

        {useRealMap ? (
          <g clipPath="url(#mini-globe-clip)" fill="rgba(255,255,255,0.075)" stroke="rgba(255,255,255,0.10)" strokeWidth={0.45}>
            {countries.map((f: any, i: number) => {
              const d = path(f as any);
              return d ? <path key={i} d={d} /> : null;
            })}
          </g>
        ) : (
          <g clipPath="url(#mini-globe-clip)" fill="rgba(255,255,255,0.075)" stroke="rgba(255,255,255,0.10)" strokeWidth={0.6}>
            <path d="M 18 34 L 36 30 L 44 38 L 34 52 L 18 54 Z" />
            <path d="M 54 34 L 68 30 L 72 42 L 62 48 Z" />
            <path d="M 48 50 L 64 46 L 68 62 L 58 70 Z" />
          </g>
        )}

        <circle cx={width / 2} cy={height / 2} r={width / 2 - 1} fill="url(#mini-globe-shade)" style={{ pointerEvents: 'none' }} />
        <circle cx={width / 2} cy={height / 2} r={width / 2 - 1} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />

        {dot && (
          <g>
            <circle cx={dot[0]} cy={dot[1]} r={13} fill="rgba(61,181,255,0.16)" style={{ animation: 'mini-globe-pulse 2.2s ease-out infinite' }} />
            <circle cx={dot[0]} cy={dot[1]} r={3.4} fill="#3DB5FF" stroke="rgba(255,255,255,0.96)" strokeWidth={0.9} />
            <circle cx={dot[0]} cy={dot[1]} r={1.2} fill="#fff" />
          </g>
        )}
      </svg>

      <style>{`
        @keyframes mini-globe-pulse {
          0% { transform: scale(0.42); opacity: 0.88; }
          70% { transform: scale(1.75); opacity: 0; }
          100% { transform: scale(1.75); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MiniGlobe;
