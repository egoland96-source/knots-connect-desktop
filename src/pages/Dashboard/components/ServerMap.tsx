import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { CustomWorldMap, MapNode } from '../../../components/CustomWorldMap';
import type { ServerNode } from '../../../types/connection';
import type { OperatingMode } from '../../../services/bridge/bridgeService.types';

type Props = {
  nodes: ServerNode[];
  activeId?: string | null;
  onSelect?: (node: ServerNode | null) => void;
  /** Called when user picks a route. Receives the node id and the chosen operating mode. */
  onConnect?: (nodeId: string, mode: OperatingMode) => void;
  isConnected?: boolean;
  defaultLat?: number;
  defaultLon?: number;
  connectLabel?: string;
  connection?: { fromLat: number; fromLon: number; toLat: number; toLon: number } | null;
};

const toMapNode = (n: ServerNode): MapNode => ({
  id: n.id,
  country: n.country,
  city: n.city,
  code: n.code,
  lat: n.lat,
  lon: n.lon,
  count: n.count ?? 1,
  ping: n.ping,
  load: n.load,
});

export const ServerMap: React.FC<Props> = ({ nodes, activeId = null, onSelect, onConnect, isConnected, defaultLat = 39.0, defaultLon = 35.0, connectLabel = 'Connect', connection = null }) => {
  const mapNodes: MapNode[] = nodes.map(toMapNode);
  const [selected, setSelected] = useState<MapNode | null>(null);

  // Sync external activeId if provided
  useEffect(() => {
    if (activeId) {
      const found = mapNodes.find((n) => n.id === activeId) ?? null;
      setSelected(found);
    }
  }, [activeId]);

  // Merkez: seçili node > (bağlıyken Dashboard'ın verdiği gerçek hizmet konumu) > varsayılan.
  const centerLat = selected ? selected.lat : defaultLat;
  const centerLon = selected ? selected.lon : defaultLon;
  const zoom = selected ? 5.2 : isConnected ? 4.4 : 3.2;

  const [mapCenter, setMapCenter] = useState({ lat: centerLat, lon: centerLon, zoom });
  const mapCenterRef = useRef(mapCenter);
  mapCenterRef.current = mapCenter;

  const animRafRef = useRef<number | null>(null);

  // Smoothly glide/interpolate mapCenter to a target (lat, lon, zoom)
  const animateTo = useCallback((targetLat: number, targetLon: number, targetZoom: number, duration = 380) => {
    if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
    const start = performance.now();
    const startLat = mapCenterRef.current.lat;
    const startLon = mapCenterRef.current.lon;
    const startZoom = mapCenterRef.current.zoom;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const curLat = startLat + (targetLat - startLat) * ease;
      const curLon = startLon + (targetLon - startLon) * ease;
      const curZoom = startZoom + (targetZoom - startZoom) * ease;

      const next = { lat: curLat, lon: curLon, zoom: curZoom };
      mapCenterRef.current = next;
      setMapCenter(next);

      if (progress < 1) {
        animRafRef.current = requestAnimationFrame(tick);
      } else {
        animRafRef.current = null;
      }
    };
    animRafRef.current = requestAnimationFrame(tick);
  }, []);

  // When selected or external defaults change, glide smoothly to them
  useEffect(() => {
    if (!selected) {
      animateTo(centerLat, centerLon, zoom, 420);
    }
  }, [centerLat, centerLon, zoom, selected, animateTo]);

  const handleSelect = (node: MapNode | null) => {
    if (!node) {
      setSelected(null);
      onSelect?.(null);
      return;
    }
    setSelected(node);
    onSelect?.(nodes.find((n) => n.id === node.id) ?? null);
    animateTo(node.lat, node.lon, 5.2, 450);
  };

  // ─── High-performance RAF drag & inertia momentum ─────────────────────────
  const stageRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const dragRafRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef({ dx: 0, dy: 0 });
  const [isGrabbing, setIsGrabbing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    // Stop any running animations
    if (animRafRef.current) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }

    isDraggingRef.current = true;
    setIsGrabbing(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { vx: 0, vy: 0 };
    pendingDeltaRef.current = { dx: 0, dy: 0 };

    const processDrag = () => {
      const { dx, dy } = pendingDeltaRef.current;
      pendingDeltaRef.current = { dx: 0, dy: 0 };

      if (dx !== 0 || dy !== 0) {
        const scale = (1000 / (2 * Math.PI)) * (0.78 + mapCenterRef.current.zoom * 0.62);
        const dLon = (-dx / scale) * (180 / Math.PI);
        const dLat = (dy / scale) * (180 / Math.PI);

        // Instantaneous smoothed velocity for inertia on release
        velocityRef.current.vx = velocityRef.current.vx * 0.3 + dLon * 0.7;
        velocityRef.current.vy = velocityRef.current.vy * 0.3 + dLat * 0.7;

        const nextLon = mapCenterRef.current.lon + dLon;
        const nextLat = Math.max(-68, Math.min(74, mapCenterRef.current.lat + dLat));
        const next = { ...mapCenterRef.current, lat: nextLat, lon: nextLon };
        mapCenterRef.current = next;
        setMapCenter(next);
      }

      if (isDraggingRef.current) {
        dragRafRef.current = requestAnimationFrame(processDrag);
      } else {
        dragRafRef.current = null;
      }
    };

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - lastMousePos.current.x;
      const dy = ev.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: ev.clientX, y: ev.clientY };

      pendingDeltaRef.current.dx += dx;
      pendingDeltaRef.current.dy += dy;

      if (!dragRafRef.current) {
        dragRafRef.current = requestAnimationFrame(processDrag);
      }
    };

    const onUp = () => {
      isDraggingRef.current = false;
      setIsGrabbing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      // Inertia momentum glide
      let vx = velocityRef.current.vx;
      let vy = velocityRef.current.vy;
      const friction = 0.91;

      const glide = () => {
        vx *= friction;
        vy *= friction;

        if (Math.abs(vx) > 0.015 || Math.abs(vy) > 0.015) {
          const nextLon = mapCenterRef.current.lon + vx;
          const nextLat = Math.max(-68, Math.min(74, mapCenterRef.current.lat + vy));
          const next = { ...mapCenterRef.current, lat: nextLat, lon: nextLon };
          mapCenterRef.current = next;
          setMapCenter(next);
          animRafRef.current = requestAnimationFrame(glide);
        } else {
          animRafRef.current = null;
        }
      };

      if (Math.abs(vx) > 0.08 || Math.abs(vy) > 0.08) {
        animRafRef.current = requestAnimationFrame(glide);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.22 : 0.22;
    const targetZoom = Math.max(1, Math.min(7, mapCenterRef.current.zoom + delta));
    animateTo(mapCenterRef.current.lat, mapCenterRef.current.lon, targetZoom, 180);
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
        cursor: isGrabbing ? 'grabbing' : 'grab',
      }}
    >
      {/* Full-bleed stable map layer — projection rotates & pans smoothly without gaps */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <CustomWorldMap
          lat={mapCenter.lat}
          lon={mapCenter.lon}
          markerLat={39.0}
          markerLon={35.0}
          zoom={mapCenter.zoom}
          nodes={mapNodes}
          selectedId={selected?.id ?? null}
          onSelectNode={handleSelect}
          connection={connection}
        />
      </div>

      {/* Contextual Route Selector: [DPI] / [VPN] [🧅] with fluid spring animations */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 6 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: '50%',
              top: '46%',
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(17,29,38,0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(88,191,210,0.25)',
              boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9DB0B7', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {selected.country} ({selected.code})
            </div>

            {/* Top: DPI Button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.12 }}
              onClick={() => {
                onConnect?.(selected.id, 'gaming');
                setSelected(null);
              }}
              title="DPI Bypass Mode — 0 ms direct local route for gaming"
              style={{
                padding: '6px 20px',
                borderRadius: 8,
                border: '1px solid rgba(167,139,250,0.4)',
                background: 'rgba(167,139,250,0.16)',
                color: '#C4B5FD',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              DPI
            </motion.button>

            {/* Bottom row: [VPN] and [Tor onion] and [Split preview] */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.12 }}
                onClick={() => {
                  onConnect?.(selected.id, 'privacy');
                  setSelected(null);
                }}
                title="VPN Mode — pure encrypted WireGuard tunnel (IP privacy)"
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(88,191,210,0.4)',
                  background: 'rgba(88,191,210,0.16)',
                  color: '#58BFD2',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                VPN
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.12 }}
                onClick={() => {
                  onConnect?.(selected.id, 'hybrid');
                  setSelected(null);
                }}
                title="Split Mode — Games via DPI (0 ms), Social & Web via VPN"
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(52,211,153,0.4)',
                  background: 'rgba(52,211,153,0.16)',
                  color: '#34D399',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Split
              </motion.button>

              {/* Tor onion route */}
              <motion.button
                whileHover={{ scale: 1.08, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.12 }}
                onClick={() => {
                  alert('Tor is a separate route.');
                }}
                title="Tor Onion Route"
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(129,121,167,0.4)',
                  background: 'rgba(129,121,167,0.16)',
                  color: '#BFAFE7',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                🧅
              </motion.button>
            </div>

            <div style={{ fontSize: 9.5, color: '#657982', marginTop: 2 }}>
              Click outside to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

