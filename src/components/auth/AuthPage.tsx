import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useIsAuthenticated, useAuthLoading } from '../../store/authStore';
import LoginForm from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Shield, Lock, Zap, Globe, User } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = React.useState(true);
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();
  const { restoreSession, guestLogin } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (loading && !isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <Shield size={48} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-primary)', fontSize: 16 }}>Loading...</div>
        </motion.div>
      </div>
    );
  }

  const handleGuestLogin = async () => {
    try {
      await guestLogin();
    } catch (err) {
    }
  };

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
      {/* Background effects */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 20%, rgba(61, 181, 255, 0.06) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 80%, rgba(46, 213, 115, 0.04) 0%, transparent 60%)
        `,
      }} />

      <div style={{
        width: '100%',
        maxWidth: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-6)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Right panel - auth form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            width: '100%',
            maxWidth: 420,
          }}
        >
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <LoginForm />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterForm />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guest Login Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            onClick={handleGuestLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-card-border)',
              background: 'var(--glass-card-bg)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'var(--glass-card-blur)',
              WebkitBackdropFilter: 'var(--glass-card-blur)',
              boxShadow: 'var(--glass-card-shadow)',
              transition: 'background 180ms var(--ease), border-color 180ms var(--ease), transform 180ms var(--ease), box-shadow 180ms var(--ease)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-card-bg-strong)';
              e.currentTarget.style.borderColor = 'var(--border-accent)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--glass-card-shadow-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-card-bg)';
              e.currentTarget.style.borderColor = 'var(--glass-card-border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--glass-card-shadow)';
            }}
          >
            <User size={18} strokeWidth={2} color="var(--accent)" />
            Continue as Guest
          </motion.button>

          <div style={{ textAlign: 'center', paddingTop: 'var(--space-2)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                style={{
                  color: 'var(--accent)',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: 0,
                }}
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};