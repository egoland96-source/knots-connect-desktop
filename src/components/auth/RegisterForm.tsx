import React, { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import { useAuthStore, useAuthError, useAuthLoading } from '../../store/authStore';
import { RegisterRequest } from '../../types/auth.types';

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const RegisterForm: React.FC = () => {
  const [form, setForm] = useState<RegisterForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const error = useAuthError();
  const loading = useAuthLoading();
  const { register } = useAuthStore();

  const validateForm = (): boolean => {
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      return false;
    }
    if (form.password !== form.confirmPassword) {
      return false;
    }
    if (form.password.length < 8) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="var(--space-6)" hover>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            Create your account
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Start your secure journey with Knots Connect
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
              }}
            >
              <AlertCircle size={16} color="var(--danger)" />
              <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
            </motion.div>
          )}

          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  background: 'var(--glass-card-bg)',
                  border: '1px solid var(--glass-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  backdropFilter: 'var(--glass-card-blur)',
                  WebkitBackdropFilter: 'var(--glass-card-blur)',
                  transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--glass-card-border)'; e.target.style.boxShadow = 'none'; }}
                placeholder="yourusername"
                required
                disabled={isSubmitting || loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  background: 'var(--glass-card-bg)',
                  border: '1px solid var(--glass-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  backdropFilter: 'var(--glass-card-blur)',
                  WebkitBackdropFilter: 'var(--glass-card-blur)',
                  transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--glass-card-border)'; e.target.style.boxShadow = 'none'; }}
                placeholder="your@email.com"
                required
                disabled={isSubmitting || loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 40px',
                  background: 'var(--glass-card-bg)',
                  border: '1px solid var(--glass-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  backdropFilter: 'var(--glass-card-blur)',
                  WebkitBackdropFilter: 'var(--glass-card-blur)',
                  transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--glass-card-border)'; e.target.style.boxShadow = 'none'; }}
                placeholder="••••••••"
                required
                disabled={isSubmitting || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
                disabled={isSubmitting || loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>Minimum 8 characters</p>
          </div>

          <div>
            <label htmlFor="reg-confirm" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 40px',
                  background: 'var(--glass-card-bg)',
                  border: '1px solid var(--glass-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  backdropFilter: 'var(--glass-card-blur)',
                  WebkitBackdropFilter: 'var(--glass-card-blur)',
                  transition: 'border-color 180ms var(--ease), box-shadow 180ms var(--ease)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--glass-card-border)'; e.target.style.boxShadow = 'none'; }}
                placeholder="••••••••"
                required
                disabled={isSubmitting || loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
                disabled={isSubmitting || loading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
              <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 'var(--space-1)' }}>Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            full
            disabled={isSubmitting || loading || !validateForm()}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
};