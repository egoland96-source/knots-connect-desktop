import React from 'react';

type Props = {
  lat: number;
  lon: number;
};

// Premium, inspired — not a 1:1 copy of Proton.
// Subtle dark world silhouette with faint country borders and a synchronized pulsing dot.
export const WorldMapBackground = ({ lat, lon }: Props) => {
  const x = ((lon + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 1,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Subtle top premium gradient like Proton's reddish, but in Knots midnight blue */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(61,181,255,0.07) 0%, transparent 55%), linear-gradient(180deg, rgba(14,28,48,0.55) 0%, rgba(7,17,30,0) 55%)',
        }}
      />

      <svg
        viewBox="0 0 1000 500"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Land masses — stylized, low detail but recognizable */}
        <g fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.09)" strokeWidth={0.7}>
          {/* North America */}
          <path d="M 38 58 L 148 38 L 212 58 L 198 122 L 162 148 L 98 138 L 42 92 Z" />
          <path d="M 148 38 L 182 28 L 188 52 L 152 62 Z" />
          {/* South America */}
          <path d="M 188 182 L 268 162 L 288 232 L 268 332 L 242 368 L 188 318 L 178 242 Z" />
          {/* Greenland */}
          <path d="M 248 14 L 318 8 L 324 48 L 272 58 Z" />
          {/* Europe */}
          <path d="M 444 58 L 532 42 L 568 72 L 542 112 L 488 122 L 432 92 Z" />
          <path d="M 532 42 L 556 38 L 562 62 L 536 68 Z" />
          {/* Africa */}
          <path d="M 468 138 L 558 122 L 572 228 L 532 302 L 492 322 L 452 262 L 448 178 Z" />
          {/* Middle East / Turkey */}
          <path d="M 542 108 L 588 98 L 604 128 L 574 146 L 542 128 Z" />
          {/* Asia */}
          <path d="M 572 38 L 762 22 L 862 68 L 842 148 L 782 182 L 612 158 L 572 92 Z" />
          <path d="M 762 22 L 812 18 L 822 48 L 772 58 Z" />
          {/* Japan */}
          <path d="M 812 78 L 848 68 L 858 108 L 828 128 Z" />
          {/* Australia */}
          <path d="M 702 302 L 802 288 L 828 328 L 738 352 L 692 322 Z" />
          {/* NZ-ish */}
          <path d="M 852 348 L 872 342 L 876 368 L 854 372 Z" />
        </g>

        {/* Faint country border network — very subtle like Proton's thin lines */}
        <g fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth={0.45}>
          <path d="M 42 92 L 98 138 L 162 148 L 198 122 L 212 58 Z" />
          <path d="M 188 182 L 242 368 L 268 332 L 288 232 L 268 162 Z" />
          <path d="M 432 92 L 488 122 L 542 112 L 568 72 L 532 42 L 444 58 Z" />
          <path d="M 448 178 L 492 322 L 532 302 L 572 228 L 558 122 L 468 138 Z" />
          <path d="M 572 92 L 612 158 L 782 182 L 842 148 L 862 68 L 762 22 L 572 38 Z" />
        </g>

        {/* Pulsing location dot — synced with the small globe */}
        <g>
          <circle cx={x} cy={y} r={22} fill="rgba(61,181,255,0.13)" className="worldmap-pulse" />
          <circle cx={x} cy={y} r={11} fill="rgba(61,181,255,0.22)" className="worldmap-pulse" style={{ animationDelay: '0.4s' } as React.CSSProperties} />
          <circle cx={x} cy={y} r={6.5} fill="#3DB5FF" stroke="rgba(255,255,255,0.92)" strokeWidth={1.3} />
          <circle cx={x} cy={y} r={2.1} fill="#fff" />
        </g>
      </svg>

      {/* Bottom vignette like Proton */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 62%, rgba(7,17,30,0.55) 100%)',
        }}
      />

      <style>{`
        .worldmap-pulse {
          animation: worldmap-pulse 2.4s ease-out infinite;
          transform-origin: ${x}px ${y}px;
        }
        @keyframes worldmap-pulse {
          0% { transform: scale(0.35); opacity: 0.95; }
          70% { transform: scale(1.65); opacity: 0; }
          100% { transform: scale(1.65); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default WorldMapBackground;
