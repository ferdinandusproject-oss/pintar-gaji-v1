/**
 * Jalankan sekali di komputer Anda untuk mengubah private key dari file JSON Service Account
 * menjadi format Base64 satu baris (lebih tahan-banting untuk disimpan di .env / Vercel).
 *
 * Cara pakai:
 *   node gen-key-b64.js "C:/path/ke/file-service-account.json"
 *
 * Hasilnya salin ke .env sebagai:
 *   GOOGLE_PRIVATE_KEY_B64=hasil_yang_dicetak_di_sini
 * (TANPA tanda kutip)
 */
const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.log('Pakai: node gen-key-b64.js "path/ke/file-service-account.json"');
  process.exit(1);
}
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log('\nGOOGLE_SERVICE_ACCOUNT_EMAIL=' + json.client_email);
console.log('GOOGLE_PRIVATE_KEY_B64=' + Buffer.from(json.private_key, 'utf8').toString('base64'));
console.log('\n(Salin dua baris di atas ke file .env Anda, dan dua variable yang sama ke Environment Variables di Vercel.)\n');
