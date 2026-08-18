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
  const [showKey, setShowKey] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const changeSubscription = useAuthStore((s) => s.changeSubscription);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, loadProfile]);

  if (!isAuthenticated || !user) {
    return (
      <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: 'var(--space-6)' }}>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Not authenticated</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Please log in to view your account.</p>
        </div>
      </div>
    );
  }

  const initials = user.username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isPro = user.subscriptionType !== 'free';
  const planMeta = PLAN_META[user.subscriptionType] ?? PLAN_META.free;

  const handleChangePlan = async (plan: SubscriptionPlan) => {
    if (savingPlan || plan === user.subscriptionType) return;
    setSavingPlan(true);
    try {
      await changeSubscription(plan);
    } catch {
      // error surfaced via store; plan picker stays interactive
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Manage your profile, subscription and devices</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
        {/* SOL KOLON */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* PROFİL KARTI */}
          <Card padding="var(--space-6)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
              <motion.div
                whileHover={{ scale: 1.04 }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: 'linear-gradient(135deg, var(--accent), #0E8FD6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-inverse)',
                  fontSize: 26,
                  fontWeight: 700,
                  boxShadow: '0 6px 24px rgba(61,181,255,0.3)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>{user.username}</span>
                  <Badge tone={isPro ? 'accent' : 'neutral'}>
                    <Crown size={11} strokeWidth={2.2} /> {planMeta.label}
                  </Badge>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 3 }}>{user.email}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-2)' }}>
                  <Badge tone={user.emailVerified ? 'success' : 'warning'}>{user.emailVerified ? 'Verified' : 'Email pending'}</Badge>
                  <Badge>ID: {user.id.slice(0, 8).toUpperCase()}</Badge>
                </div>
              </div>
              <Button variant="secondary" size="sm" icon={RefreshCw}>Edit</Button>
            </div>
          </Card>

          {/* SUBSCRIPTION */}
          <Card>
            <SectionHeader icon={<Crown size={16} strokeWidth={2} />} title="Subscription" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              <MiniStat label="Plan" value={planMeta.label} />
              <MiniStat label="Member since" value={new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} />
              <MiniStat label="Status" value={isPro ? 'Active' : 'Free tier'} />
            </div>
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Device limit</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Up to {planMeta.devices} {planMeta.devices === 1 ? 'device' : 'devices'}</span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: planMeta.barWidth }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--accent), #33D4FF)' }}
                />
              </div>
              {isPro && user.subscriptionExpire && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Renews on {new Date(user.subscriptionExpire).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </Card>

          {/* DEVICES */}
          <Card>
            <SectionHeader icon={<Laptop size={16} strokeWidth={2} />} title="Devices" action={<Badge>2 connected</Badge>} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {DEVICES.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(28,200,255,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <d.icon size={17} strokeWidth={1.8} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{d.detail}</div>
                  </div>
                  {d.active ? (
                    <Badge tone="success">Online</Badge>
                  ) : (
                    <Button variant="ghost" size="sm">Revoke</Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* SECURITY */}
          <Card>
            <SectionHeader icon={<Shield size={16} strokeWidth={2} />} title="Security" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <KeyRound size={17} strokeWidth={1.8} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Access Token</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      {showKey ? 'sec_live_99824_k7x_windivert_f839a' : '••••••••••••••••••••••••••••'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms var(--ease)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {showKey ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Encryption</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Ed25519 / Curve</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Token Status</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Active</span>
              </div>
            </div>
          </Card>
        </div>

        {/* SAĞ PANEL - Daha yakın spacing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* PAYMENT */}
          <Card>
            <SectionHeader icon={<CreditCard size={16} strokeWidth={2} />} title="Payment" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
              <div style={{ width: 42, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #111827, #1F2937)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>••••</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Visa ending 4242</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expires 08/2028</div>
              </div>
              <Badge tone="success">Active</Badge>
            </div>
            <Button variant="secondary" size="sm" full style={{ marginTop: 'var(--space-3)' }} icon={CreditCard}>Manage Payment</Button>
          </Card>

          {/* QUICK ACTIONS */}
          <Card>
            <SectionHeader icon={<User size={16} strokeWidth={2} />} title="Quick Actions" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
              <QuickAction icon={RefreshCw} label="Change Key" />
              <QuickAction icon={HelpCircle} label="Support" />
              <QuickAction icon={Trash2} label="Purge Data" danger />
            </div>
          </Card>

          {/* PLAN SEÇİCİ */}
          <Card style={{ background: 'linear-gradient(135deg, rgba(28,200,255,0.08), rgba(14,143,214,0.05))', border: '1px solid rgba(28,200,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
              <Crown size={18} strokeWidth={2} color="var(--accent)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Choose your plan</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLANS.map((p) => {
                const isCurrent = user.subscriptionType === p.key;
                return (
                  <div
                    key={p.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: isCurrent ? 'rgba(28,200,255,0.1)' : 'var(--glass-card-bg)',
                      border: `1px solid ${isCurrent ? 'rgba(28,200,255,0.45)' : 'var(--glass-card-border)'}`,
                      backdropFilter: 'var(--glass-card-blur)',
                      WebkitBackdropFilter: 'var(--glass-card-blur)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{p.price}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{p.note} · {PLAN_META[p.key].devices} devices</div>
                    </div>
                    {isCurrent ? (
                      <Badge tone="accent">Active</Badge>
                    ) : (
                      <Button variant={p.key === 'premium' ? 'primary' : 'secondary'} size="sm" disabled={savingPlan} onClick={() => handleChangePlan(p.key)}>
                        {savingPlan ? '...' : 'Choose'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {planMeta.benefits.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(28,200,255,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
    </div>
    {action}
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{value}</div>
  </div>
);

const QuickAction: React.FC<{ icon: React.ComponentType<any>; label: string; danger?: boolean }> = ({ icon: Icon, label, danger }) => (
  <motion.button
    whileHover={{ y: -2 }}
    transition={{ duration: 0.15 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: 'var(--space-3)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--glass-card-bg)',
      backdropFilter: 'var(--glass-card-blur)',
      WebkitBackdropFilter: 'var(--glass-card-blur)',
      border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'var(--glass-card-border)'}`,
      color: danger ? 'var(--danger)' : 'var(--text-muted)',
      cursor: 'pointer',
      transition: 'background 150ms var(--ease), color 150ms var(--ease), border-color 150ms var(--ease)',
    }}
  >
    <Icon size={18} strokeWidth={1.9} />
    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{label}</span>
  </motion.button>
);

export default Account;