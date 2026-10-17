/**
 * ============================================================
 * lib/auth.js — dipindahkan dari bagian "KEAMANAN — Hash Password & Session"
 * di Kode.gs (baris 305-453 pada file asli). Logika IDENTIK; hanya primitif
 * penyimpanan yang berbeda (PropertiesService → getScriptProperty, lihat
 * gasCompat.js).
 * ============================================================
 */

const sheetsClient = require('./sheetsClient');
const { hashPassword, createResponse, getScriptProperty, setScriptProperty, readAllRows, findRowByValue } = require('./gasCompat');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam — sama seperti SESSION_TTL_MS di Kode.gs

async function doLogin(identifier, password) {
  try {
    await sheetsClient.ensureSheetColumn('Sheet_Users', 'SatuanKerjaBinaan');
    const data = await sheetsClient.getValues('Sheet_Users');
    const headers = data[0];
    const uCol = headers.indexOf('Username');
    const pCol = headers.indexOf('PasswordHash');
    const rCol = headers.indexOf('Peran');
    const nipCol = headers.indexOf('NIP');
    const statusCol = headers.indexOf('StatusAktif');
    const namaCol = headers.indexOf('NamaTampilan');
    const satkerBinaanCol = headers.indexOf('SatuanKerjaBinaan');

    const hash = hashPassword(password);
    const row = data.find((r, i) => i > 0 && r[uCol] === identifier && r[pCol] === hash);

    if (!row || row[statusCol] !== 'Aktif') {
      return createResponse(false, null, 'NIP/Username atau password salah.');
    }

    const peran = row[rCol];

    let namaTampilan = row[namaCol];
    if (peran === 'User') {
      const pegRow = await findRowByValue('Sheet_Pegawai', 'NIP', row[nipCol]);
      if (pegRow) namaTampilan = pegRow.obj.NamaLengkap;
    }
    const unitKerja = peran === 'AdminUnit' ? (row[satkerBinaanCol] || '') : '';

    const sessionData = {
      identifier, peran, nip: row[nipCol] || '', nama: namaTampilan, unitKerja, timestamp: Date.now()
    };
    const token = Buffer.from(JSON.stringify(sessionData) + '|' + require('crypto').randomUUID()).toString('base64');

    const sessions = JSON.parse((await getScriptProperty('activeSessions')) || '{}');
    sessions[token] = Object.assign({}, sessionData, { expiry: Date.now() + SESSION_TTL_MS });
    Object.keys(sessions).forEach((k) => { if (sessions[k].expiry < Date.now()) delete sessions[k]; });
    await setScriptProperty('activeSessions', JSON.stringify(sessions));

    return createResponse(true, {
      token, peran, nip: row[nipCol] || '', nama: namaTampilan, unitKerja
    }, 'Login berhasil!');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function validateSession(token) {
  try {
    if (!token) return { valid: false };
    const sessions = JSON.parse((await getScriptProperty('activeSessions')) || '{}');
    const s = sessions[token];
    if (!s || s.expiry < Date.now()) return { valid: false };
    return Object.assign({ valid: true }, s);
  } catch (e) {
    return { valid: false };
  }
}

async function doLogout(token) {
  try {
    const sessions = JSON.parse((await getScriptProperty('activeSessions')) || '{}');
    delete sessions[token];
    await setScriptProperty('activeSessions', JSON.stringify(sessions));
    return createResponse(true, null, 'Logout berhasil.');
  } catch (e) {
    return createResponse(false, null, e.message);
  }
}

async function changeOwnPassword(token, oldPassword, newPassword) {
  try {
    const s = await requireAuth(token, null);
    if (!newPassword || String(newPassword).length < 4) {
      return createResponse(false, null, 'Password baru minimal 4 karakter.');
    }
    const found = await findRowByValue('Sheet_Users', 'Username', s.identifier);
    if (!found) return createResponse(false, null, 'Akun tidak ditemukan.');
    if (found.obj.PasswordHash !== hashPassword(oldPassword)) {
      return createResponse(false, null, 'Password lama yang Anda masukkan salah.');
    }
    const pCol = found.headers.indexOf('PasswordHash') + 1;
    await sheetsClient.setValues('Sheet_Users', `${sheetsClient.colLetter(pCol)}${found.rowIndex1Based}`, [[hashPassword(newPassword)]]);
    return createResponse(true, null, 'Password berhasil diubah.');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function resetUserPassword(token, username, newPassword) {
  try {
    const s = await requireAuth(token, ['SuperAdmin']);
    if (!username) return createResponse(false, null, 'Akun tujuan wajib ditentukan.');
    if (!newPassword || String(newPassword).length < 4) {
      return createResponse(false, null, 'Password baru minimal 4 karakter.');
    }
    const found = await findRowByValue('Sheet_Users', 'Username', username);
    if (!found) return createResponse(false, null, 'Akun pengguna tidak ditemukan.');
    const pCol = found.headers.indexOf('PasswordHash') + 1;
    await sheetsClient.setValues('Sheet_Users', `${sheetsClient.colLetter(pCol)}${found.rowIndex1Based}`, [[hashPassword(newPassword)]]);
    await logAuditSuperAdmin(s.nama, 'Reset Password Pengguna', username);
    return createResponse(true, null, 'Password pengguna berhasil direset.');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

/** Setara requireAuth(token, allowedRoles) — melempar error dengan pesan yang SAMA
 *  ('SESSION_EXPIRED' / 'UNAUTHORIZED') supaya penanganan di app.js (yang tidak diubah)
 *  tetap bekerja seperti sebelumnya. */
async function requireAuth(token, allowedRoles) {
  const s = await validateSession(token);
  if (!s.valid) throw new Error('SESSION_EXPIRED');
  if (allowedRoles && allowedRoles.indexOf(s.peran) === -1) throw new Error('UNAUTHORIZED');
  return s;
}

async function logAuditSuperAdmin(nama, aksi, nip) {
  try {
    await sheetsClient.createSheetIfNotExists('Sheet_AuditLog', ['Waktu', 'Oleh', 'Aksi', 'NIP_Target']);
    await sheetsClient.appendRow('Sheet_AuditLog', [new Date().toISOString(), nama, aksi, nip]);
  } catch (e) { console.error('Audit log gagal:', e.message); }
}

module.exports = {
  doLogin, validateSession, doLogout, changeOwnPassword, resetUserPassword, requireAuth, logAuditSuperAdmin
};
