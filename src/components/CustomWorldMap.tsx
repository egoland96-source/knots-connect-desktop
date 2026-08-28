// @ts-nocheck
import { useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import landAtlasRaw from 'world-atlas/land-110m.json?raw';

export type MapNode = {
  id: string;
  country: string;
  code: string;
  lat: number;
  lon: number;
  count: number;
  ping: number;
  load: number;
};

type Props = {
  lat: number;
  lon: number;
  markerLat?: number;
  markerLon?: number;
  zoom?: number;
  nodes?: MapNode[];
  selectedId?: string | null;
  onSelectNode?: (node: MapNode | null) => void;
};

// Single land mass is ~15x cheaper to project than 177 countries
let landFeature: any = null;
try {
  const data: any = JSON.parse((landAtlasRaw as unknown as string));
  const src = (data as any).default || data;
  landFeature = (feature as any)(src, src.objects.land);
} catch {}

export const CustomWorldMap = ({ lat, lon, markerLat, markerLon, zoom = 1, nodes = [], selectedId, onSelectNode }: Props) => {
  const mLat = markerLat ?? lat;
  const mLon = markerLon ?? lon;
  const width = 1000;
  const height = 500;
  const scale = (width / (2 * Math.PI)) * (0.78 + zoom * 0.62);

  const projection = geoMercator().scale(scale).translate([width / 2, height / 2]).center([lon, lat]);
  const path = geoPath(projection as any);
  const landD = landFeature ? path(landFeature as any) : null;
  const dot = projection([mLon, mLat] as any) as [number, number] | null;

  // Note: pan/zoom is now handled by the parent stage via CSS transform on this whole
  // container — this component is purely presentational and never re-renders on drag,
  // so it stays at 60fps even on large maps. The parent updates `lat/lon/zoom` only on drag-end.

  return (
    <div
      onClick={() => onSelectNode?.(null)}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 92% 72% at 50% 36%, #0f1e36 0%, #070d1a 58%, #050a14 100%)',
        overflow: 'hidden',
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="rgba(255,255,255,0.028)" strokeWidth={0.6}>
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (height / 6) * (i + 1);
            return <line key={`h-${i}`} x1={0} y1={y} x2={width} y2={y} />;
          })}
          {Array.from({ length: 11 }).map((_, i) => {
            const x = (width / 12) * (i + 1);
            return <line key={`v-${i}`} x1={x} y1={0} x2={x} y2={height} />;
          })}
        </g>

        {landD && <path d={landD} fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.095)" strokeWidth={0.7} />}

        {/* Neon server nodes with count badges */}
        {nodes.map((n) => {
          const p = projection([n.lon, n.lat] as any) as [number, number] | null;
          if (!p) return null;
          const isSelected = selectedId === n.id;
          return (
            <g key={n.id} onClick={(e) => { e.stopPropagation(); onSelectNode?.(n); }} style={{ cursor: 'pointer' }}>
              {/* Outer glow */}
              <circle cx={p[0]} cy={p[1]} r={isSelected ? 18 : 14} fill={isSelected ? 'rgba(61,181,255,0.22)' : 'rgba(61,181,255,0.14)'} style={{ animation: 'custom-map-pulse 2.2s ease-out infinite' }} />
              {/* Core pin */}
              <circle cx={p[0]} cy={p[1]} r={7} fill={isSelected ? '#3DB5FF' : '#2FA0E8'} stroke="rgba(255,255,255,0.96)" strokeWidth={1.4} />
              <circle cx={p[0]} cy={p[1]} r={2.2} fill="#fff" />
              {/* Count badge */}
              <g transform={`translate(${p[0] + 10}, ${p[1] - 10})`}>
                <rect x={-14} y={-8} width={28} height={14} rx={7} fill="rgba(12,22,38,0.88)" stroke="rgba(61,181,255,0.32)" strokeWidth={0.8} />
                <text x={0} y={0} dy="0.35em" textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#8fd4ff" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.3px' }}>
                  {n.code} • {n.count}
                </text>
              </g>
            </g>
          );
        })}

        {/* Main user/server pulsing dot (only when no node is selected to avoid clutter) */}
        {dot && !selectedId && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={dot[0]} cy={dot[1]} r={42} fill="rgba(61,181,255,0.13)" style={{ animation: 'custom-map-pulse 2.6s ease-out infinite' }} />
            <circle cx={dot[0]} cy={dot[1]} r={22} fill="rgba(61,181,255,0.19)" style={{ animation: 'custom-map-pulse 2.6s ease-out infinite', animationDelay: '0.38s' } as any} />
            <circle cx={dot[0]} cy={dot[1]} r={7.2} fill="#3DB5FF" stroke="rgba(255,255,255,0.96)" strokeWidth={1.5} />
            <circle cx={dot[0]} cy={dot[1]} r={2.3} fill="#fff" />
          </g>
        )}
      </svg>

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,17,30,0.28) 0%, transparent 44%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 148, background: 'linear-gradient(180deg, transparent 0%, rgba(7,17,30,0.82) 100%)', pointerEvents: 'none' }} />

      <style>{`
        @keyframes custom-map-pulse {
          0% { transform: scale(0.32); opacity: 0.95; }
          70% { transform: scale(1.68); opacity: 0; }
          100% { transform: scale(1.68); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CustomWorldMap;
