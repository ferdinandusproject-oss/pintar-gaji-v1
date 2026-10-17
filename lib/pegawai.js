/**
 * ============================================================
 * lib/pegawai.js — dipindahkan dari bagian "DATA PEGAWAI" di Kode.gs
 * (sekitar baris 575-1320 pada file asli). Fungsi-fungsi di file ini adalah
 * FASE 1: cukup untuk login, melihat & mengelola Data Pegawai inti.
 * Modul Pengajuan, Gaji, Import/Export Excel/PDF, dan Dashboard menyusul
 * di fase berikutnya (lihat README "Peta Migrasi").
 * ============================================================
 */

const sheetsClient = require('./sheetsClient');
const { createResponse, hashPassword, readAllRows, findRowByValue } = require('./gasCompat');
const { requireAuth, logAuditSuperAdmin } = require('./auth');

async function ensurePegawaiKeaktifanColumn() {
  for (const col of ['StatusKeaktifan', 'Gender', 'StatusPernikahan', 'PasanganPNS', 'NIPPasangan']) {
    try { await sheetsClient.ensureSheetColumn('Sheet_Pegawai', col); } catch (e) {}
  }
}
async function ensureKeluargaColumns() {
  for (const col of ['MasihPendidikan', 'DokumenPendidikanUrl', 'NomorSuratKeterangan']) {
    try { await sheetsClient.ensureSheetColumn('Sheet_Keluarga', col); } catch (e) {}
  }
}

async function buildEmployeeProfile(nip) {
  await ensurePegawaiKeaktifanColumn();
  await ensureKeluargaColumns();
  const found = await findRowByValue('Sheet_Pegawai', 'NIP', nip);
  const pegawai = found ? found.obj : {};
  if (!pegawai.StatusKeaktifan) pegawai.StatusKeaktifan = 'Aktif';
  if (!pegawai.Gender) pegawai.Gender = '-';

  const byTanggalBerlakuDesc = (a, b) => new Date(b.TanggalBerlaku) - new Date(a.TanggalBerlaku);
  const keluarga = (await readAllRows('Sheet_Keluarga')).filter(r => r.NIP === nip);
  const pangkat = (await readAllRows('Sheet_PangkatGolongan')).filter(r => r.NIP === nip).sort(byTanggalBerlakuDesc);
  const jabatan = (await readAllRows('Sheet_Jabatan')).filter(r => r.NIP === nip).sort(byTanggalBerlakuDesc);
  const kgb = (await readAllRows('Sheet_MasaKerjaKGB')).filter(r => r.NIP === nip).sort(byTanggalBerlakuDesc);
  const satker = (await readAllRows('Sheet_SatuanKerja')).filter(r => r.NIP === nip).sort(byTanggalBerlakuDesc);
  const cuti = (await readAllRows('Sheet_RiwayatCuti')).filter(r => r.NIP === nip);

  delete pegawai.PasswordHash;
  return { pegawai, keluarga, pangkat, jabatan, kgb, satker, cuti };
}

/** Peta NIP -> Satuan Kerja "saat ini", setara getActiveSatkerMap() di Kode.gs. */
async function getActiveSatkerMap() {
  const all = (await readAllRows('Sheet_SatuanKerja')).sort((a, b) => new Date(b.TanggalBerlaku) - new Date(a.TanggalBerlaku));
  const picked = {};
  all.forEach((r) => {
    if (!picked[r.NIP]) picked[r.NIP] = r;
    else if (r.StatusTerkini === 'Ya' && picked[r.NIP].StatusTerkini !== 'Ya') picked[r.NIP] = r;
  });
  const m = {};
  Object.keys(picked).forEach((nip) => { m[nip] = picked[nip].SatuanKerja; });
  return m;
}

async function getMyData(token) {
  try {
    const s = await requireAuth(token, ['User']);
    return createResponse(true, await buildEmployeeProfile(s.nip), 'OK');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function getAllPegawai(token) {
  try {
    const s = await requireAuth(token, ['Admin', 'SuperAdmin', 'AdminUnit']);
    await ensurePegawaiKeaktifanColumn();
    let list = (await readAllRows('Sheet_Pegawai')).map((p) => {
      const c = Object.assign({}, p); delete c.PasswordHash;
      if (!c.StatusKeaktifan) c.StatusKeaktifan = 'Aktif';
      if (!c.Gender) c.Gender = '-';
      return c;
    });
    if (s.peran === 'AdminUnit') {
      const satkerMap = await getActiveSatkerMap();
      list = list.filter((p) => (satkerMap[p.NIP] || '') === (s.unitKerja || '') && s.unitKerja);
    }
    return createResponse(true, list, 'OK');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function getPegawaiPage(token, opts) {
  try {
    const s = await requireAuth(token, ['Admin', 'SuperAdmin', 'AdminUnit']);
    await ensurePegawaiKeaktifanColumn();
    opts = opts || {};
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(opts.pageSize, 10) || 10));
    const search = String(opts.search || '').trim().toLowerCase();
    const searchField = String(opts.searchField || '').trim();
    let satuanKerjaFilter = String(opts.satuanKerja || '').trim();

    const satkerMap = await getActiveSatkerMap();
    let list = (await readAllRows('Sheet_Pegawai')).map((p) => {
      const c = Object.assign({}, p); delete c.PasswordHash;
      if (!c.StatusKeaktifan) c.StatusKeaktifan = 'Aktif';
      if (!c.Gender) c.Gender = '-';
      c.SatuanKerja = satkerMap[c.NIP] || '-';
      return c;
    });
    if (s.peran === 'AdminUnit') {
      list = list.filter((p) => (satkerMap[p.NIP] || '') === (s.unitKerja || '') && s.unitKerja);
      satuanKerjaFilter = '';
    } else if (satuanKerjaFilter) {
      list = list.filter((p) => (satkerMap[p.NIP] || '') === satuanKerjaFilter);
    }
    if (search) {
      if (searchField === 'NIP') list = list.filter((p) => String(p.NIP || '').toLowerCase().includes(search));
      else if (searchField === 'Nama') list = list.filter((p) => String(p.NamaLengkap || '').toLowerCase().includes(search));
      else if (searchField === 'NIK') list = list.filter((p) => String(p.NIK || '').toLowerCase().includes(search));
      else list = list.filter((p) => String(p.NIP || '').toLowerCase().includes(search) || String(p.NamaLengkap || '').toLowerCase().includes(search));
    }
    const totalCount = list.length;
    const rows = list.slice((page - 1) * pageSize, page * pageSize);
    return createResponse(true, { rows, totalCount, page, pageSize }, 'OK');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function getPegawaiDetail(token, nip) {
  try {
    const s = await requireAuth(token, ['Admin', 'SuperAdmin', 'AdminUnit']);
    if (s.peran === 'AdminUnit') {
      const satkerMap = await getActiveSatkerMap();
      if (!s.unitKerja || (satkerMap[nip] || '') !== s.unitKerja) {
        return createResponse(false, null, 'Anda tidak berwenang melihat data pegawai di luar unit kerja Anda.');
      }
    }
    const profile = await buildEmployeeProfile(nip);
    profile.riwayatPengajuan = (await readAllRows('Sheet_Pengajuan')).filter((r) => r.NIP_Pemohon === nip);
    return createResponse(true, profile, 'OK');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function saveKelolaPegawai(token, pegawaiObj, isNew) {
  try {
    const s = await requireAuth(token, ['SuperAdmin']);
    await ensurePegawaiKeaktifanColumn();
    const data = await sheetsClient.getValues('Sheet_Pegawai');
    const headers = data[0];
    const nipCol = headers.indexOf('NIP');

    if (isNew) {
      if (!pegawaiObj.NIP || !pegawaiObj.NamaLengkap) {
        return createResponse(false, null, 'NIP dan Nama Lengkap wajib diisi.');
      }
      const exists = data.some((r, i) => i > 0 && r[nipCol] === pegawaiObj.NIP);
      if (exists) return createResponse(false, null, 'NIP sudah terdaftar.');

      const row = headers.map((h) => {
        if (h === 'PasswordHash') return hashPassword(pegawaiObj.Password || pegawaiObj.NIP);
        if (h === 'StatusAkun') return 'Aktif';
        if (h === 'Username') return pegawaiObj.NIP;
        if (h === 'TanggalDibuat') return new Date().toISOString();
        if (h === 'StatusKeaktifan') return pegawaiObj.StatusKeaktifan || 'Aktif';
        if (h === 'Gender') return pegawaiObj.Gender || '';
        return pegawaiObj[h] || '';
      });
      await sheetsClient.appendRow('Sheet_Pegawai', row);
      await sheetsClient.appendRow('Sheet_Users', [
        pegawaiObj.NIP, hashPassword(pegawaiObj.Password || pegawaiObj.NIP), 'User', pegawaiObj.NIP, 'Aktif', pegawaiObj.NamaLengkap
      ]);
    } else {
      const originalNip = pegawaiObj.OriginalNIP || pegawaiObj.NIP;
      const rowIndex = data.findIndex((r, i) => i > 0 && r[nipCol] === originalNip);
      if (rowIndex === -1) return createResponse(false, null, 'Data pegawai tidak ditemukan.');
      if (pegawaiObj.NIP && pegawaiObj.NIP !== originalNip) {
        const dup = data.some((r, i) => i > 0 && i !== rowIndex && r[nipCol] === pegawaiObj.NIP);
        if (dup) return createResponse(false, null, 'NIP sudah digunakan oleh pegawai lain.');
      }
      const updated = headers.map((h, i) => {
        if (h === 'PasswordHash') return data[rowIndex][i];
        if (h === 'StatusKeaktifan') return pegawaiObj.StatusKeaktifan || data[rowIndex][i] || 'Aktif';
        if (h === 'Gender') return (pegawaiObj.Gender !== undefined ? pegawaiObj.Gender : data[rowIndex][i]) || '';
        if (h in pegawaiObj) return pegawaiObj[h];
        return data[rowIndex][i];
      });
      await sheetsClient.updateRow('Sheet_Pegawai', rowIndex + 1, updated);
    }

    await logAuditSuperAdmin(s.nama, isNew ? 'Tambah Pegawai' : 'Edit Pegawai', pegawaiObj.NIP);
    return createResponse(true, null, isNew ? 'Pegawai baru berhasil ditambahkan.' : 'Data pegawai berhasil diperbarui.');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

async function deletePegawai(token, nip) {
  try {
    const s = await requireAuth(token, ['SuperAdmin']);
    const data = await sheetsClient.getValues('Sheet_Pegawai');
    const nipCol = data[0].indexOf('NIP');
    const rowIndex = data.findIndex((r, i) => i > 0 && r[nipCol] === nip);
    if (rowIndex === -1) return createResponse(false, null, 'Data tidak ditemukan.');
    await sheetsClient.deleteRow('Sheet_Pegawai', rowIndex + 1);

    await logAuditSuperAdmin(s.nama, 'Hapus Pegawai', nip);
    return createResponse(true, null, 'Data pegawai berhasil dihapus.');
  } catch (error) {
    return createResponse(false, null, error.message);
  }
}

module.exports = {
  buildEmployeeProfile, getActiveSatkerMap, getMyData,
  getAllPegawai, getPegawaiPage, getPegawaiDetail, saveKelolaPegawai, deletePegawai
};
