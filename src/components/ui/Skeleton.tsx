import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: React.CSSProperties;
}

/** İskelet yükleme animasyonu - premium shimmer efekti. */
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, radius = '8px', style: extraStyle }) => (
  <motion.div
    initial={{ opacity: 0.4 }}
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(61,181,255,0.12) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
      ...extraStyle,
    }}
  />
);

export const StatCardSkeleton: React.FC = () => (
  <div style={{ background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--glass-card-shadow)', padding: 'var(--space-5)', backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Skeleton width={40} height={40} radius="12px" />
      <Skeleton width={88} height={30} radius="4px" />
    </div>
    <Skeleton width={80} height={12} radius="4px" style={{ marginTop: 'var(--space-3)' }} />
    <Skeleton width={120} height={24} radius="4px" style={{ marginTop: 6 }} />
  </div>
);

export const GaugeCardSkeleton: React.FC = () => (
  <div style={{ background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--glass-card-shadow)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, backdropFilter: 'var(--glass-card-blur)', WebkitBackdropFilter: 'var(--glass-card-blur)' }}>
    <Skeleton width={20} height={20} radius="50%" />
    <Skeleton width={50} height={11} radius="4px" />
    <Skeleton width={70} height={18} radius="4px" />
  </div>
);

export const ConnectButtonSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    style={{ position: 'relative', width: 180 + 96, height: 180 + 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <Skeleton width={180 + 88} height={180 + 88} radius="50%" />
    <Skeleton width={180 + 52} height={180 + 52} radius="50%" />
    <Skeleton width={180} height={180} radius="50%" />
  </motion.div>
);

export default Skeleton;