const express = require("express");
const cors = require("cors");
const db = require("./db");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ PERBAIKI TABEL OTOMATIS ============
const fixDatabase = () => {
    console.log("🔧 Memeriksa dan memperbaiki struktur database...");
    
    // Hapus kolom sekolah_id jika ada (biar gak double)
    db.query("ALTER TABLE data_santri DROP COLUMN IF EXISTS sekolah_id", (err) => {
        if (err && err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') console.log("Info:", err.message);
    });
    
    db.query("ALTER TABLE setoran DROP COLUMN IF EXISTS sekolah_id", (err) => {
        if (err && err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') console.log("Info:", err.message);
    });
    
    // Tambah kolom sekolah_id yang benar
    setTimeout(() => {
        db.query("ALTER TABLE data_santri ADD COLUMN sekolah_id VARCHAR(50) DEFAULT 'MI001'", (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') console.log("Info data_santri:", err?.message);
            else console.log("✅ Kolom sekolah_id siap di data_santri");
        });
        
        db.query("ALTER TABLE setoran ADD COLUMN sekolah_id VARCHAR(50) DEFAULT 'MI001'", (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') console.log("Info setoran:", err?.message);
            else console.log("✅ Kolom sekolah_id siap di setoran");
        });
        
        // Pastikan tabel daftar_sekolah ada
        db.query(`CREATE TABLE IF NOT EXISTS daftar_sekolah (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kode_sekolah VARCHAR(50) UNIQUE,
            nama_sekolah VARCHAR(255),
            alamat TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error buat daftar_sekolah:", err.message);
            else console.log("✅ Tabel daftar_sekolah siap");
        });
        
        // Masukkan sekolah default
        db.query(`INSERT IGNORE INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) 
            VALUES ('MI001', 'MI HIDAYATUL MUBTADIEN', 'Bangil, Pasuruan')`, (err) => {
            if (err) console.error("Error insert sekolah:", err.message);
            else console.log("✅ Sekolah default MI001 siap");
        });
    }, 1000);
};

// Jalankan perbaikan database 2 detik setelah koneksi
setTimeout(fixDatabase, 2000);

// ============ API SANTRI ============
app.get("/api/santri", (req, res) => {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    db.query("SELECT * FROM data_santri WHERE sekolah_id = ? ORDER BY nama_santri ASC", [sekolah_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json(rows);
    });
});

app.post("/api/santri", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, sekolah_id } = req.body;
    
    console.log("📝 Data diterima:", { nama_santri, nomor_wa_orangtua, sekolah_id });
    
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    if (!nama_santri || !nomor_wa_orangtua) {
        return res.status(400).json({ message: "Nama dan nomor WA wajib diisi" });
    }
    
    db.query(
        "INSERT INTO data_santri (nama_santri, nomor_wa_orangtua, sekolah_id) VALUES (?, ?, ?)",
        [nama_santri, nomor_wa_orangtua, sekolah_id],
        (err, result) => {
            if (err) {
                console.error("❌ Error insert:", err.message);
                return res.status(500).json({ message: "Gagal", error: err.message });
            }
            console.log("✅ Santri berhasil ditambah!");
            res.json({ message: "Sukses", id: result.insertId });
        }
    );
});

// ============ API LAINNYA (SETORAN, DASHBOARD, DLL) ============
app.get("/api/setoran/filter", (req, res) => {
    const { santri, surah, tanggal_mulai, tanggal_sampai, sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    let sql = "SELECT * FROM setoran WHERE sekolah_id = ?";
    let params = [sekolah_id];
    
    if (santri) { sql += " AND nama = ?"; params.push(santri); }
    if (surah) { sql += " AND surah = ?"; params.push(surah); }
    if (tanggal_mulai) { sql += " AND DATE(created_at) >= ?"; params.push(tanggal_mulai); }
    if (tanggal_sampai) { sql += " AND DATE(created_at) <= ?"; params.push(tanggal_sampai); }
    
    sql += " ORDER BY created_at DESC";
    
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json(rows);
    });
});

app.post("/api/setoran", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan, sekolah_id } = req.body;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    const sql = "INSERT INTO setoran (nama, nomor_wa, surah, ayat, nilai, keterangan, sekolah_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan, sekolah_id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json({ message: "Sukses" });
    });
});

app.get("/api/dashboard", (req, res) => {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    const sql = `SELECT 
        nama, COUNT(*) as total_setoran, ROUND(AVG(nilai), 1) as rata_rata,
        MAX(nilai) as nilai_tertinggi, MIN(nilai) as nilai_terendah
    FROM setoran WHERE sekolah_id = ? GROUP BY nama ORDER BY rata_rata DESC`;
    
    db.query(sql, [sekolah_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json(rows);
    });
});

app.delete("/api/setoran/:id", (req, res) => {
    const id = req.params.id;
    const { sekolah_id } = req.query;
    db.query("DELETE FROM setoran WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus" });
        res.json({ message: "Berhasil" });
    });
});

app.get("/api/sekolah/cek/:kode", (req, res) => {
    const kode = req.params.kode.toUpperCase();
    db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [kode], (err, rows) => {
        if (err) return res.status(500).json({ valid: false });
        if (rows.length > 0) {
            res.json({ valid: true, nama_sekolah: rows[0].nama_sekolah, alamat: rows[0].alamat });
        } else {
            res.json({ valid: false });
        }
    });
});

// ============ PDF REKAP ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).send("Sekolah ID diperlukan");
    
    db.query(`SELECT * FROM setoran WHERE DATE(created_at) = ? AND sekolah_id = ? ORDER BY created_at ASC`, 
        [today, sekolah_id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Tidak ada data setoran hari ini");
        }
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_harian_${today}.pdf`);
        doc.pipe(res);
        
        db.query("SELECT nama_sekolah FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (err, sekolahRow) => {
            const namaSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            
            doc.fontSize(16).font('Helvetica-Bold').text(namaSekolah, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`LAPORAN SETORAN HARIAN`, { align: 'center' });
            doc.fontSize(10).text(new Date(today).toLocaleDateString('id-ID'), { align: 'center' });
            doc.moveDown();
            
            const startX = 50;
            let y = doc.y;
            
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('No', startX, y);
            doc.text('Nama', startX + 40, y);
            doc.text('Surah', startX + 150, y);
            doc.text('Ayat', startX + 250, y);
            doc.text('Keterangan', startX + 320, y);
            
            y += 20;
            doc.font('Helvetica');
            
            rows.forEach((row, i) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    doc.font('Helvetica-Bold');
                    doc.text('No', startX, y);
                    doc.text('Nama', startX + 40, y);
                    doc.text('Surah', startX + 150, y);
                    doc.text('Ayat', startX + 250, y);
                    doc.text('Keterangan', startX + 320, y);
                    y += 20;
                    doc.font('Helvetica');
                }
                
                const keterangan = row.nilai >= 85 ? 'Lancar' : 'Kurang Lancar';
                doc.text((i+1).toString(), startX, y);
                doc.text(row.nama || '-', startX + 40, y);
                doc.text(row.surah || '-', startX + 150, y);
                doc.text(row.ayat || '-', startX + 250, y);
                doc.text(keterangan, startX + 320, y);
                y += 18;
            });
            
            doc.end();
        });
    });
});

// ============ HALAMAN UTAMA ============
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ START SERVER ============
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server nyala di port ${PORT}`);
    console.log(`🌐 https://aplikasi-setoran-santri-github.onrender.com`);
});
