const mysql = require('mysql2');
const fs = require('fs');

// Hapus pengecekan DATABASE_URL, langsung hardcode untuk testing
const db = mysql.createPool({
    host: 'mysql-1d002628-muhammadikhwan309-5e52.d.aivencloud.com',
    port: 19436,
    user: 'avnadmin',
    password: 'AVNS_sK4ad2m8DVSOUBIyZGI',
    database: 'defaultdb',
    ssl: {
        ca: fs.readFileSync('./ca.pem')  // ← file certificate dari Aiven
    },
    waitForConnections: true,
    connectionLimit: 10
});
