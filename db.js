const mysql = require('mysql2');

// HARDCODE sementara untuk testing di Render
// TODO: Setelah berhasil, pindahkan ke environment variable
const DB_CONFIG = {
    host: 'mysql-1d002628-muhammadikhwan309-5e52.d.aivencloud.com',
    port: 19436,
    user: 'avnadmin',
    password: 'AVNS_sK4ad2m8DVSOUBIyZGI',
    database: 'defaultdb',
    ssl: {
        rejectUnauthorized: false // Terima semua sertifikat SSL
    },
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 20000
};

console.log('🔌 Mencoba konek ke database Aiven...');

const db = mysql.createPool(DB_CONFIG);

// Test koneksi
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal konek database:', err.message);
        console.error('Silakan cek kredensial database Aiven Anda');
        process.exit(1); // Hentikan proses jika gagal
    } else {
        console.log('✅ Database Aiven Berhasil Terhubung!');
        connection.release();
    }
});

module.exports = db;
