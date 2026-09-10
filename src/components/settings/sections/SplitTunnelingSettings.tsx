import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Gamepad2,
  Shield,
  Zap,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Activity,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useConnectionStore } from '../../../store/connectionStore';
import { bridgeService } from '../../../services/bridge/bridgeService';
import type { RunningProcessItem } from '../../../services/bridge/bridgeService.types';

const SectionHeader: React.FC<{ title: string; desc: string; icon?: React.ReactNode }> = ({ title, desc, icon }) => (
  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && (
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(52,211,153,0.12)',
            color: '#34D399',
            border: '1px solid rgba(52,211,153,0.18)',
          }}
        >
          {icon}
        </span>
      )}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>{title}</h3>
    </div>
    <p style={{ margin: '6px 0 0 40px', fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>{desc}</p>
  </div>
);

const Row: React.FC<{ title: string; desc: string; control: React.ReactNode }> = ({ title, desc, control }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '14px 0',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
    </div>
    <div style={{ flexShrink: 0 }}>{control}</div>
  </div>
);

export const SplitTunnelingSettings: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const splitSettings = useConnectionStore((s) => s.splitSettings);
  const operatingMode = useConnectionStore((s) => s.operatingMode);
  const setOperatingMode = useConnectionStore((s) => s.setOperatingMode);
  const updateSplitSettings = useConnectionStore((s) => s.updateSplitSettings);
  const addBypassApp = useConnectionStore((s) => s.addBypassApp);
  const removeBypassApp = useConnectionStore((s) => s.removeBypassApp);

  const [processes, setProcesses] = useState<RunningProcessItem[]>([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [customAppInput, setCustomAppInput] = useState('');
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  const cfg = splitSettings?.splitTunneling;
  const isEnabled = cfg?.enabled ?? true;
  const autoDetect = cfg?.autoDetectGames ?? true;
  const presets = cfg?.presets ?? { steam: true, riot: true, epic: true, roblox: true, discordVoice: true };
  const customApps = cfg?.customApps ?? [];
  const activeRoutesCount = splitSettings?.activeRoutesCount ?? 0;
  const gateway = splitSettings?.physicalGateway ?? '192.168.1.1';

  const fetchProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const list = await bridgeService.getRunningProcesses();
      setProcesses(list);
    } catch {
      setProcesses([]);
    } finally {
      setLoadingProcesses(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleToggleMaster = async () => {
    await updateSplitSettings({ enabled: !isEnabled });
    onSaved();
  };

  const handleToggleAutoDetect = async () => {
    await updateSplitSettings({ autoDetectGames: !autoDetect });
    onSaved();
  };

  const handleTogglePreset = async (key: keyof typeof presets) => {
    const next = { ...presets, [key]: !presets[key] };
    await updateSplitSettings({ presets: next });
    onSaved();
  };

  const handleAddCustomApp = async (app: string) => {
    if (!app.trim()) return;
    const clean = app.trim().toLowerCase().endsWith('.exe') ? app.trim().toLowerCase() : `${app.trim().toLowerCase()}.exe`;
    await addBypassApp(clean);
    setCustomAppInput('');
    setSelectedProcess('');
    onSaved();
  };

  const PRESET_INFO: Record<keyof typeof presets, { label: string; desc: string; icon: string }> = {
    steam: { label: 'Steam & Valve Servers', desc: 'CS2, Dota 2, Steam Matchmaking & Relays', icon: '🎮' },
    riot: { label: 'Riot Games Direct', desc: 'Valorant, League of Legends TR/EU Game Servers', icon: '⚔️' },
    epic: { label: 'Epic Games & Fortnite', desc: 'Fortnite, Rocket League & AWS GameLift Relays', icon: '🚀' },
    roblox: { label: 'Roblox Edge Servers', desc: 'Roblox Core TCP/UDP Game Edge Nodes', icon: '🧱' },
    discordVoice: { label: 'Discord Voice & RTC', desc: 'Discord RTC voice servers & media channels', icon: '🎙️' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        title="Smart Split-Tunneling"
        desc="Oyunlarda 0 ms ek gecikme ile tam yerel hat hızını korurken; sosyal medya ve web sitelerinde IP adresinizi güvenceye alın."
        icon={<GitFork size={14} />}
      />

      {/* Mode Status Card */}
      <div
        style={{
          padding: '16px 18px',
          borderRadius: 14,
          background:
            operatingMode === 'hybrid'
              ? 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(59,130,246,0.08))'
              : operatingMode === 'gaming'
              ? 'rgba(167,139,250,0.10)'
              : 'rgba(59,130,246,0.10)',
          border: `1px solid ${
            operatingMode === 'hybrid'
              ? 'rgba(52,211,153,0.28)'
              : operatingMode === 'gaming'
              ? 'rgba(167,139,250,0.28)'
              : 'rgba(59,130,246,0.28)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: operatingMode === 'hybrid' ? '#34D399' : operatingMode === 'gaming' ? '#A78BFA' : '#3B82F6',
                  boxShadow: `0 0 10px ${
                    operatingMode === 'hybrid' ? '#34D399' : operatingMode === 'gaming' ? '#A78BFA' : '#3B82F6'
                  }`,
                }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                {operatingMode === 'hybrid'
                  ? '🧠 Smart Hybrid Aktif'
                  : operatingMode === 'gaming'
                  ? '⚡ Gaming Mod Aktif'
                  : '🛡️ Privacy Mod Aktif'}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(52,211,153,0.14)',
                  color: '#34D399',
                  border: '1px solid rgba(52,211,153,0.24)',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {activeRoutesCount} BYPASS ROTASI
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, lineHeight: 1.5 }}>
              {operatingMode === 'hybrid'
                ? 'Oyun paketleri yerel ağdan 0 ms ping ile çıkarken, sosyal medya ve web siteleri IP maskeleme tünelinden geçer.'
                : operatingMode === 'gaming'
                ? 'Tüm trafik yerel DPI bypass motoru üzerinden akar (Tam hat hızı, 0 ek ping).'
                : 'Tüm trafik WireGuard üzerinden şifreli tünelle akar (Maksimum IP gizliliği).'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {(['gaming', 'hybrid', 'privacy'] as const).map((m) => {
              const active = operatingMode === m;
              return (
                <button
                  key={m}
                  onClick={async () => {
                    await setOperatingMode(m);
                    onSaved();
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: active ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)',
                    background: active ? 'rgba(52,211,153,0.16)' : 'rgba(8,13,22,0.6)',
                    color: active ? '#34D399' : '#94A3B8',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {m === 'hybrid' ? '🧠 Hybrid' : m === 'gaming' ? '⚡ Gaming' : '🛡️ Privacy'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Master Toggle */}
      <Row
        title="Akıllı Ayrıştırmayı Etkinleştir (Split-Tunneling)"
        desc="Oyun ve düşük gecikme gerektiren trafiği VPN tünelinden hariç tutarak doğrudan fiziksel karta yönlendirir."
        control={
          <button
            onClick={handleToggleMaster}
            role="switch"
            aria-checked={isEnabled}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              border: '1px solid',
              borderColor: isEnabled ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
              background: isEnabled ? '#34D399' : 'rgba(255,255,255,0.10)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: isEnabled ? 20 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 160ms ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
              }}
            />
          </button>
        }
      />

      {/* Auto-Detect Games */}
      <Row
        title="Otomatik Oyun Algılama (0 ms Ping Garantisi)"
        desc="Arka planda açılan oyunları ve UDP ses bağlantılarını otomatik tanıyıp anında yerel hatta aktarır."
        control={
          <button
            onClick={handleToggleAutoDetect}
            disabled={!isEnabled}
            role="switch"
            aria-checked={autoDetect}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              border: '1px solid',
              borderColor: autoDetect ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.14)',
              background: autoDetect ? '#34D399' : 'rgba(255,255,255,0.10)',
              position: 'relative',
              cursor: isEnabled ? 'pointer' : 'not-allowed',
              opacity: isEnabled ? 1 : 0.4,
              transition: 'all 160ms ease',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: autoDetect ? 20 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 160ms ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
              }}
            />
          </button>
        }
      />

      {/* Presets Grid */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#E2E8F0', marginBottom: 12 }}>
          🎮 Hazır Oyun & Protokol Önayarları
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {(Object.keys(presets) as (keyof typeof presets)[]).map((key) => {
            const info = PRESET_INFO[key];
            const active = presets[key];
            return (
              <div
                key={key}
                onClick={() => isEnabled && handleTogglePreset(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: active ? 'rgba(52,211,153,0.06)' : 'rgba(17,25,40,0.4)',
                  border: `1px solid ${active ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: isEnabled ? 'pointer' : 'default',
                  opacity: isEnabled ? 1 : 0.5,
                  transition: 'all 140ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#F8FAFC' : '#94A3B8' }}>{info.label}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{info.desc}</div>
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    background: active ? '#34D399' : 'rgba(255,255,255,0.1)',
                    color: '#080D16',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {active ? '✓' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Application Bypass */}
      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#E2E8F0' }}>
              🛡️ Özel Uygulamalar (.exe)
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Bu listedeki uygulamaların trafiği doğrudan kendi internet hattınızdan (0 ms ping) çıkar.
            </div>
          </div>
          <button
            onClick={fetchProcesses}
            title="Açık pencereleri yenile"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94A3B8',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} className={loadingProcesses ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>

        {/* Add from running processes or custom */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {processes.length > 0 ? (
            <select
              value={selectedProcess}
              onChange={(e) => {
                setSelectedProcess(e.target.value);
                if (e.target.value) handleAddCustomApp(e.target.value);
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                background: '#111928',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#E2E8F0',
                fontSize: 12.5,
              }}
            >
              <option value="">Açık bir oyun veya uygulama seçin...</option>
              {processes.map((p) => (
                <option key={p.pid} value={p.name}>
                  {p.isGame ? '🎮 ' : '💻 '} {p.title.slice(0, 45)} ({p.name})
                </option>
              ))}
            </select>
          ) : null}

          <input
            type="text"
            placeholder="veya manuel yazın: oyun.exe"
            value={customAppInput}
            onChange={(e) => setCustomAppInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomApp(customAppInput)}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 10,
              background: '#111928',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#E2E8F0',
              fontSize: 12.5,
            }}
          />

          <button
            onClick={() => handleAddCustomApp(customAppInput)}
            disabled={!customAppInput.trim()}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: customAppInput.trim() ? '#34D399' : 'rgba(255,255,255,0.06)',
              color: customAppInput.trim() ? '#080D16' : '#64748B',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: customAppInput.trim() ? 'pointer' : 'default',
            }}
          >
            Ekle
          </button>
        </div>

        {/* Chips list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {customApps.length === 0 ? (
            <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
              Henüz özel uygulama eklenmedi. (Hazır oyun önayarları yukarıda etkindir).
            </span>
          ) : (
            customApps.map((app) => (
              <span
                key={app}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: 'rgba(52,211,153,0.10)',
                  border: '1px solid rgba(52,211,153,0.22)',
                  color: '#34D399',
                  fontSize: 12,
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 700,
                }}
              >
                🎮 {app}
                <button
                  onClick={() => {
                    removeBypassApp(app);
                    onSaved();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#FB7185',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                  title="Kaldır"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Network Info Footer */}
      <div
        style={{
          marginTop: 10,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(8,13,22,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#94A3B8',
          fontFamily: 'DM Mono, monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={14} color="#34D399" />
          <span>Fiziksel Ağ Geçidi: <strong style={{ color: '#F8FAFC' }}>{gateway}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
          <Activity size={14} />
          <span>0 ms Ek Gecikme Garantisi</span>
        </div>
      </div>
    </div>
  );
};

export default SplitTunnelingSettings;
