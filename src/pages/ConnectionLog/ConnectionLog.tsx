import React, { useState, useEffect, useRef } from 'react';

interface PacketLogData {
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  tcp_flags: string;
  payload_len: number;
  sni: string;
  strategy: string;
  description: string;
  color: string;
}

export const ConnectionLog: React.FC = () => {
  const [logs, setLogs] = useState<PacketLogData[]>([]);
  const [filter, setFilter] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = window.knots?.onTelemetry?.((data: any) => {
      if (data?.event === 'packet_log' && data?.data) {
        setLogs((prev) => {
          const next = [data.data, ...prev];
          if (next.length > 500) next.length = 500;
          return next;
        });
      }
    });
    return () => unsubscribe?.();
  }, []);

  const filtered = logs.filter((l) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      l.description?.toLowerCase().includes(q) ||
      l.sni?.toLowerCase().includes(q) ||
      l.dst_ip?.toLowerCase().includes(q) ||
      l.strategy?.toLowerCase().includes(q)
    );
  });

  const colorClass = (c: string) => {
    switch (c) {
      case 'green': return { borderColor: '#22c55e', background: 'rgba(34,197,94,0.08)' };
      case 'yellow': return { borderColor: '#eab308', background: 'rgba(234,179,8,0.08)' };
      case 'red': return { borderColor: '#ef4444', background: 'rgba(239,68,68,0.08)' };
      default: return { borderColor: '#94a3b8', background: 'rgba(148,163,184,0.05)' };
    }
  };

  return (
    <div style={{ padding: 24, color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Bağlantı Günlüğü</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Go motorundan gelen gerçek zamanlı paket açıklamaları. Her satırın üzerine tıklayarak teknik detayları görebilirsiniz.
      </p>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrele (domain, açıklama, strateji...)"
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid var(--glass-card-border)',
            background: 'var(--glass-card-bg)',
            color: 'inherit',
            fontSize: 13,
          }}
        />
      </div>

      <div
        ref={scrollRef}
        style={{
          maxHeight: 520,
          overflowY: 'auto',
          border: '1px solid var(--glass-card-border)',
          borderRadius: 12,
          background: 'var(--glass-card-bg)',
          backdropFilter: 'var(--glass-card-blur)',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Henüz paket kaydı yok. Bağlantı kurulduğunda burada görünecek.
          </div>
        ) : (
          filtered.map((l, i) => {
            const styleObj = colorClass(l.color);
            return (
              <div
                key={`${l.timestamp}-${i}-${l.dst_ip}-${l.dst_port}`}
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${styleObj.borderColor}`,
                  background: expandedIndex === i ? 'rgba(255,255,255,0.03)' : styleObj.background,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                {/* SADE AÇIKLAMA — ana satır */}
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {l.description || 'Paket kaydı — açıklama yok.'}
                </div>

                {/* Renk etiketi */}
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: styleObj.borderColor + '22',
                      color: styleObj.borderColor,
                      fontWeight: 600,
                      marginRight: 8,
                    }}
                  >
                    {l.color === 'green' ? 'Başarılı' : l.color === 'yellow' ? 'Denendi / Bekliyor' : l.color === 'red' ? 'Engellendi / Koptu' : 'Bypass Uygulanmadı'}
                  </span>
                  <span>{l.timestamp}</span>
                </div>

                {/* Genişleme — teknik detay */}
                {expandedIndex === i && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.15)',
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div><strong>Kaynak:</strong> {l.src_ip}:{l.src_port}</div>
                    <div><strong>Hedef:</strong> {l.dst_ip}:{l.dst_port}</div>
                    <div><strong>Protokol:</strong> {l.protocol}</div>
                    <div><strong>TCP Bayrakları:</strong> {l.tcp_flags}</div>
                    <div><strong>Payload Boyutu:</strong> {l.payload_len} bayt</div>
                    {l.sni ? <div><strong>SNI:</strong> {l.sni}</div> : null}
                    <div><strong>Strateji:</strong> {l.strategy}</div>
                    <div><strong>Zaman:</strong> {l.timestamp}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
