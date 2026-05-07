const mysql = require('mysql2');

// Debug: cek apakah DATABASE_URL terbaca
console.log('DATABASE_URL ada:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'KOSONG');

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL tidak ditemukan! Cek environment variable di Render.');
    process.exit(1);
}

const dbUrl = new URL(process.env.DATABASE_URL);

console.log('Host:', dbUrl.hostname);
console.log('Port:', dbUrl.port);
console.log('User:', dbUrl.username);
console.log('DB:', dbUrl.pathname.replace('/', ''));

const db = mysql.createPool({
    host:     dbUrl.hostname,
    port:     parseInt(dbUrl.port) || 3306,
    user:     dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace('/', ''),
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    connectTimeout:     20000
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal konek database:', err.message);
    } else {
        console.log('✅ Database Aiven Terhubung!');
        connection.release();
    }
});

module.exports = db;
