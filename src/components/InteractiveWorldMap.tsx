// @ts-nocheck
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  lat: number;
  lon: number;
  zoom?: number;
  onCenterChange?: (lat: number, lon: number, zoom: number) => void;
  interactive?: boolean;
};

// Keep the map view in sync when the selected server / connection changes
function SyncView({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom, { animate: true, duration: 0.9 });
  }, [lat, lon, zoom, map]);
  return null;
}

function MapEvents({ onCenterChange }: { onCenterChange?: (lat: number, lon: number, zoom: number) => void }) {
  useMapEvents({
    // @ts-ignore - LeafletEvent typing varies across versions
    moveend: (e: any) => {
      const m = e.target as L.Map;
      const c = m.getCenter();
      onCenterChange?.(c.lat, c.lng, m.getZoom());
    },
    // @ts-ignore
    zoomend: (e: any) => {
      const m = e.target as L.Map;
      const c = m.getCenter();
      onCenterChange?.(c.lat, c.lng, m.getZoom());
    },
  });
  return null;
}

function PulsingDot({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    const dot = document.createElement('div');
    dot.style.width = '14px';
    dot.style.height = '14px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#3DB5FF';
    dot.style.border = '2px solid rgba(255,255,255,0.95)';
    dot.style.boxShadow = '0 0 0 0 rgba(61,181,255,0.55)';
    dot.style.animation = 'leaflet-pulse 2.2s ease-out infinite';

    const pulse = document.createElement('div');
    pulse.style.position = 'absolute';
    pulse.style.inset = '-10px';
    pulse.style.borderRadius = '50%';
    pulse.style.background = 'rgba(61,181,255,0.16)';
    pulse.style.animation = 'leaflet-pulse-ring 2.2s ease-out infinite';
    dot.style.position = 'relative';
    dot.appendChild(pulse);

    const icon = L.divIcon({
      html: dot,
      className: 'knots-leaflet-dot',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([lat, lon], { icon, interactive: false, keyboard: false }).addTo(map);
    return () => {
      marker.remove();
    };
  }, [lat, lon, map]);

  return null;
}

export const InteractiveWorldMap = ({ lat, lon, zoom = 3.2, onCenterChange, interactive = true }: Props) => {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#070d1a' }}>
      {/* @ts-ignore - react-leaflet v4 prop typing */}
      <MapContainer
        center={[lat, lon] as any}
        zoom={zoom}
        minZoom={2}
        maxZoom={7}
        zoomControl={false}
        attributionControl={false}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        style={{ height: '100%', width: '100%', background: '#070d1a' } as any}
      >
        {/* Dark matter tiles — premium, matches Knots midnight blue */}
        {/* @ts-ignore */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <SyncView lat={lat} lon={lon} zoom={zoom} />
        <MapEvents onCenterChange={onCenterChange} />
        <PulsingDot lat={lat} lon={lon} />
      </MapContainer>

      {/* Subtle top premium wash so the VPN/DPI pill reads well over the tiles */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7,17,30,0.42) 0%, transparent 38%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Bottom vignette like Proton */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 140,
          background: 'linear-gradient(180deg, transparent 0%, rgba(7,17,30,0.78) 100%)',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        .knots-leaflet-dot { background: transparent; border: none; }
        @keyframes leaflet-pulse {
          0% { box-shadow: 0 0 0 0 rgba(61,181,255,0.55); }
          70% { box-shadow: 0 0 0 14px rgba(61,181,255,0); }
          100% { box-shadow: 0 0 0 14px rgba(61,181,255,0); }
        }
        @keyframes leaflet-pulse-ring {
          0% { transform: scale(0.45); opacity: 0.85; }
          70% { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .leaflet-container { background: #070d1a; }
        .leaflet-tile-pane { filter: saturate(0.9) brightness(0.95); }
      `}</style>
    </div>
  );
};

export default InteractiveWorldMap;
