/**
 * ============================================================
 * lib/sheetsClient.js
 * Pengganti `SpreadsheetApp` Apps Script — akses Google Sheets lewat
 * Google Sheets API (googleapis) menggunakan kredensial Service Account.
 * ============================================================
 *
 * SETUP YANG DIPERLUKAN (lihat panduan lengkap):
 * 1. Buat Service Account di Google Cloud Console, aktifkan Google Sheets API.
 * 2. Share spreadsheet Anda ke email Service Account tsb sebagai Editor.
 * 3. Isi environment variable di Vercel:
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_PRIVATE_KEY          (simpan dengan \n literal, lihat README)
 *    - SPREADSHEET_ID
 */

const { google } = require('googleapis');

let _sheetsClient = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY belum di-set di Environment Variables.');
  }
  return new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
}

function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  _sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
  return _sheetsClient;
}

function getSpreadsheetId() {
  const id = process.env.SPREADSHEET_ID;
  if (!id) throw new Error('Aplikasi belum di-setup. SPREADSHEET_ID belum di-set di Environment Variables.');
  return id;
}

/** Ambil SEMUA baris mentah (termasuk header) sebuah sheet sebagai array 2 dimensi.
 *  Setara dengan `sheet.getDataRange().getValues()` di Apps Script. */
async function getValues(sheetName, range) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: range ? `${sheetName}!${range}` : sheetName
  });
  return res.data.values || [];
}

async function setValues(sheetName, range, values) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
}

/** Setara `sheet.appendRow([...])` */
async function appendRow(sheetName, row) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
}

/** Timpa satu baris penuh (1-based, termasuk header di baris 1) — setara
 *  `sheet.getRange(rowIndex1Based, 1, 1, headers.length).setValues([row])`. */
async function updateRow(sheetName, rowIndex1Based, row) {
  await setValues(sheetName, `A${rowIndex1Based}:${colLetter(row.length)}${rowIndex1Based}`, [row]);
}

/** Hapus satu baris (1-based) — setara `sheet.deleteRow(rowIndex1Based)`.
 *  Memerlukan sheetId numerik internal, jadi kita cari dulu lewat metadata. */
async function deleteRow(sheetName, rowIndex1Based) {
  const sheets = getSheetsClient();
  const sheetId = await getSheetIdByName(sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex1Based - 1,
            endIndex: rowIndex1Based
          }
        }
      }]
    }
  });
}

const _sheetIdCache = {};
async function getSheetIdByName(sheetName) {
  if (_sheetIdCache[sheetName] != null) return _sheetIdCache[sheetName];
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const found = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!found) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);
  _sheetIdCache[sheetName] = found.properties.sheetId;
  return found.properties.sheetId;
}

async function sheetExists(sheetName) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  return meta.data.sheets.some(s => s.properties.title === sheetName);
}

/** Setara `ss.insertSheet(name)` + header pertama + styling dasar. */
async function createSheetIfNotExists(sheetName, headers) {
  if (await sheetExists(sheetName)) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
  });
  if (headers && headers.length) await setValues(sheetName, `A1:${colLetter(headers.length)}1`, [headers]);
}

/** Setara ensureSheetColumn(sheet, columnName) di Kode.gs — tambahkan kolom baru di akhir
 *  jika belum ada, mengembalikan header terbaru. */
async function ensureSheetColumn(sheetName, columnName) {
  const headerRow = (await getValues(sheetName, '1:1'))[0] || [];
  if (headerRow.indexOf(columnName) === -1) {
    const nextCol = headerRow.length + 1;
    await setValues(sheetName, `${colLetter(nextCol)}1`, [[columnName]]);
    headerRow.push(columnName);
  }
  return headerRow;
}

function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

module.exports = {
  getValues, setValues, appendRow, updateRow, deleteRow,
  createSheetIfNotExists, ensureSheetColumn, sheetExists, colLetter
};
