const mysql = require('mysql2');

const db = mysql.createConnection(process.env.DATABASE_URL);

db.connect((err) => {
    if (err) {
        console.error('Gagal konek:', err.message);
    } else {
        console.log('✅ Database Aiven Terhubung!');
    }
});

module.exports = db;
