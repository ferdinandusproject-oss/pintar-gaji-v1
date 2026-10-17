# PINTAR-Gaji — Versi Vercel + Google Sheets API

Migrasi dari Google Apps Script (`Kode.gs` + `Index.html` + `JavaScript.html` +
`Stylesheet.html`) ke Vercel, database tetap Google Spreadsheet (Opsi 2).

Panduan lengkap langkah demi langkah (setup sampai online, dan setup VSCode)
ada di dokumen terpisah yang saya kirimkan bersama file ini.

## Arsitektur

```
public/index.html   ← SAMA PERSIS dengan Index.html asli (hanya 2 baris
                       include() diganti <link>/<script> biasa)
public/style.css    ← SAMA PERSIS dengan isi Stylesheet.html (diekstrak mentah,
                       tanpa diubah)
public/app.js        ← SAMA PERSIS dengan isi JavaScript.html (diekstrak mentah,
                       tanpa diubah — semua 3272 baris logika frontend aslinya)
public/gas-shim.js  ← BARU. Membuat google.script.run di app.js tetap berfungsi,
                       diteruskan sebagai fetch() ke /api/exec

api/exec.js          ← BARU. Satu endpoint yang menerima {fn, args} dan memanggil
                       fungsi terkait di lib/registry.js

lib/sheetsClient.js  ← pengganti SpreadsheetApp (baca/tulis ke Google Sheets
                        lewat Google Sheets API)
lib/gasCompat.js     ← padanan helper Kode.gs (hashPassword, readAllRows, dst.)
lib/auth.js          ← dipindahkan dari bagian Login/Session Kode.gs
lib/pegawai.js       ← dipindahkan dari bagian Data Pegawai Kode.gs
lib/registry.js       ← daftar fungsi yang sudah tersedia untuk dipanggil
```

## Status migrasi (PENTING — baca ini)

`Kode.gs` asli berisi **79 fungsi** (login, pengajuan perubahan data, gaji,
impor/ekspor Excel & PDF, dashboard, dsb.) dan `JavaScript.html` berisi
**3272 baris** logika frontend. Ini adalah aplikasi besar.

Pada tahap ini yang sudah dipindahkan & siap pakai (**Fase 1**):

- Login, validasi sesi, logout, ganti password, reset password (Super Admin)
- Lihat data pegawai (Portal Pegawai — `getMyData`)
- Kelola Pegawai: lihat daftar/halaman/detail, tambah, edit, hapus

Frontend (`app.js`, HTML, CSS) **sudah 100% lengkap dan tidak diubah** —
begitu sebuah fungsi backend tersedia di `lib/registry.js`, bagian UI yang
memanggilnya otomatis langsung berfungsi, tanpa perlu menyentuh frontend lagi.

Fungsi yang **belum** dipindahkan (menyusul di fase berikutnya, mengikuti pola
yang sama persis seperti `lib/pegawai.js`):

- Modul Pengajuan Perubahan Data (submit, approve, reject, dsb.)
- Modul Data Gaji (CRUD, impor Excel, periode)
- Impor/Ekspor massal Excel & PDF (perlu library tambahan: `exceljs` untuk
  Excel, `puppeteer`/layanan PDF untuk PDF — `Utilities.newBlob().getAs('application/pdf')`
  tidak punya padanan langsung di Node.js)
- Dashboard & statistik
- Upload dokumen (pengganti `DriveApp` — disarankan pakai Vercel Blob atau
  Google Drive API dengan Service Account yang sama)
- Notifikasi (pengganti `MailApp` — perlu layanan email seperti Resend/SendGrid)

Jika mencoba memakai menu yang fungsinya belum dipindahkan, aplikasi akan
menampilkan pesan error yang jelas (bukan diam-diam gagal), karena
`api/exec.js` memeriksa dulu apakah fungsinya terdaftar.

## Catatan teknis penting

1. **Sesi login** disimpan di sheet `ScriptProperties` (bukan di memori server,
   karena serverless function di Vercel tidak punya memori yang bertahan
   antar-request) — ini pengganti `PropertiesService` Apps Script.
2. **`LockService`** (penguncian saat tulis bersamaan) BELUM diimplementasikan
   di versi dasar ini. Untuk pemakaian oleh banyak admin sekaligus, pertimbangkan
   menambahkan locking sederhana (mis. kolom "sedang diedit" atau Upstash Redis)
   sebelum dipakai serius di produksi.
3. **Cache** (`CacheService`, TTL 1800/60 detik di Kode.gs) belum diimplementasikan
   — setiap pemanggilan langsung baca ke Sheets API. Jika nanti terasa lambat,
   ini titik pertama yang perlu ditambah (Vercel KV cocok untuk ini).
