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

app.post("/api/sekolah/daftar", (req, res) => {
    const { nama_sekolah, alamat, kode_sekolah } = req.body;
    if (!nama_sekolah || !kode_sekolah) {
        return res.status(400).json({ message: "Nama sekolah dan kode wajib diisi" });
    }
    db.query("INSERT INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) VALUES (?, ?, ?)", 
        [kode_sekolah.toUpperCase(), nama_sekolah, alamat || ''], 
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Kode sekolah sudah dipakai" });
                return res.status(500).json({ message: "Gagal daftar sekolah", error: err.message });
            }
            res.json({ message: "Sekolah berhasil didaftarkan", kode_sekolah: kode_sekolah.toUpperCase() });
        });
});

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
        if (err || rows.length === 0) return res.status(404).json({ message: "Sekolah tidak ditemukan" });
        res.json(rows[0]);
    });
});

// ============ API SANTRI ============

app.get("/api/santri", (req, res) => {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    db.query("SELECT * FROM data_santri WHERE sekolah_id = ? ORDER BY nama_santri ASC", [sekolah_id], (err, rows) => {
        if (err) {
            console.error("❌ GET /api/santri error:", err.message);
            return res.status(500).json({ message: "Gagal ambil data santri", error: err.message });
        }
        res.json(rows);
    });
});

app.post("/api/santri", (req, res) => {
    console.log("📥 POST /api/santri body:", JSON.stringify(req.body));
    
    const { nama_santri, nomor_wa_orangtua, sekolah_id } = req.body;

    if (!sekolah_id || sekolah_id === 'null' || sekolah_id === 'undefined') {
        console.error("❌ POST /api/santri: sekolah_id tidak valid:", sekolah_id);
        return res.status(400).json({ message: "Sekolah ID diperlukan. Coba logout dan login ulang." });
    }
    if (!nama_santri || nama_santri.trim() === '') {
        return res.status(400).json({ message: "Nama santri tidak boleh kosong" });
    }

    const namaClean = nama_santri.trim();
    // Potong nomor WA maksimal 30 karakter untuk keamanan
    const waClean = (nomor_wa_orangtua || '').trim().substring(0, 30);
    
    db.query(
        "INSERT INTO data_santri (nama_santri, nomor_wa_orangtua, sekolah_id) VALUES (?, ?, ?)", 
        [namaClean, waClean, sekolah_id],
        (err, result) => {
            if (err) {
                console.error("❌ POST /api/santri DB error:", err.message, "| Code:", err.code);
                return res.status(500).json({ 
                    message: "Gagal menyimpan santri: " + err.message, 
                    error: err.message,
                    code: err.code
                });
            }
            console.log("✅ Santri berhasil ditambahkan, ID:", result.insertId);
            res.json({ 
                message: "Santri berhasil ditambahkan",
                id: result.insertId,
                nama_santri: namaClean,
                nomor_wa_orangtua: waClean,
                sekolah_id
            });
        }
    );
});

app.put("/api/santri/:id", (req, res) => {
    const id = req.params.id;
    const { nomor_wa_orangtua, sekolah_id } = req.body;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    if (nomor_wa_orangtua === undefined || nomor_wa_orangtua === null) {
        return res.status(400).json({ message: "Nomor WA diperlukan" });
    }
    db.query(
        "UPDATE data_santri SET nomor_wa_orangtua = ? WHERE id = ? AND sekolah_id = ?",
        [nomor_wa_orangtua.trim().substring(0, 30), id, sekolah_id],
        (err, result) => {
            if (err) { console.error("❌ PUT /api/santri error:", err.message); return res.status(500).json({ message: "Gagal update", error: err.message }); }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Santri tidak ditemukan" });
            res.json({ message: "Nomor WA berhasil diupdate" });
        }
    );
});

app.delete("/api/santri/:id", (req, res) => {
    const id = req.params.id;
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    
    db.query("SELECT nama_santri FROM data_santri WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err, rows) => {
        if (err) { return res.status(500).json({ message: "Gagal cari santri", error: err.message }); }
        if (rows.length === 0) return res.status(404).json({ message: "Santri tidak ditemukan" });
        const namaSantri = rows[0].nama_santri;
        db.query("DELETE FROM setoran WHERE nama = ? AND sekolah_id = ?", [namaSantri, sekolah_id], () => {
            db.query("DELETE FROM data_santri WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err) => {
                if (err) { return res.status(500).json({ message: "Gagal hapus santri", error: err.message }); }
                res.json({ message: "Santri dan semua setorannya berhasil dihapus" });
            });
        });
    });
});

// ============ API SETORAN ============

app.post("/api/setoran", (req, res) => {
    console.log("📥 POST /api/setoran body:", JSON.stringify(req.body));
    const { nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan, sekolah_id } = req.body;
    
    if (!sekolah_id || sekolah_id === 'null') return res.status(400).json({ message: "Sekolah ID diperlukan" });
    if (!nama_santri || !surah || !ayat) return res.status(400).json({ message: "Nama santri, surah, dan ayat wajib diisi" });
    if (nilai === undefined || nilai === null || isNaN(parseInt(nilai))) return res.status(400).json({ message: "Nilai harus berupa angka" });
    
    const sql = "INSERT INTO setoran (nama, nomor_wa, surah, ayat, nilai, keterangan, sekolah_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [nama_santri, (nomor_wa_orangtua || '').substring(0, 30), surah, ayat, parseInt(nilai), keterangan, sekolah_id], (err, result) => {
        if (err) { console.error("❌ POST /api/setoran error:", err.message); return res.status(500).json({ message: "Gagal simpan setoran", error: err.message }); }
        res.json({ message: "Sukses", id: result.insertId });
    });
});

// ============ API DASHBOARD ============

app.get("/api/dashboard", (req, res) => {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    const sql = `SELECT nama, COUNT(*) as total_setoran, ROUND(AVG(nilai), 1) as rata_rata, 
        MAX(nilai) as nilai_tertinggi, MIN(nilai) as nilai_terendah,
        MAX(DATE(created_at)) as terakhir_setor,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as setoran_hari_ini
        FROM setoran WHERE sekolah_id = ? GROUP BY nama ORDER BY rata_rata DESC`;
    db.query(sql, [sekolah_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal", error: err.message });
        res.json(rows);
    });
});

app.delete("/api/dashboard/hapus/:nama", (req, res) => {
    const nama = req.params.nama;
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    db.query("DELETE FROM setoran WHERE nama = ? AND sekolah_id = ?", [nama, sekolah_id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus", error: err.message });
        res.json({ message: "Berhasil hapus semua setoran" });
    });
});

// ============ API FILTER SETORAN ============

app.get("/api/setoran/filter", (req, res) => {
    const { santri, surah, tanggal_mulai, tanggal_sampai, sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    let sql = "SELECT * FROM setoran WHERE sekolah_id = ?";
    let params = [sekolah_id];
    if (santri) { sql += " AND nama = ?"; params.push(santri); }
    if (surah)  { sql += " AND surah = ?"; params.push(surah); }
    if (tanggal_mulai)  { sql += " AND DATE(created_at) >= ?"; params.push(tanggal_mulai); }
    if (tanggal_sampai) { sql += " AND DATE(created_at) <= ?"; params.push(tanggal_sampai); }
    sql += " ORDER BY created_at DESC";
    db.query(sql, params, (err, rows) => {
        if (err) { console.error("❌ GET /api/setoran/filter error:", err.message); return res.status(500).json({ message: "Gagal", error: err.message }); }
        res.json(rows);
    });
});

app.delete("/api/setoran/:id", (req, res) => {
    const id = req.params.id;
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    db.query("DELETE FROM setoran WHERE id = ? AND sekolah_id = ?", [id, sekolah_id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal hapus", error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Data tidak ditemukan" });
        res.json({ message: "Berhasil" });
    });
});

// ============ PDF REKAP HARIAN ============

app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).send("Sekolah ID diperlukan");
    
    db.query(`SELECT * FROM setoran WHERE DATE(created_at) = ? AND sekolah_id = ? ORDER BY created_at ASC`, 
        [today, sekolah_id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).send("Tidak ada data setoran hari ini");
        const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_harian_${today}.pdf`);
        doc.pipe(res);
        db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (errS, sekolahRow) => {
            const namaSekolah   = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            const alamatSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].alamat : '';
            const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
            let headerStartY = 40;
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, (doc.page.width - 65) / 2, headerStartY, { width: 65 });
                headerStartY += 75;
            }
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text(namaSekolah.toUpperCase(), 50, headerStartY, { align: 'center', width: doc.page.width - 100 });
            doc.fontSize(12).font('Helvetica');
            doc.text('LAPORAN SETORAN SISWA', 50, headerStartY + 22, { align: 'center', width: doc.page.width - 100 });
            const formattedDate = new Date(today + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.fontSize(10).text(formattedDate, 50, headerStartY + 42, { align: 'center', width: doc.page.width - 100 });
            const lineY = headerStartY + 62;
            doc.moveTo(35, lineY).lineTo(560, lineY).lineWidth(1).stroke();
            const startX = 35;
            const colWidths = [25, 130, 130, 100, 140];
            const colX = colWidths.reduce((acc, w, i) => { acc.push(i === 0 ? startX : acc[i-1] + colWidths[i-1]); return acc; }, []);
            const tableWidth = colWidths.reduce((a, b) => a + b, 0);
            const rowHeight = 18;
            const headerLabels = ['No', 'Nama', 'Surah', 'Ayat', 'Keterangan'];
            const drawTableHeader = (y) => {
                doc.rect(startX, y, tableWidth, rowHeight).fill('#e8e8e8');
                doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
                headerLabels.forEach((label, i) => doc.text(label, colX[i] + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false }));
                return y + rowHeight;
            };
            let currentY = drawTableHeader(lineY + 10);
            doc.fontSize(9).font('Helvetica');
            rows.forEach((row, index) => {
                if (currentY + rowHeight > 780) { doc.addPage(); currentY = drawTableHeader(50); doc.fontSize(9).font('Helvetica'); }
                if (index % 2 === 1) { doc.rect(startX, currentY, tableWidth, rowHeight).fill('#f5f5f5'); doc.fillColor('#000000'); }
                const textY = currentY + 5;
                doc.text((index + 1).toString(), colX[0] + 3, textY, { width: colWidths[0] - 6 });
                doc.text(row.nama || '-', colX[1] + 3, textY, { width: colWidths[1] - 6 });
                doc.text(row.surah || '-', colX[2] + 3, textY, { width: colWidths[2] - 6 });
                doc.text(row.ayat || '-', colX[3] + 3, textY, { width: colWidths[3] - 6 });
                doc.text(row.nilai >= 85 ? 'Lancar' : 'Kurang Lancar', colX[4] + 3, textY, { width: colWidths[4] - 6 });
                currentY += rowHeight;
            });
            doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).lineWidth(0.5).stroke();
            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, startX, currentY + 10);
            if (alamatSekolah) doc.text(alamatSekolah, startX, currentY + 20, { width: tableWidth, align: 'center' });
            doc.end();
        });
    });
});

// ============ PDF REKAP BULANAN ============

app.get("/api/rekap-bulan-pdf/:tahun/:bulan", (req, res) => {
    const { tahun, bulan } = req.params;
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).send("Sekolah ID diperlukan");
    db.query(`SELECT * FROM setoran WHERE DATE(created_at) BETWEEN ? AND ? AND sekolah_id = ? ORDER BY created_at ASC`, 
        [`${tahun}-${bulan}-01`, `${tahun}-${bulan}-31`, sekolah_id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).send("Tidak ada data setoran di bulan ini");
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const namaBulan = new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long' });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=rekap_bulan_${tahun}_${bulan}.pdf`);
        doc.pipe(res);
        db.query("SELECT * FROM daftar_sekolah WHERE kode_sekolah = ?", [sekolah_id], (errS, sekolahRow) => {
            const namaSekolah = (sekolahRow && sekolahRow[0]) ? sekolahRow[0].nama_sekolah : 'MADRASAH';
            const logoPath = path.join(__dirname, 'public', 'images', 'logo.png');
            let headerStartY = 40;
            if (fs.existsSync(logoPath)) { doc.image(logoPath, (doc.page.width - 65) / 2, headerStartY, { width: 65 }); headerStartY += 75; }
            doc.fontSize(14).font('Helvetica-Bold').text(namaSekolah.toUpperCase(), 50, headerStartY, { align: 'center', width: doc.page.width - 100 });
            doc.moveDown(0.5).fontSize(12).font('Helvetica').text('LAPORAN SETORAN BULANAN', { align: 'center' });
            doc.moveDown(0.5).fontSize(10).text(`Bulan: ${namaBulan} ${tahun}`, { align: 'center' }).moveDown(1.5);
            const colPos = [40, 100, 200, 300, 400, 480];
            const headers = ['No', 'Nama', 'Surah', 'Ayat', 'Tgl', 'Ket'];
            doc.rect(35, doc.y - 3, 530, 20).fill('#e8e8e8').fillColor('#000000').fontSize(8).font('Helvetica-Bold');
            headers.forEach((h, i) => doc.text(h, colPos[i], doc.y));
            doc.moveTo(35, doc.y + 17).lineTo(565, doc.y + 17).stroke();
            let y = doc.y + 25, no = 1, rowCounter = 0, currentPage = 1;
            rows.forEach((row) => {
                if (rowCounter >= 30) {
                    doc.addPage(); y = 50; rowCounter = 0; currentPage++;
                    doc.rect(35, y - 3, 530, 20).fill('#e8e8e8').fillColor('#000000').fontSize(8).font('Helvetica-Bold');
                    headers.forEach((h, i) => doc.text(h, colPos[i], y));
                    doc.moveTo(35, y + 17).lineTo(565, y + 17).stroke();
                    y += 25;
                }
                const tanggal = new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                doc.fontSize(8).font('Helvetica');
                doc.text(no.toString(), colPos[0], y);
                doc.text(row.nama || '-', colPos[1], y, { width: 90 });
                doc.text(row.surah || '-', colPos[2], y, { width: 90 });
                doc.text(row.ayat || '-', colPos[3], y, { width: 90 });
                doc.text(tanggal, colPos[4], y);
                doc.text(row.nilai >= 85 ? '✅ Lancar' : '⚠️ Kurang', colPos[5], y);
                y += 18; no++; rowCounter++;
            });
            doc.moveTo(35, y + 2).lineTo(565, y + 2).stroke();
            doc.fontSize(9).font('Helvetica-Bold').text(`Total Setoran: ${rows.length} kali`, 35, doc.page.height - 50);
            doc.fontSize(8).text(`Dicetak: ${new Date().toLocaleString('id-ID')} | Halaman ${currentPage}`, 35, doc.page.height - 35);
            doc.end();
        });
    });
});

// ============ HAPUS REKAPAN PER BULAN ============

app.delete("/api/hapus-rekapan-bulan/:tahun/:bulan", (req, res) => {
    const { tahun, bulan } = req.params;
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: "Sekolah ID diperlukan" });
    db.query("DELETE FROM setoran WHERE DATE(created_at) BETWEEN ? AND ? AND sekolah_id = ?", 
        [`${tahun}-${bulan}-01`, `${tahun}-${bulan}-31`, sekolah_id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus rekapan" });
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
    )`, (err) => {
        if (err) { console.error("❌ Gagal buat tabel daftar_sekolah:", err.message); return; }
        console.log("✅ Tabel daftar_sekolah OK");

        // Buat tabel data_santri dengan VARCHAR(30) untuk nomor WA
        db.query(`CREATE TABLE IF NOT EXISTS data_santri (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            nama_santri VARCHAR(255) NOT NULL, 
            nomor_wa_orangtua VARCHAR(30) DEFAULT '',
            sekolah_id VARCHAR(50) DEFAULT 'DEFAULT'
        )`, (err) => {
            if (err) { console.error("❌ Gagal buat tabel data_santri:", err.message); return; }
            console.log("✅ Tabel data_santri OK");

            // AUTO-FIX: Jika tabel sudah ada dengan VARCHAR(20), perlebar jadi VARCHAR(30)
            db.query(`ALTER TABLE data_santri MODIFY COLUMN nomor_wa_orangtua VARCHAR(30) DEFAULT ''`, (err) => {
                if (err) console.warn("⚠️ ALTER data_santri (bisa diabaikan jika sudah benar):", err.message);
                else console.log("✅ Kolom nomor_wa_orangtua dipastikan VARCHAR(30)");
            });

            // Buat tabel setoran dengan VARCHAR(30) untuk nomor WA
            db.query(`CREATE TABLE IF NOT EXISTS setoran (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                nama VARCHAR(255), 
                nomor_wa VARCHAR(30) DEFAULT '', 
                surah VARCHAR(100), 
                ayat VARCHAR(50), 
                nilai INT, 
                keterangan TEXT, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sekolah_id VARCHAR(50) DEFAULT 'DEFAULT'
            )`, (err) => {
                if (err) { console.error("❌ Gagal buat tabel setoran:", err.message); return; }
                console.log("✅ Tabel setoran OK");

                // AUTO-FIX: Jika tabel setoran sudah ada dengan VARCHAR(20)
                db.query(`ALTER TABLE setoran MODIFY COLUMN nomor_wa VARCHAR(30) DEFAULT ''`, (err) => {
                    if (err) console.warn("⚠️ ALTER setoran (bisa diabaikan jika sudah benar):", err.message);
                    else console.log("✅ Kolom nomor_wa setoran dipastikan VARCHAR(30)");
                });

                // Insert sekolah default
                db.query(`INSERT IGNORE INTO daftar_sekolah (kode_sekolah, nama_sekolah, alamat) 
                    VALUES ('MI001', 'MI HIDAYATUL MUBTADIEN', 'Bangil, Pasuruan')`, (err) => {
                    if (err) console.error("❌ Gagal insert sekolah default:", err.message);
                    else console.log("✅ Database siap dengan multi-sekolah!");
                });
            });
        });
    });
};
initDB();

// Catch-all SPA — taruh paling bawah
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server nyala di port ${PORT}`));
