const express = require("express");
const cors = require("cors");
const db = require("./db");
const PDFDocument = require('pdfkit');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Static Files
app.use(express.static(path.join(__dirname, 'public')));

// ============ API SANTRI ============
app.get("/api/santri", (req, res) => {
    db.query("SELECT * FROM data_santri ORDER BY nama_santri ASC", (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal" });
        res.json(rows);
    });
});

app.post("/api/santri", (req, res) => {
    const { nama_santri, nomor_wa_orangtua } = req.body;
    db.query("INSERT INTO data_santri (nama_santri, nomor_wa_orangtua) VALUES (?, ?)", [nama_santri, nomor_wa_orangtua], (err) => {
        if (err) return res.status(500).json({ message: "Gagal" });
        res.json({ message: "Sukses" });
    });
});

// ============ API SETORAN ============
app.post("/api/setoran", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan } = req.body;
    const sql = "INSERT INTO setoran (nama, nomor_wa, surah, ayat, nilai, keterangan) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan], (err) => {
        if (err) return res.status(500).json({ message: "Gagal" });
        res.json({ message: "Sukses" });
    });
});

// ============ API DASHBOARD & HAPUS ============
app.get("/api/dashboard", (req, res) => {
    const sql = `SELECT 
        nama, 
        COUNT(*) as total_setoran, 
        ROUND(AVG(nilai), 1) as rata_rata, 
        MAX(nilai) as nilai_tertinggi, 
        MIN(nilai) as nilai_terendah,
        MAX(DATE(created_at)) as terakhir_setor,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as setoran_hari_ini
    FROM setoran 
    GROUP BY nama 
    ORDER BY rata_rata DESC`;
    
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err });
        res.json(rows);
    });
});

app.delete("/api/dashboard/hapus/:nama", (req, res) => {
    const nama = req.params.nama;
    db.query("DELETE FROM setoran WHERE nama = ?", [nama], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus" });
        res.json({ message: "Berhasil hapus semua setoran" });
    });
});
// ============ FITUR PDF ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.query("SELECT * FROM setoran WHERE DATE(created_at) = ?", [today], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).send("Kosong");
        const doc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        doc.text("LAPORAN SETORAN");
        rows.forEach(r => doc.text(`${r.nama} - ${r.surah}`));
        doc.end();
    });
});

// ============ DATABASE INIT ============
const initDB = () => {
    db.query(`CREATE TABLE IF NOT EXISTS data_santri (id INT AUTO_INCREMENT PRIMARY KEY, nama_santri VARCHAR(255), nomor_wa_orangtua VARCHAR(20))`);
    db.query(`CREATE TABLE IF NOT EXISTS setoran (id INT AUTO_INCREMENT PRIMARY KEY, nama VARCHAR(255), nomor_wa VARCHAR(20), surah VARCHAR(100), ayat VARCHAR(50), nilai INT, keterangan TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    console.log("Database siap!");
};
initDB();

// --- PENTING: TARUH PALING BAWAH ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server nyala di port ${PORT}`));
