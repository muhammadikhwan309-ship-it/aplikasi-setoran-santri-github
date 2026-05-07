const mysql = require('mysql2');

// HARDCODE sementara untuk testing di Render
// TODO: Setelah berhasil, pindahkan ke environment variable
const DB_CONFIG = {
    host: process.env.DB_HOST || 'mysql-1d002628-muhammadikhwan309-5e52.d.aivencloud.com',
    port: parseInt(process.env.DB_PORT) || 19436,
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_sK4ad2m8DVSOUBIyZGI',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 20000,
    // Otomatis reconnect jika koneksi putus
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

console.log('🔌 Mencoba konek ke database Aiven...');

const db = mysql.createPool(DB_CONFIG);

// Test koneksi — tidak crash server jika gagal
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal konek database:', err.message);
        console.error('Silakan cek kredensial database Aiven Anda');
        // Tidak process.exit(1) agar server tetap nyala dan bisa retry
    } else {
        console.log('✅ Database Aiven Berhasil Terhubung!');
        connection.release();
    }
});

module.exports = db;
