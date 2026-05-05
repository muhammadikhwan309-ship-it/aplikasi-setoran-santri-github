const express = require("express");
const cors = require("cors");
const db = require("./db");
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ API SANTRI ============
app.get("/api/santri", (req, res) => {
    db.query("SELECT * FROM data_santri ORDER BY nama_santri ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/santri", (req, res) => {
    const { nama_santri, nomor_wa_orangtua } = req.body;
    db.query("INSERT INTO data_santri (nama_santri, nomor_wa_orangtua) VALUES (?, ?)", 
        [nama_santri, nomor_wa_orangtua], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put("/api/santri/:id", (req, res) => {
    db.query("UPDATE data_santri SET nomor_wa_orangtua = ? WHERE id = ?", 
        [req.body.nomor_wa_orangtua, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete("/api/santri/:id", (req, res) => {
    db.query("DELETE FROM data_santri WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============ API SETORAN ============
app.get("/api/setoran/filter", (req, res) => {
    let sql = "SELECT * FROM setoran WHERE 1=1";
    let params = [];
    
    if (req.query.santri && req.query.santri !== "") {
        sql += " AND nama = ?";
        params.push(req.query.santri);
    }
    if (req.query.surah && req.query.surah !== "") {
        sql += " AND surah = ?";
        params.push(req.query.surah);
    }
    if (req.query.tanggal_mulai && req.query.tanggal_mulai !== "") {
        sql += " AND tanggal >= ?";
        params.push(req.query.tanggal_mulai);
    }
    if (req.query.tanggal_sampai && req.query.tanggal_sampai !== "") {
        sql += " AND tanggal <= ?";
        params.push(req.query.tanggal_sampai);
    }
    
    sql += " ORDER BY tanggal DESC, id DESC";
    
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/setoran", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan } = req.body;
    const sql = `INSERT INTO setoran (nama, nomor_wa, surah, ayat, nilai, keterangan, tanggal) 
                 VALUES (?, ?, ?, ?, ?, ?, CURDATE())`;
    db.query(sql, [nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.delete("/api/setoran/:id", (req, res) => {
    db.query("DELETE FROM setoran WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============ API DASHBOARD ============
app.get("/api/dashboard", (req, res) => {
    const sql = `
        SELECT 
            nama, 
            COUNT(*) as total_setoran, 
            ROUND(AVG(nilai), 1) as rata_rata,
            MAX(nilai) as nilai_tertinggi, 
            MIN(nilai) as nilai_terendah
        FROM setoran 
        GROUP BY nama 
        ORDER BY rata_rata DESC`;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ============ PDF REKAP HARIAN ============
app.get("/api/rekap-pdf", (req, res) => {
    db.query("SELECT * FROM setoran WHERE tanggal = CURDATE() ORDER BY nama ASC", (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ message: "Tidak ada data hari ini" });
        }
        
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=rekap_${new Date().toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);
        
        doc.fontSize(20).text("LAPORAN SETORAN QURAN", { align: "center" });
        doc.fontSize(12).text(`Tanggal: ${new Date().toISOString().split('T')[0]}`, { align: "center" });
        doc.moveDown();
        
        rows.forEach((row, i) => {
            doc.fontSize(10).text(`${i+1}. ${row.nama} - ${row.surah} (Ayat: ${row.ayat}) - Nilai: ${row.nilai}`);
        });
        
        doc.end();
    });
});

// ============ INIT TABEL OTOMATIS SAAT SERVER JALAN ============
const initDB = () => {
    const tableSantri = `
        CREATE TABLE IF NOT EXISTS data_santri (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_santri VARCHAR(255) NOT NULL,
            nomor_wa_orangtua VARCHAR(20) NOT NULL
        )`;
    
    const tableSetoran = `
        CREATE TABLE IF NOT EXISTS setoran (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            nomor_wa VARCHAR(20) NOT NULL,
            surah VARCHAR(100),
            ayat VARCHAR(50),
            nilai INT,
            keterangan TEXT,
            tanggal DATE DEFAULT (CURRENT_DATE)
        )`;

    db.query(tableSantri, (err) => {
        if (err) console.error("Gagal buat tabel santri:", err.message);
        else console.log("✓ Tabel data_santri siap");
    });

    db.query(tableSetoran, (err) => {
        if (err) console.error("Gagal buat tabel setoran:", err.message);
        else console.log("✓ Tabel setoran siap");
    });
};

initDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
