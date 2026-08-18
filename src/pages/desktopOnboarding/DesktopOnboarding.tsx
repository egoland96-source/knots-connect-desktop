import React, { useState } from 'react';

export const DesktopOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  const slides = [
    {
      title: "Gizliliğiniz Bizim Önceliğimiz",
      desc: "Tüm ağ katmanlarında askeri seviye şifreleme ile bağlantınızı güvenlik altına alın.",
      tag: "KNOTS VPN ÇEKİRDĞI"
    },
    {
      title: "Yüksel Hız",
      desc: "80+ ülkede 140+ sunucu, bant genişliği darboğazı veya gecikme doruk noktası yok.",
      tag: "KÜRESEL AĞ"
    },
    {
      title: "Gizliliğiniz Kutsaldır",
      desc: "Günlük kayıt politikası yok, donanım Kesin Durdurma ve ileri DNS Sızıntı Koruması.",
      tag: "ULTİMA ÖZGÜRLÜK"
    }
  ];

  return (
    <div style={desktopStyles.overlay}>
      <div style={desktopStyles.card}>
        <div style={desktopStyles.tagBadge}>{slides[step - 1].tag}</div>
        <h1 style={desktopStyles.title}>{slides[step - 1].title}</h1>
        <p style={desktopStyles.desc}>{slides[step - 1].desc}</p>

        <div style={desktopStyles.dotContainer}>
          <span style={{ ...desktopStyles.dot, background: step === 1 ? 'var(--accent)' : 'var(--border-strong)' }} />
          <span style={{ ...desktopStyles.dot, background: step === 2 ? 'var(--accent)' : 'var(--border-strong)' }} />
          <span style={{ ...desktopStyles.dot, background: step === 3 ? 'var(--accent)' : 'var(--border-strong)' }} />
        </div>

        <div style={desktopStyles.btnRow}>
          {step > 1 && (
            <button style={desktopStyles.secondaryBtn} onClick={() => setStep(step - 1)}>
              Geri
            </button>
          )}
          <button 
            style={desktopStyles.primaryBtn} 
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else onComplete();
            }}
          >
            {step === 3 ? 'Hesap Oluştur ve Şifrele' : 'İleri'}
          </button>
        </div>
      </div>
    </div>
  );
};

const desktopStyles: Record<string, React.CSSProperties> = {
  overlay: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(180deg, #07111E 0%, #0B1628 50%, #0E1C30 100%)',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
  },
  card: {
    width: '540px',
    background: 'rgba(18, 25, 40, 0.55)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  tagBadge: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: 'var(--accent, #00d2ff)',
    marginBottom: '16px',
    background: 'rgba(0, 210, 255, 0.1)',
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(0, 210, 255, 0.2)',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  desc: {
    fontSize: '14px',
    color: '#a0a0b0',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  dotContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #00d2ff 0%, #0076ff 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)',
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#a0a0b0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '14px 24px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  }
};