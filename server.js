const express = require("express");
const cors = require("cors");
const db = require("./db");
const PDFDocument = require('pdfkit');
const path = require('path'); // Tambahan: Agar bisa membaca folder
const app = express();

app.use(cors());
app.use(express.json());

// --- KUNCI: Agar tampilan web (HTML/CSS/JS) muncul ---
// Memastikan Node.js membaca file di dalam folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ============ API UNTUK SANTRI ============
app.get("/api/santri", (req, res) => {
    db.query("SELECT * FROM data_santri ORDER BY nama_santri ASC", (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data santri" });
        res.json(rows);
    });
});

app.post("/api/santri", (req, res) => {
    const { nama_santri, nomor_wa_orangtua } = req.body;
    if (!nama_santri || !nomor_wa_orangtua) return res.status(400).json({ message: "Semua field harus diisi!" });
    db.query("INSERT INTO data_santri (nama_santri, nomor_wa_orangtua) VALUES (?, ?)", [nama_santri, nomor_wa_orangtua], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menambah santri" });
        res.json({ message: "Santri berhasil ditambahkan", id: result.insertId });
    });
});

app.put("/api/santri/:id", (req, res) => {
    const { id } = req.params;
    const { nomor_wa_orangtua } = req.body;
    db.query("UPDATE data_santri SET nomor_wa_orangtua = ? WHERE id = ?", [nomor_wa_orangtua, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal mengupdate" });
        res.json({ message: "Nomor WA berhasil diupdate" });
    });
});

app.delete("/api/santri/:id", (req, res) => {
    db.query("DELETE FROM data_santri WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal hapus" });
        res.json({ message: "Santri berhasil dihapus" });
    });
});

// ============ API UNTUK SETORAN ============
app.get("/api/setoran", (req, res) => {
    db.query("SELECT * FROM setoran ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data" });
        res.json(rows);
    });
});

app.post("/api/setoran", (req, res) => {
    const { nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan } = req.body;
    const sql = "INSERT INTO setoran (nama, nomor_wa, surah, ayat, nilai, keterangan) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [nama_santri, nomor_wa_orangtua, surah, ayat, nilai, keterangan], (err) => {
        if (err) return res.status(500).json({ message: "Gagal menyimpan data" });
        res.json({ message: "Data berhasil disimpan" });
    });
});

// ============ FITUR PDF ============
app.get("/api/rekap-pdf", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.query("SELECT * FROM setoran WHERE DATE(created_at) = ? ORDER BY id DESC", [today], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).json({ message: "Data kosong" });
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        doc.fontSize(20).text("LAPORAN SETORAN QURAN", { align: "center" });
        rows.forEach((row, i) => doc.fontSize(10).text(`${i+1}. ${row.nama} - ${row.surah}`));
        doc.end();
    });
});

// ============ DASHBOARD REKAP (SUDAH DIPERBAIKI) ============
app.get("/api/dashboard", (req, res) => {
    const sql = `
        SELECT nama, COUNT(*) as total_setoran, ROUND(AVG(nilai), 1) as rata_rata,
        MAX(nilai) as nilai_tertinggi, MIN(nilai) as nilai_terendah
        FROM setoran GROUP BY nama ORDER BY rata_rata DESC`;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ message: "Gagal ambil dashboard" });
        res.json(rows);
    });
});

// --- PENTING: Mengirim file HTML utama saat web dibuka ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ============ OTOMATIS BUAT TABEL JIKA BELUM ADA ============
const initDB = () => {
    const tableSantri = `
        CREATE TABLE IF NOT EXISTS data_santri (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_santri VARCHAR(255) NOT NULL,
            nomor_wa_orangtua VARCHAR(20) NOT NULL
        );`;
    
    const tableSetoran = `
        CREATE TABLE IF NOT EXISTS setoran (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            nomor_wa VARCHAR(20) NOT NULL,
            surah VARCHAR(100),
            ayat VARCHAR(50),
            nilai INT,
            keterangan TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;

    db.query(tableSantri, (err) => {
        if (err) console.error("Gagal buat tabel santri:", err);
        else console.log("Tabel santri siap!");
    });

    db.query(tableSetoran, (err) => {
        if (err) console.error("Gagal buat tabel setoran:", err);
        else console.log("Tabel setoran siap!");
    });
};

// Jalankan fungsi buat tabel
initDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
