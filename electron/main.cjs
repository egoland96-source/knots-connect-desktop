const { app, BrowserWindow, ipcMain, Menu, Tray, net, shell, screen, clipboard, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const readline = require('readline');
const updater = require('./updater.cjs');
const { generateHWID } = require('./hwid.cjs');

let keytar;
try {
  keytar = require('keytar');
} catch (e) {
  keytar = null;
}

// Açılış akışını dosyaya yazan tanılama logu — "açılış ekranı açılmıyor"
// sorununu kullanıcıda teşhis etmek için her kritik adım buraya düşer.
const bootLogPath = path.join(app.getPath('userData'), 'knots-boot.log');
function bootLog(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  try {
    fs.appendFileSync(bootLogPath, line + '\n');
  } catch {}
  console.log(line);
}

// Uygulamanın kendi giden HTTP trafiği (API + gizlilik liste indirme +
// güncelleme) makinedeki sistem/VPN proxy'sini atlasın, aksi halde istekler
// eski bir backend önbelleğine takılıp /admin route'ları 404 döner ve liste
// indirme çalışmaz. (Tarayıcı aynı makinede proxy'yi atlayıp doğrudan yeni
// instance'a ulaşıyordu; uygulama da öyle yapmalı.)
// NOT: VPN motoru (k_main.exe) ayrı bir süreçtir ve bu ayardan etkilenmez.
try {
  app.commandLine.appendSwitch('no-proxy-server');
} catch (e) {
  console.error('[Electron] proxy devre dışı bırakılamadı:', e.message);
}

// Node'un kendi https istemcisi (güncelleyici) yalnızca Chromium switch'lerinden
// etkilenmez; HTTP(S)_PROXY ortam değişkenlerine bakar. VPN istemcisinin ölü
// yerel proxy'si yüzünden api.github.com çözümlenemiyordu (ENOTFOUND). Bu
// değişkenleri temizleyerek hem tarayıcı hem de Node doğrudan sistem DNS'ine gider.
for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']) {
  delete process.env[k];
}

let mainWindow;
let miniWindow = null;
let miniModeActive = false;
let savedBounds = null;
let splashWindow = null;
let splashStart = 0;
let splashWaitMs = 8000; // her açılışta rastgele, 5-18 sn (20 sn altı)
let splashTimer = null;
let pythonProcess = null;
let pythonReadLine = null;
let goProcess = null;
let goReadLine = null;
let goProcessUserStopped = false;
let tray = null;
let trayQuitFromMenu = false;
let internetMonitorTimer = null;
const rpcCallbacks = new Map();
let requestIdCounter = 0;
let currentEngineMode = 'go'; // 'python' or 'go' (varsayılan Go motoru — k_main.exe)

const BACKEND_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'backend')
  : path.resolve(path.join(__dirname, '..', 'backend'));
const PYTHON_SCRIPT_PATH = path.join(BACKEND_DIR, 'k_main.py');
const GO_ENGINE_PATH = path.join(BACKEND_DIR, 'k_main.exe'); // Go compiled binary

// =========================================================================
// WIREGUARD TUNNEL YÖNETİMİ — Knots'un satın alınan sunucusuna kurulu
// WireGuard (wg0, port 62464) üzerinden tam tünel.
// Windows WireGuard istemcisi "WireGuardTunnel$<ism>" adında bir Windows
// servisi kurar; uygulama requireAdministrator olduğu için sc.exe ile
// bu servisi başlatmak/durdurmak/sorgulamak yeterlidir.
// =========================================================================
const WG_TUNNEL_NAME = 'KnotsImport';
const WG_SERVICE = `WireGuardTunnel$${WG_TUNNEL_NAME}`;
const WG_WG_EXE = path.join('C:', 'Program Files', 'WireGuard', 'wg.exe');
let wgAutoStart = false;

let appSettingsMemory = {
  autoConnect: false,
  killSwitch: true,
  dnsLeakProtection: true,
  startWithWindows: false,
  autoUpdate: true,
  aggressiveMode: true,
  adblock: true,
  dnsMode: 'local', // local | cloudflare
  wireguardEnabled: false,
  operatingMode: 'hybrid', // 'gaming' | 'hybrid' | 'privacy'
  splitTunneling: {
    enabled: true,
    autoDetectGames: true,
    presets: {
      steam: true,
      riot: true,
      epic: true,
      roblox: true,
      discordVoice: true,
    },
    customApps: [],
    customIps: [],
  },
};

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');

const SETTING_KEYS = new Set([
  'autoConnect',
  'killSwitch',
  'dnsLeakProtection',
  'startWithWindows',
  'autoUpdate',
  'aggressiveMode',
  'adblock',
  'encryptionMethod',
  'dnsMode',
  'wireguardEnabled',
  'operatingMode',
  'splitTunneling',
]);

function normalizeSettingValue(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || (typeof value === 'object' && value !== null)) {
    return value;
  }
  return null;
}

function loadAppSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE())) {
      const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8'));
      appSettingsMemory = { ...appSettingsMemory, ...saved };
    }
  } catch (err) {
    console.error('[Electron] Ayarlar yüklenemedi:', err.message);
  }
}

function saveAppSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(appSettingsMemory, null, 2), 'utf8');
  } catch (err) {
    console.error('[Electron] Ayarlar kaydedilemedi:', err.message);
  }
}

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
    notifyUser(
      'Knots motor arızası',
      'VPN motoru beklenmedik şekilde kapandı, 1 saniye içinde otomatik yeniden başlatılıyor.',
      'motor-crash'
    );
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
  // Aggressive Mode: blacklist işleme, tüm SNI'li ClientHello'lar tek split2 stratejisiyle bölünür
  const globalFlag = appSettingsMemory.aggressiveMode ? '--global=true' : '--global=false';
  // DPI Tactics: default sni-split, plus any persisted techniques
  const dpiTechniques = appSettingsMemory.dpiTechniques || ['sni-split'];
  const dpiFlags = Array.isArray(dpiTechniques) ? dpiTechniques.map((t) => `--${t}`) : ['--sni-split'];
  goProcess = spawn(GO_ENGINE_PATH, [`--method=${methodId}`, adblockFlag, '--fake=true', globalFlag, ...dpiFlags], {
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
    notifyUser(
      'Knots motor arızası',
      'VPN motoru beklenmedik şekilde kapandı, 1 saniye içinde otomatik yeniden başlatılıyor.',
      'motor-crash'
    );
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
    try { pythonProcess.kill(); } catch {}
    pythonProcess = null;
    try { pythonReadLine?.close(); } catch {}
    pythonReadLine = null;
  }
  if (goProcess) {
    try { goProcess.kill(); } catch {}
    goProcess = null;
    try { goReadLine?.close(); } catch {}
    goReadLine = null;
  }
}

// =========================================================================
// WIREGUARD — Windows hizmeti (WireGuardTunnel$<ism>) yönetimi
// Uygulama admin (requireAdministrator) olarak çalıştığı için sc.exe
// çağrıları yetki sorunu yaşamaz. Tunnel kapalıyken Knots'un kendi Go
// DPI motoru çalışmaya devam eder; toggle açılınca tam tünel devreye girer.
// =========================================================================

function runSc(args) {
  return new Promise((resolve) => {
    execFile('sc.exe', args, { windowsHide: true, timeout: 10000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function parseScState(stdout) {
  const m = /STATE\s*:\s*\d+\s*(\w+)/i.exec(stdout || '');
  return m ? m[1].toUpperCase() : null;
}

async function wgServiceStatus() {
  const res = await runSc(['query', WG_SERVICE]);
  const state = parseScState(res.stdout);
  const running = state === 'RUNNING' || state === 'START_PENDING' || state === 'STOP_PENDING';
  return { installed: res.ok, running, state, raw: res.stdout.trim() };
}

async function wgSetEnabled(enabled) {
  const status = await wgServiceStatus();
  if (!status.installed) return { success: false, message: `WireGuard tünel servisi kurulu değil (${WG_SERVICE}).` };
  if (enabled) {
    if (status.running) return { success: true, running: true, message: 'WireGuard zaten açık.' };
    const res = await runSc(['start', WG_SERVICE]);
    const out = res.stdout + res.stderr;
    if (/FAILED|already|başlatılamad|Error/i.test(out) && res.code !== 0 && !/running|RUNNING/i.test(out)) {
      return { success: false, message: `Servis başlatılamadı: ${out.slice(0, 200)}` };
    }
    return { success: true, running: true };
  }
  // stop
  if (!status.running) return { success: true, running: false, message: 'WireGuard zaten kapalı.' };
  const res = await runSc(['stop', WG_SERVICE]);
  await new Promise((r) => setTimeout(r, 800));
  return { success: res.ok, running: false };
}

async function wgRealtimeStatus() {
  const svc = await wgServiceStatus();
  let handshakeSec = null;
  let transfers = null;
  if (svc.running && fs.existsSync(WG_WG_EXE)) {
    try {
      const hs = await new Promise((resolve) => {
        execFile(WG_WG_EXE, ['show', WG_TUNNEL_NAME, 'latest-handshakes'], { windowsHide: true, timeout: 6000 }, (err, stdout) => {
          resolve(err ? '' : (stdout || '').trim());
        });
      });
      const tr = await new Promise((resolve) => {
        execFile(WG_WG_EXE, ['show', WG_TUNNEL_NAME, 'transfer'], { windowsHide: true, timeout: 6000 }, (err, stdout) => {
          resolve(err ? '' : (stdout || '').trim());
        });
      });
      // format: <pubkey>\t<handshake epoch>  /  <pubkey>\t<rx>\t<tx>
      const hsLine = hs.split(/\n/).map((l) => l.split(/\t/)).find((p) => p.length >= 2 && /^\d+$/.test(p[1]));
      if (hsLine) {
        const now = Math.floor(Date.now() / 1000);
        handshakeSec = Math.max(0, now - parseInt(hsLine[1], 10));
      }
      const trLine = tr.split(/\n/).map((l) => l.split(/\t/)).find((p) => p.length >= 3);
      if (trLine) transfers = { rxBytes: parseInt(trLine[1], 10) || 0, txBytes: parseInt(trLine[2], 10) || 0 };
    } catch (_) {}
  }
  return {
    running: svc.running,
    installed: svc.installed,
    state: svc.state,
    server: '162.35.122.121:62464',
    handshakeSec,
    transfers,
  };
}

// Windows ENOTEMPTY / dosya kilidi için: güncelleme kurulurken Go/Python
// motorları ve açık file handle'ları SIGKILL ile tamamen sonlandırılır.
// Bu fonksiyon mevcut IPC/Go başlatma kodlarını bozmadan sadece quit öncesi çağrılır.
function terminateEnginesForUpdate() {
  console.log('[Electron] terminateEnginesForUpdate — SIGKILL');
  try {
    if (goProcess) {
      try { goProcess.kill('SIGKILL'); } catch {}
      goProcess = null;
    }
    if (goReadLine) {
      try { goReadLine.close(); } catch {}
      try { goReadLine.removeAllListeners?.(); } catch {}
      goReadLine = null;
    }
    if (pythonProcess) {
      try { pythonProcess.kill('SIGKILL'); } catch {}
      pythonProcess = null;
    }
    if (pythonReadLine) {
      try { pythonReadLine.close(); } catch {}
      try { pythonReadLine.removeAllListeners?.(); } catch {}
      pythonReadLine = null;
    }
    for (const [id, { reject }] of rpcCallbacks) {
      try { reject(new Error('Update: engine terminated')); } catch {}
      rpcCallbacks.delete(id);
    }
  } catch (e) {
    console.error('[Electron] terminateEnginesForUpdate failed:', e.message);
  }
}

// =========================================================================
// SPLIT TUNNELING & OPERATING MODES (Smart Hybrid, Gaming, Privacy)
// =========================================================================
const GAME_PRESETS = {
  steam: [
    { ip: '155.133.224.0', mask: '255.255.224.0', name: 'Steam / Valve EU' },
    { ip: '162.254.192.0', mask: '255.255.192.0', name: 'Steam / Valve Global' },
    { ip: '208.64.200.0', mask: '255.255.252.0', name: 'Steam Matchmaking' },
    { ip: '205.185.194.0', mask: '255.255.255.0', name: 'Steam Relay' },
  ],
  riot: [
    { ip: '104.160.128.0', mask: '255.255.224.0', name: 'Riot Games (Valorant / LoL TR-EU)' },
    { ip: '162.249.72.0', mask: '255.255.252.0', name: 'Riot Direct' },
    { ip: '192.64.168.0', mask: '255.255.252.0', name: 'Riot Core' },
  ],
  epic: [
    { ip: '52.0.0.0', mask: '255.224.0.0', name: 'Epic Games / AWS GameLift' },
    { ip: '54.0.0.0', mask: '255.192.0.0', name: 'Epic Online Services' },
  ],
  roblox: [
    { ip: '128.116.0.0', mask: '255.255.0.0', name: 'Roblox Edge Servers' },
  ],
  discordVoice: [
    { ip: '162.158.0.0', mask: '255.254.0.0', name: 'Discord RTC Voice' },
    { ip: '66.22.196.0', mask: '255.255.252.0', name: 'Discord Media Voice' },
  ],
};

const KNOWN_GAME_EXES = new Set([
  'cs2.exe', 'csgo.exe', 'valorant.exe', 'valorant-win64-shipping.exe',
  'riotclientux.exe', 'leagueclient.exe', 'league of legends.exe',
  'robloxplayerbeta.exe', 'steam.exe', 'steamwebhelper.exe',
  'epicgameslauncher.exe', 'fortniteclient-win64-shipping.exe',
  'pubg.exe', 'tslgame.exe', 'r5apex.exe', 'gta5.exe', 'socialclubhelper.exe',
  'discord.exe', 'battle.net.exe', 'eaconnect.exe'
]);

let activeSplitRoutes = new Set();
let physicalGatewayCache = null;
let splitMonitorInterval = null;

function getPhysicalGateway() {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "Get-NetRoute -DestinationPrefix \'0.0.0.0/0\' | Where-Object { $_.InterfaceAlias -notlike \'*WireGuard*\' -and $_.InterfaceAlias -notlike \'*Knots*\' } | Select-Object -First 1 InterfaceAlias, InterfaceIndex, NextHop | ConvertTo-Json"', { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ gateway: physicalGatewayCache || '192.168.1.1', ifIndex: null });
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const gw = data.NextHop || physicalGatewayCache || '192.168.1.1';
        physicalGatewayCache = gw;
        resolve({ gateway: gw, ifIndex: data.InterfaceIndex || null, ifAlias: data.InterfaceAlias || '' });
      } catch {
        resolve({ gateway: physicalGatewayCache || '192.168.1.1', ifIndex: null });
      }
    });
  });
}

function runRouteCommand(action, ip, mask, gateway, ifIndex) {
  return new Promise((resolve) => {
    let args = [];
    if (action === 'add') {
      args = ['add', ip, 'mask', mask, gateway, 'metric', '1'];
      if (ifIndex) args.push('if', String(ifIndex));
    } else {
      args = ['delete', ip];
    }
    execFile('route.exe', args, { windowsHide: true, timeout: 5000 }, (err) => {
      resolve(!err);
    });
  });
}

async function applySplitRoutes() {
  const settings = appSettingsMemory.splitTunneling || {};
  if (!settings.enabled) return;

  const { gateway, ifIndex } = await getPhysicalGateway();
  if (!gateway) return;

  const presets = settings.presets || {};
  for (const [presetKey, enabled] of Object.entries(presets)) {
    if (enabled && GAME_PRESETS[presetKey]) {
      for (const item of GAME_PRESETS[presetKey]) {
        if (!activeSplitRoutes.has(item.ip)) {
          const ok = await runRouteCommand('add', item.ip, item.mask, gateway, ifIndex);
          if (ok) activeSplitRoutes.add(item.ip);
        }
      }
    }
  }

  // Custom IPs
  if (Array.isArray(settings.customIps)) {
    for (const item of settings.customIps) {
      if (!activeSplitRoutes.has(item.ip)) {
        const mask = item.mask || '255.255.255.255';
        const ok = await runRouteCommand('add', item.ip, mask, gateway, ifIndex);
        if (ok) activeSplitRoutes.add(item.ip);
      }
    }
  }
  console.log(`[SplitTunnel] Toplam ${activeSplitRoutes.size} aktif bypass rotası devrede (Gateway: ${gateway}).`);
}

async function clearSplitRoutes() {
  for (const ip of activeSplitRoutes) {
    await runRouteCommand('delete', ip);
  }
  activeSplitRoutes.clear();
}

function clearSplitRoutesSync() {
  for (const ip of activeSplitRoutes) {
    try {
      execFileSync('route.exe', ['delete', ip], { windowsHide: true, timeout: 2000 });
    } catch {}
  }
  activeSplitRoutes.clear();
}

function startSplitMonitor() {
  if (splitMonitorInterval) return;
  splitMonitorInterval = setInterval(async () => {
    const opMode = appSettingsMemory.operatingMode || 'hybrid';
    const splitCfg = appSettingsMemory.splitTunneling || {};
    if (opMode !== 'hybrid' || !splitCfg.enabled || !splitCfg.autoDetectGames) return;

    const customApps = (splitCfg.customApps || []).map((a) => a.toLowerCase());
    const allGameExes = Array.from(KNOWN_GAME_EXES).concat(customApps);
    const namesList = allGameExes.map((x) => `'${x}'`).join(',');

    exec(
      `powershell -NoProfile -Command "$names = @(${namesList}); $pids = Get-Process | Where-Object { $names -contains ($_.ProcessName + '.exe') -or $names -contains $_.ProcessName } | Select-Object -ExpandProperty Id; if ($pids) { Get-NetTCPConnection -State Established | Where-Object { $pids -contains $_.OwningProcess -and $_.RemoteAddress -notlike '127.*' -and $_.RemoteAddress -notlike '192.168.*' -and $_.RemoteAddress -notlike '10.*' -and $_.RemoteAddress -notlike '162.35.122.121' } | Select-Object -ExpandProperty RemoteAddress -Unique }"`,
      { windowsHide: true, timeout: 8000 },
      async (err, stdout) => {
        if (err || !stdout) return;
        const ips = stdout.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^\d+\.\d+\.\d+\.\d+$/.test(s));
        if (ips.length === 0) return;
        const { gateway, ifIndex } = await getPhysicalGateway();
        for (const ip of ips) {
          if (!activeSplitRoutes.has(ip)) {
            const ok = await runRouteCommand('add', ip, '255.255.255.255', gateway, ifIndex);
            if (ok) {
              activeSplitRoutes.add(ip);
              console.log(`[SplitTunnel] Oyun akışı doğrudan yerel hatta yönlendirildi: ${ip}`);
            }
          }
        }
      }
    );
  }, 10000);
}

function stopSplitMonitor() {
  if (splitMonitorInterval) {
    clearInterval(splitMonitorInterval);
    splitMonitorInterval = null;
  }
}

async function setOperatingMode(targetMode) {
  if (!['gaming', 'hybrid', 'privacy'].includes(targetMode)) {
    return { success: false, message: 'Geçersiz mod' };
  }

  appSettingsMemory.operatingMode = targetMode;
  saveAppSettings();

  console.log(`[Electron] Çalışma modu değiştiriliyor: ${targetMode}`);

  if (targetMode === 'gaming') {
    stopSplitMonitor();
    await clearSplitRoutes();
    await wgSetEnabled(false);
    appSettingsMemory.wireguardEnabled = false;
    currentEngineMode = 'go';
    startGoProcess();
    return { success: true, mode: 'gaming', message: 'Oyun Modu aktif (DPI Bypass - 0 ms gecikme)' };
  }

  if (targetMode === 'privacy') {
    stopSplitMonitor();
    await clearSplitRoutes();
    await wgSetEnabled(true);
    appSettingsMemory.wireguardEnabled = true;
    return { success: true, mode: 'privacy', message: 'Gizlilik Modu aktif (Tam WireGuard tüneli)' };
  }

  if (targetMode === 'hybrid') {
    currentEngineMode = 'go';
    startGoProcess();
    await wgSetEnabled(true);
    appSettingsMemory.wireguardEnabled = true;
    await applySplitRoutes();
    startSplitMonitor();
    return { success: true, mode: 'hybrid', message: 'Akıllı Hibrit Mod aktif (Oyunlar 0 ms, Web Korumalı)' };
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

// Windows masaüstü bildirimi + renderer'a aynı mesajı iletir.
// Hem motor arızası hem internet kesintisi gibi kritik durumlarda kullanılır.
let lastAlertSignature = '';
function notifyUser(title, body, signature) {
  const sig = signature || `${title}:${body}`;
  if (sig === lastAlertSignature) return; // aynı uyarıyı arka arkaya tekrarlama
  lastAlertSignature = sig;
  try {
    const n = new Notification({ title, body, silent: false });
    n.on('click', () => showMainWindow());
    n.show();
    console.log(`[notify] ${title} — ${body}`);
  } catch (e) {
    console.error('[notify] bildirim gösterilemedi:', e.message);
  }
  try {
    mainWindow?.webContents.send('knots:systemAlert', { title, body, ts: Date.now() });
  } catch {}
}

// İnternet erişilebilirliği: Chromium'un net.isOnline() durumu + gerçek bir
// bağlantı kontrolü (msftconnecttest, 6sn timeout). Arka arkaya sürekli bildirim
// basmamak için durum DEĞİŞİMİNDE sola bir kez uyarır.
function startInternetMonitor() {
  if (internetMonitorTimer) return;
  let wasOnline = null; // null = henüz ölçülmedi (ilk sonuç sessizce oturur)
  internetMonitorTimer = setInterval(async () => {
    try {
      const offlineViaNet = typeof net.isOnline === 'function' ? !net.isOnline() : false;
      let reachable = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await net.fetch('https://www.msftconnecttest.com/connecttest.txt', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        reachable = res.ok;
      } catch {
        reachable = false;
      }
      const online = !offlineViaNet && reachable;

      if (wasOnline === null) {
        wasOnline = online;
        return;
      }
      if (wasOnline && !online) {
        notifyUser(
          'İnternet bağlantısı kesildi',
          'Knots internet erişimini algılayamıyor. VPN bağlantısını ve modem durumunu kontrol edin.',
          'internet-off'
        );
      } else if (!wasOnline && online) {
        notifyUser('İnternet bağlantısı geri geldi', 'Knots internet erişimini yeniden algıladı.', 'internet-on');
      }
      wasOnline = online;
    } catch (e) {
      console.error('[internet-monitor] hata:', e.message);
    }
  }, 15000);
}

// Açılış ekranı + ana pencereyi güvenle bitir. Birden fazla kez çağrılırsa
// ikincisi zararsızdır (referanslar null kontrolü ile korunur).
function closeSplashAndShow() {
  bootLog(`closeSplashAndShow() ÇAĞRILDI | splash=${!!splashWindow} mainVisible=${mainWindow ? mainWindow.isVisible() : 'null'}`);
  if (splashTimer) {
    clearInterval(splashTimer);
    splashTimer = null;
  }
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
    bootLog(`mainWindow.show() ÇAĞRILDI | visible=${mainWindow.isVisible()}`);
  } else if (mainWindow) {
    bootLog(`mainWindow zaten görünür | destroyed=${mainWindow.isDestroyed()}`);
  } else {
    bootLog('mainWindow NULL!');
  }
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 460,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'), { query: { ms: String(splashWaitMs) } });
  splashWindow.on('closed', () => {
    splashWindow = null;
    clearInterval(splashTimer);
    splashTimer = null;
  });
}

function createWindow() {
  try {
    // Ekrana göre başlangıç boyutu — küçük ekranlarda pencere sığsın
    let initW = 1050;
    let initH = 700;
    try {
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
      initW = Math.min(1050, Math.max(860, sw - 32));
      initH = Math.min(700, Math.max(600, sh - 64));
    } catch (_) { /* screen hazır değilse varsayılan */ }
    mainWindow = new BrowserWindow({
      width: initW,
      height: initH,
      minWidth: 860,
      minHeight: 600,
      resizable: true,
      frame: false,
      show: false,
      titleBarStyle: 'hidden',
      icon: app.isPackaged
        ? path.join(process.resourcesPath, 'icon.ico')
        : path.join(__dirname, '..', 'build', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    bootLog('BrowserWindow oluşturuldu');
    // Dev sekmesi ve F12/Ctrl+Shift+I kısayolları kapalı — kullanıcı dev arayüzünü göremez.
    // NOT: Electron 44'te setDevToolsEnabled kaldırıldı; bu yüzden devtools kısayollarını
    // before-input-event ile engelliyoruz. setDevToolsEnabled varsa yine de çağrılır.
    if (typeof mainWindow.webContents.setDevToolsEnabled === 'function') {
      mainWindow.webContents.setDevToolsEnabled(false);
    }
    const isDevToolsShortcut = (input) => {
      const k = (input.key || '').toLowerCase();
      if (['f12', 'f7'].includes(k)) return true;
      if ((input.control || input.meta) && input.shift && ['i', 'j', 'c'].includes(k)) return true;
      return false;
    };
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (isDevToolsShortcut(input)) {
        event.preventDefault();
      }
    });

  mainWindow.setMenu(null);

  // Güvenlik: pencereyi yalnızca uygulamanın kendi içeriğiyle sınırla.
  // Renderer herhangi bir nedenle uzak bir sayfaya yönlendirilirse preload
  // köprüsü (token erişimi dahil) o sayfaya AÇILMAZ.
  const ALLOWED_NAV = (url) => {
    if (url.startsWith('file:')) return true;
    if (app.isPackaged) return false;
    const dev = new URL('http://localhost:5173');
    const target = new URL(url);
    return target.host === dev.host && target.protocol === dev.protocol;
  };

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!ALLOWED_NAV(url)) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!ALLOWED_NAV(url)) return { action: 'deny' };
    return { action: 'allow' };
  });

  // NOT: Bu listener'lar loadFile()'dan ÖNCE bağlanmalı. Aksi halde:
  // - sayfa çok hızlı yüklenirse ready-to-show / did-finish-load kaçırılır,
  // - yükleme anında hata olursa did-fail-load kaçırılır
  // ve splash sonsuza dek açık kalır (gözlenen belirti!). 
  // Açılış ekranı: ana pencere hazır olduğunda splash için kalan süre kadar bekle,
  // ama toplam bekleme asla rastgele süreyi geçmez. Ana pencere 3sn içinde bile
  // hazır olsa kullanıcı en az ~5sn splash görür; hazır değilse splash biter,
  // pencere yine de açılır (kullanıcıyı sonsuz bekletmez).
  mainWindow.once('ready-to-show', () => {
    bootLog('ready-to-show ATEŞLENDİ');
    const elapsed = Date.now() - splashStart;
    const wait = Math.max(1500, splashWaitMs - elapsed);
    bootLog(`splash kalan bekleme: ${wait}ms (splashWaitMs=${splashWaitMs}, elapsed=${elapsed})`);
    if (splashTimer) clearInterval(splashTimer);
    setTimeout(() => {
      closeSplashAndShow();
    }, wait);
  });

  // Indirme/başlatma bitince de tetikle: ready-to-show hiç ateşlenmezse
  // (ör. renderer takılırsa) asla takılı kalmasın.
  mainWindow.webContents.once('did-finish-load', () => {
    bootLog('did-finish-load ATEŞLENDİ');
    const elapsed = Date.now() - splashStart;
    const wait = Math.max(1500, splashWaitMs - elapsed);
    setTimeout(() => {
      if (splashWindow || !mainWindow?.isVisible()) closeSplashAndShow();
    }, wait);
  });

  // Sayfa yüklenemezse (hata) splash'i derhal kapat, pencereyi göster.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    bootLog(`did-fail-load (${code}: ${desc})`);
    console.error(`[Electron] renderer yüklenemedi (${code}: ${desc})`);
    closeSplashAndShow();
  });

  // Renderer işlemi çökerse de splash takılı kalmasın.
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    bootLog(`render-process-gone (${details && details.reason})`);
    console.error('[Electron] renderer öldü:', details && details.reason);
    closeSplashAndShow();
  });

  // Renderer içi JS hataları (React çökmesi, ReferenceError vb.) boot log'a düşer.
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) {
      bootLog(`[renderer] ${message} (${sourceId}:${line})`);
    }
  });

  // Güvenlik yedeği: ana pencere hazır DEĞİLSE bile rastgele süre dolunca
  // splash mutlaka kapanır ve pencere gösterilir — takılı kalma yok.
  setTimeout(() => {
    closeSplashAndShow();
  }, splashWaitMs + 6000);

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch((e) => bootLog(`loadURL HATASI: ${e && e.stack || e}`));
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((e) => bootLog(`loadFile HATASI: ${e && e.stack || e}`));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  bootLog('createWindow TAMAM — eventler bağlandı');
  } catch (e) {
    bootLog(`createWindow HATASI: ${e && e.stack || e}`);
    console.error('[Electron] createWindow hatası:', e);
    // Ana pencere açılamasa bile splash'i kapatıp hatayı göster.
    closeSplashAndShow();
  }
}

// =========================================================================
// ELECTRON IPC HANDLER TANIMLAMALARI (motor / ayarlar / pencere)
// =========================================================================

ipcMain.handle('knots:connect', async (event, serverId) => {
  if (serverId !== undefined && serverId !== null && typeof serverId !== 'string') {
    return { success: false, message: 'Geçersiz server_id.' };
  }
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

// =========================================================================
// WIREGUARD IPC — renderer'daki toggle'ın bağlandığı köprüler
// =========================================================================
ipcMain.handle('knots:wgStatus', async () => {
  try {
    return await wgRealtimeStatus();
  } catch (err) {
    return { running: false, installed: false, error: err.message };
  }
});

ipcMain.handle('knots:wgEnable', async (_e, enabled) => {
  try {
    const res = await wgSetEnabled(!!enabled);
    if (res.success) wgAutoStart = !!enabled;
    return res;
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('knots:wgSetAutoStart', async (_e, enabled) => {
  wgAutoStart = !!enabled;
  return { success: true, value: wgAutoStart };
});

// =========================================================================
// SPLIT TUNNELING & OPERATING MODES IPC
// =========================================================================
ipcMain.handle('knots:getSplitSettings', async () => {
  return {
    splitTunneling: appSettingsMemory.splitTunneling,
    operatingMode: appSettingsMemory.operatingMode || 'hybrid',
    activeRoutesCount: activeSplitRoutes.size,
    physicalGateway: physicalGatewayCache || '192.168.1.1',
  };
});

ipcMain.handle('knots:updateSplitSettings', async (_e, settings) => {
  if (typeof settings === 'object' && settings !== null) {
    appSettingsMemory.splitTunneling = {
      ...appSettingsMemory.splitTunneling,
      ...settings,
    };
    saveAppSettings();
    if (appSettingsMemory.operatingMode === 'hybrid') {
      await clearSplitRoutes();
      await applySplitRoutes();
    }
    return { success: true, splitTunneling: appSettingsMemory.splitTunneling };
  }
  return { success: false, message: 'Geçersiz ayarlar' };
});

ipcMain.handle('knots:setOperatingMode', async (_e, mode) => {
  return await setOperatingMode(mode);
});

ipcMain.handle('knots:getRunningProcesses', async () => {
  return new Promise((resolve) => {
    exec(
      'powershell -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json -Compress"',
      { windowsHide: true, timeout: 5000 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const results = list
            .filter((p) => p && p.ProcessName)
            .map((p) => {
              const exeName = (p.ProcessName.endsWith('.exe') ? p.ProcessName : `${p.ProcessName}.exe`).toLowerCase();
              return {
                name: exeName,
                pid: p.Id,
                title: p.MainWindowTitle || p.ProcessName,
                isGame: KNOWN_GAME_EXES.has(exeName),
              };
            });
          resolve(results);
        } catch {
          resolve([]);
        }
      }
    );
  });
});

ipcMain.handle('knots:addBypassApp', async (_e, appName) => {
  if (!appName || typeof appName !== 'string') return { success: false };
  const clean = appName.trim().toLowerCase();
  const current = appSettingsMemory.splitTunneling?.customApps || [];
  if (!current.includes(clean)) {
    current.push(clean);
    appSettingsMemory.splitTunneling.customApps = current;
    saveAppSettings();
  }
  return { success: true, customApps: current };
});

ipcMain.handle('knots:removeBypassApp', async (_e, appName) => {
  if (!appName || typeof appName !== 'string') return { success: false };
  const clean = appName.trim().toLowerCase();
  let current = appSettingsMemory.splitTunneling?.customApps || [];
  current = current.filter((x) => x !== clean);
  appSettingsMemory.splitTunneling.customApps = current;
  saveAppSettings();
  return { success: true, customApps: current };
});

ipcMain.handle('knots:setDpiTechniques', async (event, techniques) => {
  // Persist for next startup
  if (Array.isArray(techniques)) {
    appSettingsMemory.dpiTechniques = techniques;
    saveAppSettings();
  }
  if (currentEngineMode === 'go' && goProcess && !goProcess.killed) {
    try {
      // Go motoruna teknikleri RPC ile ilet
      return await callEngine('set_dpi_techniques', { techniques });
    } catch (err) {
      console.error(`[Electron] set_dpi_techniques RPC iletilemedi: ${err.message}`);
      return { success: false, message: err.message };
    }
  }
  return { success: true };
});

ipcMain.handle('knots:getEngineMode', async () => ({ mode: currentEngineMode }));
ipcMain.handle('knots:getHWID', async () => {
  try {
    return generateHWID();
  } catch (err) {
    console.error('[Electron] HWID üretilemedi:', err.message);
    return null;
  }
});

ipcMain.handle('knots:setEngineMode', async (event, mode) => {
  if (mode !== 'python' && mode !== 'go') {
    return { success: false, message: 'Geçersiz motor modu.' };
  }
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
  if (!Number.isInteger(methodId) || methodId < 1) {
    return { success: false, message: 'Geçersiz şifreleme yöntemi.' };
  }
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
  if (typeof key !== 'string' || !SETTING_KEYS.has(key)) {
    return { success: false, message: 'Geçersiz ayar anahtarı.' };
  }
  const safeValue = normalizeSettingValue(value);
  if (safeValue === null) {
    return { success: false, message: 'Geçersiz ayar değeri.' };
  }
  appSettingsMemory[key] = safeValue;
  saveAppSettings();

  // startWithWindows: gerçek otomatik başlatma kaydı (Windows)
  if (key === 'startWithWindows') {
    try {
      app.setLoginItemSettings({ openAtLogin: !!value });
    } catch (err) {
      console.error('[Electron] Otomatik başlatma ayarlanamadı:', err.message);
    }
  }

  // WireGuard toggle: ayarı kalıcı yap ve Windows WireGuard servisini aç/kapat.
  // Uygulama admin olduğu için sc.exe yetki sorunu yaşamaz; işlem başarısızsa
  // ayar geri alınır (UI tutarsız durumda kalmaz).
  if (key === 'wireguardEnabled') {
    try {
      const res = await wgSetEnabled(!!value);
      if (!res.success) {
        appSettingsMemory[key] = !safeValue;
        saveAppSettings();
        return { success: false, message: res.message || 'WireGuard servisi yönetilemedi.' };
      }
      wgAutoStart = !!value;
      mainWindow?.webContents.send('knots:wgState', await wgRealtimeStatus());
    } catch (err) {
      console.error('[Electron] WireGuard toggle hatası:', err.message);
    }
  }

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

function isPrivateHostname(hostname) {
  const host = (hostname || '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (/^[\d.]+$/.test(host) || /^[0-9a-f:]+$/i.test(host)) {
    return isPrivateIp(host);
  }
  return false;
}

function isPrivateIp(ip) {
  if (ip.includes(':')) {
    const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : '';
    if (v4 && v4.includes('.')) return isPrivateIp(v4);
    if (ip === '::1') return true;
    if (/^fc/i.test(ip) || /^fd/i.test(ip) || /^fe[89ab]/i.test(ip)) return true;
    return false;
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

ipcMain.handle('privacy:fetchList', async (_event, url) => {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    return { ok: false, error: 'invalid-url' };
  }
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password || isPrivateHostname(parsed.hostname)) {
      return { ok: false, error: 'invalid-url' };
    }
  } catch {
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
const MAX_TOKEN_BYTES = 8 * 1024;

function isValidToken(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TOKEN_BYTES;
}

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
    return Buffer.isBuffer(decrypted) ? decrypted.toString('utf8') : decrypted || null;
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
// KNOTS IDENTITY — Zero-Knowledge Anonymous ID + 12-word Mnemonic
// Bridges window.knots.auth(id) / window.knots.init() / mnemonicRecover
// Storage: userData/knots-identity.json  (knotsId digits, mnemonic, hwid)
// =========================================================================

const KNOTS_IDENTITY_FILE = () => path.join(app.getPath('userData'), 'knots-identity.json');

// BIP39 English wordlist subset (512 words) — full 2048 not needed for entropy;
// 12 words × log2(512)=9 bits → 108 bits entropy. Production can swap to 2048.
const KNOTS_WORDLIST = (
  'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aeroplane affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek cricket crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise demise deny dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drink drip drive drop drum dry duck dumb dune duplicate durian during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony pool popular portion position possible potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scout scrap screen screw scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stood story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thick thin thing think third thirty threat three throat thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volcanic volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo'
).split(' ');

function formatKnotsIdDigits(digits) {
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}
function normalizeKnotsId(input) {
  return String(input || '').replace(/\D/g, '').slice(0, 16);
}
function validateKnotsId(input) {
  const d = normalizeKnotsId(input);
  return d.length === 16 ? d : null;
}
function generateKnotsIdDigits() {
  let s = '';
  for (let i = 0; i < 16; i++) s += crypto.randomInt(0, 10).toString();
  // Avoid all zeros
  if (/^0+$/.test(s)) s = '1' + s.slice(1);
  return s;
}
function generateMnemonic() {
  const words = [];
  for (let i = 0; i < 12; i++) {
    const idx = crypto.randomInt(0, KNOTS_WORDLIST.length);
    words.push(KNOTS_WORDLIST[idx]);
  }
  return words.join(' ');
}
function normalizeMnemonic(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function deriveKnotsIdFromMnemonic(mnemonic) {
  const h = crypto.createHash('sha256').update(normalizeMnemonic(mnemonic), 'utf8').digest('hex');
  // Map hex to decimal digits: take hex digits, convert each hex char to decimal digit via mod
  let digits = '';
  for (let i = 0; i < h.length && digits.length < 16; i++) {
    const v = parseInt(h[i], 16);
    digits += (v % 10).toString();
    if (digits.length < 16) {
      const v2 = parseInt(h[(i+1)%h.length], 16);
      digits += ((v+v2)%10).toString();
      if (digits.length > 16) digits = digits.slice(0,16);
    }
  }
  digits = digits.slice(0,16).padEnd(16,'0');
  if (/^0+$/.test(digits)) digits = '1' + digits.slice(1);
  return digits;
}
function loadKnotsIdentity() {
  try {
    if (!fs.existsSync(KNOTS_IDENTITY_FILE())) return null;
    const raw = fs.readFileSync(KNOTS_IDENTITY_FILE(), 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.knotsId === 'string' && typeof data.mnemonic === 'string') return data;
  } catch (_) {}
  return null;
}
function saveKnotsIdentity(data) {
  try {
    const dir = path.dirname(KNOTS_IDENTITY_FILE());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(KNOTS_IDENTITY_FILE(), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[KnotsIdentity] save failed:', e.message);
    return false;
  }
}

ipcMain.handle('knots:auth', async (_event, knotsIdRaw) => {
  const digits = validateKnotsId(knotsIdRaw);
  if (!digits) return { success: false, message: 'Knots ID 16 haneli olmalı (XXXX-XXXX-XXXX-XXXX)' };
  try {
    const hwid = (() => { try { return generateHWID(); } catch { return null; } })();
    const existing = loadKnotsIdentity();
    // Zero-knowledge: if an identity already exists with different ID, we allow switching (user may restore on new device)
    // Persist the authenticated ID
    const toSave = {
      knotsId: digits,
      knotsIdFormatted: formatKnotsIdDigits(digits),
      mnemonic: existing && existing.knotsId === digits && existing.mnemonic ? existing.mnemonic : (existing?.mnemonic || ''),
      hwid: hwid || existing?.hwid || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastAuthAt: new Date().toISOString(),
    };
    // If no mnemonic at all (first auth with manual ID), generate one so recovery is possible
    if (!toSave.mnemonic) toSave.mnemonic = generateMnemonic();
    saveKnotsIdentity(toSave);
    return { success: true, knotsId: toSave.knotsIdFormatted, knotsIdRaw: digits, mnemonic: toSave.mnemonic };
  } catch (e) {
    return { success: false, message: e.message || 'Auth failed' };
  }
});

ipcMain.handle('knots:init', async () => {
  try {
    const hwid = (() => { try { return generateHWID(); } catch { return null; } })();
    const digits = generateKnotsIdDigits();
    const mnemonic = generateMnemonic();
    const data = {
      knotsId: digits,
      knotsIdFormatted: formatKnotsIdDigits(digits),
      mnemonic,
      hwid: hwid || null,
      createdAt: new Date().toISOString(),
      lastAuthAt: new Date().toISOString(),
    };
    saveKnotsIdentity(data);
    return { success: true, knotsId: data.knotsIdFormatted, knotsIdRaw: digits, mnemonic };
  } catch (e) {
    return { success: false, message: e.message || 'Init failed' };
  }
});

ipcMain.handle('knots:mnemonicRecover', async (_event, payload) => {
  const mnemonicRaw = payload && (payload.mnemonic || payload.phrase || payload);
  const mnemonic = normalizeMnemonic(typeof mnemonicRaw === 'string' ? mnemonicRaw : String(mnemonicRaw || ''));
  const words = mnemonic.split(' ').filter(Boolean);
  if (words.length !== 12) return { success: false, message: 'Kurtarma anahtarı 12 kelime olmalı' };
  // Wordlist validation: each word must be in list (lenient: allow any lower alpha)
  for (const w of words) {
    if (!/^[a-z]{2,20}$/.test(w)) return { success: false, message: `Geçersiz kelime: ${w}` };
  }
  try {
    const existing = loadKnotsIdentity();
    // If existing mnemonic matches exactly, return its knotsId
    if (existing && normalizeMnemonic(existing.mnemonic) === mnemonic) {
      const updated = { ...existing, lastAuthAt: new Date().toISOString() };
      saveKnotsIdentity(updated);
      return { success: true, knotsId: existing.knotsIdFormatted || formatKnotsIdDigits(existing.knotsId), knotsIdRaw: existing.knotsId, mnemonic };
    }
    // Otherwise derive deterministic Knots ID from mnemonic and create new identity
    const derivedDigits = deriveKnotsIdFromMnemonic(mnemonic);
    const hwid = (() => { try { return generateHWID(); } catch { return null; } })();
    const data = {
      knotsId: derivedDigits,
      knotsIdFormatted: formatKnotsIdDigits(derivedDigits),
      mnemonic,
      hwid: hwid || null,
      createdAt: new Date().toISOString(),
      lastAuthAt: new Date().toISOString(),
    };
    saveKnotsIdentity(data);
    return { success: true, knotsId: data.knotsIdFormatted, knotsIdRaw: derivedDigits, mnemonic };
  } catch (e) {
    return { success: false, message: e.message || 'Recover failed' };
  }
});

ipcMain.handle('knots:getIdentity', async () => {
  const data = loadKnotsIdentity();
  if (!data) return null;
  return { knotsId: data.knotsIdFormatted || formatKnotsIdDigits(data.knotsId), knotsIdRaw: data.knotsId, mnemonic: data.mnemonic, createdAt: data.createdAt };
});

// Legacy / UI helpers
ipcMain.handle('mnemonic:generate', async () => {
  const res = await (async () => {
    const digits = generateKnotsIdDigits();
    const mnemonic = generateMnemonic();
    return { mnemonic, knotsId: formatKnotsIdDigits(digits) };
  })();
  return res;
});
ipcMain.handle('app:copyId', async (_event, id) => {
  try {
    if (typeof id === 'string' && id) clipboard.writeText(String(id));
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('qr:generate', async () => {
  const data = loadKnotsIdentity();
  if (!data) return { success: false, message: 'No identity' };
  // Renderer can render QR from knotsId; just return data
  return { success: true, knotsId: data.knotsIdFormatted || formatKnotsIdDigits(data.knotsId), text: data.knotsIdFormatted || data.knotsId };
});
ipcMain.handle('engine:set', async (_event, mode) => {
  if (mode !== 'python' && mode !== 'go') return { success: false, message: 'Invalid mode' };
  return { success: true, mode };
});
ipcMain.handle('dpi:set', async () => ({ success: true }));
ipcMain.handle('shield:set', async () => ({ success: true }));
ipcMain.handle('doh:set', async () => ({ success: true }));
ipcMain.handle('split:set', async () => ({ success: true }));

// =========================================================================
// MINI MODE — oyun oynarken RAM tasarrufu için pencereyi kareye indir
// Motor + tüm state arka planda çalışmaya devam eder; React sayfaları
// unmount olur → renderer RAM düşer. Tıklayınca eski boyut + sayfa geri gelir.
// =========================================================================
function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) return miniWindow;
  const sz = 64;
  // Ana pencerenin ortasına konumlandır (kullanıcının baktığı yerde kalsın)
  let x, y;
  if (savedBounds) {
    x = Math.round(savedBounds.x + (savedBounds.width - sz) / 2);
    y = Math.round(savedBounds.y + (savedBounds.height - sz) / 2);
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    const b = mainWindow.getBounds();
    x = Math.round(b.x + (b.width - sz) / 2);
    y = Math.round(b.y + (b.height - sz) / 2);
  } else {
    const { width: w, height: h } = screen.getPrimaryDisplay().workAreaSize;
    x = Math.round((w - sz) / 2);
    y = Math.round((h - sz) / 2);
  }
  // Ekrandan taşma kontrolü
  const display = screen.getDisplayMatching({ x, y, width: sz, height: sz });
  const work = display.workArea;
  x = Math.max(work.x, Math.min(x, work.x + work.width - sz));
  y = Math.max(work.y, Math.min(y, work.y + work.height - sz));

  miniWindow = new BrowserWindow({
    width: sz,
    height: sz,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'mini-preload.cjs'),
    }
  });
  miniWindow.setIgnoreMouseEvents(false);
  miniWindow.loadFile(path.join(__dirname, 'mini.html'));
  return miniWindow;
}

ipcMain.handle('window:enterMini', () => {
  if (miniModeActive) return { success: false };
  if (!mainWindow || mainWindow.isDestroyed()) {
    // Ana pencere zaten yoksa sadece mini aç
    miniModeActive = true;
    try { createMiniWindow(); } catch (e) { console.error('[mini]', e.message); }
    broadcastMiniMode(true);
    return { success: true };
  }
  // Ana pencere state'ini kaydet
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  savedBounds = mainWindow.getBounds();
  miniModeActive = true;
  // Ana pencereyi TAMAMEN yok et → renderer process ölür, RAM serbest kalır
  try {
    mainWindow.removeAllListeners('close');
    mainWindow.removeAllListeners('closed');
    mainWindow.destroy();
  } catch (e) {
    console.error('[mini] destroy main failed:', e.message);
  }
  mainWindow = null;
  // Bağımsız küçük pencere aç
  try { createMiniWindow(); } catch (e) { console.error('[mini] create failed:', e.message); }
  broadcastMiniMode(true);
  return { success: true };
});

ipcMain.on('mini:exit', () => {
  exitMiniInternal();
});

ipcMain.on('mini:toggle', () => {
  if (miniModeActive) {
    exitMiniInternal();
  } else {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('knots:miniMode', { active: true });
    }
  }
});

// Mini pencere sürükleme: HTML tarafında mousemove ile incremental (dx,dy) gönderilir.
// Her delta'da pencere setBounds ile taşınır, ekran sınırları içinde tutulur.
ipcMain.on('mini:drag:move', (_e, { dx, dy } = {}) => {
  if (!miniWindow || miniWindow.isDestroyed()) return;
  if (typeof dx !== 'number' || typeof dy !== 'number') return;
  if (dx === 0 && dy === 0) return;
  const b = miniWindow.getBounds();
  const nx = b.x + Math.round(dx);
  const ny = b.y + Math.round(dy);
  const d = screen.getDisplayMatching({ x: nx, y: ny, width: 64, height: 64 });
  const wa = d.workArea;
  const cx = Math.max(wa.x, Math.min(nx, wa.x + wa.width - 64));
  const cy = Math.max(wa.y, Math.min(ny, wa.y + wa.height - 64));
  miniWindow.setBounds({ x: cx, y: cy, width: 64, height: 64 });
});

ipcMain.handle('window:exitMini', () => {
  exitMiniInternal();
  return { success: true };
});

function exitMiniInternal() {
  if (!miniModeActive) return;
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close();
  }
  miniWindow = null;
  miniModeActive = false;
  // Ana pencere yok edildiği için sıfırdan oluştur
  if (!mainWindow || mainWindow.isDestroyed()) {
    try {
      createWindow();
    } catch (e) {
      console.error('[mini] createWindow failed:', e.message);
    }
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSkipTaskbar(false);
    if (savedBounds) {
      mainWindow.setBounds(savedBounds);
      savedBounds = null;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  broadcastMiniMode(false);
}

ipcMain.handle('window:miniStatus', () => ({ active: miniModeActive }));

// X butonu: pencereyi gizle, motor arka planda çalışsın (tray'dan dönülür)
ipcMain.handle('window:hideToTray', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
  if (miniModeActive && savedBounds) {
    mainWindow.setBounds(savedBounds);
    savedBounds = null;
    mainWindow.setAlwaysOnTop(false);
    miniModeActive = false;
    broadcastMiniMode(false);
  }
  mainWindow.hide();
  return { success: true };
});

ipcMain.handle('window:showFromTray', () => {
  showMainWindow();
  return { success: true };
});

// Mini mode durumunu renderer'a anlık bildir
function broadcastMiniMode(active) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('knots:miniMode', { active });
  }
}

// =========================================================================
// AUTH IPC HANDLERS
// =========================================================================

ipcMain.handle('auth:getToken', async () => {
  return getSecureValue('access_token');
});

ipcMain.handle('auth:setToken', async (event, token) => {
  if (!isValidToken(token)) return { success: false };
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
  if (!isValidToken(token)) return { success: false };
  setSecureValue('refresh_token', token);
  return { success: true };
});

ipcMain.handle('auth:removeRefreshToken', async () => {
  removeSecureValue('refresh_token');
  return { success: true };
});

// =========================================================================
// OTOMATİK GÜNCELLEME (portable self-update + yedekli değişim)
// =========================================================================
function sendUpdateStatus(data) {
  mainWindow?.webContents.send('knots:updateStatus', data);
}

ipcMain.handle('app:installUpdate', () => {
  // Windows ENOTEMPTY önlemi: kurulum öncesi Go motorunu SIGKILL ile öldür
  terminateEnginesForUpdate();
  updater.applyUpdate();
});

ipcMain.handle('app:rollbackUpdate', () => {
  updater.rollbackUpdate();
});

ipcMain.handle('app:openReleases', () => {
  shell.openExternal('https://github.com/egoland96-source/knots-connect-desktop/releases/latest');
});

// --- Güncelleyici entegrasyonu: dev mod + ENOTEMPTY + error handler ---
// 1) Dev modda güncellemeyi pasif al: sadece paketlenmiş canlı sürümde kontrol
//    (updater.cjs içinde de app.isPackaged guard var; burada da çift koruma)
// 2) Windows dosya kilidi: before-quit-for-update'de Go/Python SIGKILL
// 3) Hata yönetimi: autoUpdater/updater error'ları logla, çökertme
try {
  // electron-updater kuruluysa (opsiyonel) — dev modda tetiklenmesin
  const { autoUpdater } = require('electron-updater');
  if (autoUpdater) {
    // Dev modda otomatik indir/kur pasif
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.on('error', (err) => {
      console.error('[autoUpdater] error (handled):', err?.message || err);
    });
    autoUpdater.on('before-quit-for-update', () => {
      console.log('[autoUpdater] before-quit-for-update — terminating engines (SIGKILL)');
      terminateEnginesForUpdate();
    });
  }
} catch {}
// Custom updater (updater.cjs) ve Electron app event'i için aynı koruma
app.on('before-quit-for-update', () => {
  console.log('[Electron] app before-quit-for-update — terminating engines (SIGKILL)');
  terminateEnginesForUpdate();
});
try {
  // updater.cjs EventEmitter ise onun error event'ini de yakala
  if (updater && typeof updater.on === 'function') {
    updater.on('error', (err) => console.error('[updater] error (handled):', err?.message || err));
  }
} catch {}
process.on('unhandledRejection', (reason) => {
  const msg = String(reason?.message || reason);
  bootLog(`unhandledRejection: ${msg}`);
  if (msg.includes('ENOTEMPTY') || msg.includes('updater') || msg.includes('autoUpdater')) {
    console.error('[updater] unhandledRejection (handled):', msg);
  }
});
process.on('uncaughtException', (err) => {
  bootLog(`uncaughtException: ${err && err.stack || err}`);
  console.error('[Electron] uncaughtException:', err);
});

// =========================================================================
// UYGULAMA YAŞAM DÖNGÜSÜ
// =========================================================================

// Uygulamanın tek örnek olarak çalışmasını zorla. Kullanıcı ikinci kez açarsa
// mevcut pencere öne gelir. Aksi halde iki örnek aynı anda splash gösterebilir
// ve biri diğerini engeller.
const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  bootLog('İkinci örnek başlatıldı — mevcut örneğe odaklan, yeni örnek kapatılıyor.');
  app.quit();
}

app.whenReady().then(() => {
  bootLog(`whenReady OK | dir=${__dirname}`);
  Menu.setApplicationMenu(null);
  loadAppSettings();
  const opMode = appSettingsMemory.operatingMode || 'hybrid';
  console.log(`[Electron] Başlangıç çalışma modu: ${opMode}`);
  if (opMode === 'hybrid') {
    wgSetEnabled(true).then((res) => {
      if (res.success) {
        console.log('[WireGuard] Hibrit mod için başlatıldı.');
        applySplitRoutes();
        startSplitMonitor();
      }
    });
  } else if (opMode === 'privacy') {
    wgSetEnabled(true).then((res) => {
      if (res.success) console.log('[WireGuard] Gizlilik modu için başlatıldı.');
    });
  } else {
    // gaming mode
    wgSetEnabled(false);
  }
  // Açılış ekranı süresi her seferinde rastgele: 5-18 sn (20 sn altı).
  // Kullanıcı beklerken splash'te geri sayım görür, süre dolunca ana ekran açılır.
  splashWaitMs = 5000 + Math.floor(Math.random() * 14000); // 5.000 - 18.999 ms
  bootLog(`splashWaitMs=${splashWaitMs}`);
  createSplash();
  splashStart = Date.now();
  createWindow();
  bootLog('createWindow çağrıldı — sonrası geldi');
  startInternetMonitor();

  // System tray: oyun oynarken X basınca kapanmasın, arka planda çalışsın
  try {
    const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
    const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }) : nativeImage.createEmpty();
    tray = new Tray(trayIcon);
    const trayMenu = Menu.buildFromTemplate([
      { label: 'KNOTS — Aç', click: () => { showMainWindow(); } },
      { type: 'separator' },
      { label: 'Mini Mode (Küçük kare)', click: () => { showMainWindow(); if (mainWindow) mainWindow.webContents.send('knots:miniMode', { active: true }); } },
      { type: 'separator' },
      { label: 'Çıkış (motoru da kapat)', click: () => { trayQuitFromMenu = true; stopSplitMonitor(); clearSplitRoutesSync(); stopEngineProcess(); app.quit(); } },
    ]);
    tray.setToolTip('Knots Connect');
    tray.setContextMenu(trayMenu);
    tray.on('click', () => showMainWindow());
    tray.on('double-click', () => showMainWindow());
  } catch (e) {
    console.error('[tray] init failed:', e.message);
  }

  // Dev modunda güncellemeyi pasif al — yalnızca paketlenmiş canlı sürümde kontrol
  if (app.isPackaged) {
    updater.checkForUpdates(sendUpdateStatus);
    setInterval(() => updater.checkForUpdates(sendUpdateStatus), 30 * 60 * 1000);
  } else {
    console.log('[updater] dev mode — auto-update check skipped (app.isPackaged=false)');
  }
});

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (miniModeActive) {
    exitMiniInternal();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

app.on('window-all-closed', (e) => {
  if (process.platform === 'darwin') return;
  // Tray varsa arka planda çalışmaya devam et; sadece menüden "Çıkış" seçilirse kapat
  if (tray && !trayQuitFromMenu) return;
  stopSplitMonitor();
  clearSplitRoutesSync();
  stopEngineProcess();
  app.quit();
});