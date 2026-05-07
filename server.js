const express = require("express");
const cors = require("cors");
const db = require("./db");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// ============ API MULTI-SEKOLAH ============

// Daftar sekolah baru
app.post("/api/sekolah/daftar", (req, res) => {
    const { nama_sekolah, alamat, kode_sekolah } = req.body;
    
    if (!nama_sekolah || !kode_sekolah) {
        return res.status(400).json({ message: "Nama sekolah dan kode wajib diisi" });
    }
    
    db.query("INSERT INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) VALUES (?, ?, ?)", 
        [kode_sekolah.toUpperCase(), nama_sekolah, alamat || ''], 
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: "Kode sekolah sudah dipakai" });
                }
                return res.status(500).json({ message: "Gagal daftar sekolah" });
            }
            res.json({ message: "Sekolah berhasil didaftarkan", kode_sekolah: kode_sekolah.toUpperCase() });
        });
});

// Cek kode sekolah valid
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

// Get info sekolah
app.get("/api/sekolah/info/:kode", (req, res) => {
    const kode = req.params.kode.toUpperCase();
    db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [kode], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).json({ message: "Sekolah tidak ditemukan" });
        res.json(rows[0]);
    });
});

// ============ API SANTRI (per sekolah) ============
app.get("/api/santri", (req, res) => {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    db.query("SELECT * FROM data_santri WHERE sekolah_id = ? ORDER BY nama_santri ASC", [sekolah_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal" });
        res.json(rows);
    });
});

app.post("/api/santri", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, sekolah_id } = req.body;
    console.log("Received data:", { nama_santri, nomor_wa_orangtua, sekolah_id });
    
    if (!sekolah_id) {
        return res.status(400).json({ message: "Sekolah ID diperlukan" });
    }
    
    if (!nama_santri || !nomor_wa_orangtua) {
        return res.status(400).json({ message: "Nama santri dan nomor WA wajib diisi" });
    }
    
    db.query(
        "INSERT INTO data_santri (nama_santri, nomor_wa_orangtua, sekolah_id) VALUES (?, ?, ?)", 
        [nama_santri, nomor_wa_orangtua, sekolah_id], 
        (err, result) => {
            if (err) {
                console.error("Database error detail:", err);
                return res.status(500).json({ 
                    message: "Gagal", 
                    error: err.message,
                    sql: err.sql 
                });
            }
            console.log("Insert success, ID:", result.insertId);
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
            if (err) return res.status(500).json({ message: "Gagal update" });
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
        if (err) return res.status(500).json({ message: "Gagal" });
        res.json({ message: "Sukses" });
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

app.delete("/api/dashboard/hapus/:nama", (req, res) => {
    const nama = req.params.nama;
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    db.query("DELETE FROM setoran WHERE nama = ? AND sekolah_id = ?", [nama, sekolah_id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus" });
        res.json({ message: "Berhasil hapus semua setoran" });
    });
});

// ============ API FILTER SETORAN ============
app.get("/api/setoran/filter", (req, res) => {
    const { santri, surah, tanggal_mulai, tanggal_sampai, sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    let sql = "SELECT * FROM setoran WHERE sekolah_id = ?";
    let params = [sekolah_id];
    
    if (santri) {
        sql += " AND nama = ?";
        params.push(santri);
    }
    if (surah) {
        sql += " AND surah = ?";
        params.push(surah);
    }
    if (tanggal_mulai) {
        sql += " AND DATE(created_at) >= ?";
        params.push(tanggal_mulai);
    }
    if (tanggal_sampai) {
        sql += " AND DATE(created_at) <= ?";
        params.push(tanggal_sampai);
    }
    
    sql += " ORDER BY created_at DESC";
    
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal" });
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

// ============ FITUR PDF REKAP HARIAN ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).send("Sekolah ID diperlukan");
    
    db.query(`SELECT * FROM setoran WHERE DATE(created_at) = ? AND sekolah_id = ? ORDER BY created_at ASC`, 
        [today, sekolah_id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Tidak ada data setoran hari ini");
        }
        
        const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_harian_${today}.pdf`);
        doc.pipe(res);
        
        // Ambil info sekolah
        db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (errSekolah, sekolahRow) => {
            const namaSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            const alamatSekolah = (sekolahRow && sekolahRow[0] && sekolahRow[0].alamat) ? sekolahRow[0].alamat : '';
            
            // Logo
            const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
            let headerStartY = 40;
            if (fs.existsSync(logoPath)) {
                const logoWidth = 65;
                const logoX = (doc.page.width - logoWidth) / 2;
                doc.image(logoPath, logoX, headerStartY, { width: logoWidth });
                headerStartY += 75;
            }
        
            // Header
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text(namaSekolah.toUpperCase(), 50, headerStartY, { align: 'center', width: doc.page.width - 100 });
        
            doc.fontSize(12).font('Helvetica');
            doc.text('LAPORAN SETORAN SISWA', 50, headerStartY + 22, { align: 'center', width: doc.page.width - 100 });
        
            const formattedDate = new Date(today + 'T00:00:00')
                .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.fontSize(10);
            doc.text(formattedDate, 50, headerStartY + 42, { align: 'center', width: doc.page.width - 100 });
        
            const lineY = headerStartY + 62;
            doc.moveTo(35, lineY).lineTo(560, lineY).lineWidth(1).stroke();
        
            // Tabel
            const startX = 35;
            const colWidths = [25, 130, 130, 100, 140];
            const colX = colWidths.reduce((acc, w, i) => {
                acc.push(i === 0 ? startX : acc[i-1] + colWidths[i-1]);
                return acc;
            }, []);
            const tableWidth = colWidths.reduce((a, b) => a + b, 0);
            const rowHeight = 18;
            const headerLabels = ['No', 'Nama', 'Surah', 'Ayat', 'Keterangan'];
        
            const drawTableHeader = (y) => {
                doc.rect(startX, y, tableWidth, rowHeight).fill('#e8e8e8');
                doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
                headerLabels.forEach((label, i) => {
                    doc.text(label, colX[i] + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false });
                });
                return y + rowHeight;
            };
        
            let currentY = drawTableHeader(lineY + 10);
            doc.fontSize(9).font('Helvetica');
        
            rows.forEach((row, index) => {
                if (currentY + rowHeight > 780) {
                    doc.addPage();
                    currentY = drawTableHeader(50);
                    doc.fontSize(9).font('Helvetica');
                }
        
                if (index % 2 === 1) {
                    doc.rect(startX, currentY, tableWidth, rowHeight).fill('#f5f5f5');
                    doc.fillColor('#000000');
                }
        
                const keterangan = row.nilai >= 85 ? 'Lancar' : 'Kurang Lancar';
                const textY = currentY + 5;
        
                doc.text((index + 1).toString(), colX[0] + 3, textY, { width: colWidths[0] - 6 });
                doc.text(row.nama || '-', colX[1] + 3, textY, { width: colWidths[1] - 6 });
                doc.text(row.surah || '-', colX[2] + 3, textY, { width: colWidths[2] - 6 });
                doc.text(row.ayat || '-', colX[3] + 3, textY, { width: colWidths[3] - 6 });
                doc.text(keterangan, colX[4] + 3, textY, { width: colWidths[4] - 6 });
        
                currentY += rowHeight;
            });
        
            doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).lineWidth(0.5).stroke();
        
            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, startX, currentY + 10);
            if (alamatSekolah) {
                doc.text(alamatSekolah, startX, currentY + 20, { width: tableWidth, align: 'center' });
            }
        
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
        
        db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (errSekolah, sekolahRow) => {
            const namaSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            
            const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
            let headerStartY = 40;
            if (fs.existsSync(logoPath)) {
                const logoWidth = 65;
                const logoX = (doc.page.width - logoWidth) / 2;
                doc.image(logoPath, logoX, headerStartY, { width: logoWidth });
                headerStartY += 75;
            }
            
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text(namaSekolah.toUpperCase(), 50, headerStartY, { align: 'center', width: doc.page.width - 100 });
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica');
            doc.text('LAPORAN SETORAN BULANAN', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(`Bulan: ${namaBulan} ${tahun}`, { align: 'center' });
            doc.moveDown(1.5);
            
            const colPos = [40, 100, 200, 300, 400, 480];
            const headers = ['No', 'Nama', 'Surah', 'Ayat', 'Tgl', 'Ket'];
            
            doc.rect(35, doc.y - 3, 530, 20).fill('#e8e8e8');
            doc.fillColor('#000000');
            doc.fontSize(8).font('Helvetica-Bold');
            headers.forEach((header, i) => {
                doc.text(header, colPos[i], doc.y);
            });
            doc.moveTo(35, doc.y + 17).lineTo(565, doc.y + 17).stroke();
            
            let y = doc.y + 25;
            let no = 1;
            let rowCounter = 0;
            const maxRowsPerPage = 30;
            let currentPage = 1;
            
            rows.forEach((row) => {
                if (rowCounter >= maxRowsPerPage) {
                    doc.addPage();
                    y = 50;
                    rowCounter = 0;
                    currentPage++;
                    
                    doc.rect(35, y - 3, 530, 20).fill('#e8e8e8');
                    doc.fillColor('#000000');
                    doc.fontSize(8).font('Helvetica-Bold');
                    headers.forEach((header, i) => {
                        doc.text(header, colPos[i], y);
                    });
                    doc.moveTo(35, y + 17).lineTo(565, y + 17).stroke();
                    y += 25;
                }
                
                const tanggal = new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                let keterangan = row.nilai >= 85 ? '✅ Lancar' : '⚠️ Kurang';
                
                doc.fontSize(8).font('Helvetica');
                doc.text(no.toString(), colPos[0], y);
                doc.text(row.nama || '-', colPos[1], y, { width: 90 });
                doc.text(row.surah || '-', colPos[2], y, { width: 90 });
                doc.text(row.ayat || '-', colPos[3], y, { width: 90 });
                doc.text(tanggal, colPos[4], y);
                doc.text(keterangan, colPos[5], y);
                
                y += 18;
                no++;
                rowCounter++;
            });
            
            doc.moveTo(35, y + 2).lineTo(565, y + 2).stroke();
            
            const pageHeight = doc.page.height;
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text(`Total Setoran: ${rows.length} kali`, 35, pageHeight - 50);
            doc.fontSize(8);
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')} | Halaman ${currentPage}`, 35, pageHeight - 35);
            
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
            return res.status(500).json({ message: "Gagal menghapus rekapan" });
        }
        res.json({ message: `Berhasil menghapus ${result.affectedRows} data setoran ${bulan}/${tahun}` });
    });
});

// ============ DATABASE INIT ============
const initDB = () => {
    // Buat tabel daftar_sekolah
    db.query(`CREATE TABLE IF NOT EXISTS daftar_sekolah (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        kode_sekolah VARCHAR(50) UNIQUE, 
        nama_sekolah VARCHAR(255), 
        alamat TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Buat tabel data_santri
    db.query(`CREATE TABLE IF NOT EXISTS data_santri (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        nama_santri VARCHAR(255), 
        nomor_wa_orangtua VARCHAR(20),
        sekolah_id VARCHAR(50) DEFAULT 'DEFAULT'
    )`);
    
    // Buat tabel setoran
    db.query(`CREATE TABLE IF NOT EXISTS setoran (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        nama VARCHAR(255), 
        nomor_wa VARCHAR(20), 
        surah VARCHAR(100), 
        ayat VARCHAR(50), 
        nilai INT, 
        keterangan TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sekolah_id VARCHAR(50) DEFAULT 'DEFAULT'
    )`);
    
    // Masukkan data sekolah default
    db.query(`INSERT IGNORE INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) 
        VALUES ('MI001', 'MI HIDAYATUL MUBTADIEN', 'Bangil, Pasuruan')`);
    
    console.log("Database siap dengan multi-sekolah!");
};
initDB();

// --- PENTING: TARUH PALING BAWAH ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server nyala di port ${PORT}`));
