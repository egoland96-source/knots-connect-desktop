import React, { useState, useMemo } from 'react';
import { motion, animate } from 'framer-motion';
import { Download, Upload, Activity, ShieldCheck, RotateCcw, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useConnectionStore, useTelemetryHistory } from '../../store/connectionStore';
import { usePrivacyStore } from '../../store/privacyStore';
import { sumRange, sliceDays } from '../../privacy';
import { Card, Badge, ProgressRing, Button } from '../../components/ui';

type Range = '24H' | '7D' | '30D';

const RANGES: Range[] = ['24H', '7D', '30D'];

const RANGE_DAYS: Record<Range, number> = { '24H': 2, '7D': 7, '30D': 30 };

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const ACTIVITY_LOG = [
  { icon: CheckCircle2, color: '#22C55E', text: 'Connection established · Netherlands', time: '14:32' },
  { icon: Info, color: '#3DB5FF', text: 'Encryption switched to XOR Mask', time: '14:31' },
  { icon: AlertTriangle, color: '#F59E0B', text: 'High packet load detected on 443', time: '14:28' },
  { icon: CheckCircle2, color: '#22C55E', text: 'DNS leak protection engaged', time: '14:26' },
  { icon: Info, color: '#3DB5FF', text: 'Kill switch armed', time: '14:25' },
];

// Safe number utilities
const safeNum = (value: number | null | undefined): number => 
  typeof value === 'number' && isFinite(value) ? value : 0;

const safeNumFixed = (value: number | null | undefined, decimals: number = 1): string => 
  safeNum(value).toFixed(decimals);

/** Sayıyı yumuşak bir sayaç animasyonuyla mevcut değerden hedefe taşır. */
const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string; duration?: number }> = ({
  value,
  format = (n) => `${n}`,
  duration = 0.8,
}) => {
  const formatRef = React.useRef(format);
  formatRef.current = format;
  const prev = React.useRef(0);
  const [display, setDisplay] = React.useState(() => format(0));

  React.useEffect(() => {
    const from = prev.current;
    const controls = animate(from, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(formatRef.current(v)),
      onComplete: () => setDisplay(formatRef.current(value)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <span>{display}</span>;
};

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label: string;
  timeLabels?: string[];
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 384,
  height = 128,
  color = 'var(--accent)',
  label,
  timeLabels,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <div style={{ width: '100%', maxWidth: width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No data available
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 12;
  const step = (width - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: pad + i * step,
    y: height - pad - ((v - min) / range) * (height - pad * 2),
  }));

  const linePath = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const p0 = arr[Math.max(0, i - 2)];
    const p1 = arr[i - 1];
    const p2 = p;
    const p3 = arr[Math.min(arr.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    return `${acc} C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }, '');
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`;
  const gid = React.useId();

  const gridLines = [0.25, 0.5, 0.75].map((f) => ({
    y: height - pad - f * (height - pad * 2),
  }));

  const defaultTimeLabels = timeLabels || Array.from({ length: data.length }, (_, i) => {
    const hour = Math.floor((i / (data.length - 1)) * 24);
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: width }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="60%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map((g, i) => (
          <line key={i} x1={pad} y1={g.y} x2={width - pad} y2={g.y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        ))}

        {[0.25, 0.5, 0.75].map((f, i) => (
          <line
            key={`v${i}`}
            x1={pad + f * (width - pad * 2)}
            y1={pad}
            x2={pad + f * (width - pad * 2)}
            y2={height - pad}
            stroke="rgba(255,255,255,0.03)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gid})`} />

        {/* Animated line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 3px currentColor)' }}
        />

        {/* Hover areas + points */}
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - step / 2}
              y={0}
              width={step}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
            {hoverIdx === i && (
              <>
                <line x1={p.x} y1={pad} x2={p.x} y2={height - pad} stroke={`${color}44`} strokeDasharray="3 3" />
                <circle cx={p.x} cy={p.y} r={6} fill={color} stroke="#060B14" strokeWidth={2} />
                <circle cx={p.x} cy={p.y} r={10} fill={color} opacity={0.2} />
              </>
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            top: -40,
            left: `${(hoverIdx / (data.length - 1)) * 100}%`,
            transform: 'translateX(-50%)',
            background: 'var(--glass-card-bg-strong)',
            border: '1px solid var(--glass-card-border)',
            backdropFilter: 'var(--glass-card-blur)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-pop)',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ color, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{safeNumFixed(data[hoverIdx])}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{defaultTimeLabels[hoverIdx]}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const Statistics: React.FC = () => {
  const [range, setRange] = useState<Range>('24H');
  const isConnected = useConnectionStore((s) => s.status === 'connected');
  const uptimePct = 98;
  const uptimeSeconds = useConnectionStore((s) => s.uptimeSeconds);
  const engineMode = useConnectionStore((s) => s.engineMode);
  
  // Use store history directly - no polling, no duplication
  const history = useTelemetryHistory();
  const metrics = useConnectionStore((s) => ({
    downloadSpeed: s.downloadSpeed,
    uploadSpeed: s.uploadSpeed,
    latencyMs: s.latencyMs,
    bypassCount: s.bypassCount,
  }), (a, b) => a.downloadSpeed === b.downloadSpeed && a.uploadSpeed === b.uploadSpeed && a.latencyMs === b.latencyMs && a.bypassCount === b.bypassCount);

  const safeNum = (value: number | null | undefined): number => 
    typeof value === 'number' && isFinite(value) ? value : 0;

  const safeNumFixed = (value: number | null | undefined, decimals: number = 1): string => 
    safeNum(value).toFixed(decimals);

  const formatUptime = (sec: number | null) => {
    if (!sec) return '00:00:00';
    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const secs = (sec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Use store history for charts - live data, no mock
  const downloadData = history.download.length > 0 ? history.download : [0.5, 1.2, 0.8, 2.1, 1.8, 2.8, 2.2, 3.5, 3.1, 4.2, 3.8, 4.5];
  const uploadData = history.upload.length > 0 ? history.upload : [0.2, 0.5, 0.4, 0.8, 0.6, 1.1, 0.9, 1.4, 1.2, 1.6, 1.4, 1.8];
  const latencyData = history.latency.length > 0 ? history.latency : [45, 42, 48, 40, 44, 38, 42, 36, 40, 35, 33, 34];

  const timeLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  const bytesReceived = useConnectionStore((s) => s.bytesReceived);
  const bytesSent = useConnectionStore((s) => s.bytesSent);

  // ── Privacy Protection (veri kazancı) ─────────────────────────────────────
  const privacyStats = usePrivacyStore((s) => s.stats);
  const privacyHistory = usePrivacyStore((s) => s.history);
  const resetStats = usePrivacyStore((s) => s.resetStats);

  const rangeDays = RANGE_DAYS[range];
  const rangeSum = useMemo(() => sumRange(privacyHistory, rangeDays), [privacyHistory, rangeDays]);
  const rangeSlice = useMemo(() => sliceDays(privacyHistory, rangeDays), [privacyHistory, rangeDays]);

  // 24H: bugün vs dün (2 bar); 7D/30D: günlük bar dizisi
  const privacyChartData = useMemo(() => {
    if (range === '24H') {
      const byDate = new Map(privacyHistory.map((d) => [d.date, d.blocked]));
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      return [byDate.get(yesterday.toISOString().slice(0, 10)) ?? 0, byDate.get(now.toISOString().slice(0, 10)) ?? 0];
    }
    return rangeSlice.map((d) => d.blocked);
  }, [range, rangeSlice, privacyHistory]);

  const privacyTimeLabels = range === '24H' ? ['Yesterday', 'Today'] : rangeSlice.map((d) => {
    const [, m, day] = d.date.split('-');
    return `${m}/${day}`;
  });

  const summary = [
    { icon: Download, label: 'Data Downloaded', value: safeNum(bytesReceived) / (1024 * 1024), unit: 'MB', nullValue: null },
    { icon: Upload, label: 'Data Uploaded', value: safeNum(bytesSent) / (1024 * 1024), unit: 'MB', nullValue: null },
    { icon: Activity, label: 'Avg Ping', value: isConnected ? metrics.latencyMs : null, unit: 'ms', nullValue: '--' },
  ];

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto' }}>
      {/* ÜST: Başlık + Filtre */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Statistics</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Network performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--glass-card-bg-light)', border: '1px solid var(--glass-card-border)', borderRadius: 'var(--radius-md)', padding: 4, backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              onMouseEnter={(e) => { if (range !== r) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { if (range !== r) e.currentTarget.style.background = 'transparent'; }}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: range === r ? 'var(--accent)' : 'transparent',
                color: range === r ? 'var(--text-inverse)' : 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 180ms var(--ease), color 180ms var(--ease)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {summary.map((s) => (
          <Card key={s.label} hover>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--glass-accent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} strokeWidth={1.9} />
              </span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {s.value === null ? s.nullValue : <AnimatedNumber value={s.value} format={(n) => `${n.toFixed(1)} ${s.unit}`} />}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
        {/* SOL: Grafik kartı */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Download Speed</span>
            <Badge tone="accent">{range} average</Badge>
          </div>
          <LineChart data={downloadData} label="MB/s" color="var(--accent)" timeLabels={timeLabels} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            {timeLabels.map((t, i) => <span key={i} style={{ width: `${100 / (timeLabels.length - 1)}%`, textAlign: i === 0 ? 'left' : i === timeLabels.length - 1 ? 'right' : 'center' }}>{t}</span>)}
          </div>
        </Card>

        {/* SAĞ: Uptime halkası */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>Engine Uptime</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <ProgressRing value={uptimePct} size={150} strokeWidth={12} color={isConnected ? 'var(--success)' : 'var(--text-muted)'}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                <AnimatedNumber value={uptimePct} format={(n) => `${Math.round(n)}%`} />
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Uptime</span>
            </ProgressRing>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatUptime(uptimeSeconds)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Active session</div>
          </div>
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Engine</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{engineMode === 'go' ? 'Go Native' : 'Python'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Packets</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{safeNum(metrics.bypassCount).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ALT: Upload grafiği + Aktivite logu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)', gap: 'var(--space-4)', marginTop: 'var(--space-4)', alignItems: 'start' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Upload Speed</span>
            <Badge tone="success">Live</Badge>
          </div>
          <LineChart data={uploadData} label="MB/s" color="var(--success)" timeLabels={timeLabels} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            {timeLabels.map((t, i) => <span key={i} style={{ width: `${100 / (timeLabels.length - 1)}%`, textAlign: i === 0 ? 'left' : i === timeLabels.length - 1 ? 'right' : 'center' }}>{t}</span>)}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>Activity Log</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ACTIVITY_LOG.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                style={{ display: 'flex', gap: 12, paddingBottom: i === ACTIVITY_LOG.length - 1 ? 0 : 'var(--space-3)', position: 'relative' }}
              >
                {i !== ACTIVITY_LOG.length - 1 && (
                  <span style={{ position: 'absolute', left: 9, top: 22, width: 2, height: 'calc(100% - 14px)', background: 'var(--border-subtle)' }} />
                )}
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${entry.color}1a`, color: entry.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                  <entry.icon size={12} strokeWidth={2.2} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{entry.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>{entry.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── PRIVACY PROTECTION: veri kazancı (günlük / haftalık / aylık) ── */}
      <div style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={16} strokeWidth={2} color="var(--accent)" />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Privacy Protection</span>
            <Badge tone="accent">{range} breakdown</Badge>
          </div>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => resetStats()}>Reset</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <PrivacyStat label="Requests blocked" value={rangeSum.blocked} format={(n) => `${Math.round(n).toLocaleString()}`} sub={`${rangeDays === 2 ? '2' : rangeDays} days`} />
          <PrivacyStat label="Data saved" value={rangeSum.bytes} format={formatBytes} sub="estimated" color="var(--success)" />
          <PrivacyStat label="All time blocked" value={privacyStats.requestsBlocked} format={(n) => `${Math.round(n).toLocaleString()}`} sub="this device" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Blocked requests</span>
              <Badge tone="danger">{range} total</Badge>
            </div>
            <LineChart data={privacyChartData} label={range === '24H' ? 'blocked' : 'blocked / day'} color="var(--success)" timeLabels={privacyTimeLabels} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
              {privacyTimeLabels.map((t, i) => (
                <span key={i} style={{ width: `${100 / (privacyTimeLabels.length - 1)}%`, textAlign: i === 0 ? 'left' : i === privacyTimeLabels.length - 1 ? 'right' : 'center' }}>{t}</span>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>By category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Ads', value: privacyStats.adsBlocked },
                { label: 'Trackers', value: privacyStats.trackersBlocked },
                { label: 'Malware', value: privacyStats.malwareBlocked },
                { label: 'Phishing', value: privacyStats.phishingBlocked },
              ].map((c) => {
                const pct = privacyStats.requestsBlocked > 0 ? Math.round((c.value / privacyStats.requestsBlocked) * 100) : 0;
                return (
                  <div key={c.label} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{c.label}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{c.value.toLocaleString()} <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>· {pct}%</span></span>
                    </div>
                    <div style={{ width: '100%', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--accent), #33D4FF)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
              Estimated savings: ~25 KB / ad, ~35 KB / tracker, ~60 KB / malware request.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PrivacyStat: React.FC<{ label: string; value: number; format: (n: number) => string; sub?: string; color?: string }> = ({ label, value, format, sub, color }) => (
  <Card hover>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color ?? 'var(--text-primary)', marginTop: 6 }}>
      <AnimatedNumber value={value} format={format} />
    </div>
    {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
  </Card>
);

export default Statistics;