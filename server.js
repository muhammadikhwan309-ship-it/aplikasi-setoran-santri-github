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

// ============ PERBAIKI DAN INISIALISASI DATABASE MULTI-SEKOLAH ============
const fixDatabase = () => {
    console.log("🔧 Memeriksa struktur database multi-sekolah...");
    
    // Tambah kolom sekolah_id jika belum ada
    db.query("ALTER TABLE data_santri ADD COLUMN IF NOT EXISTS sekolah_id VARCHAR(50) DEFAULT 'MI001'", (err) => {
        if (err) console.log("Info data_santri:", err?.message);
        else console.log("✅ Kolom sekolah_id OK di data_santri");
    });
    
    db.query("ALTER TABLE setoran ADD COLUMN IF NOT EXISTS sekolah_id VARCHAR(50) DEFAULT 'MI001'", (err) => {
        if (err) console.log("Info setoran:", err?.message);
        else console.log("✅ Kolom sekolah_id OK di setoran");
    });
    
    // Buat tabel daftar_sekolah
    db.query(`CREATE TABLE IF NOT EXISTS daftar_sekolah (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_sekolah VARCHAR(50) UNIQUE NOT NULL,
        nama_sekolah VARCHAR(255) NOT NULL,
        alamat TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error:", err?.message);
        else console.log("✅ Tabel daftar_sekolah siap");
    });
    
    // Buat tabel data_santri
    db.query(`CREATE TABLE IF NOT EXISTS data_santri (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_santri VARCHAR(255) NOT NULL,
        nomor_wa_orangtua VARCHAR(20),
        sekolah_id VARCHAR(50) DEFAULT 'MI001'
    )`, (err) => {
        if (err) console.error("Error:", err?.message);
        else console.log("✅ Tabel data_santri siap");
    });
    
    // Buat tabel setoran
    db.query(`CREATE TABLE IF NOT EXISTS setoran (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        nomor_wa VARCHAR(20),
        surah VARCHAR(100),
        ayat VARCHAR(50),
        nilai INT,
        keterangan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sekolah_id VARCHAR(50) DEFAULT 'MI001'
    )`, (err) => {
        if (err) console.error("Error:", err?.message);
        else console.log("✅ Tabel setoran siap");
    });
    
    // Masukkan sekolah default (MI001)
    db.query(`INSERT IGNORE INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) 
        VALUES ('MI001', 'MI HIDAYATUL MUBTADIEN', 'Bangil, Pasuruan')`, (err) => {
        if (err) console.error("❌ Error insert MI001:", err.message);
        else console.log("✅ Sekolah MI Hidayatul Mubtadien (MI001) siap!");
    });
    
    // 🆕 Masukkan sekolah TPQ Wali Songo
    db.query(`INSERT IGNORE INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) 
        VALUES ('TPQ002', 'TPQ Wali Songo', 'Ketapan, Rembang')`, (err) => {
        if (err) console.error("❌ Error insert TPQ002:", err.message);
        else console.log("✅ Sekolah TPQ Wali Songo (TPQ002) siap!");
    });
};

// Jalankan perbaikan database setelah koneksi siap
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
    
    console.log("📝 Data santri masuk:", { nama_santri, nomor_wa_orangtua, sekolah_id });
    
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    if (!nama_santri || !nomor_wa_orangtua) {
        return res.status(400).json({ message: "Nama santri dan nomor WA wajib diisi" });
    }
    
    db.query(
        "INSERT INTO data_santri (nama_santri, nomor_wa_orangtua, sekolah_id) VALUES (?, ?, ?)",
        [nama_santri, nomor_wa_orangtua, sekolah_id],
        (err, result) => {
            if (err) {
                console.error("❌ Error insert:", err.message);
                return res.status(500).json({ message: "Gagal", error: err.message });
            }
            console.log("✅ Santri berhasil ditambah, ID:", result.insertId);
            res.json({ message: "Sukses", id: result.insertId });
        }
    );
});

// Edit nomor WA santri
app.put("/api/santri/:id", (req, res) => {
    const id = req.params.id;
    const { nomor_wa_orangtua, sekolah_id } = req.body;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    if (!nomor_wa_orangtua) return res.status(400).json({ message: "Nomor WA diperlukan" });

    db.query(
        "UPDATE data_santri SET nomor_wa_orangtua = ? WHERE id = ? AND sekolah_id = ?",
        [nomor_wa_orangtua, id, sekolah_id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Gagal update", error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Santri tidak ditemukan" });
            res.json({ message: "Nomor WA berhasil diupdate" });
        }
    );
});

app.delete("/api/santri/:id", (req, res) => {
    const id = req.params.id;
    const { sekolah_id } = req.query;
    
    db.query("SELECT nama_santri FROM data_santri WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal cari santri" });
        if (rows.length === 0) return res.status(404).json({ message: "Santri tidak ditemukan" });
        
        const namaSantri = rows[0].nama_santri;
        
        db.query("DELETE FROM setoran WHERE nama = ? AND sekolah_id = ?", [namaSantri, sekolah_id], (err) => {
            if (err) console.error("Gagal hapus setoran:", err);
            
            db.query("DELETE FROM data_santri WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err) => {
                if (err) return res.status(500).json({ message: "Gagal hapus santri" });
                res.json({ message: "Santri dan semua setorannya berhasil dihapus" });
            });
        });
    });
});

// ============ API SETORAN ============
app.post("/api/setoran", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan, sekolah_id } = req.body;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    const sql = "INSERT INTO setoran (nama, nomor_wa, surah, ayat, nilai, keterangan, sekolah_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan, sekolah_id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json({ message: "Sukses" });
    });
});

// ============ API FILTER SETORAN ============
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

app.delete("/api/setoran/:id", (req, res) => {
    const id = req.params.id;
    const { sekolah_id } = req.query;
    db.query("DELETE FROM setoran WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus" });
        res.json({ message: "Berhasil" });
    });
});

// ============ API DASHBOARD ============
app.get("/api/dashboard", (req, res) => {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    const sql = `SELECT 
        nama, 
        COUNT(*) as total_setoran, 
        ROUND(AVG(nilai), 1) as rata_rata, 
        MAX(nilai) as nilai_tertinggi, 
        MIN(nilai) as nilai_terendah,
        MAX(DATE(created_at)) as terakhir_setor,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as setoran_hari_ini
    FROM setoran 
    WHERE sekolah_id = ?
    GROUP BY nama 
    ORDER BY rata_rata DESC`;
    
    db.query(sql, [sekolah_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err });
        res.json(rows);
    });
});

// ============ API SEKOLAH ============
app.get("/api/sekolah/cek/:kode", (req, res) => {
    const kode = req.params.kode.toUpperCase();
    db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [kode], (err, rows) => {
        if (err) return res.status(500).json({ valid: false, error: err.message });
        if (rows.length > 0) {
            res.json({ valid: true, nama_sekolah: rows[0].nama_sekolah, alamat: rows[0].alamat });
        } else {
            res.json({ valid: false });
        }
    });
});

app.get("/api/sekolah/info/:kode", (req, res) => {
    const kode = req.params.kode.toUpperCase();
    db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [kode], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error", error: err.message });
        if (rows.length === 0) return res.status(404).json({ message: "Sekolah tidak ditemukan" });
        res.json(rows[0]);
    });
});

// Daftar semua sekolah (untuk admin)
app.get("/api/sekolah/semua", (req, res) => {
    db.query("SELECT kode_sekolah, nama_sekolah, alamat FROM daftar_sekolah ORDER BY kode_sekolah", (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json(rows);
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
        
        db.query("SELECT nama_sekolah, alamat FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (err, sekolahRow) => {
            const namaSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            const alamat = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].alamat : '';
            
            doc.fontSize(16).font('Helvetica-Bold').text(namaSekolah, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(alamat, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text('LAPORAN SETORAN HARIAN', { align: 'center' });
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
// ============ FITUR PDF REKAP BULANAN ============
app.get("/api/rekap-bulan-pdf/:tahun/:bulan", (req, res) => {
    const tahun = req.params.tahun;
    const bulan = req.params.bulan;
    const { sekolah_id } = req.query;
    
    if (!sekolah_id) return res.status(400).send("Sekolah ID diperlukan");
    
    const startDate = `${tahun}-${bulan}-01`;
    const endDate = `${tahun}-${bulan}-31`;
    
    db.query(`SELECT * FROM setoran WHERE DATE(created_at) BETWEEN ? AND ? AND sekolah_id = ? ORDER BY created_at ASC`, 
        [startDate, endDate, sekolah_id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Tidak ada data setoran di bulan ini");
        }
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const namaBulan = new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long' });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_bulan_${tahun}_${bulan}.pdf`);
        doc.pipe(res);
        
        db.query("SELECT nama_sekolah, alamat FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (errSekolah, sekolahRow) => {
            const namaSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            const alamat = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].alamat : '';
            
            // Header
            doc.fontSize(16).font('Helvetica-Bold').text(namaSekolah, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(alamat, { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).font('Helvetica-Bold').text('LAPORAN SETORAN BULANAN', { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`${namaBulan} ${tahun}`, { align: 'center' });
            doc.moveDown();
            
            // Tabel
            const startX = 50;
            let y = doc.y;
            
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('No', startX, y);
            doc.text('Nama', startX + 40, y);
            doc.text('Surah', startX + 150, y);
            doc.text('Ayat', startX + 250, y);
            doc.text('Tgl', startX + 320, y);
            doc.text('Ket', startX + 380, y);
            
            y += 20;
            doc.font('Helvetica');
            
            let no = 1;
            rows.forEach((row, i) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    doc.font('Helvetica-Bold');
                    doc.text('No', startX, y);
                    doc.text('Nama', startX + 40, y);
                    doc.text('Surah', startX + 150, y);
                    doc.text('Ayat', startX + 250, y);
                    doc.text('Tgl', startX + 320, y);
                    doc.text('Ket', startX + 380, y);
                    y += 20;
                    doc.font('Helvetica');
                }
                
                const tanggal = new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                const keterangan = row.nilai >= 85 ? 'Lancar' : 'Kurang';
                
                doc.text(no.toString(), startX, y);
                doc.text(row.nama || '-', startX + 40, y);
                doc.text(row.surah || '-', startX + 150, y);
                doc.text(row.ayat || '-', startX + 250, y);
                doc.text(tanggal, startX + 320, y);
                doc.text(keterangan, startX + 380, y);
                y += 18;
                no++;
            });
            
            // Footer
            doc.moveDown();
            doc.fontSize(9);
            doc.text(`Total Setoran: ${rows.length} kali`, startX, y + 10);
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, startX, y + 25);
            
            doc.end();
        });
    });
});

// ============ HAPUS REKAPAN PER BULAN ============
app.delete("/api/hapus-rekapan-bulan/:tahun/:bulan", (req, res) => {
    const tahun = req.params.tahun;
    const bulan = req.params.bulan;
    const { sekolah_id } = req.query;
    
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    const startDate = `${tahun}-${bulan}-01`;
    const endDate = `${tahun}-${bulan}-31`;
    
    db.query("DELETE FROM setoran WHERE DATE(created_at) BETWEEN ? AND ? AND sekolah_id = ?", 
        [startDate, endDate, sekolah_id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Gagal menghapus rekapan", error: err.message });
        }
        res.json({ message: `Berhasil menghapus ${result.affectedRows} data setoran ${bulan}/${tahun}` });
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
    console.log(`🏫 Sekolah tersedia: MI001 dan TPQ002`);
});
