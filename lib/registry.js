/**
 * ============================================================
 * lib/registry.js
 * Daftar semua fungsi yang bisa dipanggil dari frontend (app.js) lewat
 * google.script.run.<namaFungsi>(...) → gas-shim.js → /api/exec.
 *
 * Nama di sini HARUS sama persis dengan nama fungsi yang dipanggil di
 * app.js (yang tidak diubah), karena app.js memanggilnya sebagai
 * google.script.run.namaFungsi(...).
 *
 * FASE BERIKUTNYA: tambahkan fungsi dari modul Pengajuan, Gaji,
 * Import/Export Excel & PDF, dan Dashboard ke sini dengan pola yang sama.
 * ============================================================
 */

const auth = require('./auth');
const pegawai = require('./pegawai');

const registry = {
  // ── Autentikasi ──
  doLogin: auth.doLogin,
  validateSession: auth.validateSession,
  doLogout: auth.doLogout,
  changeOwnPassword: auth.changeOwnPassword,
  resetUserPassword: auth.resetUserPassword,

  // ── Data Pegawai (Fase 1) ──
  getMyData: pegawai.getMyData,
  getAllPegawai: pegawai.getAllPegawai,
  getPegawaiPage: pegawai.getPegawaiPage,
  getPegawaiDetail: pegawai.getPegawaiDetail,
  saveKelolaPegawai: pegawai.saveKelolaPegawai,
  deletePegawai: pegawai.deletePegawai

  // Fase 2+ akan menambah di sini: submitPengajuan, approvePengajuan, getAllGaji,
  // importPegawaiExcel, exportPegawaiPDF, getDashboardData, dll.
};

module.exports = registry;
