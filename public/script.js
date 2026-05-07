// ============ BASE URL ============
const BASE_URL = window.location.origin;
let SEKOLAH_ID = null;
let NAMA_SEKOLAH = "";

// ============ TUNGGU HTML SIAP ============
document.addEventListener("DOMContentLoaded", function () {
    const savedKode = sessionStorage.getItem("sekolah_id");
    const savedNama = sessionStorage.getItem("nama_sekolah");

    if (savedKode && savedNama) {
        SEKOLAH_ID = savedKode;
        NAMA_SEKOLAH = savedNama;
        tampilkanAplikasi();
    } else {
        tampilkanLayarKode();
    }
});

// ============ LAYAR INPUT KODE SEKOLAH ============
function tampilkanLayarKode() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";

    const btnMasuk = document.getElementById("btnMasukKode");
    const inputKode = document.getElementById("inputKodeSekolah");
    const errorMsg = document.getElementById("kodeError");

    if (btnMasuk) {
        btnMasuk.onclick = async () => {
            const kode = inputKode.value.trim().toUpperCase();
            if (!kode) {
                errorMsg.textContent = "Masukkan kode sekolah terlebih dahulu.";
                errorMsg.style.display = "block";
                return;
            }

            btnMasuk.textContent = "⏳ Memeriksa...";
            btnMasuk.disabled = true;
            errorMsg.style.display = "none";

            try {
                const res = await fetch(`${BASE_URL}/api/sekolah/cek/${kode}`);
                const data = await res.json();

                if (data.valid) {
                    SEKOLAH_ID = kode;
                    NAMA_SEKOLAH = data.nama_sekolah;
                    sessionStorage.setItem("sekolah_id", kode);
                    sessionStorage.setItem("nama_sekolah", data.nama_sekolah);
                    tampilkanAplikasi();
                } else {
                    errorMsg.textContent = "Kode sekolah tidak ditemukan. Coba lagi.";
                    errorMsg.style.display = "block";
                }
            } catch (err) {
                errorMsg.textContent = "Gagal terhubung ke server.";
                errorMsg.style.display = "block";
            }

            btnMasuk.textContent = "🔓 Masuk";
            btnMasuk.disabled = false;
        };
    }

    if (inputKode) {
        inputKode.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && btnMasuk) btnMasuk.click();
        });
    }
}

// ============ TAMPILKAN APLIKASI UTAMA ============
function tampilkanAplikasi() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";

    const namaEl = document.getElementById("namaSekolahHeader");
    if (namaEl) namaEl.textContent = NAMA_SEKOLAH;

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.onclick = () => {
            sessionStorage.removeItem("sekolah_id");
            sessionStorage.removeItem("nama_sekolah");
            location.reload();
        };
    }

    // Update header date
    const dateEl = document.getElementById("headerDate");
    if (dateEl) {
        const d = new Date();
        dateEl.textContent = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    inisialisasiApp();
}

// ============ INISIALISASI SEMUA FITUR ============
function inisialisasiApp() {
    // Elemen Tab
    const tabSetoranBtn = document.getElementById("tabSetoranBtn");
    const tabSantriBtn = document.getElementById("tabSantriBtn");
    const tabDashboardBtn = document.getElementById("tabDashboardBtn");
    const tabSetoran = document.getElementById("tabSetoran");
    const tabSantri = document.getElementById("tabSantri");
    const tabDashboard = document.getElementById("tabDashboard");

    // Modal Edit
    const modal = document.getElementById("editModal");
    const editNama = document.getElementById("editNama");
    const editNomorWa = document.getElementById("editNomorWa");
    const btnSimpanEdit = document.getElementById("btnSimpanEdit");
    const btnBatalEdit = document.getElementById("btnBatalEdit");
    let editIdSantri = null;

    // ===== FUNGSI TAB =====
    function aktifkanSetoran() {
        tabSetoranBtn?.classList.add("active");
        tabSantriBtn?.classList.remove("active");
        tabDashboardBtn?.classList.remove("active");
        tabSetoran?.classList.add("active");
        tabSantri?.classList.remove("active");
        tabDashboard?.classList.remove("active");
        loadSetoran();
    }

    function aktifkanSantri() {
        tabSantriBtn?.classList.add("active");
        tabSetoranBtn?.classList.remove("active");
        tabDashboardBtn?.classList.remove("active");
        tabSantri?.classList.add("active");
        tabSetoran?.classList.remove("active");
        tabDashboard?.classList.remove("active");
        loadSantri();
    }

    function aktifkanDashboard() {
        tabDashboardBtn?.classList.add("active");
        tabSetoranBtn?.classList.remove("active");
        tabSantriBtn?.classList.remove("active");
        tabDashboard?.classList.add("active");
        tabSetoran?.classList.remove("active");
        tabSantri?.classList.remove("active");
        loadDashboard();
    }

    if (tabSetoranBtn) tabSetoranBtn.onclick = aktifkanSetoran;
    if (tabSantriBtn) tabSantriBtn.onclick = aktifkanSantri;
    if (tabDashboardBtn) tabDashboardBtn.onclick = aktifkanDashboard;

    // ===== BADGE NILAI =====
    function nilaiToBadge(nilai) {
        const num = parseInt(nilai);
        let cls = "badge-a";
        if (num >= 85) cls = "badge-a";
        else if (num >= 70) cls = "badge-b";
        else if (num >= 60) cls = "badge-c";
        else cls = "badge-d";
        return `<span class="badge ${cls}">${num}</span>`;
    }

    // ===== MODAL =====
    function bukaEditModal(id, nama, nomorWa) {
        editIdSantri = id;
        editNama.value = nama;
        editNomorWa.value = nomorWa;
        modal.style.display = "flex";
    }

    function tutupModal() {
        modal.style.display = "none";
        editIdSantri = null;
    }

    // ===== LOAD SANTRI =====
    async function loadSantri() {
        try {
            const res = await fetch(`${BASE_URL}/api/santri?sekolah_id=${SEKOLAH_ID}`);
            const data = await res.json();

            // Update tabel santri
            const tbody = document.getElementById("santriTableBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada data santri</td></tr>';
                } else {
                    data.forEach(s => {
                        const row = tbody.insertRow();
                        row.insertCell(0).innerHTML = s.id;
                        row.insertCell(1).innerHTML = s.nama_santri;
                        row.insertCell(2).innerHTML = s.nomor_wa_orangtua;
                        const btnCell = row.insertCell(3);
                        btnCell.innerHTML = `
                            <button class="btn btn-amber btn-sm" onclick='bukaEditModal("${s.id}", "${s.nama_santri.replace(/'/g, "\\'")}", "${s.nomor_wa_orangtua}")'>✏️ Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="hapusSantri(${s.id})">🗑️ Hapus</button>
                        `;
                    });
                }
            }

            // Update dropdown pilih santri
            const select = document.getElementById("pilihSantri");
            if (select) {
                select.innerHTML = '<option value="">-- Pilih Santri --</option>';
                data.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.nama_santri;
                    opt.setAttribute("data-nomor", s.nomor_wa_orangtua);
                    opt.textContent = s.nama_santri;
                    select.appendChild(opt);
                });
            }

            // Update dropdown filter
            const filterSelect = document.getElementById("filterSantri");
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">Semua Santri</option>';
                data.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.nama_santri;
                    opt.textContent = s.nama_santri;
                    filterSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("loadSantri error:", err);
        }
    }

    window.hapusSantri = async function(id) {
        if (confirm("Hapus santri ini beserta semua setorannya?")) {
            await fetch(`${BASE_URL}/api/santri/${id}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            loadSantri();
            loadSetoran();
            loadDashboard();
        }
    };

    // ===== EDIT NOMOR WA =====
    if (btnSimpanEdit) {
        btnSimpanEdit.onclick = async () => {
            const nomorBaru = editNomorWa.value.trim();
            if (!nomorBaru.match(/^62[0-9]{10,13}$/)) {
                alert("Format WA salah! Contoh: 6281234567890");
                return;
            }
            await fetch(`${BASE_URL}/api/santri/${editIdSantri}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nomor_wa_orangtua: nomorBaru, sekolah_id: SEKOLAH_ID })
            });
            alert("✓ Berhasil update!");
            tutupModal();
            loadSantri();
        };
    }
    if (btnBatalEdit) btnBatalEdit.onclick = tutupModal;

    // ===== LOAD SETORAN =====
    const filterSantri = document.getElementById("filterSantri");
    const filterSurah = document.getElementById("filterSurah");
    const filterTglMulai = document.getElementById("filterTanggalMulai");
    const filterTglSampai = document.getElementById("filterTanggalSampai");
    const btnFilter = document.getElementById("btnFilter");
    const btnReset = document.getElementById("btnResetFilter");

    async function loadSetoran() {
        try {
            let url = `${BASE_URL}/api/setoran/filter?sekolah_id=${SEKOLAH_ID}`;
            if (filterSantri?.value) url += `&santri=${encodeURIComponent(filterSantri.value)}`;
            if (filterSurah?.value) url += `&surah=${encodeURIComponent(filterSurah.value)}`;
            if (filterTglMulai?.value) url += `&tanggal_mulai=${filterTglMulai.value}`;
            if (filterTglSampai?.value) url += `&tanggal_sampai=${filterTglSampai.value}`;

            const res = await fetch(url);
            const data = await res.json();

            const tbody = document.getElementById("tableBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Tidak ada data setoran</td></tr>';
                } else {
                    data.forEach(item => {
                        const row = tbody.insertRow();
                        row.insertCell(0).innerHTML = item.nama;
                        row.insertCell(1).innerHTML = item.surah;
                        row.insertCell(2).innerHTML = item.ayat;
                        row.insertCell(3).innerHTML = nilaiToBadge(item.nilai);
                        row.insertCell(4).innerHTML = item.nilai >= 85 ? '✅ Lancar' : '⚠️ Kurang Lancar';
                        row.insertCell(5).innerHTML = `<button class="btn btn-danger btn-sm" onclick="hapusSetoranItem(${item.id})">🗑️ Hapus</button>`;
                    });
                }
            }
        } catch (err) {
            console.error("loadSetoran error:", err);
        }
    }

    window.hapusSetoranItem = async function(id) {
        if (confirm("Hapus setoran ini?")) {
            await fetch(`${BASE_URL}/api/setoran/${id}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            loadSetoran();
            loadDashboard();
        }
    };

    if (btnFilter) btnFilter.onclick = loadSetoran;
    if (btnReset) {
        btnReset.onclick = () => {
            if (filterSantri) filterSantri.value = "";
            if (filterSurah) filterSurah.value = "";
            if (filterTglMulai) filterTglMulai.value = "";
            if (filterTglSampai) filterTglSampai.value = "";
            loadSetoran();
        };
    }

    // ===== DASHBOARD =====
    async function loadDashboard() {
        try {
            const res = await fetch(`${BASE_URL}/api/dashboard?sekolah_id=${SEKOLAH_ID}`);
            const data = await res.json();

            const tbody = document.getElementById("dashboardBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada data setoran</td></tr>';
                } else {
                    data.forEach((item, i) => {
                        const row = tbody.insertRow();
                        if (i === 0) row.style.background = "#fef3c7";

                        const peringkat = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
                        row.insertCell(0).innerHTML = peringkat;
                        row.insertCell(1).innerHTML = item.nama;
                        row.insertCell(2).innerHTML = item.total_setoran;
                        row.insertCell(3).innerHTML = nilaiToBadge(item.rata_rata);
                        row.insertCell(4).innerHTML = item.nilai_tertinggi;
                        row.insertCell(5).innerHTML = item.nilai_terendah;

                        let predikat = "";
                        if (item.rata_rata >= 85) predikat = "🏆 Sangat Baik";
                        else if (item.rata_rata >= 70) predikat = "👍 Baik";
                        else if (item.rata_rata >= 60) predikat = "📖 Cukup";
                        else predikat = "⚠️ Kurang";
                        row.insertCell(6).innerHTML = predikat;
                    });
                }
            }
        } catch (err) {
            console.error("loadDashboard error:", err);
        }
    }

    // ===== TAMBAH SANTRI =====
    const tambahBtn = document.getElementById("tambahSantriBtn");
    if (tambahBtn) {
        tambahBtn.onclick = async () => {
            const nama = document.getElementById("namaSantriBaru").value.trim();
            const wa = document.getElementById("nomorWaBaru").value.trim();

            if (!nama || !wa) return alert("Isi semua field!");
            if (!wa.match(/^62[0-9]{10,13}$/)) return alert("Format WA salah! Contoh: 6281234567890");

            const res = await fetch(`${BASE_URL}/api/santri`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nama_santri: nama,
                    nomor_wa_orangtua: wa,
                    sekolah_id: SEKOLAH_ID
                })
            });

            if (res.ok) {
                document.getElementById("namaSantriBaru").value = "";
                document.getElementById("nomorWaBaru").value = "";
                loadSantri();
                alert("✓ Santri berhasil ditambahkan!");
            } else {
                alert("Gagal menambahkan santri");
            }
        };
    }

    // ===== SIMPAN SETORAN =====
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const select = document.getElementById("pilihSantri");
            const nama = select.value;
            const wa = select.options[select.selectedIndex]?.getAttribute("data-nomor") || "";
            const surah = document.getElementById("surah").value;
            const ayat = document.getElementById("ayat").value.trim();
            const nilaiInput = document.getElementById("nilai").value;

            if (!nama || !wa || !surah || !ayat || !nilaiInput) return alert("Isi semua field!");

            const nilaiInt = parseInt(nilaiInput);
            if (isNaN(nilaiInt) || nilaiInt < 0 || nilaiInt > 100) return alert("Nilai harus antara 0–100!");

            let keterangan = nilaiInt >= 85 ? "✅ Lancar" : "⚠️ Kurang Lancar";

            const res = await fetch(`${BASE_URL}/api/setoran`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nama_santri: nama,
                    nomor_wa_orangtua: wa,
                    surah: surah,
                    ayat: ayat,
                    nilai: nilaiInt,
                    keterangan: keterangan,
                    sekolah_id: SEKOLAH_ID
                })
            });

            if (res.ok) {
                alert("✓ Data tersimpan!");
                const pesan = `📚 *LAPORAN SETORAN QURAN*\n\nNama    : ${nama}\nSurah   : ${surah}\nAyat    : ${ayat}\nNilai   : ${nilaiInt}\nKeterangan: ${keterangan}\n\nBarakallahu fiikum 🌙`;
                window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, "_blank");

                select.value = "";
                document.getElementById("surah").value = "";
                document.getElementById("ayat").value = "";
                document.getElementById("nilai").value = "";
                loadSetoran();
                loadDashboard();
            } else {
                alert("Gagal menyimpan setoran");
            }
        };
    }

    // ===== PDF HARIAN =====
    const pdfHarianBtn = document.getElementById("pdfHarianBtn");
    if (pdfHarianBtn) {
        pdfHarianBtn.onclick = async () => {
            const res = await fetch(`${BASE_URL}/api/rekap-pdf?sekolah_id=${SEKOLAH_ID}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rekap_harian.pdf";
                a.click();
                URL.revokeObjectURL(url);
                alert("✓ PDF berhasil diunduh!");
            } else {
                const text = await res.text();
                alert(text || "Gagal membuat PDF atau belum ada data hari ini");
            }
        };
    }

    // ===== PDF BULANAN =====
    const pdfBulananBtn = document.getElementById("pdfBulananBtn");
    if (pdfBulananBtn) {
        pdfBulananBtn.onclick = async () => {
            const now = new Date();
            const tahun = now.getFullYear();
            const bulan = String(now.getMonth() + 1).padStart(2, "0");
            const res = await fetch(`${BASE_URL}/api/rekap-bulan-pdf/${tahun}/${bulan}?sekolah_id=${SEKOLAH_ID}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `rekap_bulan_${tahun}_${bulan}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                alert("✓ PDF bulanan berhasil diunduh!");
            } else {
                const text = await res.text();
                alert(text || "Gagal membuat PDF atau belum ada data bulan ini");
            }
        };
    }

    // ===== HAPUS REKAPAN BULAN =====
    const btnHapusRekapanBulan = document.getElementById("btnHapusRekapanBulan");
    if (btnHapusRekapanBulan) {
        btnHapusRekapanBulan.onclick = async () => {
            const bulanSelect = document.getElementById("bulanFilter");
            const tahunInput = document.getElementById("tahunFilter");
            const bulan = bulanSelect?.value;
            const tahun = tahunInput?.value;

            if (!bulan || !tahun) return alert("Pilih bulan dan tahun terlebih dahulu!");

            const namaBulan = bulanSelect.options[bulanSelect.selectedIndex]?.text || bulan;
            if (!confirm(`⚠️ PERINGATAN!\n\nHapus SEMUA data setoran untuk bulan ${namaBulan} ${tahun}?\n\nData yang dihapus TIDAK BISA DIKEMBALIKAN!`)) return;

            const res = await fetch(`${BASE_URL}/api/hapus-rekapan-bulan/${tahun}/${bulan}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            const result = await res.json();
            alert(result.message);
            loadSetoran();
            loadDashboard();
        };
    }

    // ===== LOAD DATA AWAL =====
    loadSantri();
    loadSetoran();
    loadDashboard();

    // ===== TUTUP MODAL KLIK LUAR =====
    window.onclick = (event) => {
        if (event.target === modal) tutupModal();
    };
}
