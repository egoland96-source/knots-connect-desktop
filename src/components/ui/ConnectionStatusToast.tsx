import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Zap, ServerCrash } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';

export const ConnectionStatusToast: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const latencyMs = useConnectionStore((s) => s.latencyMs);
  const engineMode = useConnectionStore((s) => s.engineMode);
  const connect = useConnectionStore((s) => s.connect);

  const [visible, setVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'down'>('down');
  const prevStatus = useRef(status);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (prev === 'connecting' && status === 'connected') {
      setToastType('success');
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    } 
    else if (prev === 'connected' && status === 'error') {
      setToastType('error');
      setVisible(true);
      // Hata toast'u manuel kapanana kadar kalır (dismiss butonu var)
    }
    else if (prev === 'connected' && status === 'disconnected') {
      setToastType('down');
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
    
    // Diğer geçişlerde toast'u sakla
    if (status === 'connecting' || (status === 'disconnected' && prev !== 'connected')) {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: toastType === 'success' ? 'rgba(52,211,153,0.1)' 
            : toastType === 'error' ? 'rgba(248,113,133,0.1)' 
            : 'rgba(245,158,11,0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: toastType === 'success' ? 'rgba(52,211,153,0.3)' 
            : toastType === 'error' ? 'rgba(248,113,133,0.3)' 
            : 'rgba(245,158,11,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          width: 300,
        }}
      >
        <div style={{
          color: toastType === 'success' ? '#34D399' 
            : toastType === 'error' ? '#F87171' 
            : '#FCD34D',
          marginTop: 2
        }}>
          {toastType === 'success' && <ShieldCheck size={20} />}
          {toastType === 'error' && <ServerCrash size={20} />}
          {toastType === 'down' && <ShieldAlert size={20} />}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ 
            color: '#F8FAFC', 
            fontSize: 13, 
            fontWeight: 600, 
            marginBottom: 4 
          }}>
            {toastType === 'success' && 'Güvenli Bağlantı Kuruldu'}
            {toastType === 'error' && 'Bağlantı Hatası'}
            {toastType === 'down' && 'Tünel Kapatıldı'}
          </div>
          
          <div style={{ 
            color: '#94A3B8', 
            fontSize: 12, 
            fontFamily: toastType === 'success' ? "'DM Mono', monospace" : 'inherit'
          }}>
            {toastType === 'success' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={10} color="#A78BFA" />
                {engineMode === 'go' ? 'WinDivert' : 'Python'} · {Math.round(latencyMs || 0)}ms
              </span>
            ) : toastType === 'error' ? (
              'Motor yanıt vermiyor veya sürücü yüklenemedi.'
            ) : (
              'İnternet trafiğiniz artık korunmuyor.'
            )}
          </div>
          
          {toastType === 'error' && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button 
                onClick={() => { setVisible(false); connect(); }}
                style={{
                  background: 'rgba(248,113,133,0.2)',
                  color: '#FCA5A5',
                  border: '1px solid rgba(248,113,133,0.3)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Yeniden Dene
              </button>
              <button 
                onClick={() => setVisible(false)}
                style={{
                  background: 'transparent',
                  color: '#94A3B8',
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Kapat
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
