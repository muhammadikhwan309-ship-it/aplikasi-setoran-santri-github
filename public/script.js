// ============ BASE URL ============
const BASE_URL = window.location.origin

// ============ GLOBAL VARIABLES ============
let daftarSantri = [];

// ============ FUNGSI HAPUS TOTAL SETORAN (GLOBAL - DILUAR DOMContentLoaded) ============
async function hapusTotalSetoran(nama) {
    if (confirm(`Hapus SELURUH riwayat setoran untuk santri: ${nama}?`)) {
        try {
            const res = await fetch(`${BASE_URL}/api/dashboard/hapus/${encodeURIComponent(nama)}`, { 
                method: "DELETE" 
            });
            if (res.ok) {
                alert("Berhasil menghapus semua setoran santri tersebut.");
                // Panggil loadDashboard dari global scope
                if (typeof loadDashboardGlobal === 'function') {
                    loadDashboardGlobal();
                }
            } else {
                alert("Gagal menghapus data");
            }
        } catch (err) {
            alert("Gagal menghapus data");
        }
    }
}

// ============ TUNGGU HTML SIAP ============
document.addEventListener("DOMContentLoaded", function() {
    
    // ============ AMBIL ELEMEN TAB ============
    const tabSetoranBtn = document.getElementById("tabSetoranBtn");
    const tabSantriBtn = document.getElementById("tabSantriBtn");
    const tabDashboardBtn = document.getElementById("tabDashboardBtn");
    const tabSetoran = document.getElementById("tabSetoran");
    const tabSantri = document.getElementById("tabSantri");
    const tabDashboard = document.getElementById("tabDashboard");
    
    // ============ MODAL EDIT ============
    const modal = document.getElementById("editModal");
    const editNama = document.getElementById("editNama");
    const editNomorWa = document.getElementById("editNomorWa");
    const btnSimpanEdit = document.getElementById("btnSimpanEdit");
    const btnBatalEdit = document.getElementById("btnBatalEdit");
    let editIdSantri = null;
    
    // ============ FUNGSI TAB ============
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
    
    // Event klik tab
    tabSetoranBtn.onclick = aktifkanSetoran;
    tabSantriBtn.onclick = aktifkanSantri;
    if (tabDashboardBtn) tabDashboardBtn.onclick = aktifkanDashboard;
    
    // ============ FUNGSI MODAL ============
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
    
    // ============ LOAD SANTRI ============
    async function loadSantri() {
        try {
            const res = await fetch(`${BASE_URL}/api/santri`);
            const data = await res.json();
            daftarSantri = data;
            
            const tbody = document.getElementById("santriTableBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4">Belum ada data santri</td></tr>';
                } else {
                    data.forEach(s => {
                        const row = tbody.insertRow();
                        row.insertCell(0).innerHTML = s.id;
                        row.insertCell(1).innerHTML = s.nama_santri;
                        row.insertCell(2).innerHTML = s.nomor_wa_orangtua;
                        const btnCell = row.insertCell(3);
                        
                        const editBtn = document.createElement("button");
                        editBtn.innerHTML = "✏️ Edit";
                        editBtn.className = "edit-btn";
                        editBtn.onclick = () => bukaEditModal(s.id, s.nama_santri, s.nomor_wa_orangtua);
                        btnCell.appendChild(editBtn);
                        
                        const delBtn = document.createElement("button");
                        delBtn.innerHTML = "🗑️ Hapus";
                        delBtn.className = "delete-btn";
                        delBtn.onclick = () => hapusSantri(s.id);
                        btnCell.appendChild(delBtn);
                    });
                }
            }
            
            // Update dropdown pilih santri
            const select = document.getElementById("pilihSantri");
            if (select) {
                select.innerHTML = '<option value="">-- Pilih Nama Santri --</option>';
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
            console.error(err);
        }
    }
    
    async function hapusSantri(id) {
        if (confirm("Hapus santri ini?")) {
            await fetch(`${BASE_URL}/api/santri/${id}`, { method: "DELETE" });
            loadSantri();
            loadSetoran();
            loadDashboard();
        }
    }
    
    // ============ UPDATE NOMOR WA ============
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
                body: JSON.stringify({ nomor_wa_orangtua: nomorBaru })
            });
            alert("✓ Berhasil update!");
            tutupModal();
            loadSantri();
        };
    }
    if (btnBatalEdit) btnBatalEdit.onclick = tutupModal;
    
    // ============ LOAD SETORAN ============
    const filterSantri = document.getElementById("filterSantri");
    const filterSurah = document.getElementById("filterSurah");
    const filterTglMulai = document.getElementById("filterTanggalMulai");
    const filterTglSampai = document.getElementById("filterTanggalSampai");
    const btnFilter = document.getElementById("btnFilter");
    const btnReset = document.getElementById("btnResetFilter");
    
    async function loadSetoran() {
        try {
            let url = `${BASE_URL}/api/setoran/filter?`;
            if (filterSantri?.value) url += `santri=${encodeURIComponent(filterSantri.value)}&`;
            if (filterSurah?.value) url += `surah=${encodeURIComponent(filterSurah.value)}&`;
            if (filterTglMulai?.value) url += `tanggal_mulai=${filterTglMulai.value}&`;
            if (filterTglSampai?.value) url += `tanggal_sampai=${filterTglSampai.value}&`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            const tbody = document.getElementById("tableBody");
            if (tbody) {
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6">Tidak ada data</td></tr>';
                } else {
                    data.forEach(item => {
                        const row = tbody.insertRow();
                        row.insertCell(0).innerHTML = item.nama;
                        row.insertCell(1).innerHTML = item.surah;
                        row.insertCell(2).innerHTML = item.ayat;
                        row.insertCell(3).innerHTML = item.nilai;
                        row.insertCell(4).innerHTML = item.keterangan;
                        const btn = document.createElement("button");
                        btn.innerHTML = "🗑️ Hapus";
                        btn.className = "delete-btn";
                        btn.onclick = () => hapusSetoran(item.id);
                        row.insertCell(5).appendChild(btn);
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }
    }
    
    async function hapusSetoran(id) {
        if (confirm("Hapus setoran ini?")) {
            await fetch(`${BASE_URL}/api/setoran/${id}`, { method: "DELETE" });
            loadSetoran();
            loadDashboard();
        }
    }
    
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
    
    // ============ DASHBOARD ============
async function loadDashboard() {
    try {
        const res = await fetch(`${BASE_URL}/api/dashboard`);
        const data = await res.json();
        
        const tbody = document.getElementById("dashboardBody");
        if (tbody) {
            tbody.innerHTML = "";
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10">Belum ada data setoran</td></tr>';
            } else {
                data.forEach((item, i) => {
                    const row = tbody.insertRow();
                    row.insertCell(0).innerHTML = i + 1;
                    row.insertCell(1).innerHTML = item.nama;
                    row.insertCell(2).innerHTML = item.total_setoran;
                    row.insertCell(3).innerHTML = item.rata_rata;
                    row.insertCell(4).innerHTML = item.nilai_tertinggi;
                    row.insertCell(5).innerHTML = item.nilai_terendah;
                    
                    // Format tanggal terakhir setor
                    let tglTerakhir = "-";
                    if (item.terakhir_setor) {
                        const tanggal = new Date(item.terakhir_setor);
                        tglTerakhir = tanggal.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                    }
                    row.insertCell(6).innerHTML = tglTerakhir;
                    
                    // Status setoran hari ini
                    let badgeHariIni = '';
                    if (item.setoran_hari_ini > 0) {
                        badgeHariIni = `<span style="background:#10b981; color:white; padding:4px 10px; border-radius:20px; font-size:12px;">✅ Setor ${item.setoran_hari_ini}x hari ini</span>`;
                    } else {
                        badgeHariIni = `<span style="background:#ef4444; color:white; padding:4px 10px; border-radius:20px; font-size:12px;">❌ Belum setor hari ini</span>`;
                    }
                    row.insertCell(7).innerHTML = badgeHariIni;
                    
                    // Predikat
                    let predikat = "";
                    if (item.rata_rata >= 85) predikat = "🏆 Sangat Baik";
                    else if (item.rata_rata >= 70) predikat = "👍 Baik";
                    else if (item.rata_rata >= 60) predikat = "📖 Cukup";
                    else predikat = "⚠️ Kurang";
                    row.insertCell(8).innerHTML = predikat;
                    
                    // Tombol hapus
                    const aksiCell = row.insertCell(9);
                    const safeNama = item.nama.replace(/'/g, "\\'");
                    aksiCell.innerHTML = `<button onclick="hapusTotalSetoran('${safeNama}')" style="background:#ff4d4d; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🗑️ Hapus Semua</button>`;
                    
                    if (i === 0) row.style.background = "#fef3c7";
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
}
    
    // Expose loadDashboard ke global agar bisa dipanggil dari hapusTotalSetoran
    window.loadDashboardGlobal = loadDashboard;
    
    // ============ TAMBAH SANTRI ============
    const tambahBtn = document.getElementById("tambahSantriBtn");
    if (tambahBtn) {
        tambahBtn.onclick = async () => {
            const nama = document.getElementById("namaSantriBaru").value;
            const wa = document.getElementById("nomorWaBaru").value;
            if (!nama || !wa) return alert("Isi semua!");
            if (!wa.match(/^62[0-9]{10,13}$/)) return alert("Format WA salah!");
            await fetch(`${BASE_URL}/api/santri`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nama_santri: nama, nomor_wa_orangtua: wa })
            });
            document.getElementById("namaSantriBaru").value = "";
            document.getElementById("nomorWaBaru").value = "";
            loadSantri();
        };
    }
    
    // ============ SIMPAN SETORAN ============
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const select = document.getElementById("pilihSantri");
            const nama = select.value;
            const wa = select.options[select.selectedIndex]?.getAttribute("data-nomor") || "";
            const surah = document.getElementById("surah").value;
            const ayat = document.getElementById("ayat").value;
            const nilai = document.getElementById("nilai").value;
            
            if (!nama || !wa || !surah || !ayat || !nilai) return alert("Isi semua!");
            
            let keterangan = "";
            if (nilai >= 85) keterangan = "A - Sangat Baik";
            else if (nilai >= 70) keterangan = "B - Baik";
            else if (nilai >= 60) keterangan = "C - Cukup";
            else keterangan = "D - Kurang";
            
            await fetch(`${BASE_URL}/api/setoran`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nama_santri: nama, nomor_wa_orangtua: wa, surah, ayat, nilai: parseInt(nilai), keterangan })
            });
            
            alert("✓ Data tersimpan!");
            const pesan = `LAPORAN SETORAN QURAN\n\nNama: ${nama}\nSurah: ${surah}\nAyat: ${ayat}\nNilai: ${nilai}\nKeterangan: ${keterangan}`;
            window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, '_blank');
            
            select.value = "";
            document.getElementById("surah").value = "";
            document.getElementById("ayat").value = "";
            document.getElementById("nilai").value = "";
            loadSetoran();
            loadDashboard();
        };
    }
    
    // ============ PDF HARIAN ============
    const pdfHarianBtn = document.getElementById("pdfHarianBtn");
    if (pdfHarianBtn) {
        pdfHarianBtn.onclick = async () => {
            const res = await fetch(`${BASE_URL}/api/rekap-pdf`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rekap_harian.pdf";
                a.click();
                URL.revokeObjectURL(url);
                alert("✓ PDF siap!");
            } else {
                alert("Gagal buat PDF atau belum ada data hari ini");
            }
        };
    }

    // ============ PDF REKAP BULANAN ============
    const btnRekapBulan = document.getElementById("btnRekapBulan");
    if (btnRekapBulan) {
        btnRekapBulan.onclick = async () => {
            const bulan = document.getElementById("bulanFilter")?.value;
            const tahun = document.getElementById("tahunFilter")?.value;
            if (!bulan || !tahun) return alert("Pilih bulan dan tahun terlebih dahulu!");

            const res = await fetch(`${BASE_URL}/api/rekap-pdf-bulanan?tahun=${tahun}&bulan=${bulan}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `rekap_bulanan_${tahun}_${String(bulan).padStart(2,'0')}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                alert("✓ PDF Rekap Bulanan siap!");
            } else {
                alert("Gagal buat PDF atau tidak ada data pada bulan tersebut");
            }
        };
    }

    // ============ HAPUS REKAPAN BULANAN ============
    const btnHapusRekapanBulan = document.getElementById("btnHapusRekapanBulan");
    if (btnHapusRekapanBulan) {
        btnHapusRekapanBulan.onclick = async () => {
            const bulan = document.getElementById("bulanFilter")?.value;
            const tahun = document.getElementById("tahunFilter")?.value;
            if (!bulan || !tahun) return alert("Pilih bulan dan tahun terlebih dahulu!");

            const namaBulan = document.getElementById("bulanFilter").options[document.getElementById("bulanFilter").selectedIndex].text;
            if (!confirm(`Hapus semua data setoran bulan ${namaBulan} ${tahun}? Tindakan ini tidak bisa dibatalkan!`)) return;

            const res = await fetch(`${BASE_URL}/api/hapus-rekapan-bulan/${tahun}/${bulan}`, { method: "DELETE" });
            const data = await res.json();
            alert(data.message || "Selesai");
            loadSetoran();
            loadDashboard();
        };
    }

    // ============ LOAD DATA AWAL ============
    loadSantri();
    loadSetoran();
    loadDashboard();
    
    // ============ TUTUP MODAL ============
    window.onclick = (event) => {
        if (event.target === modal) tutupModal();
    };
    
});
