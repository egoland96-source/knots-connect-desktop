import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  CreditCard,
  Eye,
  EyeOff,
  Laptop,
  Smartphone,
  Shield,
  RefreshCw,
  User,
  HelpCircle,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import type { SubscriptionPlan } from '../../types/auth.types';
import { useTranslation } from '../../store/languageStore';

const DEVICES = [
  { icon: Laptop, name: 'Windows Workstation', detail: 'WinDivert Native · Online', active: true },
  { icon: Smartphone, name: 'Android Device', detail: 'Last seen 2h ago', active: false },
];

const PLAN_META = {
  free: { label: 'Free', devices: 1, barWidth: '20%', benefits: ['Standard bandwidth', 'Essential server locations', '1 simultaneous device', 'Community support'] },
  basic: { label: 'Basic', devices: 3, barWidth: '40%', benefits: ['10 GB bandwidth', 'Standard + regional servers', 'Kill switch', '3 simultaneous devices'] },
  premium: { label: 'Pro', devices: 5, barWidth: '64%', benefits: ['Unlimited bandwidth', 'All server locations', 'WireGuard + priority cores', '5 simultaneous devices'] },
} as const;

const PLANS: { key: SubscriptionPlan; name: string; price: string; note: string }[] = [
  { key: 'free', name: 'Free', price: '0 ₺', note: 'everyday essentials' },
  { key: 'basic', name: 'Basic', price: '99 ₺/mo', note: 'for power users' },
  { key: 'premium', name: 'Pro', price: '199 ₺/mo', note: 'everything unlocked' },
];

export const Account: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const knotsCreateIdentity = useAuthStore((s) => s.knotsCreateIdentity);
  const knotsRecover = useAuthStore((s) => s.knotsRecover);
  const logout = useAuthStore((s) => s.logout);

  const knotsId = user?.knotsIdFormatted || user?.id || '7F3A-91C2-6D84-B0E7';
  const isPro = user?.subscriptionType === 'premium';

  const [copied, setCopied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIdentity, setNewIdentity] = useState<{ knotsId: string; mnemonic: string } | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreMnemonic, setRestoreMnemonic] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(knotsId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateIdentity = async () => {
    try {
      const res = await knotsCreateIdentity();
      setNewIdentity(res);
      setShowCreateModal(true);
    } catch (e: any) {
      alert(e?.message || 'Kimlik oluşturulamadı.');
    }
  };

  const handleRestoreIdentity = async () => {
    if (!restoreMnemonic.trim()) return;
    setRestoreLoading(true);
    setRestoreError(null);
    try {
      await knotsRecover(restoreMnemonic.trim());
      setShowRestoreModal(false);
      setRestoreMnemonic('');
    } catch (e: any) {
      setRestoreError(e?.message || 'Geçersiz kurtarma anahtarı.');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#EEF4F5', letterSpacing: '-0.02em' }}>
          {t('account.title')}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
          {t('account.subtitle')}
        </div>
      </div>

      {/* Knots ID Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('account.knotsId')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: '#EEF4F5', letterSpacing: '0.04em' }}>
            {knotsId}
          </div>
          <button
            onClick={handleCopyId}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: '#18333D',
              border: '1px solid #29404B',
              color: copied ? '#61D1A8' : '#58BFD2',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {copied ? t('account.copied') : t('account.copyId')}
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#7E949F', marginTop: 6 }}>
          {t('account.storedOnDevice')}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1E2D38', marginBottom: 28 }} />

      {/* Main Grid: Identity Actions (Left) and Account Access (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 36 }}>
        {/* Left Column: Identity */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#EEF4F5', marginBottom: 16 }}>
            {t('account.identity')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={handleCreateIdentity}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                border: 'none',
                borderBottom: '1px solid #1E2D38',
                background: 'transparent',
                color: '#EEF4F5',
                fontSize: 13.5,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Yeni kimlik oluştur</span>
              <span style={{ color: '#58BFD2', fontSize: 16 }}>›</span>
            </motion.button>
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                setRestoreError(null);
                setShowRestoreModal(true);
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                border: 'none',
                borderBottom: '1px solid #1E2D38',
                background: 'transparent',
                color: '#EEF4F5',
                fontSize: 13.5,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Kimliği geri yükle (12 Kelime)</span>
              <span style={{ color: '#58BFD2', fontSize: 16 }}>›</span>
            </motion.button>
          </div>
        </div>

        {/* Right Column: Account Access */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7E949F', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            {t('account.accountAccess')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #1E2D38',
                fontSize: 13.5,
              }}
            >
              <span style={{ color: '#EEF4F5' }}>Abonelik Durumu</span>
              <span style={{ color: isPro ? '#61D1A8' : '#7E949F', fontSize: 13, fontWeight: 600 }}>
                {isPro ? 'Pro Aktif' : 'Ücretsiz'}
              </span>
            </div>
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={() => logout()}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                border: 'none',
                borderBottom: '1px solid #1E2D38',
                background: 'transparent',
                color: '#ef4444',
                fontSize: 13.5,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Çıkış Yap / Kimlik Değiştir</span>
              <span style={{ color: '#ef4444', fontSize: 16 }}>›</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Privacy Explanation Surface */}
      <div
        style={{
          padding: '18px 22px',
          borderRadius: 8,
          background: '#111D26',
          border: '1px solid #1E2D38',
          maxWidth: 480,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#EEF4F5' }}>
          {t('account.identityNote')}
        </div>
        <div style={{ fontSize: 12, color: '#7E949F', marginTop: 4 }}>
          {t('account.keyNote')}
        </div>
      </div>

      {/* Modal: New Identity Created */}
      {showCreateModal && newIdentity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(8, 15, 22, 0.8)',
            backdropFilter: 'blur(4px)',
            padding: 20,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#111D26',
              border: '1px solid #1E2D38',
              borderRadius: 12,
              padding: '24px 28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, color: '#61D1A8', fontSize: 18, fontWeight: 700 }}>
              Yeni Knots Kimliği Oluşturuldu
            </h3>
            <p style={{ fontSize: 13, color: '#9DB0B7', marginTop: 8 }}>
              Kurtarma anahtarınızı güvenli bir yere kaydedin. Knots sunucularında saklanmaz.
            </p>
            <div style={{ padding: '12px 16px', background: '#0B151D', borderRadius: 8, marginTop: 12, border: '1px solid #1E2D38' }}>
              <div style={{ fontSize: 11, color: '#7E949F', fontWeight: 700, textTransform: 'uppercase' }}>12 Kelimelik Kurtarma Anahtarı</div>
              <div style={{ fontSize: 13, color: '#EEF4F5', fontFamily: "'DM Mono', monospace", marginTop: 6, lineHeight: 1.6, wordBreak: 'break-word' }}>
                {newIdentity.mnemonic}
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  background: '#18333D',
                  border: '1px solid #29404B',
                  color: '#EEF4F5',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('common.done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Restore Identity */}
      {showRestoreModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(8, 15, 22, 0.8)',
            backdropFilter: 'blur(4px)',
            padding: 20,
          }}
          onClick={() => setShowRestoreModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#111D26',
              border: '1px solid #1E2D38',
              borderRadius: 12,
              padding: '24px 28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, color: '#EEF4F5', fontSize: 18, fontWeight: 700 }}>
              Kimliği Geri Yükle
            </h3>
            <p style={{ fontSize: 13, color: '#9DB0B7', marginTop: 8 }}>
              12 kelimelik kurtarma anahtarınızı aralarında boşluk bırakarak girin.
            </p>
            <textarea
              value={restoreMnemonic}
              onChange={(e) => setRestoreMnemonic(e.target.value)}
              placeholder="kelime1 kelime2 kelime3..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #1E2D38',
                background: '#0B151D',
                color: '#EEF4F5',
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                marginTop: 12,
                resize: 'none',
              }}
            />
            {restoreError && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
                {restoreError}
              </div>
            )}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRestoreModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: '1px solid #1E2D38',
                  color: '#7E949F',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRestoreIdentity}
                disabled={restoreLoading}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #287FB9, #4FB9CF)',
                  border: 'none',
                  color: '#EEF4F5',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: restoreLoading ? 'wait' : 'pointer',
                }}
              >
                {restoreLoading ? t('common.loading') : 'Geri Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Account;