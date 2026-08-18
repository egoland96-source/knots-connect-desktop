import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' KRİTİK - Electron'da file:// protokolüyle açılan index.html'in
// asset yollarının doğru çözülmesi için mutlak (/) değil göreli (./) olmalı.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});
