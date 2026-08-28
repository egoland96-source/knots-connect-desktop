import React, { useState } from 'react';
import {
  PlugZap,
  Lock,
  Eye,
  Bell,
  MonitorSmartphone,
  Zap,
  Fingerprint,
  Menu,
  Network,
  ChevronDown,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { usePrivacyStore } from '../../store/privacyStore';
import { useDnsStore } from '../../store/dnsStore';
import { Section, ToggleItem } from '../../components/ui';
import { PrivacyProtectionPanel, FilterListsPanel, CustomRulesPanel, LiveProtectionFeed } from '../../components/privacy';

export const Settings: React.FC = () => {
  const settings = useConnectionStore((s) => s.settings);
  const engineMode = useConnectionStore((s) => s.engineMode);
  const status = useConnectionStore((s) => s.status);
  const encryptionMethod = useConnectionStore((s) => s.encryptionMethod);
  const setEngineMode = useConnectionStore((s) => s.setEngineMode);
  const setEncryptionMethod = useConnectionStore((s) => s.setEncryptionMethod);
  const toggleSetting = useConnectionStore((s) => s.toggleSetting);

  const setPrivacyEnabled = usePrivacyStore((s) => s.setEnabled);
  const dnsMode = useDnsStore((s) => s.mode);
  const setDnsMode = useDnsStore((s) => s.setMode);
  const loadDns = useDnsStore((s) => s.load);

  const [encOpen, setEncOpen] = useState(false);

  React.useEffect(()=>{ loadDns(); }, [loadDns]);

  const isConnected = status === 'connected' || status === 'connecting';

  const ENC_OPTIONS = ['XOR Mask', 'Bit Swap', 'UDP Pad'];
  const encLabel = ENC_OPTIONS[(encryptionMethod ?? 1) - 1] ?? 'XOR Mask';

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Settings</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Tune your shield and connection preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* CONNECTION */}
        <Section title="Connection" icon={<PlugZap size={16} strokeWidth={2} />}>
          <SettingRow
            icon={<Zap size={17} strokeWidth={1.8} />}
            title="Bypass Engine"
            desc={isConnected ? 'Disconnect to change the backend' : 'Choose the packet processing backend'}
            control={
<div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            background: 'var(--glass-bg-light)',
            backdropFilter: 'var(--glass-blur-light)',
            WebkitBackdropFilter: 'var(--glass-blur-light)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-1)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}>
            {(['python', 'go'] as const).map((mode) => (
              <button
                key={mode}
                disabled={isConnected}
                onClick={() => setEngineMode(mode)}
                className={`knots-glass-btn ${engineMode === mode ? 'is-active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  opacity: isConnected ? 0.5 : 1,
                  cursor: isConnected ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {mode === 'go' ? 'Go Native' : 'Python'}
              </button>
            ))}
          </div>
            }
          />

          <div style={{ position: 'relative' }}>
            <SettingRow
              icon={<Network size={17} strokeWidth={1.8} />}
              title="Encryption Method"
              desc="How outgoing packets are obfuscated"
              control={
                <button
                  onClick={() => setEncOpen(!encOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--glass-card-bg-light)',
                    backdropFilter: 'var(--glass-card-blur)',
                    WebkitBackdropFilter: 'var(--glass-card-blur)',
                    border: '1px solid var(--glass-card-border)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: 140,
                    justifyContent: 'space-between',
                  }}
                >
                  {encLabel}
                  <ChevronDown size={15} strokeWidth={2} style={{ transform: encOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms var(--ease)' }} />
                </button>
              }
            />
            {encOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  width: 180,
                  background: 'var(--glass-card-bg-strong)',
                  backdropFilter: 'var(--glass-card-blur-hover)',
                  WebkitBackdropFilter: 'var(--glass-card-blur-hover)',
                  border: '1px solid var(--glass-card-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--glass-card-shadow-hover)',
                  padding: 6,
                  zIndex: 20,
                }}
              >
                {ENC_OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setEncryptionMethod(i + 1);
                      setEncOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: (encryptionMethod ?? 1) - 1 === i ? 'rgba(28,200,255,0.12)' : 'transparent',
                      color: (encryptionMethod ?? 1) - 1 === i ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 13,
                      fontWeight: (encryptionMethod ?? 1) - 1 === i ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToggleItem
            icon={PlugZap}
            title="Auto-Connect"
            desc="Start the shield automatically on launch"
            checked={settings?.autoConnect ?? false}
            onChange={() => toggleSetting('autoConnect')}
          />
        </Section>

        {/* SECURITY */}
        <Section title="Security" icon={<Lock size={16} strokeWidth={2} />}>
          <ToggleItem
            icon={Lock}
            title="Kill Switch"
            desc="Block all traffic if the connection drops unexpectedly"
            checked={settings?.killSwitch ?? true}
            onChange={() => toggleSetting('killSwitch')}
          />
          <ToggleItem
            icon={Fingerprint}
            title="Aggressive Mode"
            desc="Apply split/TTL manipulation to all HTTPS handshakes on port 443"
            checked={settings?.aggressiveMode ?? false}
            onChange={() => toggleSetting('aggressiveMode')}
          />
        </Section>

        {/* PRIVACY */}
        <Section title="Privacy" icon={<Eye size={16} strokeWidth={2} />}>
          <SettingRow
            icon={<Network size={17} strokeWidth={1.8} />}
            title="DNS Modu"
            desc={dnsMode==='cloudflare' ? 'Cloudflare Security Shield (malware kalkanı) — kart yok' : 'Yerel DNS (sistem) — ISP varsayılanı'}
            control={
              <div style={{display:'flex',gap:6,background:'var(--glass-bg-light)',padding:4,borderRadius:12,border:'1px solid var(--glass-border)'}}>
                {(['local','cloudflare'] as const).map(m=>(
                  <button key={m} onClick={()=>setDnsMode(m)} className={`knots-glass-btn ${dnsMode===m?'is-active':''}`} style={{padding:'8px 14px',borderRadius:10,fontSize:12.5,fontWeight:600,cursor:'pointer'}}>
                    {m==='local'?'Yerel':'Cloudflare'}
                  </button>
                ))}
              </div>
            }
          />
          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:-8,marginBottom:8,lineHeight:1.5}}>
            Yerel: sistem DNS'i • Cloudflare: <code>https://security.cloudflare-dns.com/dns-query</code> (filtreli, DoH, uygulama-içi) — UDP 53 kesilmez, sadece Knots sorguları gider. Değişim anında, yeniden başlatma yok.
          </div>
          <ToggleItem
            icon={Eye}
            title="DNS Leak Protection"
            desc="Route DNS queries through the private tunnel, keeping them hidden from your ISP"
            checked={settings?.dnsLeakProtection ?? true}
            onChange={() => toggleSetting('dnsLeakProtection')}
          />
          <ToggleItem
            icon={settings?.adblock ? ShieldCheck : ShieldOff}
            title="Privacy Protection Engine"
            desc="Local filter engine for ads, trackers, malware & phishing — independent of VPN/DPI. Off = uses last working cache."
            checked={settings?.adblock ?? true}
            onChange={() => {
              toggleSetting('adblock');
              setPrivacyEnabled(!!settings?.adblock ? false : true);
            }}
          />

          {/* Privacy Protection Engine — gerçek filtreme motoru (bağımsız modül) */}
          <PrivacyProtectionPanel />
          <FilterListsPanel />
          <CustomRulesPanel />
          <LiveProtectionFeed />
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Notifications" icon={<Bell size={16} strokeWidth={2} />}>
          <ToggleItem
            icon={Bell}
            title="Connection Alerts"
            desc="Show a notification when the connection state changes"
            checked={false}
            onChange={() => {}}
            disabled
          />
          <ToggleItem
            icon={Bell}
            title="Update Alerts"
            desc="Notify when a new version is available"
            checked={settings?.autoUpdate ?? true}
            onChange={() => toggleSetting('autoUpdate')}
          />
        </Section>

        {/* APPLICATION */}
        <Section title="Application" icon={<MonitorSmartphone size={16} strokeWidth={2} />}>
          <ToggleItem
            icon={MonitorSmartphone}
            title="Launch at Startup"
            desc="Start Knots Connect automatically when you log in to Windows"
            checked={settings?.startWithWindows ?? false}
            onChange={() => toggleSetting('startWithWindows')}
          />
          <ToggleItem
            icon={Menu}
            title="Tray Icon"
            desc="Keep the app running in the system tray when closed"
            checked={false}
            onChange={() => {}}
            disabled
          />
        </Section>
      </div>
    </div>
  );
};

interface SettingRowProps {
  icon?: React.ReactNode;
  title: string;
  desc: string;
  control?: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, title, desc, control }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 'var(--space-4) 0', borderTop: '1px solid var(--border-subtle)' }}>
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--glass-card-bg-light)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)', border: '1px solid var(--glass-card-border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
    {control}
  </div>
);

export default Settings;