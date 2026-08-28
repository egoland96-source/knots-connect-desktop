const { app } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const OWNER = 'egoland96-source';
const REPO = 'knots-connect-desktop';
// NOTE: we deliberately avoid api.github.com for version detection — it is
// rate-limited to 60 requests/hour per IP, which shared VPN egress IPs exhaust
// quickly. The releases/latest redirect carries the tag and has no quota.
const BASE = `https://github.com/${OWNER}/${REPO}`;
const RELEASES_LATEST = `${BASE}/releases/latest`;
const GH_LATEST_API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

let downloading = false;
let stagedDir = null;

function log(msg) {
  const line = `[${new Date().toISOString()}] [updater] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'updater.log'), line + '\n');
  } catch (_) { /* ignore */ }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'knots-connect', Accept: 'application/vnd.github+json' } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

// Resolves the latest version by following the /releases/latest redirect,
// which lands on /releases/tag/vX.Y.Z. No API quota involved.
function latestViaRedirect() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      RELEASES_LATEST,
      { headers: { 'User-Agent': 'knots-connect' } },
      (res) => {
        res.resume();
        const loc = res.headers.location || '';
        const m = loc.match(/\/releases\/tag\/v?([^/?#]+)/);
        if (res.statusCode >= 300 && res.statusCode < 400 && m) return resolve(m[1]);
        return reject(new Error(`redirect lookup failed: HTTP ${res.statusCode} ${loc.slice(0, 80)}`));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

async function resolveLatestVersion() {
  try {
    const v = await latestViaRedirect();
    if (v) return v;
  } catch (e) {
    log(`redirect lookup failed (${e.message}), falling back to api.github.com`);
  }
  const rel = await getJson(GH_LATEST_API);
  if (!rel.tag_name) throw new Error('no tag_name in api response');
  return rel.tag_name.replace(/^v/, '');
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'knots-connect' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.rmSync(dest, { force: true });
        return downloadFile(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.rmSync(dest, { force: true });
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
      file.on('error', (e) => {
        fs.rmSync(dest, { force: true });
        reject(e);
      });
    });
    req.on('error', (e) => {
      file.close();
      fs.rmSync(dest, { force: true });
      reject(e);
    });
  });
}

function extractZip(zip, dest) {
  const ps = `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dest}' -Force`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
    encoding: 'utf8',
    timeout: 180000,
  });
  if (r.status !== 0) throw new Error('extract failed: ' + (r.stderr || r.stdout || '').slice(0, 300));
}

function appResourcesDir() {
  return path.join(path.dirname(process.execPath), 'resources');
}

function versionCompare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function checkForUpdates(onStatus) {
  if (!app.isPackaged || downloading) return;
  let versionResolved = false;
  try {
    const latest = await resolveLatestVersion();
    versionResolved = true;
    log(`latest=${latest} current=${app.getVersion()}`);
    if (versionCompare(latest, app.getVersion()) <= 0) return;

    const zipUrl = `${BASE}/releases/download/v${latest}/update-${latest}.zip`;
    onStatus({ status: 'downloading', version: latest });
    downloading = true;

    const temp = app.getPath('temp');
    const zipPath = path.join(temp, `knots-update-${latest}.zip`);

    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Her denemede BENZERSİZ bir geçici dizin kullan. Böylece önceki
      // denemenin bıraktığı (antivirüs/kilitli dosya nedeniyle silinemeyen)
      // dizine hiç dokunmayız ve ENOTEMPTY hatası oluşmaz.
      const attemptDir = path.join(temp, `knots-staged-${latest}-${Date.now()}-${attempt}`);
      try {
        await downloadFile(zipUrl, zipPath);
        const size = fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0;
        log(`downloaded update-${latest}.zip (${size} bytes), attempt ${attempt}`);
        try {
          fs.rmSync(attemptDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
        } catch (rmErr) {
          log(`staged dir temizlenemedi (yok sayılıyor): ${rmErr.message}`);
        }
        fs.mkdirSync(attemptDir, { recursive: true });
        extractZip(zipPath, attemptDir);
        fs.rmSync(zipPath, { force: true });
        stagedDir = attemptDir;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        log(`attempt ${attempt} failed: ${e.message}`);
      }
    }
    if (lastErr) throw lastErr;

    downloading = false;
    log(`update ${latest} staged successfully`);
    onStatus({ status: 'ready', version: latest });
  } catch (err) {
    log(`check failed: ${err.message}`);
    downloading = false;
    stagedDir = null;
    // Sürüm tespiti başarısızsa (ağ/ DNS kesintisi) kullanıcıyı uyarma —
    // zaten en güncel sürümde olabiliriz ve bu zararsız bir kontroldür.
    // Yalnızca gerçek indirme/ uygulama hatalarında hata durumu bildir.
    if (versionResolved) onStatus({ status: 'error', detail: err.message });
  }
}

function applyUpdate() {
  if (!stagedDir) {
    log('applyUpdate called but nothing is staged');
    return;
  }
  const resourcesDir = appResourcesDir();
  const stagedResources = path.join(stagedDir, 'resources');
  if (!fs.existsSync(stagedResources)) {
    log(`staged resources missing: ${stagedResources}`);
    return;
  }
  const ps1 = path.join(resourcesDir, 'knots-update.ps1');
  if (!fs.existsSync(ps1)) {
    log(`update script missing: ${ps1}`);
    return;
  }
  log(`launching installer script for ${stagedDir}`);
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-staged', stagedDir, '-target', resourcesDir, '-exe', process.execPath],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();
  app.quit();
}

function rollbackUpdate() {
  const resourcesDir = appResourcesDir();
  const ps1 = path.join(resourcesDir, 'knots-update.ps1');
  if (!fs.existsSync(ps1)) return;
  log('rollback requested');
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-rollback', '-target', resourcesDir, '-exe', process.execPath],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();
  app.quit();
}

module.exports = { checkForUpdates, applyUpdate, rollbackUpdate };
