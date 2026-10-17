/**
 * ============================================================
 * api/exec.js — pengganti doGet/google.script.run di Apps Script.
 * Satu endpoint generik: menerima { fn, args }, memanggil fungsi yang
 * sesuai di lib/registry.js, dan mengembalikan hasilnya sebagai JSON
 * — bentuknya identik dengan createResponse() di Kode.gs asli:
 *   { success, data, message }
 * ============================================================
 */

const registry = require('../lib/registry');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, data: null, message: 'Method not allowed' });
    return;
  }

  const { fn, args } = req.body || {};
  const target = registry[fn];

  if (typeof target !== 'function') {
    res.status(404).json({
      success: false, data: null,
      message: `Fungsi "${fn}" belum tersedia di server (mungkin belum dipindahkan dari Kode.gs — lihat README bagian "Peta Migrasi").`
    });
    return;
  }

  try {
    const result = await target(...(Array.isArray(args) ? args : []));
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error di fungsi "${fn}":`, error);
    res.status(500).json({ success: false, data: null, message: error.message || 'Terjadi kesalahan di server.' });
  }
};
