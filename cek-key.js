require('dotenv').config();
const crypto = require('crypto');

const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

console.log('Jumlah baris:', key.split('\n').length);
console.log('Ada karakter \\r tersisa?', key.includes('\r'));
console.log('Ada tanda kutip nyangkut?', key.includes('"'));

try {
  crypto.createPrivateKey(key);
  console.log('✅ KEY VALID — bisa diparse Node.js.');
} catch (e) {
  console.log('❌ KEY TIDAK VALID:', e.message);
}