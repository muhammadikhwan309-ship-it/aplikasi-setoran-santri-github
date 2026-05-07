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
        console.log("✅ Session ditemukan, SEKOLAH_ID:", SEKOLAH_ID);
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
                console.log("✅ Login berhasil, SEKOLAH_ID:", SEKOLAH_ID);
                tampilkanAplikasi();
            } else {
                errorMsg.textContent = "Kode sekolah tidak ditemukan. Coba lagi.";
                errorMsg.style.display = "block";
            }
        } catch (err) {
            console.error("Login error:", err);
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
            SEKOLAH_ID = null;
            NAMA_SEKOLAH = "";
            location.reload();
        };
    }

    inisialisasiApp();
}

// ============ HELPER: KETERANGAN NILAI ============
function hitungKeterangan(nilaiInt) {
    return nilaiInt >= 85 ? "A - Sangat Baik"
         : nilaiInt >= 70 ? "B - Baik"
         : nilaiInt >= 60 ? "C - Cukup"
         : "D - Kurang";
}

// ============ HELPER: BADGE NILAI ============
function nilaiToBadge(nilai) {
    const n = parseInt(nilai);
    const cls = n >= 85 ? "badge-a" : n >= 70 ? "badge-b" : n >= 60 ? "badge-c" : "badge-d";
    return `<span class="badge ${cls}">${n}</span>`;
}

// ============ INISIALISASI SEMUA FITUR APP ============
function inisialisasiApp() {
    console.log("🚀 inisialisasiApp dipanggil, SEKOLAH_ID:", SEKOLAH_ID);

    // Guard: jika SEKOLAH_ID tidak ada, jangan lanjut
    if (!SEKOLAH_ID) {
        console.error("❌ SEKOLAH_ID kosong saat inisialisasiApp!");
        alert("Sesi tidak valid. Silakan login ulang.");
        sessionStorage.clear();
        location.reload();
        return;
    }

    // ===== ELEMEN TAB =====
    const tabSetoranBtn   = document.getElementById("tabSetoranBtn");
    const tabSantriBtn    = document.getElementById("tabSantriBtn");
    const tabDashboardBtn = document.getElementById("tabDashboardBtn");
    const tabSetoran      = document.getElementById("tabSetoran");
    const tabSantri       = document.getElementById("tabSantri");
    const tabDashboard    = document.getElementById("tabDashboard");

    // ===== ELEMEN MODAL =====
    const modal         = document.getElementById("editModal");
    const editNama      = document.getElementById("editNama");
    const editNomorWa   = document.getElementById("editNomorWa");
    const btnSimpanEdit = document.getElementById("btnSimpanEdit");
    const btnBatalEdit  = document.getElementById("btnBatalEdit");
    let editIdSantri    = null;

    // ===== ELEMEN FILTER =====
    const filterSantri    = document.getElementById("filterSantri");
    const filterSurah     = document.getElementById("filterSurah");
    const filterTglMulai  = document.getElementById("filterTanggalMulai");
    const filterTglSampai = document.getElementById("filterTanggalSampai");
    const btnFilter       = document.getElementById("btnFilter");
    const btnReset        = document.getElementById("btnResetFilter");

    // ===== FUNGSI TAB =====
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

    tabSetoranBtn.onclick   = aktifkanSetoran;
    tabSantriBtn.onclick    = aktifkanSantri;
    if (tabDashboardBtn) tabDashboardBtn.onclick = aktifkanDashboard;

    // ===== MODAL EDIT WA =====
    function bukaEditModal(id, nama, nomorWa) {
        editIdSantri      = id;
        editNama.value    = nama;
        editNomorWa.value = nomorWa || "";
        modal.style.display = "flex";
    }

    function tutupModal() {
        modal.style.display = "none";
        editIdSantri = null;
    }

    if (btnBatalEdit) btnBatalEdit.onclick = tutupModal;

    window.onclick = (e) => {
        if (e.target === modal) tutupModal();
    };

    // ===== SIMPAN EDIT NOMOR WA =====
    if (btnSimpanEdit) {
        btnSimpanEdit.onclick = async () => {
            const nomorBaru = editNomorWa.value.trim();
            if (!nomorBaru) { alert("Nomor WA tidak boleh kosong!"); return; }
            try {
                btnSimpanEdit.disabled = true;
                btnSimpanEdit.innerHTML = "⏳ Menyimpan...";
                const res = await fetch(`${BASE_URL}/api/santri/${editIdSantri}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nomor_wa_orangtua: nomorBaru, sekolah_id: SEKOLAH_ID })
                });
                const data = await res.json();
                if (res.ok) {
                    alert("✓ Nomor WA berhasil diupdate!");
                    tutupModal();
                    loadSantri();
                } else {
                    alert("Gagal update: " + (data.message || "Error server"));
                }
            } catch (err) {
                alert("Gagal terhubung ke server.");
            } finally {
                btnSimpanEdit.disabled = false;
                btnSimpanEdit.innerHTML = "💾 Simpan";
            }
        };
    }

    // ===== LOAD SANTRI =====
    async function loadSantri() {
        try {
            console.log("📡 loadSantri dengan SEKOLAH_ID:", SEKOLAH_ID);
            const res  = await fetch(`${BASE_URL}/api/santri?sekolah_id=${SEKOLAH_ID}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Respon server error: " + res.status);
            }
            const data = await res.json();
            console.log("✅ Data santri diterima:", data.length, "santri");
            daftarSantri = data;

            // Update tabel santri
            const tbody = document.getElementById("santriTableBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada data santri</td></tr>';
                } else {
                    data.forEach(s => {
                        const row = tbody.insertRow();
                        row.insertCell(0).textContent = s.id;
                        row.insertCell(1).textContent = s.nama_santri;
                        row.insertCell(2).textContent = s.nomor_wa_orangtua || '-';
                        const btnCell = row.insertCell(3);
                        const editBtn = document.createElement("button");
                        editBtn.innerHTML = "✏️ Edit";
                        editBtn.className = "btn btn-amber btn-sm";
                        editBtn.onclick = () => bukaEditModal(s.id, s.nama_santri, s.nomor_wa_orangtua || '');
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

            // Update dropdown pilih santri
            const selectPilih = document.getElementById("pilihSantri");
            if (selectPilih) {
                selectPilih.innerHTML = '<option value="">-- Pilih Santri --</option>';
                data.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.nama_santri;
                    opt.setAttribute("data-nomor", s.nomor_wa_orangtua || "");
                    opt.textContent = s.nama_santri;
                    selectPilih.appendChild(opt);
                });
            }

            // Update dropdown filter santri
            const selectFilter = document.getElementById("filterSantri");
            if (selectFilter) {
                const currentVal = selectFilter.value;
                selectFilter.innerHTML = '<option value="">Semua Santri</option>';
                data.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.nama_santri;
                    opt.textContent = s.nama_santri;
                    selectFilter.appendChild(opt);
                });
                selectFilter.value = currentVal;
            }

        } catch (err) {
            console.error("❌ loadSantri error:", err);
        }
    }

    // ===== HAPUS SANTRI =====
    async function hapusSantri(id) {
        if (!confirm("Hapus santri ini beserta semua setorannya?")) return;
        try {
            const res = await fetch(`${BASE_URL}/api/santri/${id}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) { alert("✓ " + data.message); }
            else { alert("Gagal: " + (data.message || "Error server")); }
        } catch (err) {
            alert("Gagal terhubung ke server.");
        }
        loadSantri();
        loadSetoran();
        loadDashboard();
    }

    // ===== TAMBAH SANTRI =====
    const tambahBtn = document.getElementById("tambahSantriBtn");
    if (tambahBtn) {
        tambahBtn.onclick = async () => {
            // Pastikan SEKOLAH_ID ada sebelum kirim
            if (!SEKOLAH_ID) {
                alert("Sesi tidak valid. Silakan logout dan login ulang.");
                return;
            }

            const nama = document.getElementById("namaSantriBaru").value.trim();
            const wa   = document.getElementById("nomorWaBaru").value.trim();

            if (!nama) {
                alert("Nama santri tidak boleh kosong!");
                return;
            }

            console.log("📤 Tambah santri:", { nama, wa, sekolah_id: SEKOLAH_ID });

            try {
                tambahBtn.disabled = true;
                tambahBtn.innerHTML = "⏳ Menyimpan...";

                const res = await fetch(`${BASE_URL}/api/santri`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nama_santri: nama,
                        nomor_wa_orangtua: wa,
                        sekolah_id: SEKOLAH_ID
                    })
                });

                const data = await res.json();
                console.log("📥 Response tambah santri:", res.status, JSON.stringify(data));

                if (res.ok) {
                    alert("✓ Santri berhasil ditambahkan!");
                    document.getElementById("namaSantriBaru").value = "";
                    document.getElementById("nomorWaBaru").value    = "";
                    loadSantri();
                } else {
                    alert("Gagal menambah santri:\n" + (data.message || "Error tidak diketahui"));
                }
            } catch (err) {
                console.error("❌ tambahSantri fetch error:", err);
                alert("Gagal terhubung ke server. Periksa koneksi internet Anda.");
            } finally {
                tambahBtn.disabled = false;
                tambahBtn.innerHTML = "📝 Tambah Santri";
            }
        };
    } else {
        console.error("❌ Element tambahSantriBtn tidak ditemukan di DOM!");
    }

    // ===== LOAD SETORAN =====
    async function loadSetoran() {
        try {
            let url = `${BASE_URL}/api/setoran/filter?sekolah_id=${SEKOLAH_ID}`;
            if (filterSantri?.value)    url += `&santri=${encodeURIComponent(filterSantri.value)}`;
            if (filterSurah?.value)     url += `&surah=${encodeURIComponent(filterSurah.value)}`;
            if (filterTglMulai?.value)  url += `&tanggal_mulai=${filterTglMulai.value}`;
            if (filterTglSampai?.value) url += `&tanggal_sampai=${filterTglSampai.value}`;

            const res  = await fetch(url);
            if (!res.ok) throw new Error("Respon server error: " + res.status);
            const data = await res.json();

            const tbody = document.getElementById("tableBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Tidak ada data setoran</td></tr>';
                } else {
                    data.forEach(item => {
                        const row = tbody.insertRow();
                        row.insertCell(0).textContent = item.nama_santri || item.nama;
                        row.insertCell(1).textContent = item.surah;
                        row.insertCell(2).textContent = item.ayat;
                        row.insertCell(3).innerHTML   = nilaiToBadge(item.nilai);
                        row.insertCell(4).textContent = item.keterangan;
                        const hapusBtn = document.createElement("button");
                        hapusBtn.innerHTML = "🗑️ Hapus";
                        hapusBtn.className = "btn btn-danger btn-sm";
                        hapusBtn.onclick   = () => hapusSetoran(item.id);
                        row.insertCell(5).appendChild(hapusBtn);
                    });
                }
            }
        } catch (err) {
            console.error("❌ loadSetoran error:", err);
        }
    }

    // ===== HAPUS SETORAN =====
    async function hapusSetoran(id) {
        if (!confirm("Hapus setoran ini?")) return;
        try {
            const res = await fetch(`${BASE_URL}/api/setoran/${id}?sekolah_id=${SEKOLAH_ID}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) alert("Gagal hapus: " + (data.message || "Error server"));
        } catch (err) {
            alert("Gagal terhubung ke server.");
        }
        loadSetoran();
        loadDashboard();
    }

    // ===== FILTER & RESET =====
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

    // ===== SIMPAN SETORAN =====
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const select   = document.getElementById("pilihSantri");
            const nama     = select.value;
            const wa       = select.options[select.selectedIndex]?.getAttribute("data-nomor") || "";
            const surah    = document.getElementById("surah").value;
            const ayat     = document.getElementById("ayat").value.trim();
            const nilaiRaw = document.getElementById("nilai").value.trim();

            if (!nama)     return alert("Pilih santri terlebih dahulu!");
            if (!surah)    return alert("Pilih surah terlebih dahulu!");
            if (!ayat)     return alert("Isi ayat terlebih dahulu!");
            if (!nilaiRaw) return alert("Isi nilai terlebih dahulu!");

            const nilaiInt = parseInt(nilaiRaw);
            if (isNaN(nilaiInt) || nilaiInt < 0 || nilaiInt > 100) {
                return alert("Nilai harus berupa angka antara 0 sampai 100!");
            }

            const keterangan = hitungKeterangan(nilaiInt);

            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = "⏳ Menyimpan...";

                const res = await fetch(`${BASE_URL}/api/setoran`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nama_santri: nama,
                        nomor_wa_orangtua: wa,
                        surah, ayat,
                        nilai: nilaiInt,
                        keterangan,
                        sekolah_id: SEKOLAH_ID
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    // Kirim WA hanya jika nomor tersedia
                    if (wa) {
                        const pesan = `📚 *LAPORAN SETORAN QURAN*\n\nNama    : ${nama}\nSurah   : ${surah}\nAyat    : ${ayat}\nNilai   : ${nilaiInt}\nKet     : ${keterangan}\n\nBarakallahu fiikum 🌙`;
                        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, "_blank");
                    }
                    alert("✓ Data setoran berhasil disimpan!" + (wa ? "" : "\n(Nomor WA tidak ada, pesan tidak dikirim)"));
                    select.value = "";
                    document.getElementById("surah").value = "";
                    document.getElementById("ayat").value  = "";
                    document.getElementById("nilai").value = "";
                    loadSetoran();
                    loadDashboard();
                } else {
                    alert("Gagal menyimpan: " + (data.message || "Error server"));
                }
            } catch (err) {
                console.error("❌ saveSetoran error:", err);
                alert("Gagal terhubung ke server.");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = "💾 Simpan & Kirim WhatsApp";
            }
        };
    }

    // ===== PDF HARIAN =====
    const pdfHarianBtn = document.getElementById("pdfHarianBtn");
    if (pdfHarianBtn) {
        pdfHarianBtn.onclick = async () => {
            try {
                pdfHarianBtn.disabled = true;
                pdfHarianBtn.innerHTML = "⏳ Membuat PDF...";
                const res = await fetch(`${BASE_URL}/api/rekap-pdf?sekolah_id=${SEKOLAH_ID}`);
                if (res.ok) {
                    const blob = await res.blob();
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href = url; a.download = "rekap_harian.pdf";
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a); URL.revokeObjectURL(url);
                    alert("✓ PDF berhasil diunduh!");
                } else {
                    alert("Gagal membuat PDF. Pastikan ada data setoran hari ini.");
                }
            } catch (err) {
                alert("Gagal terhubung ke server.");
            } finally {
                pdfHarianBtn.disabled = false;
                pdfHarianBtn.innerHTML = "📄 Rekap Hari Ini";
            }
        };
    }

    // ===== LOAD DASHBOARD =====
    async function loadDashboard() {
        try {
            const res  = await fetch(`${BASE_URL}/api/dashboard?sekolah_id=${SEKOLAH_ID}`);
            if (!res.ok) throw new Error("Respon server error: " + res.status);
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
                        const predikat  = item.rata_rata >= 85 ? "🏆 Sangat Baik"
                                        : item.rata_rata >= 70 ? "👍 Baik"
                                        : item.rata_rata >= 60 ? "📖 Cukup"
                                        : "⚠️ Kurang";
                        row.insertCell(0).textContent = peringkat;
                        row.insertCell(1).textContent = item.nama_santri || item.nama;
                        row.insertCell(2).textContent = item.total_setoran;
                        row.insertCell(3).innerHTML   = nilaiToBadge(item.rata_rata);
                        row.insertCell(4).textContent = item.nilai_tertinggi;
                        row.insertCell(5).textContent = item.nilai_terendah;
                        row.insertCell(6).textContent = predikat;
                    });
                }
            }
        } catch (err) {
            console.error("❌ loadDashboard error:", err);
        }
    }

    // ===== LOAD DATA AWAL =====
    loadSantri();
    loadSetoran();
    loadDashboard();
}
