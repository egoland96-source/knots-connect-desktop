// @ts-nocheck
import { useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import landAtlasRaw from 'world-atlas/land-110m.json?raw';

export type MapNode = {
  id: string;
  country: string;
  city?: string;
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
  connection?: { fromLat: number; fromLon: number; toLat: number; toLon: number } | null;
};

// Single land mass is ~15x cheaper to project than 177 countries
let landFeature: any = null;
try {
  const data: any = JSON.parse((landAtlasRaw as unknown as string));
  const src = (data as any).default || data;
  landFeature = (feature as any)(src, src.objects.land);
} catch {}

export const CustomWorldMap = ({ lat, lon, markerLat, markerLon, zoom = 1, nodes = [], selectedId, onSelectNode, connection }: Props) => {
  const mLat = markerLat ?? 39.0;
  const mLon = markerLon ?? 35.0;
  const width = 1000;
  const height = 500;
  const scale = (width / (2 * Math.PI)) * (0.78 + zoom * 0.62);

  // Spherical rotation around the polar axis rotates the entire globe before projecting.
  // This wraps longitudes continuously across 360° and eliminates the hard cutoff at -180° / +180°.
  const projection = geoMercator()
    .scale(scale)
    .translate([width / 2, height / 2])
    .rotate([-lon, 0])
    .center([0, lat]);
  const path = geoPath(projection as any);
  const landD = landFeature ? path(landFeature as any) : null;
  const dot = projection([mLon, mLat] as any) as [number, number] | null;

  return (
    <div
      onClick={() => onSelectNode?.(null)}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#12252E',
        overflow: 'hidden',
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#58BFD2" />
            <stop offset="100%" stopColor="#61D1A8" />
          </linearGradient>
        </defs>

        <g fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth={0.6}>
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (height / 6) * (i + 1);
            return <line key={`h-${i}`} x1={0} y1={y} x2={width} y2={y} />;
          })}
          {Array.from({ length: 11 }).map((_, i) => {
            const x = (width / 12) * (i + 1);
            return <line key={`v-${i}`} x1={x} y1={0} x2={x} y2={height} />;
          })}
        </g>

        {landD && <path d={landD} fill="#24434B" stroke="#789C9E" strokeWidth={0.7} strokeOpacity={0.4} />}

        {/* Server nodes */}
        {nodes.map((n) => {
          const p = projection([n.lon, n.lat] as any) as [number, number] | null;
          if (!p) return null;
          const isSelected = selectedId === n.id;
          return (
            <g key={n.id} onClick={(e) => { e.stopPropagation(); onSelectNode?.(n); }} style={{ cursor: 'pointer' }}>
              {/* Outer halo — radius and fill animate on selection */}
              <circle
                cx={p[0]} cy={p[1]}
                r={isSelected ? 14 : 10}
                fill={isSelected ? 'rgba(88,191,210,0.25)' : 'rgba(88,191,210,0.12)'}
                style={{ transition: 'r 0.25s cubic-bezier(0.34,1.56,0.64,1), fill 0.2s ease' }}
              />
              {/* Core dot — brightens on selection */}
              <circle
                cx={p[0]} cy={p[1]}
                r={5.5}
                fill={isSelected ? '#58BFD2' : '#287FB9'}
                stroke="#EEF4F5"
                strokeWidth={1.2}
                style={{ transition: 'fill 0.2s ease' }}
              />
              <circle cx={p[0]} cy={p[1]} r={1.8} fill="#fff" />
              <text
                x={p[0]}
                y={p[1] + 16}
                textAnchor="middle"
                fontSize={9}
                fontWeight={isSelected ? 700 : 500}
                fill={isSelected ? '#58BFD2' : '#9DB0B7'}
                style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
              >
                {n.city || n.country}
              </text>
            </g>
          );
        })}

        {/* Restrained Route line: Cyan near device -> Muted green near secure exit (Spec Page 7) */}
        {connection &&
          (() => {
            const from = projection([connection.fromLon, connection.fromLat] as any) as [number, number] | null;
            const to = projection([connection.toLon, connection.toLat] as any) as [number, number] | null;
            if (!from || !to) return null;
            const mx = (from[0] + to[0]) / 2;
            const my = (from[1] + to[1]) / 2 - 28;
            const d = `M ${from[0]} ${from[1]} Q ${mx} ${my} ${to[0]} ${to[1]}`;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <path d={d} fill="none" stroke="url(#routeGradient)" strokeWidth={2.4} strokeLinecap="round" opacity={0.92} />
                
                {/* Endpoint: This device */}
                <circle cx={from[0]} cy={from[1]} r={5} fill="#111D26" stroke="#58BFD2" strokeWidth={2} />
                <text x={from[0]} y={from[1] + 16} textAnchor="middle" fontSize={9} fontWeight={600} fill="#9DB0B7" style={{ fontFamily: 'Inter, sans-serif' }}>
                  This device
                </text>

                {/* Endpoint: Secure exit */}
                <circle cx={to[0]} cy={to[1]} r={16} fill="rgba(97,209,168,0.16)" stroke="#61D1A8" strokeWidth={1.5}>
                  <animate attributeName="r" values="10;22;10" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.12;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={to[0]} cy={to[1]} r={5} fill="#111D26" stroke="#61D1A8" strokeWidth={2} />
                <text x={to[0]} y={to[1] - 12} textAnchor="middle" fontSize={9} fontWeight={600} fill="#61D1A8" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Secure exit
                </text>
              </g>
            );
          })()}

        {/* Device location pin when idle */}
        {dot && !selectedId && !connection && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={dot[0]} cy={dot[1]} r={6} fill="#58BFD2" stroke="#EEF4F5" strokeWidth={1.5} />
            <text x={dot[0]} y={dot[1] + 16} textAnchor="middle" fontSize={9} fontWeight={600} fill="#9DB0B7" style={{ fontFamily: 'Inter, sans-serif' }}>
              This device
            </text>
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
