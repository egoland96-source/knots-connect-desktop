const { app, BrowserWindow, ipcMain, Menu, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const { autoUpdater } = require('electron-updater');

let keytar;
try {
  keytar = require('keytar');
} catch (e) {
  keytar = null;
}

let mainWindow;
let pythonProcess = null;
let pythonReadLine = null;
let goProcess = null;
let goReadLine = null;
let goProcessUserStopped = false;
const rpcCallbacks = new Map();
let requestIdCounter = 0;
let currentEngineMode = 'python'; // 'python' or 'go'

const BACKEND_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'backend')
  : path.resolve(path.join(__dirname, '..', 'backend'));
const PYTHON_SCRIPT_PATH = path.join(BACKEND_DIR, 'k_main.py');
const GO_ENGINE_PATH = path.join(BACKEND_DIR, 'k_main.exe'); // Go compiled binary

let appSettingsMemory = {
  autoConnect: false,
  killSwitch: true,
  dnsLeakProtection: true,
  startWithWindows: false,
  autoUpdate: true,
  aggressiveMode: false,
  adblock: true,
};

// =========================================================================
// ENGINE PROCESS MANAGEMENT
// =========================================================================

function getEnginePath() {
  return currentEngineMode === 'go' ? GO_ENGINE_PATH : PYTHON_SCRIPT_PATH;
}

function startEngineProcess() {
  if (currentEngineMode === 'go') {
    startGoProcess();
  } else {
    startPythonProcess();
  }
}

function startPythonProcess() {
  if (pythonProcess !== null) return;

  console.log(`[Electron] Python motoru başlatılıyor: ${PYTHON_SCRIPT_PATH}`);

  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' };

  pythonProcess = spawn('python', ['-u', PYTHON_SCRIPT_PATH], {
    cwd: BACKEND_DIR,
    env: env,
    windowsHide: true,
  });

  pythonReadLine = readline.createInterface({
    input: pythonProcess.stdout,
    terminal: false,
  });

  pythonReadLine.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      if (response && response.id && rpcCallbacks.has(response.id)) {
        const { resolve, reject } = rpcCallbacks.get(response.id);
        rpcCallbacks.delete(response.id);

        if (response.error) {
          reject(new Error(response.error.message || 'Bilinmeyen RPC Hatası'));
        } else {
          resolve(response.result);
        }
      }
    } catch (err) {
      console.error('[Electron] JSON-RPC Ayrıştırma Hatası:', err, 'Satır:', line);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python-STDERR] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Electron] Python süreci kapandı, kod: ${code}`);
    pythonProcess = null;
    pythonReadLine = null;

    console.log('[Electron] Python motoru 1 saniye içinde otomatik yeniden başlatılacak...');
    setTimeout(() => {
      for (const [id, { reject }] of rpcCallbacks) {
        reject(new Error('Python süreci beklenmedik şekilde sonlandı, yeniden başlatılıyor.'));
        rpcCallbacks.delete(id);
      }
      startPythonProcess();
    }, 1000);
  });
}

function startGoProcess() {
  if (goProcess !== null) return;

  console.log(`[Electron] Go motoru başlatılıyor: ${GO_ENGINE_PATH}`);

  const env = { ...process.env };
  
  // Pass encryption method as CLI arg
  const methodId = appSettingsMemory.encryptionMethod || 1;
  // Go motoru AdBlock bayrağını Uİ ayarından alır (capalıysa liste/cache'ler yüklenmez)
  const adblockFlag = `--adblock=${appSettingsMemory.adblock ? 'true' : 'false'}`;
  goProcess = spawn(GO_ENGINE_PATH, [`--method=${methodId}`, adblockFlag, '--fake=true'], {
    cwd: BACKEND_DIR,
    env: env,
    windowsHide: true,
  });

  goReadLine = readline.createInterface({
    input: goProcess.stdout,
    terminal: false,
  });

  goReadLine.on('line', (line) => {
    try {
      // Handle telemetry messages from Go engine
      if (line.startsWith('TELEMETRY:')) {
        const jsonStr = line.substring('TELEMETRY:'.length);
        const telemetry = JSON.parse(jsonStr);
        // Forward to renderer process
        mainWindow?.webContents.send('knots:telemetry', telemetry);
        return;
      }

      // Handle JSON-RPC responses
      const response = JSON.parse(line);
      if (response && response.id && rpcCallbacks.has(response.id)) {
        const { resolve, reject } = rpcCallbacks.get(response.id);
        rpcCallbacks.delete(response.id);

        if (response.error) {
          reject(new Error(response.error.message || 'Bilinmeyen RPC Hatası'));
        } else {
          resolve(response.result);
        }
      }
    } catch (err) {
      // Non-JSON lines are just logs
      console.log(`[Go-STDOUT] ${line}`);
    }
  });

  goProcess.stderr.on('data', (data) => {
    console.error(`[Go-STDERR] ${data.toString().trim()}`);
  });

  goProcess.on('close', (code) => {
    console.log(`[Electron] Go süreci kapandı, kod: ${code}`);
    const wasUserStopped = goProcessUserStopped;
    goProcess = null;
    goReadLine = null;
    goProcessUserStopped = false;

    if (wasUserStopped) {
      console.log('[Electron] Go motoru kullanıcı tarafından durduruldu, yeniden başlatılmiyor.');
      return;
    }

    console.log('[Electron] Go motoru 1 saniye içinde otomatik yeniden başlatılacak...');
    setTimeout(() => {
      for (const [id, { reject }] of rpcCallbacks) {
        reject(new Error('Go süreci beklenmedik şekilde sonlandı, yeniden başlatılıyor.'));
        rpcCallbacks.delete(id);
      }
      startGoProcess();
    }, 1000);
  });
}

function stopEngineProcess() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    pythonReadLine = null;
  }
  if (goProcess) {
    goProcess.kill();
    goProcess = null;
    goReadLine = null;
  }
}

function callEngine(method, params = {}) {
  return new Promise((resolve, reject) => {
    const process = currentEngineMode === 'go' ? goProcess : pythonProcess;
    const processName = currentEngineMode === 'go' ? 'Go' : 'Python';

    if (!process || process.killed) {
      startEngineProcess();
      if ((currentEngineMode === 'go' ? goProcess : pythonProcess) === null) {
        return reject(new Error(`${processName} motoru çalışmıyor.`));
      }
      setTimeout(() => {
        sendRpcRequest(method, params, processName, resolve, reject);
      }, 2000);
      return;
    }

    sendRpcRequest(method, params, processName, resolve, reject);
  });
}

function sendRpcRequest(method, params, processName, resolve, reject) {
  const id = `req_${Date.now()}_${++requestIdCounter}`;
  rpcCallbacks.set(id, { resolve, reject });

  const requestPayload = JSON.stringify({ id, method, params }) + '\n';
  const targetProcess = currentEngineMode === 'go' ? goProcess : pythonProcess;
  targetProcess.stdin.write(requestPayload);

  setTimeout(() => {
    if (rpcCallbacks.has(id)) {
      rpcCallbacks.delete(id);
      reject(new Error(`RPC İstek Zaman Aşımı (${method})`));

      if (targetProcess) {
        console.warn(`[Electron] ${processName} süreci yanıt vermiyor, zorla sonlandırılıyor...`);
        targetProcess.kill('SIGKILL');
      }
    }
  }, 8000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 700,
    resizable: true,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =========================================================================
// ELECTRON IPC HANDLER TANIMLAMALARI (motor / ayarlar / pencere)
// =========================================================================

ipcMain.handle('knots:connect', async (event, serverId) => {
  if (currentEngineMode === 'go') {
    if (!goProcess || goProcess.killed) {
      startGoProcess();
    }
    if (goProcess && !goProcess.killed) {
      return { success: true };
    }
    return { success: false, message: 'Go motoru başlatılamadı.' };
  }
  return callEngine('connect', { server_id: serverId });
});

ipcMain.handle('knots:disconnect', async () => {
  if (currentEngineMode === 'go') {
    if (goProcess && !goProcess.killed) {
      goProcessUserStopped = true;
      goProcess.kill('SIGTERM');
    }
    return { success: true };
  }
  return callEngine('disconnect');
});

ipcMain.handle('knots:getStatus', async () => {
  if (currentEngineMode === 'go') {
    const isRunning = goProcess && !goProcess.killed;
    return {
      connected: isRunning,
      state: isRunning ? 'connected' : 'disconnected',
      server_id: null,
      engine_mode: 'go',
      bytes_received: 0,
      bytes_sent: 0,
      latency_ms: 0,
    };
  }
  return callEngine('status');
});
ipcMain.handle('knots:getEngineMode', async () => ({ mode: currentEngineMode }));

ipcMain.handle('knots:setEngineMode', async (event, mode) => {
  if (currentEngineMode === mode) {
    return { success: true, mode };
  }

  // Stop the currently running engine if any
  if (goProcess && !goProcess.killed) {
    goProcessUserStopped = true;
    goProcess.kill('SIGTERM');
  }
  if (pythonProcess && !pythonProcess.killed) {
    pythonProcess.kill('SIGTERM');
  }

  // Wait briefly for processes to terminate
  await new Promise(resolve => setTimeout(resolve, 500));

  currentEngineMode = mode;
  return { success: true, mode };
});

ipcMain.handle('knots:getEncryptionMethod', async () => ({ method_id: appSettingsMemory.encryptionMethod || 1 }));
ipcMain.handle('knots:setEncryptionMethod', async (event, methodId) => {
  appSettingsMemory.encryptionMethod = methodId;
  // Only send to engine if it's running
  const process = currentEngineMode === 'go' ? goProcess : pythonProcess;
  if (process && !process.killed) {
    return callEngine('set_encryption_method', { method_id: methodId });
  }
  return { success: true };
});

ipcMain.handle('knots:getSettings', async () => appSettingsMemory);
ipcMain.handle('knots:updateSetting', async (event, key, value) => {
  appSettingsMemory[key] = value;

  // AdBlock toggle'ını çalışan Go motoruna CANLI ilet (yeniden başlatma yok).
  // Motor CLI flag'ini ikinci kez okumaz; stdin RPC ile SetEnabled çağrılır.
  if (key === 'adblock' && currentEngineMode === 'go' && goProcess && !goProcess.killed) {
    try {
      await callEngine('set_adblock', { value: !!value });
    } catch (err) {
      console.error(`[Electron] set_adblock RPC iletilemedi: ${err.message}`);
    }
  }
  return { success: true };
});

ipcMain.handle('window:minimize', async () => mainWindow?.minimize());
ipcMain.handle('window:maximize', async () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle('window:close', async () => mainWindow?.close());

// =========================================================================
// PRIVACY PROTECTION: FİLTRE LİSTESİ İNDİRME + DISK CACHE
// Renderer'daki fetch CORS'a takılır; bu yüzden indirme main process'te
// Electron net.fetch (CORS'suz) ile yapılır, içerik userData/privacy-lists/
// klasörüne yazılır. Tüm işlemler yerel — hiçbir telemetry/analytics yok.
// =========================================================================

const PRIVACY_LISTS_DIR = path.join(app.getPath('userData'), 'privacy-lists');
const PRIVACY_MAX_LIST_BYTES = 20 * 1024 * 1024;
const SAFE_FILE_RE = /^[a-zA-Z0-9._-]+$/;

function ensurePrivacyDir() {
  try {
    if (!fs.existsSync(PRIVACY_LISTS_DIR)) {
      fs.mkdirSync(PRIVACY_LISTS_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function safeListFileName(name) {
  const n = (name || '').replace(/\.[^.]+$/, '');
  if (typeof n !== 'string' || !SAFE_FILE_RE.test(n)) return null;
  return `${n}.txt`;
}

function fetchPrivacyList(url) {
  return new Promise((resolve) => {
    let request;
    const timeout = setTimeout(() => {
      try {
        if (request) request.abort();
      } catch {}
      resolve({ ok: false, error: 'timeout' });
    }, 30000);

    try {
      request = net.request(url);
      let data = '';
      let errored = false;

      request.on('response', (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          clearTimeout(timeout);
          resolve({ ok: false, error: `http-${response.statusCode}` });
          return;
        }
        response.on('data', (chunk) => {
          data += chunk.toString('utf8');
          if (data.length > PRIVACY_MAX_LIST_BYTES) {
            clearTimeout(timeout);
            errored = true;
            try {
              request.abort();
            } catch {}
            resolve({ ok: false, error: 'too-large' });
          }
        });
        response.on('end', () => {
          if (errored) return;
          clearTimeout(timeout);
          resolve({ ok: true, content: data });
        });
        response.on('error', () => {
          clearTimeout(timeout);
          resolve({ ok: false, error: 'network' });
        });
      });
      request.on('error', () => {
        clearTimeout(timeout);
        resolve({ ok: false, error: 'network' });
      });
      request.end();
    } catch {
      clearTimeout(timeout);
      resolve({ ok: false, error: 'network' });
    }
  });
}

ipcMain.handle('privacy:fetchList', async (_event, url) => {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    return { ok: false, error: 'invalid-url' };
  }
  return fetchPrivacyList(url);
});

ipcMain.handle('privacy:cache:write', async (_event, name, content) => {
  const fileName = safeListFileName(name);
  if (!fileName || typeof content !== 'string') return { ok: false };
  if (!ensurePrivacyDir()) return { ok: false };
  if (content.length > PRIVACY_MAX_LIST_BYTES) return { ok: false, error: 'too-large' };
  try {
    const tmp = path.join(PRIVACY_LISTS_DIR, `${fileName}.${Date.now()}.tmp`);
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, path.join(PRIVACY_LISTS_DIR, fileName));
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

ipcMain.handle('privacy:cache:read', async (_event, name) => {
  const fileName = safeListFileName(name);
  if (!fileName) return null;
  try {
    const file = path.join(PRIVACY_LISTS_DIR, fileName);
    if (!fs.existsSync(file)) return null;
    const stat = fs.statSync(file);
    if (stat.size > PRIVACY_MAX_LIST_BYTES) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
});

ipcMain.handle('privacy:cache:remove', async (_event, name) => {
  const fileName = safeListFileName(name);
  if (!fileName) return { ok: false };
  try {
    const file = path.join(PRIVACY_LISTS_DIR, fileName);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

// =========================================================================
// SECURE TOKEN STORAGE (keytar with safeStorage fallback)
// =========================================================================

const SERVICE_NAME = 'knots-vpn';
const SECURE_STORAGE_FILE = path.join(app.getPath('userData'), '.secure_tokens.json');

function _readSecureStorage() {
  try {
    if (fs.existsSync(SECURE_STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(SECURE_STORAGE_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function _writeSecureStorage(data) {
  fs.writeFileSync(SECURE_STORAGE_FILE, JSON.stringify(data), 'utf8');
}

function getSecureValue(key) {
  if (keytar) {
    try {
      return keytar.getPassword(SERVICE_NAME, key);
    } catch (_) {}
  }
  try {
    const { safeStorage } = require('electron');
    const stored = _readSecureStorage();
    const entry = stored[key];
    if (!entry) return null;
    const decrypted = safeStorage.unpackSync(Buffer.from(entry, 'base64'));
    return decrypted || null;
  } catch (_) {}
  return null;
}

function setSecureValue(key, value) {
  if (keytar) {
    try {
      keytar.setPassword(SERVICE_NAME, key, value);
      return;
    } catch (_) {}
  }
  try {
    const { safeStorage } = require('electron');
    const encrypted = safeStorage.packSync(value);
    const stored = _readSecureStorage();
    stored[key] = Buffer.from(encrypted).toString('base64');
    _writeSecureStorage(stored);
  } catch (_) {}
}

function removeSecureValue(key) {
  if (keytar) {
    try {
      keytar.deletePassword(SERVICE_NAME, key);
    } catch (_) {}
  }
  try {
    const stored = _readSecureStorage();
    delete stored[key];
    _writeSecureStorage(stored);
  } catch (_) {}
}

// =========================================================================
// AUTH IPC HANDLERS
// =========================================================================

ipcMain.handle('auth:getToken', async () => {
  return getSecureValue('access_token');
});

ipcMain.handle('auth:setToken', async (event, token) => {
  setSecureValue('access_token', token);
  return { success: true };
});

ipcMain.handle('auth:removeToken', async () => {
  removeSecureValue('access_token');
  return { success: true };
});

ipcMain.handle('auth:getRefreshToken', async () => {
  return getSecureValue('refresh_token');
});

ipcMain.handle('auth:setRefreshToken', async (event, token) => {
  setSecureValue('refresh_token', token);
  return { success: true };
});

ipcMain.handle('auth:removeRefreshToken', async () => {
  removeSecureValue('refresh_token');
  return { success: true };
});

// =========================================================================
// OTOMATİK GÜNCELLEME (electron-updater + GitHub Releases)
// =========================================================================
autoUpdater.on('update-available', (info) => {
  console.log(`[updater] Yeni sürüm bulundu: ${info.version} - indiriliyor...`);
  mainWindow?.webContents.send('knots:updateStatus', { status: 'downloading', version: info.version });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log(`[updater] Sürüm ${info.version} indirildi, yeniden başlatınca kurulacak.`);
  mainWindow?.webContents.send('knots:updateStatus', { status: 'ready', version: info.version });
});

autoUpdater.on('error', (error) => {
  console.error('[updater] Güncelleme hatası:', error);
});

ipcMain.handle('app:installUpdate', () => {
  autoUpdater.quitAndInstall();
});

// =========================================================================
// UYGULAMA YAŞAM DÖNGÜSÜ
// =========================================================================

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  stopEngineProcess();
  if (process.platform !== 'darwin') app.quit();
});