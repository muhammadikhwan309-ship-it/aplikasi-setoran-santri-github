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

// ============ FITUR PDF REKAP HARIAN (TANPA HALAMAN KOSONG) ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.query(`
        SELECT * FROM setoran
        WHERE DATE(created_at) = ? 
        ORDER BY created_at DESC
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
        
        // ===== KONSTANTA TABEL =====
        const colPos = [40, 100, 220, 350, 450];
        const headers = ['No', 'Nama', 'Surah', 'Ayat', 'Keterangan'];
        
        // Header tabel dengan background abu-abu
        doc.rect(35, doc.y - 3, 530, 20).fill('#e8e8e8');
        doc.fillColor('#000000');
        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
            doc.text(header, colPos[i], doc.y);
        });
        doc.moveTo(35, doc.y + 17).lineTo(565, doc.y + 17).lineWidth(0.5).stroke();
        
        let yPosition = doc.y + 25;
        let rowCount = 0;
        
        rows.forEach((row, index) => {
            // Cek apakah perlu halaman baru
            if (yPosition > 750) {
                doc.addPage();
                yPosition = 50;
                rowCount = 0;
                
                // Redraw header di halaman baru
                doc.rect(35, yPosition - 3, 530, 20).fill('#e8e8e8');
                doc.fillColor('#000000');
                doc.fontSize(9).font('Helvetica-Bold');
                headers.forEach((header, i) => {
                    doc.text(header, colPos[i], yPosition);
                });
                doc.moveTo(35, yPosition + 17).lineTo(565, yPosition + 17).lineWidth(0.5).stroke();
                yPosition = yPosition + 25;
            }
            
            let keterangan = row.nilai >= 85 ? '✅ Lancar' : '⚠️ Kurang Lancar';
            
            doc.fontSize(9).font('Helvetica');
            doc.text((index + 1).toString(), colPos[0], yPosition);
            doc.text(row.nama || '-', colPos[1], yPosition, { width: 110 });
            doc.text(row.surah || '-', colPos[2], yPosition, { width: 120 });
            
            // Handle ayat yang mungkin undefined
            let ayatText = row.ayat || '-';
            doc.text(ayatText, colPos[3], yPosition, { width: 90 });
            doc.text(keterangan, colPos[4], yPosition);
            
            yPosition += 20;
            rowCount++;
        });
        
        // Hanya gambar garis penutup jika ada baris
        if (rows.length > 0) {
            doc.moveTo(35, yPosition + 2).lineTo(565, yPosition + 2).stroke();
        }
        
        // Footer hanya di halaman terakhir
        if (!doc.page.width) {
            const pageHeight = doc.page.height;
            doc.fontSize(8).font('Helvetica');
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 35, pageHeight - 40);
            doc.text('MI Hidayatul Mubtadiien - Bangil, Pasuruan', 35, pageHeight - 25, { align: 'center', width: 530 });
        } else {
            const pageHeight = doc.page.height;
            doc.fontSize(8).font('Helvetica');
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 35, pageHeight - 40);
            doc.text('MI Hidayatul Mubtadiien - Bangil, Pasuruan', 35, pageHeight - 25, { align: 'center', width: 530 });
        }
        
        doc.end();
    });
});
// ============ FITUR PDF REKAP HARIAN (FIXED) ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.query(`SELECT * FROM setoran WHERE DATE(created_at) = ? ORDER BY created_at ASC`, [today], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Tidak ada data setoran hari ini");
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_harian_${today}.pdf`);
        doc.pipe(res);

        // ===== LOGO =====
        const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
        let headerStartY = 40;
        if (fs.existsSync(logoPath)) {
            const logoWidth = 65;
            const logoX = (doc.page.width - logoWidth) / 2;
            doc.image(logoPath, logoX, headerStartY, { width: logoWidth });
            headerStartY += 75; // tinggi logo + sedikit gap
        }

        // ===== HEADER =====
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('MI HIDAYATUL MUBTADIEN', 50, headerStartY, { align: 'center', width: doc.page.width - 100 });

        doc.fontSize(12).font('Helvetica');
        doc.text('LAPORAN SETORAN SISWA', 50, headerStartY + 22, { align: 'center', width: doc.page.width - 100 });

        const formattedDate = new Date(today + 'T00:00:00')
            .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.fontSize(10);
        doc.text(formattedDate, 50, headerStartY + 42, { align: 'center', width: doc.page.width - 100 });

        // Garis bawah header
        const lineY = headerStartY + 62;
        doc.moveTo(35, lineY).lineTo(560, lineY).lineWidth(1).stroke();

        // ===== TABEL =====
        const startX = 35;
        const colWidths = [25, 130, 130, 100, 140]; // No, Nama, Surah, Ayat, Keterangan
        const colX = colWidths.reduce((acc, w, i) => {
            acc.push(i === 0 ? startX : acc[i-1] + colWidths[i-1]);
            return acc;
        }, []);
        const tableWidth = colWidths.reduce((a, b) => a + b, 0); // 525
        const rowHeight = 18;
        const headerLabels = ['No', 'Nama', 'Surah', 'Ayat', 'Keterangan'];

        const drawTableHeader = (y) => {
            // Background abu-abu header
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

            // Zebra stripe
            if (index % 2 === 1) {
                doc.rect(startX, currentY, tableWidth, rowHeight).fill('#f5f5f5');
                doc.fillColor('#000000');
            }

            const keterangan = row.nilai >= 85 ? 'Lancar' : 'Kurang Lancar';
            const textY = currentY + 5;

            doc.text((index + 1).toString(), colX[0] + 3, textY, { width: colWidths[0] - 6, lineBreak: false });
            doc.text(row.nama || '-',          colX[1] + 3, textY, { width: colWidths[1] - 6, lineBreak: false });
            doc.text(row.surah || '-',         colX[2] + 3, textY, { width: colWidths[2] - 6, lineBreak: false });
            doc.text(row.ayat || '-',          colX[3] + 3, textY, { width: colWidths[3] - 6, lineBreak: false });
            doc.text(keterangan,                 colX[4] + 3, textY, { width: colWidths[4] - 6, lineBreak: false });

            currentY += rowHeight;
        });

        // Garis bawah tabel
        doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).lineWidth(0.5).stroke();

        // ===== FOOTER (di bawah tabel, bukan di pageHeight) =====
        doc.fontSize(8).font('Helvetica').fillColor('#555555');
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, startX, currentY + 10);
        doc.text('MI Hidayatul Mubtadiien - Bangil, Pasuruan', startX, currentY + 20,
            { width: tableWidth, align: 'center' });

        doc.end();
    });
});

// ============ HAPUS REKAPAN PER BULAN ============
app.delete("/api/hapus-rekapan-bulan/:tahun/:bulan", (req, res) => {
    const tahun = req.params.tahun;
    const bulan = req.params.bulan;
    
    const startDate = `${tahun}-${bulan}-01`;
    const endDate = `${tahun}-${bulan}-31`;
    
    db.query("DELETE FROM setoran WHERE DATE(created_at) BETWEEN ? AND ?", [startDate, endDate], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Gagal menghapus rekapan" });
        }
        res.json({ message: `Berhasil menghapus ${result.affectedRows} data setoran ${bulan}/${tahun}` });
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
