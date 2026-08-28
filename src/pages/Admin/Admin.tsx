import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield, Users, Megaphone, Database, Server, KeyRound, Smartphone,
  Gift, CreditCard, RefreshCw, Trash2, Plus, Play, Save, AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import * as api from '../../services/admin/adminApi';

type Tab = 'overview' | 'users' | 'announcements' | 'db' | 'render' | 'security' | 'referrals' | 'payments';

const TABS: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'overview', label: 'Overview', icon: Shield },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'db', label: 'DB Console', icon: Database },
  { key: 'render', label: 'Render', icon: Server },
  { key: 'security', label: 'Security (2FA/Devices)', icon: KeyRound },
  { key: 'referrals', label: 'Referrals', icon: Gift },
  { key: 'payments', label: 'Payments', icon: CreditCard },
];

function useAsync<T>(fn: () => Promise<T>, deps: any[], initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, loading, error, run, setData };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid var(--glass-card-border)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
};

// Değerleri ekranda düz metin gösterilmeyecek hassas env key'leri
const SECRET_ENV_RE = /(secret|token|password|passwd|api[_-]?key|private|credential|dsn|database[_-]?url|^url$)/i;

function Overview({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const users = useAsync(() => api.adminUsers() as Promise<any[]>, [], []);
  const payments = useAsync(() => api.adminPayments() as Promise<any[]>, [], []);

  const card = (label: string, value: string | number, onClick?: () => void) => (
    <Card hover={!!onClick} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </Card>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        {card('Total Users', users.data.length, () => onNavigate('users'))}
        {card('Admins', users.data.filter((u: any) => u.is_admin).length)}
        {card('Payments', payments.data.length, () => onNavigate('payments'))}
        {card('Verified Users', users.data.filter((u: any) => u.email_verified).length)}
      </div>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
          <AlertTriangle size={16} /> Admin console has full database &amp; infra access. Use carefully.
        </div>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { data, loading, error } = useAsync(() => api.adminUsers() as Promise<any[]>, [], []);
  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading users…</p>;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
  return (
    <Card>
      <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Users</h3>
      <Table
        columns={['email', 'username', 'subscription_type', 'email_verified', 'is_admin', 'referral_code', 'created_at']}
        rows={data}
      />
    </Card>
  );
}

function AnnouncementsTab() {
  const { data, run, loading, error } = useAsync(() => api.adminAnnouncements() as Promise<any[]>, [], []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState('info');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.adminCreateAnnouncement({ title, body, severity });
      setMsg('Created');
      setTitle(''); setBody('');
      run();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await api.adminDeleteAnnouncement(id);
    run();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>New announcement</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, marginBottom: 12 }}>
          <Field label="Title"><input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Severity">
            <select style={inputStyle} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {['info', 'warning', 'success', 'danger'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Body"><textarea style={{ ...inputStyle, minHeight: 80 }} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button size="sm" icon={Plus} disabled={busy} onClick={create}>Create</Button>
          {msg && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{msg}</span>}
          {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Active / all announcements</h3>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> :
          <Table columns={['title', 'severity', 'active', 'created_at']} rows={data}
            actions={(r) => <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(r.id)}>Delete</Button>} />}
      </Card>
    </div>
  );
}

function DbTab() {
  const [sql, setSql] = useState('SELECT id, email, subscription_type FROM users ORDER BY created_at DESC LIMIT 20;');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setResult(null);
    try {
      setResult(await api.adminDbQuery(sql));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const isGrid = result && result.columns && result.rows;

  return (
    <Card>
      <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Raw SQL Console (full DB access)</h3>
      <textarea style={{ ...inputStyle, width: '100%', minHeight: 110, fontFamily: 'monospace', fontSize: 12 }} value={sql} onChange={(e) => setSql(e.target.value)} />
      <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button size="sm" icon={Play} disabled={busy} onClick={run}>Run</Button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>SELECT/INSERT/UPDATE/DELETE all allowed. Admin only.</span>
      </div>
      {err && <pre style={{ color: 'var(--danger)', marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>{err}</pre>}
      {result && !err && (
        <div style={{ marginTop: 16, overflow: 'auto' }}>
          {isGrid ? <Table columns={result.columns} rows={result.rows} /> :
            <pre style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      )}
    </Card>
  );
}

function RenderTab() {
  const env = useAsync(() => api.renderEnv() as Promise<any>, [], null);
  const deploys = useAsync(() => api.renderDeploys() as Promise<any>, [], null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState(false);

  const restart = async () => {
    setBusy(true); setMsg(null);
    try { const r = await api.renderRestart(); setMsg(typeof r === 'string' ? r : 'Restart triggered'); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  const saveEnv = async () => {
    const vars = Object.entries(edits).map(([key, value]) => ({ key, value }));
    setBusy(true); setMsg(null);
    try { await api.renderUpdateEnv(vars); setMsg('Saved'); setEdits({}); env.run(); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  const envVars: any[] = Array.isArray(env.data) ? env.data : (env.data?.envVars || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button size="sm" variant="danger" icon={RefreshCw} disabled={busy} onClick={restart}>Restart service</Button>
          <Button size="sm" icon={RefreshCw} onClick={() => { env.run(); deploys.run(); }}>Refresh</Button>
          {msg && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{msg}</span>}
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          Environment variables
          <button onClick={() => setShowSecrets((s) => !s)}
            style={{ background: 'transparent', border: '1px solid var(--glass-card-border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>
            {showSecrets ? 'Hide secrets' : 'Show secrets'}
          </button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {envVars.map((v: any) => (
            <div key={v.key} style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{v.key}</span>
              <input
                type={!showSecrets && SECRET_ENV_RE.test(v.key) ? 'password' : 'text'}
                style={inputStyle} defaultValue={v.value} onChange={(e) => setEdits((p) => ({ ...p, [v.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        {Object.keys(edits).length > 0 && (
          <div style={{ marginTop: 12 }}><Button size="sm" icon={Save} disabled={busy} onClick={saveEnv}>Save changes</Button></div>
        )}
      </Card>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Deploys</h3>
        <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
          {JSON.stringify(deploys.data, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const devices = useAsync(() => api.listDevices() as Promise<any[]>, [], []);
  const referral = useAsync(() => api.getReferral() as Promise<any>, [], null);
  const [setup, setSetup] = useState<any>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const startSetup = async () => {
    setBusy(true); setMsg(null);
    try { setSetup(await api.totpSetup()); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };
  const enable = async () => {
    setBusy(true); setMsg(null);
    try { await api.totpEnable(code); setMsg('2FA enabled'); setSetup(null); setCode(''); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Two-factor authentication</h3>
        {!setup ? (
          <Button size="sm" icon={KeyRound} disabled={busy} onClick={startSetup}>Begin setup</Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Scan this URI in an authenticator app:</p>
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, fontSize: 12, wordBreak: 'break-all' }}>{setup.otpauth_url}</code>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Secret: {setup.secret}</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button size="sm" disabled={busy} onClick={enable}>Verify & enable</Button>
            </div>
          </div>
        )}
        {msg && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>{msg}</p>}
      </Card>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Your devices (sessions)</h3>
        {devices.loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> :
          <Table columns={['device_label', 'last_ip', 'last_seen', 'created_at']} rows={devices.data}
            actions={(r) => <Button size="sm" variant="danger" icon={Trash2} onClick={async () => { await api.revokeDevice(r.id); devices.run(); }}>Revoke</Button>} />}
      </Card>
    </div>
  );
}

function ReferralsTab() {
  const { data, loading, error } = useAsync(() => api.getReferral() as Promise<any>, [], null);
  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
  return (
    <Card>
      <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Your referral</h3>
      <pre style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{JSON.stringify(data, null, 2)}</pre>
    </Card>
  );
}

function PaymentsTab() {
  const payments = useAsync(() => api.adminPayments() as Promise<any[]>, [], []);
  const plans = useAsync(() => api.paymentPlans() as Promise<any>, [], null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Plans</h3>
        <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{JSON.stringify(plans.data, null, 2)}</pre>
      </Card>
      <Card>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Payments</h3>
        {payments.loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> :
          <Table columns={['email', 'plan', 'amount', 'currency', 'status', 'provider', 'created_at']} rows={payments.data} />}
      </Card>
    </div>
  );
}

function Table({ columns, rows, actions }: { columns: string[]; rows: any[]; actions?: (r: any) => React.ReactNode }) {
  if (!rows || rows.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No rows.</p>;
  return (
    <div style={{ overflow: 'auto', border: '1px solid var(--glass-card-border)', borderRadius: 'var(--radius-md)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            {columns.map((c) => <th key={c} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{c}</th>)}
            {actions && <th style={{ padding: '10px 12px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--glass-card-border)' }}>
              {columns.map((c) => (
                <td key={c} style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof r[c] === 'boolean' ? <Badge tone={r[c] ? 'success' : 'neutral'}>{String(r[c])}</Badge> : String(r[c] ?? '')}
                </td>
              ))}
              {actions && <td style={{ padding: '10px 12px' }}>{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Admin: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

  const [diag, setDiag] = useState<{ version: string; db: string }>({ version: '…', db: '…' });
  useEffect(() => {
    (async () => {
      let version = '';
      try {
        const v = await api.apiVersion();
        version = v.build;
      } catch (e: any) {
        version = 'ERR: ' + (e?.message ?? e);
      }
      let db = '';
      try {
        await api.adminDbQuery('SELECT 1 AS ok');
        db = '200 OK (route exists)';
      } catch (e: any) {
        db = e?.message ?? String(e);
      }
      setDiag({ version, db });
    })();
  }, []);

  const tabs = useMemo(() => TABS, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={22} color="var(--accent)" />
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Admin Console</h2>
        {!isAdmin && <Badge tone="danger">not admin — requests will be rejected</Badge>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        API build: <b style={{ color: 'var(--text-secondary)' }}>{diag.version}</b> · DB probe: <b style={{ color: 'var(--text-secondary)' }}>{diag.db}</b>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                border: active ? '1px solid rgba(61,181,255,0.4)' : '1px solid transparent',
                background: active ? 'var(--glass-accent)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'overview' && <Overview onNavigate={setTab} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'db' && <DbTab />}
      {tab === 'render' && <RenderTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'referrals' && <ReferralsTab />}
      {tab === 'payments' && <PaymentsTab />}
    </div>
  );
};

export default Admin;
