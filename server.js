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

// ============ UPDATE NOMOR WA SANTRI ============
app.put("/api/santri/:id", (req, res) => {
    const id = req.params.id;
    const { nomor_wa_orangtua } = req.body;
    db.query("UPDATE data_santri SET nomor_wa_orangtua = ? WHERE id = ?", [nomor_wa_orangtua, id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal update" });
        res.json({ message: "Berhasil update" });
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

// ============ HAPUS SETORAN PER ID ============
app.delete("/api/setoran/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM setoran WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus setoran" });
        res.json({ message: "Berhasil hapus setoran" });
    });
});

// ============ FILTER SETORAN ============
app.get("/api/setoran/filter", (req, res) => {
    const { santri, surah, tanggal_mulai, tanggal_sampai } = req.query;

    let sql = "SELECT * FROM setoran WHERE 1=1";
    const params = [];

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
        if (err) return res.status(500).json({ message: "Gagal filter", error: err });
        res.json(rows);
    });
});

// ============ API DASHBOARD ============
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

// ============ HAPUS SEMUA SETORAN SATU SANTRI ============
app.delete("/api/dashboard/hapus/:nama", (req, res) => {
    const nama = req.params.nama;
    db.query("DELETE FROM setoran WHERE nama = ?", [nama], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus" });
        res.json({ message: "Berhasil hapus semua setoran" });
    });
});

// ============ HAPUS REKAPAN PER BULAN ============
app.delete("/api/hapus-rekapan-bulan/:tahun/:bulan", (req, res) => {
    const tahun = req.params.tahun;
    const bulan = String(req.params.bulan).padStart(2, '0');

    const startDate = `${tahun}-${bulan}-01`;
    const endDate = `${tahun}-${bulan}-31`;

    db.query("DELETE FROM setoran WHERE DATE(created_at) BETWEEN ? AND ?", [startDate, endDate], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus rekapan" });
        res.json({ message: `Berhasil menghapus ${result.affectedRows} data setoran ${bulan}/${tahun}` });
    });
});

// ============ PDF REKAP HARIAN ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.query(
        `SELECT * FROM setoran WHERE DATE(created_at) = ? ORDER BY created_at ASC`,
        [today],
        (err, rows) => {
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
                headerStartY += 75;
            }

            // ===== HEADER =====
            const contentWidth = doc.page.width - 100;
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('MI HIDAYATUL MUBTADIEN', 50, headerStartY, { align: 'center', width: contentWidth });

            doc.fontSize(12).font('Helvetica');
            doc.text('LAPORAN SETORAN SISWA', 50, headerStartY + 22, { align: 'center', width: contentWidth });

            const formattedDate = new Date(today + 'T00:00:00')
                .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.fontSize(10);
            doc.text(formattedDate, 50, headerStartY + 42, { align: 'center', width: contentWidth });

            // Garis bawah header
            const lineY = headerStartY + 62;
            doc.moveTo(35, lineY).lineTo(560, lineY).lineWidth(1).stroke();

            // ===== TABEL =====
            const startX = 35;
            const colWidths = [25, 130, 130, 100, 140]; // No, Nama, Surah, Ayat, Keterangan
            const colX = colWidths.reduce((acc, w, i) => {
                acc.push(i === 0 ? startX : acc[i - 1] + colWidths[i - 1]);
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

                // Zebra stripe
                if (index % 2 === 1) {
                    doc.rect(startX, currentY, tableWidth, rowHeight).fill('#f5f5f5');
                    doc.fillColor('#000000');
                }

                const keterangan = row.nilai >= 85 ? 'Lancar' : 'Kurang Lancar';
                const textY = currentY + 5;

                doc.text((index + 1).toString(), colX[0] + 3, textY, { width: colWidths[0] - 6, lineBreak: false });
                doc.text(row.nama  || '-', colX[1] + 3, textY, { width: colWidths[1] - 6, lineBreak: false });
                doc.text(row.surah || '-', colX[2] + 3, textY, { width: colWidths[2] - 6, lineBreak: false });
                doc.text(row.ayat  || '-', colX[3] + 3, textY, { width: colWidths[3] - 6, lineBreak: false });
                doc.text(keterangan,        colX[4] + 3, textY, { width: colWidths[4] - 6, lineBreak: false });

                currentY += rowHeight;
            });

            // Garis penutup tabel
            doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).lineWidth(0.5).stroke();

            // ===== FOOTER (langsung di bawah tabel, bukan di pageHeight) =====
            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, startX, currentY + 10);
            doc.text('MI Hidayatul Mubtadiien - Bangil, Pasuruan', startX, currentY + 20,
                { width: tableWidth, align: 'center' });

            doc.end();
        }
    );
});

// ============ PDF REKAP BULANAN ============
app.get("/api/rekap-pdf-bulanan", (req, res) => {
    const { tahun, bulan } = req.query;
    if (!tahun || !bulan) return res.status(400).send("Parameter tahun dan bulan diperlukan");

    const bulanPad = String(bulan).padStart(2, '0');
    const startDate = `${tahun}-${bulanPad}-01`;
    const endDate   = `${tahun}-${bulanPad}-31`;

    const namaBulan = new Date(`${tahun}-${bulanPad}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    db.query(
        `SELECT * FROM setoran WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at ASC`,
        [startDate, endDate],
        (err, rows) => {
            if (err || rows.length === 0) {
                return res.status(404).send("Tidak ada data setoran pada bulan tersebut");
            }

            const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=rekap_bulanan_${tahun}_${bulanPad}.pdf`);
            doc.pipe(res);

            // ===== LOGO =====
            const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
            let headerStartY = 40;
            if (fs.existsSync(logoPath)) {
                const logoWidth = 65;
                const logoX = (doc.page.width - logoWidth) / 2;
                doc.image(logoPath, logoX, headerStartY, { width: logoWidth });
                headerStartY += 75;
            }

            // ===== HEADER =====
            const contentWidth = doc.page.width - 100;
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('MI HIDAYATUL MUBTADIEN', 50, headerStartY, { align: 'center', width: contentWidth });

            doc.fontSize(12).font('Helvetica');
            doc.text('LAPORAN SETORAN SISWA BULANAN', 50, headerStartY + 22, { align: 'center', width: contentWidth });

            doc.fontSize(10);
            doc.text(namaBulan, 50, headerStartY + 42, { align: 'center', width: contentWidth });

            const lineY = headerStartY + 62;
            doc.moveTo(35, lineY).lineTo(560, lineY).lineWidth(1).stroke();

            // ===== TABEL =====
            const startX = 35;
            const colWidths = [25, 110, 100, 100, 80, 110];
            const colX = colWidths.reduce((acc, w, i) => {
                acc.push(i === 0 ? startX : acc[i - 1] + colWidths[i - 1]);
                return acc;
            }, []);
            const tableWidth = colWidths.reduce((a, b) => a + b, 0);
            const rowHeight = 18;
            const headerLabels = ['No', 'Nama', 'Surah', 'Ayat', 'Nilai', 'Keterangan'];

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

                doc.text((index + 1).toString(), colX[0] + 3, textY, { width: colWidths[0] - 6, lineBreak: false });
                doc.text(row.nama  || '-', colX[1] + 3, textY, { width: colWidths[1] - 6, lineBreak: false });
                doc.text(row.surah || '-', colX[2] + 3, textY, { width: colWidths[2] - 6, lineBreak: false });
                doc.text(row.ayat  || '-', colX[3] + 3, textY, { width: colWidths[3] - 6, lineBreak: false });
                doc.text(String(row.nilai ?? '-'), colX[4] + 3, textY, { width: colWidths[4] - 6, lineBreak: false });
                doc.text(keterangan, colX[5] + 3, textY, { width: colWidths[5] - 6, lineBreak: false });

                currentY += rowHeight;
            });

            doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).lineWidth(0.5).stroke();

            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, startX, currentY + 10);
            doc.text('MI Hidayatul Mubtadiien - Bangil, Pasuruan', startX, currentY + 20,
                { width: tableWidth, align: 'center' });

            doc.end();
        }
    );
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
