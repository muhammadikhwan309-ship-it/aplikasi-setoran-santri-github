const mysql = require('mysql2');

const db = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000
});

// Test koneksi
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal konek database:', err.message);
    } else {
        console.log('✅ Database Aiven Terhubung!');
        connection.release();
    }
});

module.exports = db;
