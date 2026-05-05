const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: {
        rejectUnauthorized: false // Penting untuk koneksi ke Aiven
    }
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi Database Gagal:', err.message);
    } else {
        console.log('Mantap! Database Aiven Terhubung.');
    }
});

module.exports = db;
