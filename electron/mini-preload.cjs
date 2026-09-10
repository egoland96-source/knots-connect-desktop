/**
 * electron/mini-preload.cjs
 * Mini pencere için güvenli köprü: IPC + sürükleme
 * Sürükleme JS tarafında yapılıyor (CSS -webkit-app-region: drag kullanılmıyor),
 * her mousemove'da ana sürece setBounds çağrılır.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('knotsMini', {
  exit: () => ipcRenderer.send('mini:exit'),
  toggleMini: () => ipcRenderer.send('mini:toggle'),
  dragMove: (dx, dy) => ipcRenderer.send('mini:drag:move', { dx, dy }),
});
