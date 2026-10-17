require('dotenv').config();
const { google } = require('googleapis');

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

console.log('Email:', email);

const auth = new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);

auth.authorize((err, tokens) => {
  if (err) {
    console.log('❌ GAGAL OTORISASI:');
    console.log(err);
  } else {
    console.log('✅ BERHASIL dapat access token dari Google!');
  }
});