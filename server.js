const express = require("express");
const cors = require("cors");
const db = require("./db");
const PDFDocument = require('pdfkit');
const fs = require('fs');
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

// ============ HAPUS SANTRI ============
app.delete("/api/santri/:id", (req, res) => {
    const id = req.params.id;
    
    db.query("SELECT nama_santri FROM data_santri WHERE id = ?", [id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal cari santri" });
        if (rows.length === 0) return res.status(404).json({ message: "Santri tidak ditemukan" });
        
        const namaSantri = rows[0].nama_santri;
        
        db.query("DELETE FROM setoran WHERE nama = ?", [namaSantri], (err) => {
            if (err) console.error("Gagal hapus setoran:", err);
            
            db.query("DELETE FROM data_santri WHERE id = ?", [id], (err) => {
                if (err) return res.status(500).json({ message: "Gagal hapus santri" });
                res.json({ message: "Santri dan semua setorannya berhasil dihapus" });
            });
        });
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

// ============ FITUR PDF REKAP HARIAN ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.query(`
        SELECT s.*, ds.nomor_wa_orangtua 
        FROM setoran s
        LEFT JOIN data_santri ds ON s.nama = ds.nama_santri
        WHERE DATE(s.created_at) = ? 
        ORDER BY s.created_at DESC
    `, [today], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Tidak ada data setoran hari ini");
        }
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_harian_${today}.pdf`);
        doc.pipe(res);
        
        // ===== LOGO =====
        const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
        if (fs.existsSync(logoPath)) {
            const pageWidth = doc.page.width;
            const logoWidth = 70;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.image(logoPath, logoX, 40, { width: logoWidth });
            doc.moveDown(4);
        } else {
            doc.moveDown(2);
        }
        
        // ===== NAMA MADRASAH =====
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('MI HIDAYATUL MUBTADIEN', { align: 'center' });
        doc.moveDown(0.5);
        
        // ===== JUDUL LAPORAN =====
        doc.fontSize(12).font('Helvetica');
        doc.text('LAPORAN SETORAN SISWA', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`${new Date(today).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
        doc.moveDown(1.5);
        
        // ===== TABEL =====
        const startY = doc.y;
        const colPos = [40, 100, 220, 350, 450];
        const headers = ['No', 'Nama', 'Surah', 'Ayat', 'Keterangan'];
        
        doc.rect(35, startY - 3, 530, 20).fill('#e8e8e8');
        doc.fillColor('#000000');
        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
            doc.text(header, colPos[i], startY);
        });
        
        doc.moveTo(35, startY + 17).lineTo(565, startY + 17).lineWidth(0.5).stroke();
        
        let y = startY + 25;
        doc.fontSize(9).font('Helvetica');
        
        rows.forEach((row, index) => {
            if (y > 750) {
                doc.addPage();
                y = 50;
            }
            
            let keterangan = row.nilai >= 85 ? '✅ Lancar' : '⚠️ Kurang Lancar';
            
            doc.text((index + 1).toString(), colPos[0], y);
            doc.text(row.nama || '-', colPos[1], y, { width: 110 });
            doc.text(row.surah || '-', colPos[2], y, { width: 120 });
            doc.text(row.ayat || '-', colPos[3], y, { width: 90 });
            doc.text(keterangan, colPos[4], y);
            
            y += 22;
        });
        
        doc.moveTo(35, y + 2).lineTo(565, y + 2).stroke();
        
        const pageHeight = doc.page.height;
        doc.fontSize(8).font('Helvetica');
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 35, pageHeight - 40);
        doc.text('MI Hidayatul Mubtadiien - Bangil, Pasuruan', 35, pageHeight - 25, { align: 'center', width: 530 });
        
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
