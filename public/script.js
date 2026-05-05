const BASE_URL = window.location.origin;

document.addEventListener("DOMContentLoaded", function() {
    loadSantri();
    loadSetoran();
    loadDashboard();
    
    // Event filter
    document.getElementById("btnFilter")?.addEventListener("click", loadSetoran);
    document.getElementById("btnResetFilter")?.addEventListener("click", () => {
        document.getElementById("filterSantri").value = "";
        document.getElementById("filterSurah").value = "";
        document.getElementById("filterTanggalMulai").value = "";
        document.getElementById("filterTanggalSampai").value = "";
        loadSetoran();
    });
    
    // Simpan setoran
    document.getElementById("saveBtn")?.addEventListener("click", simpanSetoran);
    
    // Tambah santri
    document.getElementById("tambahSantriBtn")?.addEventListener("click", tambahSantri);
    
    // PDF
    document.getElementById("pdfHarianBtn")?.addEventListener("click", downloadPDF);
    
    // Tab
    document.getElementById("tabSetoranBtn")?.addEventListener("click", () => showTab("setoran"));
    document.getElementById("tabSantriBtn")?.addEventListener("click", () => showTab("santri"));
    document.getElementById("tabDashboardBtn")?.addEventListener("click", () => showTab("dashboard"));
});

function showTab(tab) {
    document.getElementById("tabSetoran").classList.toggle("active", tab === "setoran");
    document.getElementById("tabSantri").classList.toggle("active", tab === "santri");
    document.getElementById("tabDashboard").classList.toggle("active", tab === "dashboard");
    
    document.getElementById("tabSetoranBtn").classList.toggle("active", tab === "setoran");
    document.getElementById("tabSantriBtn").classList.toggle("active", tab === "santri");
    document.getElementById("tabDashboardBtn").classList.toggle("active", tab === "dashboard");
    
    if (tab === "santri") loadSantri();
    if (tab === "dashboard") loadDashboard();
}

async function loadSetoran() {
    try {
        let url = `${BASE_URL}/api/setoran/filter?`;
        const nama = document.getElementById("filterSantri")?.value;
        const surah = document.getElementById("filterSurah")?.value;
        const tglMulai = document.getElementById("filterTanggalMulai")?.value;
        const tglSampai = document.getElementById("filterTanggalSampai")?.value;
        
        if (nama && nama !== "") url += `santri=${encodeURIComponent(nama)}&`;
        if (surah && surah !== "") url += `surah=${encodeURIComponent(surah)}&`;
        if (tglMulai) url += `tanggal_mulai=${tglMulai}&`;
        if (tglSampai) url += `tanggal_sampai=${tglSampai}&`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const tbody = document.getElementById("tableBody");
        if (!tbody) return;
        
        if (!data.length || data.error) {
            tbody.innerHTML = '<tr><td colspan="7">Belum ada data setoran</td><tr>';
            return;
        }
        
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nama}</td>
                <td>${item.surah}</td>
                <td>${item.ayat}</td>
                <td>${item.nilai}</td>
                <td>${item.keterangan || (item.nilai >= 75 ? '✅ Lulus' : '❌ Perbaikan')}</td>
                <td>${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                <td><button class="delete-btn" onclick="hapusSetoran(${item.id})">🗑️ Hapus</button></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Error load setoran:", error);
        document.getElementById("tableBody").innerHTML = '</table><td colspan="7">Error loading data</td><tr>';
    }
}

async function simpanSetoran() {
    const select = document.getElementById("pilihSantri");
    const nama = select?.value;
    const wa = select?.options[select.selectedIndex]?.getAttribute("data-nomor") || "";
    const surah = document.getElementById("surah")?.value;
    const ayat = document.getElementById("ayat")?.value;
    const nilai = document.getElementById("nilai")?.value;
    
    if (!nama || !wa || !surah || !ayat || !nilai) {
        alert("Harap isi semua data!");
        return;
    }
    
    let keterangan = "";
    if (nilai >= 85) keterangan = "A - Sangat Baik";
    else if (nilai >= 70) keterangan = "B - Baik";
    else if (nilai >= 60) keterangan = "C - Cukup";
    else keterangan = "D - Kurang";
    
    try {
        const response = await fetch(`${BASE_URL}/api/setoran`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama_santri: nama, nomor_wa_orangtua: wa, surah, ayat, nilai: parseInt(nilai), keterangan })
        });
        
        const result = await response.json();
        if (result.success) {
            alert("✓ Setoran berhasil disimpan!");
            
            const pesan = `*LAPORAN SETORAN QURAN*\n\nNama: ${nama}\nSurah: ${surah}\nAyat: ${ayat}\nNilai: ${nilai}\nKeterangan: ${keterangan}`;
            window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, '_blank');
            
            select.value = "";
            document.getElementById("surah").value = "";
            document.getElementById("ayat").value = "";
            document.getElementById("nilai").value = "";
            
            loadSetoran();
            loadDashboard();  // ← Refresh dashboard
        } else {
            alert("Gagal menyimpan: " + result.error);
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
}

async function hapusSetoran(id) {
    if (confirm("Hapus setoran ini?")) {
        await fetch(`${BASE_URL}/api/setoran/${id}`, { method: "DELETE" });
        loadSetoran();
        loadDashboard();  // ← Refresh dashboard
    }
}

async function loadSantri() {
    try {
        const response = await fetch(`${BASE_URL}/api/santri`);
        const data = await response.json();
        
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
        
        const tbody = document.getElementById("santriTableBody");
        if (tbody) {
            tbody.innerHTML = data.map(s => `
                <tr>
                    <td>${s.id}</td>
                    <td>${s.nama_santri}</td>
                    <td>${s.nomor_wa_orangtua}</td>
                    <td>
                        <button class="edit-btn" onclick="editSantri(${s.id}, '${s.nama_santri}', '${s.nomor_wa_orangtua}')">✏️ Edit</button>
                        <button class="delete-btn" onclick="hapusSantri(${s.id})">🗑️ Hapus</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Error load santri:", error);
    }
}

async function tambahSantri() {
    const nama = document.getElementById("namaSantriBaru")?.value;
    const wa = document.getElementById("nomorWaBaru")?.value;
    
    if (!nama || !wa) {
        alert("Isi semua data!");
        return;
    }
    if (!wa.match(/^62[0-9]{10,13}$/)) {
        alert("Format WA salah! Contoh: 6281234567890");
        return;
    }
    
    await fetch(`${BASE_URL}/api/santri`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama_santri: nama, nomor_wa_orangtua: wa })
    });
    
    document.getElementById("namaSantriBaru").value = "";
    document.getElementById("nomorWaBaru").value = "";
    loadSantri();
}

async function hapusSantri(id) {
    if (confirm("Hapus santri ini?")) {
        await fetch(`${BASE_URL}/api/santri/${id}`, { method: "DELETE" });
        loadSantri();
        loadSetoran();
        loadDashboard();
    }
}

function editSantri(id, nama, nomorWa) {
    const nomorBaru = prompt("Edit nomor WA:", nomorWa);
    if (nomorBaru && nomorBaru.match(/^62[0-9]{10,13}$/)) {
        fetch(`${BASE_URL}/api/santri/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nomor_wa_orangtua: nomorBaru })
        }).then(() => loadSantri());
    } else if (nomorBaru) {
        alert("Format WA salah!");
    }
}

async function loadDashboard() {
    try {
        console.log("Loading dashboard...");
        const response = await fetch(`${BASE_URL}/api/dashboard`);
        const data = await response.json();
        
        console.log("Dashboard data:", data);
        
        const tbody = document.getElementById("dashboardBody");
        if (!tbody) return;
        
        if (!data.length || data.error) {
            tbody.innerHTML = '<tr><td colspan="7">Belum ada data setoran</td><tr>';
            return;
        }
        
        tbody.innerHTML = data.map((item, i) => {
            let predikat = "";
            const rataRata = parseFloat(item.rata_rata);
            if (rataRata >= 85) predikat = "🏆 Sangat Baik";
            else if (rataRata >= 70) predikat = "👍 Baik";
            else if (rataRata >= 60) predikat = "📖 Cukup";
            else predikat = "⚠️ Kurang";
            
            return `
                <tr ${i === 0 ? 'style="background:#fef3c7"' : ''}>
                    <td>${i + 1}</td>
                    <td>${item.nama}</td>
                    <td>${item.total_setoran}</td>
                    <td>${rataRata}</td>
                    <td>${item.nilai_tertinggi}</td>
                    <td>${item.nilai_terendah}</td>
                    <td>${predikat}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Error load dashboard:", error);
        document.getElementById("dashboardBody").innerHTML = '<tr><td colspan="7">Error loading data</td><tr>';
    }
}

function downloadPDF() {
    window.open(`${BASE_URL}/api/rekap-pdf`, '_blank');
}
