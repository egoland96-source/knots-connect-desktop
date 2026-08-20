/**
 * electron/preload.cjs
 */
const { contextBridge, ipcRenderer } = require('electron');

// 1. KNOTS VPN & DPI Motoru Köprüsü (JSON-RPC / main.cjs ile tam uyumlu)
contextBridge.exposeInMainWorld('knots', {
  connect: (serverId) => ipcRenderer.invoke('knots:connect', serverId),
  disconnect: () => ipcRenderer.invoke('knots:disconnect'),
  getStatus: () => ipcRenderer.invoke('knots:getStatus'),
  getEngineMode: () => ipcRenderer.invoke('knots:getEngineMode'),
  setEngineMode: (mode) => ipcRenderer.invoke('knots:setEngineMode', mode),

  // GÜNCELLENDİ: Çoklu şifreleme yöntemlerini React (Zustand Store) katmanına sızdıran yeni köprüler
  getEncryptionMethod: () => ipcRenderer.invoke('knots:getEncryptionMethod').catch(() => 1),
  setEncryptionMethod: (methodId) => ipcRenderer.invoke('knots:setEncryptionMethod', methodId).catch(() => {}),

  // Ek ayar köprüleri (varsa backend karşılar, yoksa güvenli döner)
  getSettings: () => ipcRenderer.invoke('knots:getSettings').catch(() => null),
  updateSetting: (key, value) => ipcRenderer.invoke('knots:updateSetting', key, value).catch(() => {}),

  // Python'dan gelen canlı akış / event dinleyicisi (main.cjs içindeki event dispatch mekanizmasıyla eşleşir)
  onTelemetry: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('knots:telemetry', listener);
    return () => ipcRenderer.removeListener('knots:telemetry', listener);
  },

  // Privacy Protection: filtre listesi indirme + disk cache (renderer CORS'suz erişir)
  privacy: {
    fetchList: (url) => ipcRenderer.invoke('privacy:fetchList', url).catch(() => ({ ok: false, error: 'bridge' })),
    cacheWrite: (name, content) => ipcRenderer.invoke('privacy:cache:write', name, content).catch(() => ({ ok: false })),
    cacheRead: (name) => ipcRenderer.invoke('privacy:cache:read', name).catch(() => null),
    cacheRemove: (name) => ipcRenderer.invoke('privacy:cache:remove', name).catch(() => ({ ok: false })),
  },

  // Otomatik güncelleme durumu (main.cjs'deki electron-updater event'leri)
  onUpdateStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('knots:updateStatus', listener);
    return () => ipcRenderer.removeListener('knots:updateStatus', listener);
  },
  installUpdate: () => ipcRenderer.invoke('app:installUpdate').catch(() => {}),
  rollbackUpdate: () => ipcRenderer.invoke('app:rollbackUpdate').catch(() => {}),
  openReleases: () => ipcRenderer.invoke('app:openReleases').catch(() => {}),
});

// 2. Özel TitleBar Pencere Kontrolleri (main.cjs içindeki window:* handler'larına bağlanır)
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
});

// 4. Auth API Köprüsü (secure token storage - main.cjs'deki auth:* handler'larına bağlanır)
contextBridge.exposeInMainWorld('knotsAuth', {
  getToken: () => ipcRenderer.invoke('auth:getToken'),
  setToken: (token) => ipcRenderer.invoke('auth:setToken', token),
  removeToken: () => ipcRenderer.invoke('auth:removeToken'),
  getRefreshToken: () => ipcRenderer.invoke('auth:getRefreshToken'),
  setRefreshToken: (token) => ipcRenderer.invoke('auth:setRefreshToken', token),
  removeRefreshToken: () => ipcRenderer.invoke('auth:removeRefreshToken'),
});
