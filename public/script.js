// ============ BASE URL ============
const BASE_URL = window.location.origin;

// ============ GLOBAL STATE ============
let daftarSantri = [];
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

    const btnMasuk  = document.getElementById("btnMasukKode");
    const inputKode = document.getElementById("inputKodeSekolah");
    const errorMsg  = document.getElementById("kodeError");

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
            const res  = await fetch(`${BASE_URL}/api/sekolah/cek/${kode}`);
            const data = await res.json();

            if (data.valid) {
                SEKOLAH_ID   = kode;
                NAMA_SEKOLAH = data.nama_sekolah;
                sessionStorage.setItem("sekolah_id",   kode);
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

    inputKode.addEventListener("keydown", (e) => {
        if (e.key === "Enter") btnMasuk.click();
    });
}

// ============ TAMPILKAN APLIKASI UTAMA ============
function tampilkanAplikasi() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appScreen").style.display  = "block";

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

    inisialisasiApp();
}

// ============ INISIALISASI SEMUA FITUR APP ============
function inisialisasiApp() {

    const tabSetoranBtn   = document.getElementById("tabSetoranBtn");
    const tabSantriBtn    = document.getElementById("tabSantriBtn");
    const tabDashboardBtn = document.getElementById("tabDashboardBtn");
    const tabSetoran      = document.getElementById("tabSetoran");
    const tabSantri       = document.getElementById("tabSantri");
    const tabDashboard    = document.getElementById("tabDashboard");

    const modal         = document.getElementById("editModal");
    const editNama      = document.getElementById("editNama");
    const editNomorWa   = document.getElementById("editNomorWa");
    const btnSimpanEdit = document.getElementById("btnSimpanEdit");
    const btnBatalEdit  = document.getElementById("btnBatalEdit");
    let editIdSantri    = null;

    // ===== TAB =====
    function aktifkanSetoran() {
        tabSetoranBtn.classList.add("active");
        tabSantriBtn.classList.remove("active");
        if (tabDashboardBtn) tabDashboardBtn.classList.remove("active");
        tabSetoran.classList.add("active");
        tabSantri.classList.remove("active");
        if (tabDashboard) tabDashboard.classList.remove("active");
        loadSetoran();
    }
    function aktifkanSantri() {
        tabSantriBtn.classList.add("active");
        tabSetoranBtn.classList.remove("active");
        if (tabDashboardBtn) tabDashboardBtn.classList.remove("active");
        tabSantri.classList.add("active");
        tabSetoran.classList.remove("active");
        if (tabDashboard) tabDashboard.classList.remove("active");
        loadSantri();
    }
    function aktifkanDashboard() {
        if (tabDashboardBtn) tabDashboardBtn.classList.add("active");
        tabSetoranBtn.classList.remove("active");
        tabSantriBtn.classList.remove("active");
        if (tabDashboard) tabDashboard.classList.add("active");
        tabSetoran.classList.remove("active");
        tabSantri.classList.remove("active");
        loadDashboard();
    }

    tabSetoranBtn.onclick = aktifkanSetoran;
    tabSantriBtn.onclick  = aktifkanSantri;
    if (tabDashboardBtn) tabDashboardBtn.onclick = aktifkanDashboard;

    // ===== BADGE NILAI =====
    function nilaiToBadge(nilai) {
        let cls = nilai >= 85 ? "badge-a" : nilai >= 70 ? "badge-b" : nilai >= 60 ? "badge-c" : "badge-d";
        return `<span class="badge ${cls}">${nilai}</span>`;
    }

    // ===== MODAL =====
    function bukaEditModal(id, nama, nomorWa) {
        editIdSantri = id;
        editNama.value    = nama;
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
            const res  = await fetch(`${BASE_URL}/api/santri?sekolah_id=${SEKOLAH_ID}`);
            const data = await res.json();
            daftarSantri = data;

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
                        const editBtn = document.createElement("button");
                        editBtn.innerHTML = "✏️ Edit";
                        editBtn.className = "btn btn-amber btn-sm";
                        editBtn.onclick = () => bukaEditModal(s.id, s.nama_santri, s.nomor_wa_orangtua);
                        btnCell.appendChild(editBtn);
                        btnCell.appendChild(document.createTextNode(" "));

                        const delBtn = document.createElement("button");
                        delBtn.innerHTML = "🗑️ Hapus";
                        delBtn.className = "btn btn-danger btn-sm";
                        delBtn.onclick = () => hapusSantri(s.id);
                        btnCell.appendChild(delBtn);
                    });
                }
            }

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

            const filterSelect = document.getElementById("filterSantri");
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">Semua Santri</option>';
                data.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value   = s.nama_santri;
                    opt.textContent = s.nama_santri;
                    filterSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("loadSantri error:", err);
        }
    }

    async function hapusSantri(id) {
        if (confirm("Hapus santri ini beserta semua setorannya?")) {
            await fetch(`${BASE_URL}/api/santri/${id}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            loadSantri();
            loadSetoran();
            loadDashboard();
        }
    }

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
    const filterSantri    = document.getElementById("filterSantri");
    const filterSurah     = document.getElementById("filterSurah");
    const filterTglMulai  = document.getElementById("filterTanggalMulai");
    const filterTglSampai = document.getElementById("filterTanggalSampai");
    const btnFilter       = document.getElementById("btnFilter");
    const btnReset        = document.getElementById("btnResetFilter");

    async function loadSetoran() {
        try {
            let url = `${BASE_URL}/api/setoran/filter?sekolah_id=${SEKOLAH_ID}&`;
            if (filterSantri?.value)    url += `santri=${encodeURIComponent(filterSantri.value)}&`;
            if (filterSurah?.value)     url += `surah=${encodeURIComponent(filterSurah.value)}&`;
            if (filterTglMulai?.value)  url += `tanggal_mulai=${filterTglMulai.value}&`;
            if (filterTglSampai?.value) url += `tanggal_sampai=${filterTglSampai.value}&`;

            const res  = await fetch(url);
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
                        row.insertCell(4).innerHTML = item.keterangan;

                        const btn = document.createElement("button");
                        btn.innerHTML = "🗑️ Hapus";
                        btn.className = "btn btn-danger btn-sm";
                        btn.onclick   = () => hapusSetoran(item.id);
                        row.insertCell(5).appendChild(btn);
                    });
                }
            }
        } catch (err) {
            console.error("loadSetoran error:", err);
        }
    }

    async function hapusSetoran(id) {
        if (confirm("Hapus setoran ini?")) {
            await fetch(`${BASE_URL}/api/setoran/${id}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            loadSetoran();
            loadDashboard();
        }
    }

    if (btnFilter) btnFilter.onclick = loadSetoran;
    if (btnReset) {
        btnReset.onclick = () => {
            if (filterSantri)    filterSantri.value    = "";
            if (filterSurah)     filterSurah.value     = "";
            if (filterTglMulai)  filterTglMulai.value  = "";
            if (filterTglSampai) filterTglSampai.value = "";
            loadSetoran();
        };
    }

    // ===== DASHBOARD =====
    async function loadDashboard() {
        try {
            const res  = await fetch(`${BASE_URL}/api/dashboard?sekolah_id=${SEKOLAH_ID}`);
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

                        let predikat = item.rata_rata >= 85 ? "🏆 Sangat Baik"
                                     : item.rata_rata >= 70 ? "👍 Baik"
                                     : item.rata_rata >= 60 ? "📖 Cukup"
                                     : "⚠️ Kurang";
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
            const wa   = document.getElementById("nomorWaBaru").value.trim();
            if (!nama || !wa) return alert("Isi semua field!");
            if (!wa.match(/^62[0-9]{10,13}$/)) return alert("Format WA salah! Contoh: 6281234567890");

            await fetch(`${BASE_URL}/api/santri`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nama_santri: nama,
                    nomor_wa_orangtua: wa,
                    sekolah_id: SEKOLAH_ID  // ← wajib
                })
            });
            document.getElementById("namaSantriBaru").value = "";
            document.getElementById("nomorWaBaru").value    = "";
            loadSantri();
        };
    }

    // ===== SIMPAN SETORAN =====
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const select = document.getElementById("pilihSantri");
            const nama   = select.value;
            const wa     = select.options[select.selectedIndex]?.getAttribute("data-nomor") || "";
            const surah  = document.getElementById("surah").value;
            const ayat   = document.getElementById("ayat").value.trim();
            const nilai  = document.getElementById("nilai").value;

            if (!nama || !wa || !surah || !ayat || !nilai) return alert("Isi semua field!");

            const nilaiInt = parseInt(nilai);
            if (isNaN(nilaiInt) || nilaiInt < 0 || nilaiInt > 100) return alert("Nilai harus angka antara 0-100!");

            let keterangan = nilaiInt >= 85 ? "A - Sangat Baik"
                           : nilaiInt >= 70 ? "B - Baik"
                           : nilaiInt >= 60 ? "C - Cukup"
                           : "D - Kurang";

            await fetch(`${BASE_URL}/api/setoran`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nama_santri: nama,
                    nomor_wa_orangtua: wa,
                    surah,
                    ayat,
                    nilai: nilaiInt,
                    keterangan,
                    sekolah_id: SEKOLAH_ID  // ← wajib
                })
            });

            alert("✓ Data tersimpan!");
            const pesan = `📚 *LAPORAN SETORAN QURAN*\n\nNama    : ${nama}\nSurah   : ${surah}\nAyat    : ${ayat}\nNilai   : ${nilaiInt}\nKet     : ${keterangan}\n\nBarakallahu fiikum 🌙`;
            window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, "_blank");

            select.value = "";
            document.getElementById("surah").value = "";
            document.getElementById("ayat").value  = "";
            document.getElementById("nilai").value = "";
            loadSetoran();
            loadDashboard();
        };
    }

    // ===== PDF HARIAN =====
    const pdfHarianBtn = document.getElementById("pdfHarianBtn");
    if (pdfHarianBtn) {
        pdfHarianBtn.onclick = async () => {
            const res = await fetch(`${BASE_URL}/api/rekap-pdf?sekolah_id=${SEKOLAH_ID}`);
            if (res.ok) {
                const blob = await res.blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = "rekap_harian.pdf";
                a.click();
                URL.revokeObjectURL(url);
                alert("✓ PDF berhasil diunduh!");
            } else {
                alert("Gagal membuat PDF atau belum ada data hari ini.");
            }
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
