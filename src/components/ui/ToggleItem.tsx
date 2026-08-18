import React from 'react';
import { Toggle } from './Toggle';
import type { LucideIcon } from 'lucide-react';

interface ToggleItemProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

/** İkon + başlık + açıklama + switch içeren tek satır ayar öğesi. */
export const ToggleItem: React.FC<ToggleItemProps> = ({
  icon: Icon,
  title,
  desc,
  checked,
  onChange,
  disabled,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: 'var(--space-4) 0',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
            {desc}
          </div>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
};

export default ToggleItem;