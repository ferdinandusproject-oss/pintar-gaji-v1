/**
 * ============================================================
 * lib/gasCompat.js
 * Padanan langsung dari helper-helper umum di Kode.gs asli, supaya fungsi
 * bisnis (doLogin, getAllPegawai, dst.) bisa dipindahkan nyaris baris-per-
 * baris tanpa mengubah logikanya.
 * ============================================================
 */

const crypto = require('crypto');
const sheetsClient = require('./sheetsClient');

/** Setara hashPassword() di Kode.gs — SHA-256 hex, algoritma sama persis
 *  (Utilities.computeDigest(SHA_256) Apps Script == sha256 Node), jadi
 *  password lama yang sudah ada di Sheet_Users tetap valid tanpa migrasi. */
function hashPassword(plain) {
  return crypto.createHash('sha256').update(String(plain), 'utf8').digest('hex');
}

/** Setara Utilities.getUuid() */
function generateUUID() {
  return crypto.randomUUID();
}

/** Setara createResponse() di Kode.gs */
function createResponse(success, data, message) {
  return { success, data, message };
}

/** Setara sanitizeCellValue() — Google Sheets API mengembalikan tanggal sebagai string apa
 *  adanya (bukan objek Date), jadi di sini umumnya hanya meneruskan nilai. Disediakan agar
 *  titik pemanggilan di kode yang dipindah tetap konsisten dengan versi Apps Script. */
function sanitizeCellValue(v) {
  return v === undefined ? '' : v;
}

/** Setara readAllRows(sheetName) — baca seluruh sheet, baris pertama jadi header,
 *  baris berikutnya diubah jadi array of object {header: value}. */
async function readAllRows(sheetName) {
  const data = await sheetsClient.getValues(sheetName);
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = sanitizeCellValue(row[i]); });
    return obj;
  });
}

/** Setara findRowByValue(ss, sheetName, colName, value) — mengembalikan { obj, rowIndex1Based }
 *  supaya kode yang butuh menulis balik ke baris itu tetap bisa (Apps Script versi lama hanya
 *  mengembalikan obj, tapi banyak caller di Kode.gs mencari ulang rowIndex secara terpisah —
 *  di sini digabung agar satu kali baca sheet saja). */
async function findRowByValue(sheetName, colName, value) {
  const data = await sheetsClient.getValues(sheetName);
  if (data.length <= 1) return null;
  const headers = data[0];
  const col = headers.indexOf(colName);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col]) === String(value)) {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = sanitizeCellValue(data[i][j]); });
      return { obj, rowIndex1Based: i + 1, headers };
    }
  }
  return null;
}

/** Setara PropertiesService.getScriptProperties() — disimpan di sheet khusus
 *  "ScriptProperties" (kolom Key, Value) di spreadsheet yang sama, supaya tidak perlu
 *  layanan tambahan (Redis/KV) untuk sesi login & konfigurasi aplikasi.
 *  CATATAN: karena ini baca-ubah-tulis lewat Sheets API, ada celah race-condition kecil pada
 *  trafik tinggi bersamaan (padanan LockService TIDAK diimplementasikan di versi dasar ini).
 *  Untuk trafik lebih besar, pertimbangkan pindah ke Vercel KV/Upstash Redis — lihat README. */
async function getScriptProperty(key) {
  await sheetsClient.createSheetIfNotExists('ScriptProperties', ['Key', 'Value']);
  const rows = await readAllRows('ScriptProperties');
  const row = rows.find(r => r.Key === key);
  return row ? row.Value : null;
}

async function setScriptProperty(key, value) {
  await sheetsClient.createSheetIfNotExists('ScriptProperties', ['Key', 'Value']);
  const found = await findRowByValue('ScriptProperties', 'Key', key);
  if (found) {
    await sheetsClient.updateRow('ScriptProperties', found.rowIndex1Based, [key, value]);
  } else {
    await sheetsClient.appendRow('ScriptProperties', [key, value]);
  }
}

module.exports = {
  hashPassword, generateUUID, createResponse, sanitizeCellValue,
  readAllRows, findRowByValue, getScriptProperty, setScriptProperty
};
