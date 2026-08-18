import React from 'react';
import { Card } from './Card';

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** Başlıklı bölüm kartı - Settings, Account gibi sayfalarda kategori gruplarını sarar. */
export const Section: React.FC<SectionProps> = ({ title, icon, action, children }) => {
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && (
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'rgba(28,200,255,0.1)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </span>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
};

export default Section;