const { app } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const OWNER = 'egoland96-source';
const REPO = 'knots-connect-desktop';
const GH_LATEST = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

let downloading = false;
let stagedDir = null;

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
  try {
    const rel = await getJson(GH_LATEST);
    if (!rel.tag_name) return;
    const latest = rel.tag_name.replace(/^v/, '');
    if (versionCompare(latest, app.getVersion()) <= 0) return;
    const asset = rel.assets.find((a) => a.name === `update-${latest}.zip`);
    if (!asset) return;
    onStatus({ status: 'downloading', version: latest });
    downloading = true;
    const temp = app.getPath('temp');
    const zipPath = path.join(temp, `knots-update-${latest}.zip`);
    await downloadFile(asset.browser_download_url, zipPath);
    stagedDir = path.join(temp, `knots-staged-${latest}`);
    fs.rmSync(stagedDir, { recursive: true, force: true });
    fs.mkdirSync(stagedDir, { recursive: true });
    extractZip(zipPath, stagedDir);
    fs.rmSync(zipPath, { force: true });
    downloading = false;
    onStatus({ status: 'ready', version: latest });
  } catch (err) {
    console.error('[updater]', err.message);
    downloading = false;
    stagedDir = null;
    onStatus({ status: 'error', detail: err.message });
  }
}

function applyUpdate() {
  if (!stagedDir) return;
  const resourcesDir = appResourcesDir();
  const stagedResources = path.join(stagedDir, 'resources');
  if (!fs.existsSync(stagedResources)) return;
  const ps1 = path.join(resourcesDir, 'knots-update.ps1');
  if (!fs.existsSync(ps1)) return;
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
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-rollback', '-target', resourcesDir, '-exe', process.execPath],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();
  app.quit();
}

module.exports = { checkForUpdates, applyUpdate, rollbackUpdate };