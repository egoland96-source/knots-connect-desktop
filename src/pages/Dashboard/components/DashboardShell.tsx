import React from 'react';

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: 'calc(100vh - 96px)',
        // Dark-Tech palette — spec #080D16, but blend with existing app shell gradient if inside it
        // We keep transparent here so App's bg shows, but expose CSS var for inner glass panels
      }}
    >
      {children}
    </div>
  );
};

export default DashboardShell;
