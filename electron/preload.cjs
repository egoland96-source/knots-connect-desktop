/**
 * electron/preload.cjs
 */
const { contextBridge, ipcRenderer } = require('electron');

// 1. KNOTS VPN & DPI Motoru Köprüsü (JSON-RPC / main.cjs ile tam uyumlu)
contextBridge.exposeInMainWorld('knots', {
  // Zero-Knowledge Anonymous Identity (brifing: window.knots.auth(id) / window.knots.init())
  auth: (knotsId) => ipcRenderer.invoke('knots:auth', knotsId),
  init: () => ipcRenderer.invoke('knots:init'),
  mnemonicRecover: (payload) => ipcRenderer.invoke('knots:mnemonicRecover', payload),
  getIdentity: () => ipcRenderer.invoke('knots:getIdentity').catch(() => null),
  // Legacy aliases
  knotsAuth: (knotsId) => ipcRenderer.invoke('knots:auth', knotsId),
  knotsInit: () => ipcRenderer.invoke('knots:init'),
  copyId: (id) => ipcRenderer.invoke('app:copyId', id),
  mnemonicGenerate: () => ipcRenderer.invoke('mnemonic:generate'),
  qrGenerate: () => ipcRenderer.invoke('qr:generate'),
  engineSet: (mode) => ipcRenderer.invoke('engine:set', mode),
  dpiSet: (options) => ipcRenderer.invoke('dpi:set', options),
  shieldSet: (enabled) => ipcRenderer.invoke('shield:set', enabled),
  dohSet: (provider) => ipcRenderer.invoke('doh:set', provider),
  splitSet: (enabled) => ipcRenderer.invoke('split:set', enabled),
  connect: (serverId) => ipcRenderer.invoke('knots:connect', serverId),
  disconnect: () => ipcRenderer.invoke('knots:disconnect'),
  getStatus: () => ipcRenderer.invoke('knots:getStatus'),
  getEngineMode: () => ipcRenderer.invoke('knots:getEngineMode'),
  setEngineMode: (mode) => ipcRenderer.invoke('knots:setEngineMode', mode),
  setDpiTechniques: (techniques) => ipcRenderer.invoke('knots:setDpiTechniques', techniques).catch(() => {}),
  getHWID: () => ipcRenderer.invoke('knots:getHWID').catch(() => null),

  // GÜNCELLENDİ: Çoklu şifreleme yöntemlerini React (Zustand Store) katmanına sızdıran yeni köprüler
  getEncryptionMethod: () => ipcRenderer.invoke('knots:getEncryptionMethod').catch(() => 1),
  setEncryptionMethod: (methodId) => ipcRenderer.invoke('knots:setEncryptionMethod', methodId).catch(() => {}),

  // Ek ayar köprüleri (varsa backend karşılar, yoksa güvenli döner)
  getSettings: () => ipcRenderer.invoke('knots:getSettings').catch(() => null),
  updateSetting: (key, value) => ipcRenderer.invoke('knots:updateSetting', key, value).catch(() => {}),
  getDnsMode: () => ipcRenderer.invoke('knots:getSettings').then(s=>s?.dnsMode||'local').catch(()=>'local'),
  setDnsMode: (mode) => ipcRenderer.invoke('knots:updateSetting', 'dnsMode', mode).catch(() => {}),

  // WireGuard VPN — satın alınan sunucuya tam tünel
  wgStatus: () => ipcRenderer.invoke('knots:wgStatus').catch(() => ({ running: false, installed: false })),
  wgEnable: (enabled) => ipcRenderer.invoke('knots:wgEnable', enabled).catch(() => ({ success: false })),
  onWgState: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('knots:wgState', listener);
    return () => ipcRenderer.removeListener('knots:wgState', listener);
  },

  // Smart Split Tunneling & Operating Modes (Gaming / Smart Hybrid / Privacy)
  getSplitSettings: () => ipcRenderer.invoke('knots:getSplitSettings').catch(() => null),
  updateSplitSettings: (settings) => ipcRenderer.invoke('knots:updateSplitSettings', settings).catch(() => ({ success: false })),
  setOperatingMode: (mode) => ipcRenderer.invoke('knots:setOperatingMode', mode).catch(() => ({ success: false })),
  getRunningProcesses: () => ipcRenderer.invoke('knots:getRunningProcesses').catch(() => []),
  addBypassApp: (app) => ipcRenderer.invoke('knots:addBypassApp', app).catch(() => ({ success: false })),
  removeBypassApp: (app) => ipcRenderer.invoke('knots:removeBypassApp', app).catch(() => ({ success: false })),

  // Python'dan gelen canlı akış / event dinleyicisi (main.cjs içindeki event dispatch mekanizmasıyla eşleşir)
  onTelemetry: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('knots:telemetry', listener);
    return () => ipcRenderer.removeListener('knots:telemetry', listener);
  },

  // Kritik durum bildirimleri (motor arızası, internet kesintisi vb.)
  // main.cjs -> notifyUser() -> 'knots:systemAlert'
  onSystemAlert: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('knots:systemAlert', listener);
    return () => ipcRenderer.removeListener('knots:systemAlert', listener);
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
  onMiniMode: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('knots:miniMode', listener);
    return () => ipcRenderer.removeListener('knots:miniMode', listener);
  },
  miniStatus: () => ipcRenderer.invoke('window:miniStatus'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate').catch(() => {}),
  rollbackUpdate: () => ipcRenderer.invoke('app:rollbackUpdate').catch(() => {}),
  openReleases: () => ipcRenderer.invoke('app:openReleases').catch(() => {}),
});

// 2. Özel TitleBar Pencere Kontrolleri (main.cjs içindeki window:* handler'larına bağlanır)
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  // Küçük mod: arka planda RAM tasarrufu için pencereyi kareye indir
  enterMini: () => ipcRenderer.invoke('window:enterMini'),
  exitMini: () => ipcRenderer.invoke('window:exitMini'),
  // System tray: pencereyi gizle, motor + arka plan çalışmaya devam etsin
  hideToTray: () => ipcRenderer.invoke('window:hideToTray'),
  showFromTray: () => ipcRenderer.invoke('window:showFromTray'),
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
