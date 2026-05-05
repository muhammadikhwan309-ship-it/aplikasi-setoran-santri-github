const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 19436,
    // INI WAJIB ADA UNTUK AIVEN:
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 20000 // Tunggu 20 detik sebelum menyerah
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi Database Gagal total:', err.message);
    } else {
        console.log('ALHAMDULILLAH! Database Aiven Terhubung.');
    }
});

module.exports = db;
