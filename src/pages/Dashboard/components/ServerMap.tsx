import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { CustomWorldMap, MapNode } from '../../../components/CustomWorldMap';
import type { ServerNode } from '../../../types/connection';

type Props = {
  nodes: ServerNode[];
  activeId?: string | null;
  onSelect?: (node: ServerNode | null) => void;
  onConnect?: (nodeId: string) => void;
  isConnected?: boolean;
  defaultLat?: number;
  defaultLon?: number;
};

const toMapNode = (n: ServerNode): MapNode => ({
  id: n.id,
  country: n.country,
  code: n.code,
  lat: n.lat,
  lon: n.lon,
  count: n.count ?? 1,
  ping: n.ping,
  load: n.load,
});

export const ServerMap: React.FC<Props> = ({ nodes, activeId = null, onSelect, onConnect, isConnected, defaultLat = 39.0, defaultLon = 35.0 }) => {
  const mapNodes: MapNode[] = nodes.map(toMapNode);
  const [selected, setSelected] = useState<MapNode | null>(null);

  // Sync external activeId if provided
  useEffect(() => {
    if (activeId) {
      const found = mapNodes.find((n) => n.id === activeId) ?? null;
      setSelected(found);
    }
  }, [activeId]);

  const centerLat = selected ? selected.lat : isConnected ? 52.37 : defaultLat;
  const centerLon = selected ? selected.lon : isConnected ? 4.9 : defaultLon;
  const zoom = selected ? 5.2 : isConnected ? 4.4 : 3.2;

  const [mapCenter, setMapCenter] = useState({ lat: centerLat, lon: centerLon, zoom });
  useEffect(() => {
    if (!selected) setMapCenter({ lat: centerLat, lon: centerLon, zoom });
  }, [centerLat, centerLon, zoom, selected]);

  const handleSelect = (node: MapNode | null) => {
    if (!node) {
      setSelected(null);
      onSelect?.(null);
      return;
    }
    setSelected(node);
    onSelect?.(nodes.find((n) => n.id === node.id) ?? null);
    setMapCenter({ lat: node.lat, lon: node.lon, zoom: 5.2 });
  };

  // Drag
  const stageRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartCenter = useRef({ lat: centerLat, lon: centerLon });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    isDraggingRef.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartCenter.current = { ...mapCenter };
    const mapEl = stageRef.current?.querySelector('div[style*="position: absolute"]') as HTMLElement | null;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartPos.current.x;
      const dy = ev.clientY - dragStartPos.current.y;
      if (mapEl) mapEl.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const onUp = (ev: MouseEvent) => {
      isDraggingRef.current = false;
      const dx = ev.clientX - dragStartPos.current.x;
      const dy = ev.clientY - dragStartPos.current.y;
      if (mapEl) mapEl.style.transform = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      const scale = (1000 / (2 * Math.PI)) * (0.78 + mapCenter.zoom * 0.62);
      const dLon = (-dx / scale) * (180 / Math.PI);
      const dLat = (dy / scale) * (180 / Math.PI);
      const newLon = dragStartCenter.current.lon + dLon;
      const newLat = Math.max(-72, Math.min(72, dragStartCenter.current.lat + dLat));
      setMapCenter((p) => ({ ...p, lat: newLat, lon: newLon }));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.18 : 0.18;
    const newZoom = Math.max(1, Math.min(7, mapCenter.zoom + delta));
    setMapCenter((p) => ({ ...p, zoom: newZoom }));
  };

  return (
    <div
      ref={stageRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{
        position: 'relative',
        minHeight: 420,
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(16,30,54,0.72) 0%, #080D16 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'grab',
      }}
    >
      <CustomWorldMap
        lat={mapCenter.lat}
        lon={mapCenter.lon}
        markerLat={isConnected ? 52.37 : defaultLat}
        markerLon={isConnected ? 4.9 : defaultLon}
        zoom={mapCenter.zoom}
        nodes={mapNodes}
        selectedId={selected?.id ?? null}
        onSelectNode={handleSelect}
      />

      {/* Neon halo overlay for active/connected — CSS pulsating halo behind CustomWorldMap pins */}
      {isConnected && !selected && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 28,
            height: 28,
            marginLeft: -14,
            marginTop: -14,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52,211,153,0.28) 0%, rgba(52,211,153,0.12) 45%, transparent 72%)',
            boxShadow: '0 0 24px rgba(52,211,153,0.45), 0 0 48px rgba(52,211,153,0.22)',
            pointerEvents: 'none',
            zIndex: 5,
            animation: 'knots-halo-pulse 2.2s ease-in-out infinite',
          }}
        />
      )}

      {/* Selected node popover */}
      {selected && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            minWidth: 260,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(17,25,40,0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 800, color: '#F8FAFC' }}>
            <MapPin size={13} color="#A78BFA" /> {selected.country} • {selected.code} #{selected.id}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11.5 }}>
            <span style={{ color: '#94A3B8' }}>
              Ping <b style={{ color: '#34D399', fontFamily: 'DM Mono, monospace' }}>{selected.ping} ms</b>
            </span>
            <span style={{ color: '#94A3B8' }}>
              Load <b style={{ color: '#E2E8F0' }}>{selected.load}%</b>
            </span>
          </div>
          {onConnect && (
            <button
              onClick={() => {
                onConnect(selected.id);
                setSelected(null);
                onSelect?.(null);
              }}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '9px 12px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: '#fff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(59,130,246,0.28)',
              }}
            >
              Bağlan
            </button>
          )}
        </div>
      )}

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          background: 'linear-gradient(180deg, transparent 0%, rgba(8,13,22,0.82) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <style>{`@keyframes knots-halo-pulse { 0%,100% { transform: scale(0.92); opacity: 0.9; } 50% { transform: scale(1.18); opacity: 0.55; } }`}</style>
    </div>
  );
};

export default ServerMap;
