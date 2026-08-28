import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Cpu, Shuffle, FileCode, Gauge, FilterX, Split, Lock } from 'lucide-react';
import { useDpiStore, DpiTechnique } from '../../../store/dpiStore';

type TechniqueMeta = {
  id: DpiTechnique;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
  accent: string;
};

const TECHNIQUES: TechniqueMeta[] = [
  { id: 'sni-split', label: 'SNI Split', desc: 'ClientHello SNI parçalama — DPI SNI filtrelerini atlatır.', icon: Split, accent: '#A78BFA' },
  { id: 'ttl-fake', label: 'TTL Fake', desc: 'Sahte TTL paketleri — oyun 49k port SYN koruması.', icon: ShieldAlert, accent: '#34D399' },
  { id: 'out-of-order', label: 'Out-of-Order', desc: 'Paket sırası bozma — DPI reassembly şaşırtma.', icon: Shuffle, accent: '#60A5FA' },
  { id: 'header-swap', label: 'Header Swap', desc: 'TCP header alan sırası değiştirme.', icon: FileCode, accent: '#F59E0B' },
  { id: 'window-limit', label: 'Window Limit', desc: 'TCP window size kısıtlama.', icon: Gauge, accent: '#FB7185' },
  { id: 'rst-filter', label: 'RST Filter', desc: 'Sahte RST paketlerini filtreler.', icon: FilterX, accent: '#94A3B8' },
  { id: 'split-wire', label: 'SplitWire', desc: 'Wire-level segment bölme.', icon: Cpu, accent: '#A78BFA' },
  { id: 'zero-cipher', label: 'Zero-Cipher', desc: 'Sıfır şifreleme katmanı — DPI sınıflandırmayı şaşırtır.', icon: Lock, accent: '#34D399' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export const AdvancedDpiDrawer: React.FC<Props> = ({ open, onClose }) => {
  const activeTechniques = useDpiStore((s) => s.activeTechniques);
  const toggleTechnique = useDpiStore((s) => s.toggleTechnique);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2,6,13,0.52)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 50,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(380px, 92vw)',
              zIndex: 51,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(17,25,40,0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 18px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                position: 'sticky',
                top: 0,
                background: 'rgba(17,25,40,0.92)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: '#A78BFA', fontFamily: 'DM Mono, monospace' }}>ADVANCED DPI</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginTop: 2, letterSpacing: '-0.02em' }}>Bypass Lab</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>GoodbyeDPI / WinDivert taktikleri — Go motoruna anlık iletilir.</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Kapat"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TECHNIQUES.map((t) => {
                const isActive = activeTechniques.includes(t.id);
                const Icon = t.icon as any;
                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 12,
                      borderRadius: 14,
                      background: isActive ? 'rgba(167,139,250,0.10)' : 'rgba(8,13,22,0.62)',
                      border: `1px solid ${isActive ? 'rgba(167,139,250,0.32)' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isActive ? '0 0 18px rgba(167,139,250,0.14)' : 'none',
                      transition: 'all 180ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        display: 'grid',
                        placeItems: 'center',
                        background: isActive ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? t.accent : '#94A3B8',
                        border: `1px solid ${isActive ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.06)'}`,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <Icon size={15} />
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#E2E8F0' : '#CBD5E1' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, lineHeight: 1.5 }}>{t.desc}</div>
                    </div>

                    <button
                      onClick={() => toggleTechnique(t.id)}
                      role="switch"
                      aria-checked={isActive}
                      style={{
                        width: 44,
                        height: 26,
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: isActive ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.14)',
                        background: isActive ? '#A78BFA' : 'rgba(255,255,255,0.10)',
                        position: 'relative',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 180ms ease',
                        boxShadow: isActive ? '0 4px 14px rgba(167,139,250,0.28)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: isActive ? 20 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                          transition: 'left 180ms ease',
                        }}
                      />
                    </button>
                  </div>
                );
              })}

              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.18)',
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: '#94A3B8',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                <span style={{ color: '#34D399', fontWeight: 700 }}>● LIVE</span> Değişikliklar Go motoruna (`knots:setDpiTechniques`) anlık RPC ile iletilir — yeniden başlatma gerekmez. Varsayılan <span style={{ color: '#E2E8F0' }}>SNI Split</span> etkindir.
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#E2E8F0',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Kapat
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 18px rgba(59,130,246,0.28)',
                }}
              >
                Uygula
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvancedDpiDrawer;
