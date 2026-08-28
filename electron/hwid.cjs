const { execSync } = require('child_process');
const crypto = require('crypto');

/**
 * HWID (Donanım Kimliği) üretimi
 * Anakart UUID + Disk Seri Numarası → SHA-256
 * Aynı cihazda her zaman aynı HWID, farklı cihazlarda farklı.
 */
function getMotherboardUUID() {
  try {
    const out = execSync('wmic csproduct get UUID /value', { encoding: 'utf8', timeout: 5000 });
    const m = out.match(/UUID=(.+)/i);
    if (m) return m[1].trim();
  } catch {}
  return 'unknown-mb-uuid';
}

function getDiskSerial() {
  try {
    const out = execSync('wmic diskdrive get SerialNumber /value', { encoding: 'utf8', timeout: 5000 });
    // İlk disk seri numarasını al
    const m = out.match(/SerialNumber\s*=\s*(.+)/i);
    if (m) return m[1].trim();
  } catch {}
  try {
    const out2 = execSync('wmic logicaldisk get VolumeSerialNumber /value', { encoding: 'utf8', timeout: 5000 });
    const m2 = out2.match(/VolumeSerialNumber\s*=\s*(.+)/i);
    if (m2) return m2[1].trim();
  } catch {}
  return 'unknown-disk-serial';
}

function generateHWID() {
  const mbUUID = getMotherboardUUID();
  const diskSerial = getDiskSerial();
  const raw = `${mbUUID}|${diskSerial}`;
  const hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  return hash;
}

// CLI test: node electron/hwid.cjs
if (require.main === module) {
  console.log(generateHWID());
}

module.exports = { generateHWID, getMotherboardUUID, getDiskSerial };
