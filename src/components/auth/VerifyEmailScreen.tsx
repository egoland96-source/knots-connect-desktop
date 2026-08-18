import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import { Card, Button } from '../ui';
import { useAuthStore, useAuthError, useAuthLoading, useAuthUser } from '../../store/authStore';

const CODE_LENGTH = 6;
const RESEND_WAIT_SECONDS = 60;

export const VerifyEmailScreen: React.FC = () => {
  const user = useAuthUser();
  const error = useAuthError();
  const loading = useAuthLoading();
  const { requestVerification, verifyEmail, logout, clearError } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [resendIn, setResendIn] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const email = user?.email ?? '';

  useEffect(() => {
    let cancelled = false;
    const auto = async () => {
      try {
        const debugCode = await requestVerification(email);
        if (cancelled || !debugCode) return;
        setDigits(debugCode.slice(0, CODE_LENGTH).split(''));
      } catch {
        clearError();
      }
    };
    auto();
    return () => { cancelled = true; };
  }, [email]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const updateDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    const next = Array(CODE_LENGTH).fill('');
    clean.split('').forEach((ch, i) => {
      if (index + i < CODE_LENGTH) next[index + i] = ch;
    });
    setDigits(next);

    const lastIdx = Math.min(index + clean.length, CODE_LENGTH - 1);
    inputsRef.current[lastIdx]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH;

  const handleVerify = async () => {
    if (!isComplete || loading) return;
    try {
      await verifyEmail(email, code);
    } catch {
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    try {
      await requestVerification(email);
      setResendIn(RESEND_WAIT_SECONDS);
    } catch {}
  };

  useEffect(() => {
    if (isComplete && !loading) {
      handleVerify();
    }
  }, [code]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-root)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 20%, rgba(61, 181, 255, 0.06) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 80%, rgba(46, 213, 115, 0.04) 0%, transparent 60%)
        `,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <Card padding="var(--space-6)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <span style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: 'rgba(28,200,255,0.12)',
              border: '1px solid rgba(28,200,255,0.25)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldCheck size={22} strokeWidth={1.9} />
            </span>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Doğrulama kodu
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {email} adresine 6 haneli kod gönderildi
              </p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <AlertCircle size={16} color="var(--danger)" />
              <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                inputMode="numeric"
                maxLength={CODE_LENGTH}
                value={d}
                disabled={loading}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: '100%',
                  height: 56,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  background: 'var(--glass-card-bg)',
                  border: `1px solid ${d ? 'var(--border-focus)' : 'var(--glass-card-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  backdropFilter: 'var(--glass-card-blur)',
                  WebkitBackdropFilter: 'var(--glass-card-blur)',
                  transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease)',
                  boxShadow: d ? '0 0 0 3px var(--accent-glow)' : 'none',
                }}
              />
            ))}
          </div>

          <Button
            variant="primary"
            full
            disabled={!isComplete || loading}
            onClick={handleVerify}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            {loading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleResend}
              disabled={resendIn > 0 || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                color: resendIn > 0 ? 'var(--text-muted)' : 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
                cursor: resendIn > 0 ? 'default' : 'pointer',
                padding: 0,
              }}
            >
              <RefreshCw size={14} strokeWidth={2} />
              {resendIn > 0 ? `Yeniden gönder (${resendIn}s)` : 'Kodu yeniden gönder'}
            </button>
            <button
              onClick={() => logout()}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <LogOut size={14} strokeWidth={2} />
              Çıkış yap
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmailScreen;