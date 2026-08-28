import React, { useEffect, useId, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import './LoginForm.css';

type CreatedIdentity = { knotsId: string; mnemonic: string };

// Window.knots tipi src/types/electron.d.ts içinde tanımlı (KnotsBridgeApi)
const formatKnotsId = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
};

const normalizeMnemonic = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const mnemonicWordCount = (value: string) => normalizeMnemonic(value).split(' ').filter(Boolean).length;
const FALLBACK_WORDS = 'abandon ability able about above absent absorb abstract access accident achieve acid acoustic acquire across action actor adapt add address admit advance advice airport aisle alert alien alpha alter always amazing amount analyst anchor anger angle annual antenna antique anxiety apart apology apple approve april arctic arena argue armor army arrange arrive arrow artist aspect asset assume asthma athlete atom attack attend attitude auction audit august author autumn average avocado awake aware awesome axis badge balance balcony bamboo banner barely bargain barrel basic basket beach beauty become before behave behind believe below benefit better bicycle biology bird birth bitter blade blanket blast bless blind blood blossom blouse board boat bonus border brave bread breeze brick bridge bright brisk broccoli bronze broom brother brown brush bubble budget build bundle bunker burden burger burst business busy butter buyer buzz cabin cable cactus cage calm camera camp canal cancel candy canoe canvas canyon capable capital captain carbon cargo carpet carry case cash casual catch category cause caution ceiling celery century cereal certain chair champion change chaos chapter charge chase chat check cheese cherry chest chief child choice choose circle citizen civil claim clarify clean clever client climb clinic clock close cloud cluster coach coast coconut code coffee coil coin collect color column combine comfort comic company concert conduct confirm connect consider control convince copper coral cotton country couple cover craft crane crash crater crazy cream credit creek';

function genFallbackMnemonic() {
  const words = FALLBACK_WORDS.split(' ');
  return Array.from({ length: 12 }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
}

function genFallbackKnotsId() {
  let value = '';
  for (let index = 0; index < 16; index += 1) value += Math.floor(Math.random() * 10).toString();
  return /^0+$/.test(value) ? `1${value.slice(1)}` : value;
}

const Icon = ({ name }: { name: 'shield' | 'key' | 'copy' | 'close' | 'arrow' | 'check' | 'alert' | 'eye' }) => {
  const paths = {
    shield: <><path d="M12 3.2 19 6v5.1c0 4.5-2.8 8.1-7 9.7-4.2-1.6-7-5.2-7-9.7V6l7-2.8Z" /><path d="m9.1 12 1.9 1.9 4.1-4.1" /></>,
    key: <><circle cx="8.3" cy="15.7" r="3.6" /><path d="m11 13 8.2-8.2M16 6l2 2M14.2 7.8l2 2" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    check: <path d="m5 12.5 4.3 4.3L19 7.1" />,
    alert: <><path d="M12 3.5 21 20H3l9-16.5Z" /><path d="M12 9v4.2M12 16.6v.1" /></>,
    eye: <><path d="M3.4 12c0-2 3.5-7 8.6-7s8.6 5 8.6 7-3.5 7-8.6 7-8.6-5-8.6-7Z" /><circle cx="12" cy="12" r="3" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
};

const Spinner = () => <span className="knots-spinner" aria-hidden="true" />;

export const LoginForm: React.FC = () => {
  const [knotsId, setKnotsId] = useState('');
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedIdentity | null>(null);
  const [copied, setCopied] = useState<'id' | 'mnemonic' | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const recoverTitleId = useId();

  const knotsAuth = useAuthStore((state) => state.knotsAuth);
  const knotsRecover = useAuthStore((state) => state.knotsRecover);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKnotsId(formatKnotsId(event.target.value));
    if (error) setError(null);
  };

  const handleConnect = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const raw = knotsId.replace(/-/g, '');
    if (raw.length !== 16) {
      setError('Knots ID 16 haneli olmalı (XXXX-XXXX-XXXX-XXXX).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (window.knots?.auth) {
        const response = await window.knots.auth(raw);
        if (response?.success === false) throw new Error(response.message || 'Doğrulama başarısız.');
      }
      await knotsAuth(raw);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bağlantı başarısız. ID’yi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: CreatedIdentity | null = null;
      if (window.knots?.init) {
        const response = await window.knots.init();
        if (response.knotsId && response.mnemonic) {
          data = { knotsId: formatKnotsId(response.knotsId), mnemonic: normalizeMnemonic(response.mnemonic) };
        } else if (response.success === false) {
          throw new Error(response.message || 'Kimlik oluşturulamadı.');
        }
      }
      if (!data) {
        const raw = genFallbackKnotsId();
        data = { knotsId: formatKnotsId(raw), mnemonic: genFallbackMnemonic() };
        try { await window.knots?.auth?.(raw); } catch { /* Dev fallback: motor yoksa akışı kesme. */ }
        try {
          localStorage.setItem(`knots:mnemonic:${raw}`, data.mnemonic);
          localStorage.setItem('knots:lastId', raw);
        } catch { /* Storage erişimi olmayan ortamlarda devam et. */ }
      }
      setCreated(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kimlik oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    const clean = normalizeMnemonic(mnemonic);
    if (mnemonicWordCount(clean) !== 12) {
      setError('Kurtarma anahtarı tam 12 kelime olmalı.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (window.knots?.mnemonicRecover) {
        const response = await window.knots.mnemonicRecover({ mnemonic: clean });
        if (response.success === false) throw new Error(response.message || 'Kurtarma başarısız.');
        if (response.knotsId) await knotsAuth(response.knotsId.replace(/-/g, ''));
        else await knotsRecover(clean);
      } else {
        await knotsRecover(clean);
      }
      setShowRecoverModal(false);
      setMnemonic('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kurtarma başarısız. Kelimeleri kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, type: 'id' | 'mnemonic') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try { await window.knots?.copyId?.(text); } catch { return; }
    }
    setCopied(type);
  };

  const closeRecover = () => {
    if (loading) return;
    setShowRecoverModal(false);
    setMnemonic('');
    setError(null);
  };

  if (created) {
    return (
      <div className="knots-auth-page">
        <div className="knots-auth-noise" aria-hidden="true" />
        <div className="knots-auth-grid" aria-hidden="true" />
        <div className="knots-auth-orb knots-auth-orb--blue" aria-hidden="true" />
        <div className="knots-auth-orb knots-auth-orb--violet" aria-hidden="true" />
        <main className="knots-success-card" aria-labelledby="identity-created-title">
          <div className="knots-success-icon"><Icon name="check" /></div>
          <span className="knots-eyebrow">IDENTITY PROVISIONED</span>
          <h1 id="identity-created-title">Kimlik oluşturuldu.</h1>
          <p className="knots-success-copy">Knots ID’nizi ve 12 kelimelik kurtarma anahtarınızı güvenli bir yerde saklayın. Bu bilgiler olmadan hesabınızı kurtaramazsınız.</p>

          <div className="knots-data-block">
            <div className="knots-data-label">KNOTS ID</div>
            <div className="knots-data-value">
              <code>{created.knotsId}</code>
              <button type="button" className="knots-icon-button" onClick={() => copy(created.knotsId, 'id')} aria-label="Knots ID'yi kopyala">
                {copied === 'id' ? <Icon name="check" /> : <Icon name="copy" />}
              </button>
            </div>
          </div>

          <div className="knots-data-block knots-data-block--warning">
            <div className="knots-data-label">12 KELİMELİK KURTARMA ANAHTARI</div>
            <div className={`knots-mnemonic-value ${showMnemonic ? '' : 'is-hidden'}`}>
              {showMnemonic ? created.mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
            </div>
            <div className="knots-inline-actions">
              <button type="button" className="knots-secondary-button" onClick={() => setShowMnemonic((visible) => !visible)}>
                {showMnemonic ? 'Anahtarı gizle' : 'Anahtarı göster'}
              </button>
              <button type="button" className="knots-secondary-button" onClick={() => copy(created.mnemonic, 'mnemonic')}>
                {copied === 'mnemonic' ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
          </div>

          <div className="knots-warning-note"><Icon name="alert" /> Bu anahtarı kimseyle paylaşmayın.</div>
          <button type="button" className="knots-primary-button" onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              await knotsAuth(created.knotsId.replace(/\D/g, ''));
              setCreated(null);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Giriş başarısız.');
            } finally { setLoading(false); }
          }} disabled={loading}>
            <span>{loading ? 'BAĞLANIYOR...' : 'DASHBOARD’A GEÇ'}</span>
            {loading ? <Spinner /> : <Icon name="arrow" />}
          </button>
          {error && <div className="knots-alert knots-alert--error" role="alert"><Icon name="alert" />{error}</div>}
          <p className="knots-security-caption">END-TO-END ENCRYPTED SESSION <span>•</span> KNOTS_ID::AUTH</p>
        </main>
      </div>
    );
  }

  return (
    <div className="knots-auth-page">
      <div className="knots-auth-noise" aria-hidden="true" />
      <div className="knots-auth-grid" aria-hidden="true" />
      <div className="knots-auth-orb knots-auth-orb--blue" aria-hidden="true" />
      <div className="knots-auth-orb knots-auth-orb--violet" aria-hidden="true" />
      <main className="knots-login-shell">
        <section className="knots-login-visual" aria-label="Knots Connect güvenlik bilgileri">
          <div className="knots-brand"><span className="knots-brand-mark"><Icon name="shield" /></span><span><strong>KNOTS CONNECT</strong><small>DESKTOP NETWORK CLIENT</small></span></div>
          <div className="knots-visual-copy"><span className="knots-eyebrow">PRIVATE BY DESIGN</span><h1>Your connection.<br /><em>Unseen.</em></h1><p>Zero-knowledge mimarisi ve DPI bypass odaklı güvenli ağ deneyimini tek bir akışta başlatın.</p></div>
          <div className="knots-security-list"><div><span className="knots-security-icon"><Icon name="key" /></span><span><strong>ZERO-KNOWLEDGE CORE</strong><small>Kimlik verileri yerel akışta tutulur.</small></span><Icon name="check" /></div><div><span className="knots-security-icon"><Icon name="shield" /></span><span><strong>DPI-RESISTANT ROUTING</strong><small>Ağ trafiğinize uyum sağlayan bağlantı katmanı.</small></span><Icon name="check" /></div></div>
          <div className="knots-system-status"><span className="knots-status-dot" /> ALL SYSTEMS OPERATIONAL <span /> BUILD 4.2.0</div>
        </section>

        <section className="knots-login-panel" aria-labelledby="login-title">
          <div className="knots-mobile-brand"><span className="knots-brand-mark"><Icon name="shield" /></span><strong>KNOTS CONNECT</strong></div>
          <div className="knots-panel-heading"><div className="knots-connection-state"><span className={`knots-connection-ring ${loading ? 'is-loading' : ''}`} /> {loading ? 'SECURE HANDSHAKE' : 'READY FOR SECURE ACCESS'}</div><h2 id="login-title">Access your network.</h2><p>Knots ID’nizi girerek şifreli oturumu başlatın.</p></div>

          <form className="knots-login-form" onSubmit={handleConnect} noValidate>
            <div className="knots-field"><label htmlFor="knots-id">KNOTS ID</label><div className="knots-input-row"><input id="knots-id" type="text" inputMode="numeric" placeholder="0000-0000-0000-0000" value={knotsId} onChange={handleIdChange} disabled={loading} autoComplete="off" spellCheck={false} aria-describedby={error ? 'knots-login-error' : undefined} /><button className="knots-connect-button" type="submit" disabled={loading || knotsId.replace(/-/g, '').length !== 16}>{loading ? <Spinner /> : <><span>CONNECT</span><Icon name="arrow" /></>}</button></div></div>
            {error && <div className="knots-alert knots-alert--error" id="knots-login-error" role="alert"><Icon name="alert" />{error}</div>}
            <div className="knots-divider"><span>OR</span></div>
            <button type="button" className="knots-primary-button" onClick={handleCreateNew} disabled={loading}><span>{loading ? 'CREATING...' : 'CREATE NEW IDENTITY'}</span>{loading ? <Spinner /> : <Icon name="arrow" />}</button>
            <button type="button" className="knots-recover-link" onClick={() => { setError(null); setShowRecoverModal(true); }} disabled={loading}>RESTORE WITH 12 WORDS</button>
            <p className="knots-privacy-line">Zero-knowledge <span>•</span> No email <span>•</span> No password <span>•</span> Your device is your key</p>
          </form>
          <div className="knots-panel-bottomline"><span><Icon name="shield" /> END-TO-END ENCRYPTED SESSION</span><code>KNOTS_ID::AUTH</code></div>
        </section>
      </main>

      {showRecoverModal && <div className="knots-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRecover(); }}><section className="knots-modal" role="dialog" aria-modal="true" aria-labelledby={recoverTitleId}><button type="button" className="knots-modal-close" onClick={closeRecover} disabled={loading} aria-label="Kurtarma penceresini kapat"><Icon name="close" /></button><span className="knots-eyebrow">RECOVERY PROTOCOL</span><h2 id={recoverTitleId}>Restore identity.</h2><p>12 kelimelik kurtarma anahtarınızı girin. Knots ID otomatik olarak türetilecektir.</p><textarea rows={4} value={mnemonic} onChange={(event) => { setMnemonic(event.target.value); if (error) setError(null); }} placeholder="word1 word2 word3 … word12" disabled={loading} autoComplete="off" spellCheck={false} aria-describedby={error ? 'knots-recover-error' : undefined} />{error && <div className="knots-alert knots-alert--error" id="knots-recover-error" role="alert"><Icon name="alert" />{error}</div>}<div className="knots-modal-actions"><button type="button" className="knots-secondary-button" onClick={closeRecover} disabled={loading}>CANCEL</button><button type="button" className="knots-primary-button" onClick={handleRecover} disabled={loading || mnemonicWordCount(mnemonic) !== 12}><span>{loading ? 'RECOVERING...' : 'RECOVER'}</span>{loading ? <Spinner /> : <Icon name="arrow" />}</button></div></section></div>}
    </div>
  );
};

export default LoginForm;
