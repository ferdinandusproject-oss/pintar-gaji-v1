/**
 * ============================================================
 * PINTAR-Gaji — Frontend JavaScript
 * Arsitektur: SPA murni (session di memori, bukan di URL)
 * ============================================================
 */

// ════════════════════════════════════════════════════════
// STATE APLIKASI (di memori JS — bukan di URL, sesuai gas-spa-iframe)
// ════════════════════════════════════════════════════════
const AppState = {
  token: null, peran: null, nip: null, nama: null, unitKerja: null,
  currentPage: null,
  myProfileCache: null,
  pengajuanTypeSelected: null
};

const JENIS_LIST = [
  { key: 'Data Diri', icon: 'bi-person-vcard', desc: 'NIK, alamat, telepon, email notifikasi' },
  { key: 'Data Keluarga', icon: 'bi-people', desc: 'Anggota keluarga & tanggungan (KP4)' },
  { key: 'Pangkat/Golongan', icon: 'bi-award', desc: 'Kenaikan pangkat dan golongan ruang' },
  { key: 'Jabatan', icon: 'bi-briefcase', desc: 'Perubahan jabatan struktural/fungsional' },
  { key: 'Masa Kerja/KGB', icon: 'bi-clock-history', desc: 'Kenaikan gaji berkala' },
  { key: 'Satuan Kerja', icon: 'bi-building', desc: 'Mutasi unit kerja/puskesmas' }
];

// ── Daftar tetap Satuan Kerja & Pangkat/Golongan (dropdown, bukan isian bebas) ──
const UNIT_KERJA_LIST = [
  'Dinas Kesehatan', 'RSUD Amurang', 'Puskesmas Modoinding', 'Puskesmas Maesaan',
  'Puskesmas Tompasobaru', 'Puskesmas Poopo', 'Puskesmas Motoling', 'Puskesmas Motoling Barat',
  'Puskesmas Motoling Timur', 'Puskesmas Kumelembuai', 'Puskesmas Ongkaw', 'Puskesmas Tenga',
  'Puskesmas Amurang Barat', 'Puskesmas Amurang', 'Puskesmas Amurang Timur', 'Puskesmas Tumpaan',
  'Puskesmas Tatapaan', 'Puskesmas Tareran', 'Puskesmas Suluun'
];
const PANGKAT_GOLONGAN_LIST = [
  { golongan: 'I/a', pangkat: 'Juru Muda' },
  { golongan: 'I/b', pangkat: 'Juru Muda Tingkat I' },
  { golongan: 'I/c', pangkat: 'Juru' },
  { golongan: 'I/d', pangkat: 'Juru Tingkat I' },
  { golongan: 'II/a', pangkat: 'Pengatur Muda' },
  { golongan: 'II/b', pangkat: 'Pengatur Muda Tingkat I' },
  { golongan: 'II/c', pangkat: 'Pengatur' },
  { golongan: 'II/d', pangkat: 'Pengatur Tingkat I' },
  { golongan: 'III/a', pangkat: 'Penata Muda' },
  { golongan: 'III/b', pangkat: 'Penata Muda Tingkat I' },
  { golongan: 'III/c', pangkat: 'Penata' },
  { golongan: 'III/d', pangkat: 'Penata Tingkat I' },
  { golongan: 'IV/a', pangkat: 'Pembina' },
  { golongan: 'IV/b', pangkat: 'Pembina Tingkat I' },
  { golongan: 'IV/c', pangkat: 'Pembina Utama Muda' },
  { golongan: 'IV/d', pangkat: 'Pembina Utama Madya' },
  { golongan: 'IV/e', pangkat: 'Pembina Utama' }
];
function satuanKerjaSelectHtml(name, selected, elId) {
  return `<select class="form-select" name="${name}" ${elId ? `id="${elId}"` : ''} required>
    <option value="">— Pilih Satuan Kerja —</option>
    ${UNIT_KERJA_LIST.map(u => `<option value="${u}" ${u === selected ? 'selected' : ''}>${u}</option>`).join('')}
  </select>`;
}
/** Dropdown Golongan/Ruang yang otomatis mengisi field Pangkat (tersembunyi) berpasangan,
 *  dipakai di form pengajuan pegawai maupun form Kelola Pegawai (Super Admin). uid dipakai
 *  untuk membedakan beberapa baris pada halaman yang sama (mis. daftar riwayat Kelola Pegawai). */
function golonganSelectHtml(selectedGolongan, uid) {
  uid = uid || 'main';
  const found = PANGKAT_GOLONGAN_LIST.find(g => g.golongan === selectedGolongan);
  return `<select class="form-select" required onchange="onGolonganChange(this,'${uid}')">
      <option value="">— Pilih Golongan/Ruang —</option>
      ${PANGKAT_GOLONGAN_LIST.map(g => `<option value="${g.golongan}" data-pangkat="${g.pangkat}" ${g.golongan === selectedGolongan ? 'selected' : ''}>${g.golongan} — ${g.pangkat}</option>`).join('')}
    </select>
    <input type="hidden" name="Golongan" data-field="Golongan" id="golonganHidden_${uid}" value="${selectedGolongan || ''}">
    <input type="hidden" name="Pangkat" data-field="Pangkat" id="pangkatHidden_${uid}" value="${found ? found.pangkat : ''}">
    <div class="text-muted-pg" style="font-size:12px;margin-top:4px;" id="pangkatPreview_${uid}">${found ? 'Pangkat: ' + found.pangkat : ''}</div>`;
}
function onGolonganChange(sel, uid) {
  const opt = sel.options[sel.selectedIndex];
  const pangkat = opt ? (opt.getAttribute('data-pangkat') || '') : '';
  const hG = document.getElementById('golonganHidden_' + uid);
  const hP = document.getElementById('pangkatHidden_' + uid);
  const prev = document.getElementById('pangkatPreview_' + uid);
  if (hG) hG.value = sel.value;
  if (hP) hP.value = pangkat;
  if (prev) prev.textContent = pangkat ? ('Pangkat: ' + pangkat) : '';
}

// ════════════════════════════════════════════════════════
// DROPDOWN AKUN (sidebar admin & topbar/mobile pegawai) + MODAL UBAH PASSWORD
// ════════════════════════════════════════════════════════
function toggleSidebarUserMenu() {
  closeAllDropdowns('sidebarUserMenu');
  document.getElementById('sidebarUserMenu').classList.toggle('show');
}
function toggleDesktopUserMenu() {
  closeAllDropdowns('desktopUserMenu');
  document.getElementById('desktopUserMenu').classList.toggle('show');
}
function closeAllDropdowns(except) {
  ['sidebarUserMenu', 'desktopUserMenu'].forEach(id => {
    if (id === except) return;
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('#sidebarUserToggle') && !e.target.closest('#sidebarUserMenu')) {
    const el = document.getElementById('sidebarUserMenu'); if (el) el.classList.remove('show');
  }
  if (!e.target.closest('#desktopAvatarChip') && !e.target.closest('#desktopUserMenu')) {
    const el = document.getElementById('desktopUserMenu'); if (el) el.classList.remove('show');
  }
  if (!e.target.closest('.topbar-mobile') && !e.target.closest('#mobileNavPanel')) {
    const el = document.getElementById('mobileNavPanel'); if (el) el.classList.remove('show');
  }
});

function updateAccountIdentityUI() {
  const roleLabel = { SuperAdmin: 'Super Admin', Admin: 'Admin', AdminUnit: 'Admin Unit Kerja', User: 'Pegawai' }[AppState.peran] || AppState.peran;
  const ini = initials(AppState.nama);
  const elAvatar = document.getElementById('sidebarUserAvatar'); if (elAvatar) elAvatar.textContent = ini;
  const elName = document.getElementById('sidebarUserName'); if (elName) elName.textContent = AppState.nama || '-';
  const elRole = document.getElementById('sidebarUserRole'); if (elRole) elRole.textContent = roleLabel + (AppState.peran === 'AdminUnit' && AppState.unitKerja ? ' — ' + AppState.unitKerja : '');
  const dName = document.getElementById('desktopUserName'); if (dName) dName.textContent = (AppState.nama || '-') + ' · ' + roleLabel;
}

function openChangePasswordModal() {
  closeMobileMenus(); closeAllDropdowns();
  const form = document.getElementById('changePasswordForm');
  if (form) form.reset();
  new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
}
function submitChangePassword(event) {
  event.preventDefault();
  const oldP = document.getElementById('cpOldPassword').value;
  const newP = document.getElementById('cpNewPassword').value;
  const confirmP = document.getElementById('cpConfirmPassword').value;
  if (newP !== confirmP) { showToast('Konfirmasi password baru tidak cocok.', 'warning'); return; }
  if (newP.length < 4) { showToast('Password baru minimal 4 karakter.', 'warning'); return; }
  const btn = document.getElementById('cpSubmitBtn');
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...'; btn.disabled = true;
  google.script.run
    .withSuccessHandler(res => {
      btn.innerHTML = original; btn.disabled = false;
      if (res.success) {
        showToast(res.message, 'success');
        const modalEl = document.getElementById('changePasswordModal');
        const inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide();
      } else showToast(res.message, 'danger');
    })
    .withFailureHandler(err => { btn.innerHTML = original; btn.disabled = false; showToast(err.message, 'danger'); })
    .changeOwnPassword(AppState.token, oldP, newP);
}

/** Super Admin: reset password pengguna manapun (Pegawai/Admin Unit Kerja, dicari via Username —
 *  untuk Pegawai, Username = NIP). Dipakai dari Kelola Pegawai & Kelola Admin Unit Kerja. */
function openResetPasswordModal(username, label) {
  document.getElementById('confirmModalTitle').textContent = 'Reset Password: ' + label;
  document.getElementById('confirmModalBody').innerHTML = `<label class="form-label">Password Baru <span class="required-asterisk">*</span></label>
    <input type="password" class="form-control" id="resetPasswordInput" minlength="4" placeholder="Minimal 4 karakter">`;
  const btn = document.getElementById('confirmModalBtn');
  btn.className = 'btn btn-accent';
  btn.textContent = 'Reset Password';
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  btn.onclick = () => {
    const newPassword = document.getElementById('resetPasswordInput').value;
    if (!newPassword || newPassword.length < 4) { showToast('Password baru minimal 4 karakter.', 'warning'); return; }
    modal.hide();
    google.script.run.withSuccessHandler(res => {
      if (res.success) showToast(res.message, 'success'); else showToast(res.message, 'danger');
    }).withFailureHandler(err => showToast(err.message, 'danger')).resetUserPassword(AppState.token, username, newPassword);
  };
  modal.show();
}

// ════════════════════════════════════════════════════════
// INISIALISASI
// ════════════════════════════════════════════════════════
// Kunci penyimpanan token sesi. Memakai sessionStorage (bukan localStorage) agar sesi tetap
// bertahan saat halaman di-reload/refresh, tapi otomatis hilang saat tab/browser ditutup —
// dan token tetap divalidasi ulang ke server setiap kali (lihat tryRestoreSession), sehingga
// sesi yang sudah kedaluwarsa/dilogout tetap ditolak. Keamanan tidak berkurang.
const SESSION_STORAGE_KEY = 'pintarGajiSessionToken';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  tryRestoreSession();
});

// ════════════════════════════════════════════════════════
// MODE MALAM / TERANG (dark mode) — preferensi disimpan per-perangkat (localStorage),
// diterapkan lewat atribut data-theme di <html> sehingga seluruh token warna CSS
// (lihat Stylesheet.html) otomatis menyesuaikan, termasuk sebelum login.
// ════════════════════════════════════════════════════════
function initTheme() {
  let theme = 'light';
  try { theme = localStorage.getItem('pintarGajiTheme') || 'light'; } catch (e) { /* storage diblokir, abaikan */ }
  applyTheme(theme, true);
}
function applyTheme(theme, silent) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('pintarGajiTheme', theme); } catch (e) {}
  document.querySelectorAll('.theme-toggle-icon').forEach(el => {
    el.className = 'bi ' + (theme === 'dark' ? 'bi-sun' : 'bi-moon-stars') + ' theme-toggle-icon';
  });
  document.querySelectorAll('.theme-toggle-label').forEach(el => {
    el.textContent = theme === 'dark' ? 'Mode Terang' : 'Mode Malam';
  });
  if (!silent) rerenderChartsForTheme();
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  closeAllDropdowns();
}
/** Chart.js menggambar warna grid/teks langsung ke canvas (bukan via CSS), jadi saat tema
 *  berganti, grafik yang sedang tampil perlu digambar ulang agar warnanya ikut menyesuaikan. */
function rerenderChartsForTheme() {
  if (AppState.currentPage === 'adminDashboard' && typeof loadAdminDashboard === 'function') {
    loadAdminDashboard();
  }
}

function tryRestoreSession() {
  let savedToken = null;
  try { savedToken = sessionStorage.getItem(SESSION_STORAGE_KEY); } catch (e) { /* storage diblokir, abaikan */ }

  if (!savedToken) {
    setTimeout(() => {
      document.getElementById('loadingOverlay').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
    }, 400);
    return;
  }

  // Validasi ulang ke server — token yang sudah kedaluwarsa/dilogout akan ditolak di sini.
  google.script.run
    .withSuccessHandler(s => {
      if (s && s.valid) {
        AppState.token = savedToken;
        AppState.peran = s.peran;
        AppState.nip = s.nip;
        AppState.nama = s.nama;
        AppState.unitKerja = s.unitKerja || null;
        document.getElementById('loadingOverlay').style.display = 'none';
        enterApp();
      } else {
        clearSavedSession();
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
      }
    })
    .withFailureHandler(() => {
      clearSavedSession();
      document.getElementById('loadingOverlay').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
    })
    .validateSession(savedToken);
}

function clearSavedSession() {
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) {}
}

// ════════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ════════════════════════════════════════════════════════
function togglePasswordVisibility() {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('pwEyeIcon');
  if (input.type === 'password') { input.type = 'text'; icon.className = 'bi bi-eye-slash'; }
  else { input.type = 'password'; icon.className = 'bi bi-eye'; }
}

function handleLogin(event) {
  event.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!identifier || !password) { showToast('Isi semua kolom.', 'warning'); return; }

  const btn = document.getElementById('loginBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-inline"></span> Memproses...';
  btn.disabled = true;

  google.script.run
    .withSuccessHandler(res => {
      btn.innerHTML = original; btn.disabled = false;
      if (!res) { showToast('Server tidak memberikan respons. Pastikan aplikasi sudah di-deploy ulang (New deployment) dan coba lagi.', 'danger'); return; }
      if (res.success) {
        AppState.token = res.data.token;
        AppState.peran = res.data.peran;
        AppState.nip = res.data.nip;
        AppState.nama = res.data.nama;
        AppState.unitKerja = res.data.unitKerja || null;
        try { sessionStorage.setItem(SESSION_STORAGE_KEY, res.data.token); } catch (e) {}
        enterApp();
      } else {
        showToast(res.message, 'danger');
      }
    })
    .withFailureHandler(err => {
      btn.innerHTML = original; btn.disabled = false;
      showToast('Terjadi kesalahan: ' + err.message, 'danger');
    })
    .doLogin(identifier, password);
}

function handleLogout() {
  google.script.run.doLogout(AppState.token);
  AppState.token = null; AppState.peran = null; AppState.nip = null; AppState.unitKerja = null; AppState.myProfileCache = null;
  clearSavedSession();
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginForm').reset();
  document.body.className = '';
}

function enterApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';
  updateAccountIdentityUI();

  if (AppState.peran === 'User') {
    document.body.className = 'role-pegawai';
    document.getElementById('topbarPegawai').style.display = 'block';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('topbarAdminMobile').style.display = 'none';
    navigateTo('pegawaiDashboard');
  } else if (AppState.peran === 'AdminUnit') {
    // Admin Unit Kerja: sidebar sama dengan Admin, tapi menunya dipersempit — hanya
    // "Dashboard" (Round 6 — item 10, dibatasi ke unit kerjanya) dan "Data Pegawai"
    // (dibatasi ke unit kerjanya sendiri oleh server).
    document.body.className = 'role-admin';
    document.getElementById('sidebar').style.display = 'flex';
    document.getElementById('topbarPegawai').style.display = 'none';
    document.getElementById('topbarAdminMobile').style.display = 'flex';
    document.getElementById('navKelolaPegawai').style.display = 'none';
    document.getElementById('navKelolaAdminUnit').style.display = 'none';
    // Round 6 — item 10: Dashboard Admin Unit Kerja (statistik terbatas ke unit kerjanya
    // sendiri, lihat getDashboardData di Kode.gs) — menu ini sebelumnya disembunyikan total
    // untuk peran AdminUnit; sekarang ditampilkan sebagai halaman baru yang bisa dibuka,
    // TANPA mengubah halaman pendaratan default (tetap "Data Pegawai", lihat navigateTo di
    // bawah) sesuai permintaan agar kebiasaan Admin Unit yang sudah ada tidak berubah.
    document.getElementById('navAdminDashboard').style.display = 'block';
    document.getElementById('navPengajuanMasuk').style.display = 'none';
    document.getElementById('navRiwayatSeluruh').style.display = 'none';
    document.getElementById('navKelolaGaji').style.display = 'none';
    const subtitle = document.getElementById('sidebarSubtitle');
    if (subtitle) subtitle.textContent = 'Admin Unit — ' + (AppState.unitKerja || '-');
    navigateTo('dataPegawai');
  } else {
    document.body.className = 'role-admin';
    document.getElementById('sidebar').style.display = 'flex';
    document.getElementById('topbarPegawai').style.display = 'none';
    document.getElementById('topbarAdminMobile').style.display = 'flex';
    // Reset tampilan sidebar (berjaga-jaga jika sebelumnya ada sesi Admin Unit Kerja
    // di tab yang sama yang menyembunyikan beberapa menu ini).
    document.getElementById('navAdminDashboard').style.display = 'block';
    document.getElementById('navPengajuanMasuk').style.display = 'block';
    document.getElementById('navRiwayatSeluruh').style.display = 'block';
    document.getElementById('navKelolaPegawai').style.display = 'none';
    document.getElementById('navKelolaAdminUnit').style.display = 'none';
    document.getElementById('navKelolaGaji').style.display = 'none';
    const subtitleReset = document.getElementById('sidebarSubtitle');
    if (subtitleReset) subtitleReset.textContent = 'Panel Operator';
    if (AppState.peran === 'SuperAdmin') {
      document.getElementById('navKelolaPegawai').style.display = 'block';
      document.getElementById('navKelolaAdminUnit').style.display = 'block';
      document.getElementById('navKelolaGaji').style.display = 'block';
    }
    navigateTo('adminDashboard');
    refreshPendingBadge();
  }
}

// ════════════════════════════════════════════════════════
// ROUTER SPA — navigasi tanpa reload, tanpa URL parameter
// ════════════════════════════════════════════════════════
const PAGE_TITLES = {
  pegawaiDashboard: 'Portal', dataSaya: 'Data Saya', ajukanPilihJenis: 'Ajukan Perubahan',
  ajukanForm: 'Form Pengajuan', riwayatSaya: 'Riwayat Pengajuan',
  adminDashboard: 'Dashboard', dataPegawai: 'Data Pegawai', detailPegawai: 'Detail Pegawai',
  kelolaPegawai: 'Kelola Pegawai', pengajuanMasuk: 'Pengajuan Masuk', riwayatSeluruh: 'Riwayat Pengajuan',
  kelolaAdminUnit: 'Admin Unit Kerja', gajiSaya: 'Gaji Saya', kelolaGaji: 'Data Gaji'
};

function navigateTo(pageName, params) {
  AppState.currentPage = pageName;
  closeMobileMenus();

  document.querySelectorAll('.nav-link, .topbar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === pageName);
  });
  const title = PAGE_TITLES[pageName] || 'PINTAR-Gaji';
  const mTitle1 = document.getElementById('pageTitleMobile'); if (mTitle1) mTitle1.textContent = title;
  const mTitle2 = document.getElementById('pageTitleAdminMobile'); if (mTitle2) mTitle2.textContent = title;

  const container = document.getElementById('app-container');
  container.innerHTML = renderSkeleton();
  window.scrollTo(0, 0);

  switch (pageName) {
    case 'pegawaiDashboard': loadPegawaiDashboard(); break;
    case 'dataSaya': loadDataSaya(); break;
    case 'ajukanPilihJenis': renderAjukanPilihJenis(params && params.targetNip); break;
    case 'ajukanForm': renderAjukanForm(params && params.jenis, params && params.targetNip); break;
    case 'riwayatSaya': loadRiwayatSaya(); break;
    case 'adminDashboard': loadAdminDashboard(); break;
    case 'dataPegawai': loadDataPegawai(); break;
    case 'detailPegawai': loadDetailPegawai(params && params.nip); break;
    case 'kelolaPegawai': renderKelolaPegawai(params && params.nip, params && params.mode); break;
    case 'pengajuanMasuk': loadPengajuanMasuk(); break;
    case 'riwayatSeluruh': loadRiwayatSeluruh(); break;
    case 'kelolaAdminUnit': renderKelolaAdminUnit(params && params.username, params && params.mode); break;
    case 'gajiSaya': loadGajiSaya(); break;
    case 'kelolaGaji': loadKelolaGaji(params && params.nip); break;
    default: container.innerHTML = '<p>Halaman tidak ditemukan.</p>';
  }
}

function renderSkeleton() {
  return `<div class="skeleton" style="height:28px;width:220px;margin-bottom:20px;"></div>
    <div class="row g-3 mb-4">
      ${[1,2,3].map(() => '<div class="col-md-4"><div class="skeleton" style="height:90px;border-radius:16px;"></div></div>').join('')}
    </div>
    <div class="skeleton" style="height:280px;border-radius:16px;"></div>`;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeMobileMenus;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('show');
}
function toggleMobileMenu() {
  const panel = document.getElementById('mobileNavPanel');
  if (panel) panel.classList.toggle('show');
}
function closeMobileMenus() {
  document.getElementById('sidebar').classList.remove('show');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('show');
  const mobilePanel = document.getElementById('mobileNavPanel');
  if (mobilePanel) mobilePanel.classList.remove('show');
  closeAllDropdowns();
}

// ════════════════════════════════════════════════════════
// UTILITAS UI
// ════════════════════════════════════════════════════════
/** Jalankan ulang render (mis. saat mengetik di kolom cari) TANPA kehilangan fokus/posisi
 *  kursor pada input yang sedang aktif — sebelumnya setiap ketik 1 huruf, seluruh
 *  #app-container diganti innerHTML-nya sehingga elemen <input> lama dibuang dan dibuat
 *  ulang dari nol, membuat fokus hilang dan pengguna harus klik ulang ke kolom cari. */
function rerenderPreserveFocus(renderFn) {
  const active = document.activeElement;
  const id = active && active.id;
  const hasSelection = active && typeof active.selectionStart === 'number';
  const selStart = hasSelection ? active.selectionStart : null;
  const selEnd = hasSelection ? active.selectionEnd : null;
  renderFn();
  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (selStart !== null && el.setSelectionRange) {
        try { el.setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
  }
}

function showToast(message, type = 'info') {
  const toastEl = document.getElementById('appToast');
  const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  document.getElementById('toastBody').innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> <span>${message}</span>`;
  toastEl.className = 'toast toast-' + type;
  new bootstrap.Toast(toastEl, { delay: 4000 }).show();
}

function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}
function statusPill(status) {
  const map = { Menunggu: 'warning', Disetujui: 'success', Ditolak: 'danger' };
  const cls = map[status] || 'neutral';
  const icons = { Menunggu: 'bi-clock', Disetujui: 'bi-check-circle', Ditolak: 'bi-x-circle' };
  return `<span class="pill pill-${cls}"><i class="bi ${icons[status] || ''}"></i> ${status}</span>`;
}
function initials(name) {
  if (!name) return '?';
  return name.replace(/^(dr\.|drg\.)\s*/i, '').trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function emptyState(icon, text, ctaHtml) {
  return `<div class="empty-state"><div class="icon-circle"><i class="bi ${icon}"></i></div><p>${text}</p>${ctaHtml || ''}</div>`;
}
function downloadBase64(base64, fileName, mime) {
  const link = document.createElement('a');
  link.href = 'data:' + mime + ';base64,' + base64;
  link.download = fileName;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
function openConfirmModal(title, body, onConfirm, danger) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalBody').textContent = body;
  const btn = document.getElementById('confirmModalBtn');
  btn.className = danger ? 'btn btn-danger-fill' : 'btn btn-accent';
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  btn.onclick = () => { modal.hide(); onConfirm(); };
  modal.show();
}

/** Round 5 — item 5: pratinjau dokumen pendukung Pengajuan Masuk dalam pop-up di dalam
 *  aplikasi, dilengkapi tombol "Unduh" / "Buka di Tab Baru" yang membuka URL asli (Drive) di
 *  tab baru. PDF ditampilkan lewat iframe Google Drive preview; gambar lewat <img> langsung;
 *  tipe lain (jarang terjadi — dokumen pendukung selalu diunggah sebagai PDF) jatuh kembali ke
 *  pesan + tombol Unduh saja. `url` adalah URL Drive (file.getUrl()), format
 *  ".../file/d/FILE_ID/view...". */
function openPreviewModal(url, label) {
  if (!url) { showToast('Dokumen tidak tersedia.', 'warning'); return; }
  const content = document.getElementById('previewContent');
  const downloadBtn = document.getElementById('downloadBtn');
  const titleEl = document.querySelector('#previewModal .modal-title');
  if (titleEl) titleEl.textContent = 'Pratinjau Dokumen' + (label ? ' — ' + label : '');
  downloadBtn.href = url;
  downloadBtn.setAttribute('target', '_blank');
  const fileIdMatch = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  const isImage = /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
  if (isImage) {
    content.innerHTML = `<img src="${url}" style="max-width:100%;max-height:70vh;border-radius:8px;" alt="${label || 'Dokumen'}">`;
  } else if (fileIdMatch) {
    const previewUrl = 'https://drive.google.com/file/d/' + fileIdMatch[1] + '/preview';
    content.innerHTML = `<iframe src="${previewUrl}" style="width:100%;height:70vh;border:none;border-radius:8px;" allow="autoplay"></iframe>`;
  } else {
    content.innerHTML = `<div class="text-muted-pg" style="padding:24px;">Pratinjau tidak tersedia untuk tipe dokumen ini. Gunakan tombol "Unduh" di bawah untuk membukanya di tab baru.</div>`;
  }
  new bootstrap.Modal(document.getElementById('previewModal')).show();
}

// ════════════════════════════════════════════════════════
// BAGIAN PEGAWAI — DASHBOARD
// ════════════════════════════════════════════════════════
function loadPegawaiDashboard() {
  const retry = 'loadPegawaiDashboard()';
  startWatchdog('pegawaiDashboard', retry);
  google.script.run
    .withSuccessHandler(safeHandler('pegawaiDashboard', retry, res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      AppState.myProfileCache = res.data;
      safeRender(() => renderPegawaiDashboard(res.data), retry);
      // Dipanggil setelah #recentActivityList benar-benar ada di DOM (bukan paralel),
      // supaya hasilnya tidak pernah "hilang" karena elemen belum sempat dirender.
      loadRecentActivity();
      loadChildAgeReminders();
    }))
    .withFailureHandler(safeFailure('pegawaiDashboard', retry))
    .getMyData(AppState.token);
}

/** Memuat "Aktivitas & Pengajuan Terakhir" secara mandiri dari watchdog dashboard utama,
 *  dengan timeout & null-guard sendiri yang hanya mengganti isi #recentActivityList
 *  (bukan seluruh #app-container) — sebelumnya tidak ada penjagaan ini sama sekali
 *  sehingga ketika res bernilai null/undefined, bagian ini macet selamanya di skeleton. */
function loadRecentActivity() {
  let settled = false;
  const showError = (message) => {
    if (settled) return; settled = true;
    const el = document.getElementById('recentActivityList');
    if (!el) return;
    el.innerHTML = `<div class="empty-state" style="padding:28px 20px;">
      <div class="icon-circle"><i class="bi bi-exclamation-triangle"></i></div>
      <p style="margin-bottom:12px;">${message}</p>
      <button class="btn btn-outline-pg btn-sm-pg" onclick="loadRecentActivity()">Coba Lagi</button>
    </div>`;
  };
  const timeoutId = setTimeout(() => showError('Memuat aktivitas terbaru memakan waktu lebih lama dari biasanya. Silakan coba lagi.'), 15000);

  google.script.run
    .withSuccessHandler(res => {
      if (settled) return; settled = true; clearTimeout(timeoutId);
      if (!res || !res.success) { showError((res && res.message) || 'Gagal memuat aktivitas terbaru.'); return; }
      try { renderRecentActivity(res.data.slice(0, 3)); }
      catch (e) { console.error(e); showError('Terjadi kesalahan saat menampilkan aktivitas terbaru.'); }
    })
    .withFailureHandler(err => {
      clearTimeout(timeoutId);
      showError('Gagal terhubung ke server: ' + (err && err.message ? err.message : err));
    })
    .getMyPengajuan(AppState.token);
}

function renderPegawaiDashboard(profile) {
  const p = profile.pegawai;
  const statusClass = p.StatusPegawai === 'PNS' ? 'pill-teal' : 'pill-amber';
  document.getElementById('app-container').innerHTML = `
    <div class="card-pg mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
          <span class="pill ${statusClass}">${p.StatusPegawai || '-'}</span>
          <span class="pill pill-neutral">NIP: ${p.NIP || '-'}</span>
        </div>
        <h2 style="font-size:22px;font-weight:700;">Selamat datang, ${p.NamaLengkap || '-'}</h2>
        <div class="text-muted-pg" style="font-size:13.5px;">${profile.jabatan[0] ? profile.jabatan[0].Jabatan : 'Jabatan belum tercatat'}</div>
      </div>
    </div>

    <div id="childAgeReminderBanner"></div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-md-4"><div class="stat-card"><div class="stat-icon teal"><i class="bi bi-hourglass-split"></i></div><div class="stat-value" id="statAktif">-</div><div class="stat-label">Pengajuan Aktif</div></div></div>
      <div class="col-6 col-md-4"><div class="stat-card"><div class="stat-icon green"><i class="bi bi-check-circle"></i></div><div class="stat-value" id="statDisetujui">-</div><div class="stat-label">Disetujui</div></div></div>
      <div class="col-6 col-md-4"><div class="stat-card"><div class="stat-icon red"><i class="bi bi-x-circle"></i></div><div class="stat-value" id="statDitolak">-</div><div class="stat-label">Ditolak</div></div></div>
    </div>

    <div class="row g-3 mb-4">
      ${quickActionCard('bi-person-lines-fill', 'Lihat Data Saya', "navigateTo('dataSaya')")}
      ${quickActionCard('bi-clock-history', 'Riwayat Pengajuan', "navigateTo('riwayatSaya')")}
      ${quickActionCard('bi-printer', 'Cetak Data', 'printMyData()')}
      ${quickActionCard('bi-question-circle', 'Pusat Bantuan', "showToast('Hubungi Operator Dinas untuk bantuan.', 'info')")}
    </div>

    <div class="card-pg">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">Aktivitas &amp; Pengajuan Terakhir</h3>
      <div id="recentActivityList"><div class="skeleton" style="height:60px;border-radius:12px;"></div></div>
    </div>
  `;
  recomputeStatsFromCache();
}

function quickActionCard(icon, label, onclick) {
  return `<div class="col-6 col-md-3">
    <div class="type-card hoverable" style="flex-direction:column;text-align:center;" onclick="${onclick}">
      <div class="type-icon" style="margin:0 auto"><i class="bi ${icon}"></i></div>
      <div style="font-size:13px;font-weight:700;margin-top:4px;">${label}</div>
    </div></div>`;
}

function recomputeStatsFromCache() {
  google.script.run.withSuccessHandler(res => {
    if (!res.success) return;
    const list = res.data;
    document.getElementById('statAktif').textContent = list.filter(p => p.Status === 'Menunggu').length;
    document.getElementById('statDisetujui').textContent = list.filter(p => p.Status === 'Disetujui').length;
    document.getElementById('statDitolak').textContent = list.filter(p => p.Status === 'Ditolak').length;
  }).getMyPengajuan(AppState.token);
}

function renderRecentActivity(items) {
  const el = document.getElementById('recentActivityList');
  if (!el) return;
  if (!items.length) { el.innerHTML = emptyState('bi-inbox', 'Belum ada pengajuan.'); return; }
  el.innerHTML = items.map(it => `
    <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--border)">
      <div class="d-flex align-items-center gap-3">
        <div class="type-icon" style="width:36px;height:36px;font-size:15px;"><i class="bi bi-file-earmark-text"></i></div>
        <div>
          <div style="font-weight:700;font-size:13.5px;">${it.JenisPengajuan}</div>
          <div class="text-muted-pg" style="font-size:12px;">${fmtDate(it.TanggalPengajuan)}</div>
        </div>
      </div>
      ${statusPill(it.Status)}
    </div>`).join('');
}

function printMyData() {
  showToast('Menyiapkan file PDF...', 'info');
  google.script.run.withSuccessHandler(res => {
    if (res.success) { downloadBase64(res.data.base64, res.data.fileName, 'application/pdf'); showToast('Data berhasil diunduh.', 'success'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => showToast(err.message, 'danger')).exportMyDataPDF(AppState.token);
}

// ════════════════════════════════════════════════════════
// BAGIAN PEGAWAI — DATA SAYA (tabbed)
// ════════════════════════════════════════════════════════
const DATA_SAYA_TABS = ['Data Diri', 'Data Keluarga', 'Pangkat/Golongan', 'Jabatan', 'Masa Kerja/KGB', 'Satuan Kerja', 'Riwayat Cuti'];

function loadDataSaya() {
  if (AppState.myProfileCache) { safeRender(() => renderDataSaya(AppState.myProfileCache, 'Data Diri'), 'loadDataSaya()'); return; }
  const retry = 'loadDataSaya()';
  startWatchdog('dataSaya', retry);
  google.script.run
    .withSuccessHandler(safeHandler('dataSaya', retry, res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      AppState.myProfileCache = res.data;
      safeRender(() => renderDataSaya(res.data, 'Data Diri'), retry);
    }))
    .withFailureHandler(safeFailure('dataSaya', retry))
    .getMyData(AppState.token);
}

function renderDataSaya(profile, activeTab) {
  const p = profile.pegawai;
  document.getElementById('app-container').innerHTML = `
    <div class="pg-breadcrumb"><a href="javascript:void(0)" onclick="navigateTo('pegawaiDashboard')">Portal</a> / Data Saya</div>
    <div class="card-pg mb-4 d-flex align-items-center gap-3 flex-wrap">
      <div class="avatar-initials" style="width:56px;height:56px;font-size:18px;">${initials(p.NamaLengkap)}</div>
      <div class="flex-grow-1">
        <h2 style="font-size:19px;font-weight:700;">${p.NamaLengkap || '-'}</h2>
        <div class="text-muted-pg" style="font-size:13px;">NIP ${p.NIP} &middot; ${p.StatusPegawai}</div>
      </div>
      <span class="pill pill-success"><i class="bi bi-patch-check-fill"></i> Terverifikasi</span>
    </div>
    <div class="card-pg">
      <div class="pg-tabs" id="dataSayaTabs">
        ${DATA_SAYA_TABS.map(t => `<button class="pg-tab ${t===activeTab?'active':''}" onclick="renderDataSaya(AppState.myProfileCache,'${t}')">${t}</button>`).join('')}
      </div>
      <div class="d-flex justify-content-end mb-2">
        <a href="javascript:void(0)" class="link-teal" style="font-size:13px;font-weight:600;" onclick="navigateTo('ajukanPilihJenis')">Ajukan Perubahan →</a>
      </div>
      <div id="dataSayaTabContent">${renderDataSayaTabContent(profile, activeTab)}</div>
    </div>
  `;
}

function renderDataSayaTabContent(profile, tab) {
  const p = profile.pegawai;
  if (tab === 'Data Diri') {
    const statusKeaktifanCls = p.StatusKeaktifan === 'Pensiun' ? 'pill-neutral' : (p.StatusKeaktifan === 'Pindah' ? 'pill-amber' : 'pill-success');
    return `<div class="row g-3">
      ${fieldBox('NIP', p.NIP)} ${fieldBox('Status Pegawai', p.StatusPegawai)}
      ${fieldBox('NIK', p.NIK)} ${fieldBox('Nama Lengkap', p.NamaLengkap)}
      ${fieldBox('Alamat', p.Alamat, 12)} ${fieldBox('Nomor Telepon', p.NomorTelepon)}
      ${fieldBox('Email Notifikasi', p.EmailNotifikasi)}
      <div class="col-md-6"><div class="field-box">
        <div class="field-label">Status Keaktifan</div>
        <div class="field-value"><span class="pill ${statusKeaktifanCls}">${p.StatusKeaktifan || 'Aktif'}</span></div>
      </div></div>
      <div class="col-md-6"><div class="field-box">
        <div class="field-label">Jenis Kelamin</div>
        <div class="field-value"><span class="pill pill-neutral">${(p.Gender && p.Gender !== '-') ? p.Gender : 'Belum Diisi'}</span></div>
      </div></div>
    </div>`;
  }
  if (tab === 'Data Keluarga') return simpleTable(['Nama','Tanggal Lahir','Hubungan','Pekerjaan','No. Surat Ket.','Dok. Pendidikan'],
    profile.keluarga.map(k => [k.Nama, fmtDate(k.TanggalLahir), k.HubunganKeluarga, k.Pekerjaan, k.NomorSuratKeterangan || '-',
      k.DokumenPendidikanUrl ? `<a href="javascript:void(0)" class="link-teal" onclick="openPreviewModal('${k.DokumenPendidikanUrl}','Dokumen Pendidikan — ${(k.Nama||'').replace(/'/g,"")}')">Lihat</a>` : '-']));
  if (tab === 'Pangkat/Golongan') return simpleTable(['Pangkat','Golongan','Masa Kerja','Tgl Ditetapkan','Tgl Berlaku','Nomor SK'],
    profile.pangkat.map(k => [k.Pangkat, k.Golongan, k.MasaKerja, fmtDate(k.TanggalDitetapkan), fmtDate(k.TanggalBerlaku), k.NomorSK]));
  if (tab === 'Jabatan') return simpleTable(['Jabatan','Tgl Ditetapkan','Tgl Berlaku','Nomor SK'],
    profile.jabatan.map(k => [k.Jabatan, fmtDate(k.TanggalDitetapkan), fmtDate(k.TanggalBerlaku), k.NomorSK]));
  if (tab === 'Masa Kerja/KGB') return simpleTable(['Masa Kerja Baru','Tgl Penetapan','Tgl Berlaku','Nomor SK'],
    profile.kgb.map(k => [k.MasaKerjaBaru, fmtDate(k.TanggalPenetapan), fmtDate(k.TanggalBerlaku), k.NomorSK]));
  if (tab === 'Satuan Kerja') return simpleTable(['Satuan Kerja','Tgl Penetapan','Tgl Berlaku','Nomor SK'],
    profile.satker.map(k => [k.SatuanKerja, fmtDate(k.TanggalPenetapan), fmtDate(k.TanggalBerlaku), k.NomorSK]));
  if (tab === 'Riwayat Cuti') return simpleTable(['Jenis Cuti','Tgl Mulai','Tgl Selesai','Jumlah Hari','Keterangan'],
    profile.cuti.map(k => [k.JenisCuti, fmtDate(k.TanggalMulai), fmtDate(k.TanggalSelesai), k.JumlahHari, k.Keterangan]));
  return '';
}

function fieldBox(label, value, colSize) {
  return `<div class="col-md-${colSize || 6}"><div class="field-box">
    <div class="field-label">${label}</div><div class="field-value">${value || '-'}</div>
  </div></div>`;
}
function simpleTable(headers, rows) {
  if (!rows.length) return emptyState('bi-inbox', 'Belum ada data tercatat.');
  return `<div class="table-pg-wrap"><table class="table-pg"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c != null && c !== '' ? c : '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function handleAuthError(res, retryCall) {
  if (!res) { renderErrorState('Server tidak memberikan respons. Silakan coba lagi.', retryCall); return; }
  if (res.message === 'SESSION_EXPIRED') { showToast('Sesi berakhir, silakan login kembali.', 'warning'); handleLogout(); return; }
  showToast(res.message || 'Terjadi kesalahan saat memuat data.', 'danger');
  renderErrorState(res.message, retryCall);
}

/** Menampilkan status error di #app-container (menggantikan skeleton yang tersangkut) agar halaman
 *  tidak "loading terus" ketika permintaan ke server gagal. */
function renderErrorState(message, retryCall) {
  const container = document.getElementById('app-container');
  if (!container) return;
  container.innerHTML = `
    <div class="card-pg">
      <div class="empty-state">
        <div class="icon-circle"><i class="bi bi-exclamation-triangle"></i></div>
        <p>${message || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.'}</p>
        ${retryCall ? `<button class="btn btn-accent btn-sm-pg" onclick="${retryCall}">Coba Lagi</button>` : ''}
      </div>
    </div>`;
}

/** Bungkus sebuah fungsi render agar error tak terduga (mis. field data yang tidak sesuai)
 *  tidak meninggalkan halaman tersangkut di skeleton loading tanpa pesan apa pun. */
function safeRender(renderFn, retryCall) {
  try {
    renderFn();
  } catch (e) {
    console.error(e);
    renderErrorState('Terjadi kesalahan saat menampilkan data: ' + e.message, retryCall);
  }
}

// ════════════════════════════════════════════════════════
// JARING PENGAMAN PEMANGGILAN SERVER (watchdog + null-guard)
// ------------------------------------------------------------
// GAS kadang tidak memanggil withSuccessHandler maupun withFailureHandler
// sama sekali (koneksi terputus, izin otorisasi berubah, dsb), atau
// memanggil handler dengan res = null. Tanpa penjagaan ini, halaman akan
// macet selamanya di skeleton loading tanpa pesan apa pun kepada pengguna.
// ════════════════════════════════════════════════════════
const _watchdogs = {};
function startWatchdog(key, retryCall, ms) {
  clearWatchdog(key);
  _watchdogs[key] = setTimeout(() => {
    delete _watchdogs[key];
    renderErrorState(
      'Permintaan ke server tidak merespons dalam waktu yang wajar. Pastikan koneksi internet stabil, lalu coba lagi. ' +
      'Jika masalah berlanjut, periksa log "Executions" di Apps Script Editor untuk detail errornya.',
      retryCall
    );
  }, ms || 15000);
}
function clearWatchdog(key) {
  if (_watchdogs[key]) { clearTimeout(_watchdogs[key]); delete _watchdogs[key]; }
}

/** Bungkus callback withSuccessHandler: membersihkan watchdog, menjaga res tidak null/undefined,
 *  dan menangkap error tak terduga di dalam callback itu sendiri (mis. field data tidak sesuai)
 *  sehingga tidak pernah ada "Uncaught ... Cannot read properties of null" yang membuat halaman diam. */
function safeHandler(watchdogKey, retryCall, onSuccess) {
  return function (res) {
    clearWatchdog(watchdogKey);
    try {
      if (res === null || res === undefined) {
        renderErrorState('Server tidak memberikan respons (kemungkinan sesi berakhir, izin otorisasi berubah, atau terjadi galat internal). Silakan muat ulang / login kembali.', retryCall);
        return;
      }
      onSuccess(res);
    } catch (e) {
      console.error(e);
      renderErrorState('Terjadi kesalahan saat memproses data: ' + e.message, retryCall);
    }
  };
}
/** Bungkus callback withFailureHandler dengan pembersihan watchdog. */
function safeFailure(watchdogKey, retryCall) {
  return function (err) {
    clearWatchdog(watchdogKey);
    renderErrorState('Gagal terhubung ke server: ' + (err && err.message ? err.message : err), retryCall);
  };
}

// ════════════════════════════════════════════════════════
// BAGIAN PEGAWAI — AJUKAN PERUBAHAN (pilih jenis + form)
// ════════════════════════════════════════════════════════
function renderAjukanPilihJenis(targetNip) {
  const isForOther = !!targetNip;
  const backPage = isForOther ? `navigateTo('detailPegawai',{nip:'${targetNip}'})` : "navigateTo('pegawaiDashboard')";
  document.getElementById('app-container').innerHTML = `
    <div class="pg-breadcrumb"><a href="javascript:void(0)" onclick="${backPage}">${isForOther ? 'Detail Pegawai' : 'Portal'}</a> / Ajukan Perubahan</div>
    <h2 style="font-size:22px;font-weight:700;margin-bottom:4px;">Ajukan Perubahan Data${isForOther ? ' — ' + (window.__detailProfileCache ? window.__detailProfileCache.pegawai.NamaLengkap : targetNip) : ''}</h2>
    <p class="text-muted-pg mb-4">Pilih jenis data yang ingin diperbarui.</p>
    <div class="row g-3">
      ${JENIS_LIST.map(j => `
        <div class="col-md-6">
          <div class="type-card hoverable" onclick="navigateTo('ajukanForm', {jenis:'${j.key}', targetNip:'${targetNip || ''}'})">
            <div class="type-icon"><i class="bi ${j.icon}"></i></div>
            <div class="flex-grow-1">
              <div style="font-weight:700;font-size:14.5px;">${j.key}</div>
              <div class="text-muted-pg" style="font-size:12.5px;">${j.desc}</div>
            </div>
            <i class="bi bi-chevron-right text-muted-pg"></i>
          </div>
        </div>`).join('')}
    </div>`;
}

let uploadedFile1 = null, uploadedFile2 = null;
let keluargaRows = [];
// Round 5 — item 2: Pasangan PNS + dokumen pendidikan per-anak (keyed by index di keluargaRows).
let keluargaExtra = { pasanganPNS: '', nipPasangan: '' };
let keluargaAnakFiles = {};
/** Hitung usia (tahun penuh) dari string/Date tanggal lahir — versi sisi klien dari calcAge()
 *  di Kode.gs, dipakai untuk menentukan kapan dokumen pendidikan anak wajib diunggah. */
function calcAgeClient(tanggalLahir) {
  if (!tanggalLahir) return null;
  const dob = new Date(tanggalLahir);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
function onKeluargaPasanganPNSChange(sel) {
  keluargaExtra.pasanganPNS = sel.value;
  const wrap = document.getElementById('keluargaNipPasanganWrap');
  if (wrap) wrap.style.display = sel.value === 'Ya' ? '' : 'none';
  if (sel.value !== 'Ya') { keluargaExtra.nipPasangan = ''; const inp = document.getElementById('keluargaNipPasangan'); if (inp) inp.value = ''; }
}

function renderAjukanForm(jenis, targetNip) {
  if (!jenis) { navigateTo('ajukanPilihJenis', { targetNip: targetNip }); return; }
  AppState.pengajuanTypeSelected = jenis;
  uploadedFile1 = null; uploadedFile2 = null;

  // Admin Unit Kerja mengajukan atas nama pegawai lain (targetNip) — profil diambil lewat
  // getPegawaiDetail (sudah dibatasi server ke unit kerjanya), bukan getMyData.
  const isForOther = !!targetNip;
  const profile = isForOther ? (window.__ajukanTargetProfile && window.__ajukanTargetProfile.NIP === targetNip ? window.__ajukanTargetProfile.data : null) : AppState.myProfileCache;
  if (!profile) {
    const retry = `navigateTo('ajukanForm',{jenis:'${jenis}',targetNip:'${targetNip || ''}'})`;
    startWatchdog('ajukanForm', retry);
    const handle = res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      if (isForOther) window.__ajukanTargetProfile = { NIP: targetNip, data: res.data };
      else AppState.myProfileCache = res.data;
      safeRender(() => renderAjukanForm(jenis, targetNip), retry);
    };
    const call = google.script.run.withSuccessHandler(safeHandler('ajukanForm', retry, handle)).withFailureHandler(safeFailure('ajukanForm', retry));
    if (isForOther) call.getPegawaiDetail(AppState.token, targetNip);
    else call.getMyData(AppState.token);
    return;
  }

  let dataSaatIniHtml = '', formFieldsHtml = '', dokumenHtml = '';

  if (jenis === 'Data Diri') {
    const p = profile.pegawai;
    dataSaatIniHtml = dataSaatIniBox([['NIK', p.NIK], ['Alamat', p.Alamat], ['No. Telepon', p.NomorTelepon]]);
    formFieldsHtml = `
      <div class="col-md-6">${inputField('NIK', 'NIK', p.NIK)}</div>
      <div class="col-md-6">${inputField('Nomor Telepon', 'NomorTelepon', p.NomorTelepon)}</div>
      <div class="col-md-12">${inputField('Alamat', 'Alamat', p.Alamat)}</div>
      <div class="col-md-6">${inputField('Email Notifikasi', 'EmailNotifikasi', p.EmailNotifikasi, 'email')}</div>`;
    dokumenHtml = singleDropzone('file1', 'Dokumen Pendukung (PDF)');
  } else if (jenis === 'Data Keluarga') {
    keluargaRows = profile.keluarga.map(k => Object.assign({}, k));
    keluargaAnakFiles = {};
    keluargaExtra = { pasanganPNS: profile.pegawai.PasanganPNS || '', nipPasangan: profile.pegawai.NIPPasangan || '' };
    dataSaatIniHtml = dataSaatIniBox([['Jumlah Anggota', profile.keluarga.length + ' orang'],
      ['Status Pernikahan', profile.pegawai.StatusPernikahan || '-'], ['Pasangan PNS', profile.pegawai.PasanganPNS || '-']]);
    // Round 5 — item 2: Pasangan PNS (otomatis minta NIP Pasangan jika "Ya") + anggota keluarga
    // (per-anak: Masih Pendidikan & dokumen Surat Keterangan Aktif Kuliah/Pendidikan, wajib
    // jika usia anak sudah di atas 21 tahun).
    // Round 6 — item 8: penempatan isian ditata ulang — "Data Pasangan" (status pernikahan +
    // Pasangan PNS + NIP Pasangan) dikelompokkan dalam sub-kartu tersendiri, terpisah dari
    // daftar anggota keluarga (yang sendiri sudah dikelompokkan lagi: non-Anak vs setiap Anak
    // sebagai sub-kartu masing-masing — lihat renderKeluargaRows).
    formFieldsHtml = `
      <div class="col-12">
        <div class="card-pg" style="background:var(--surface-alt);box-shadow:none;">
          <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--text-secondary);"><i class="bi bi-heart"></i> Data Pasangan</h4>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Status Pernikahan</label>
              <select class="form-select" id="keluargaStatusPernikahan">
                ${['', 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'].map(o => `<option value="${o}" ${ (profile.pegawai.StatusPernikahan || '') === o ? 'selected' : ''}>${o || '— Pilih —'}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Pasangan PNS?</label>
              <select class="form-select" id="keluargaPasanganPNS" onchange="onKeluargaPasanganPNSChange(this)">
                <option value="" ${!keluargaExtra.pasanganPNS ? 'selected' : ''}>— Pilih —</option>
                <option value="Ya" ${keluargaExtra.pasanganPNS === 'Ya' ? 'selected' : ''}>Ya</option>
                <option value="Tidak" ${keluargaExtra.pasanganPNS === 'Tidak' ? 'selected' : ''}>Tidak</option>
              </select>
            </div>
            <div class="col-md-4" id="keluargaNipPasanganWrap" style="${keluargaExtra.pasanganPNS === 'Ya' ? '' : 'display:none;'}">
              <label class="form-label">NIP Pasangan <span class="required-asterisk">*</span></label>
              <input type="text" class="form-control" id="keluargaNipPasangan" value="${keluargaExtra.nipPasangan || ''}" oninput="keluargaExtra.nipPasangan=this.value">
            </div>
          </div>
        </div>
      </div>
      <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 style="font-size:13px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:.03em;color:var(--text-secondary);"><i class="bi bi-people"></i> Anggota Keluarga</h4>
          <button type="button" class="btn btn-outline-pg btn-sm-pg" onclick="addKeluargaRow()"><i class="bi bi-plus-lg"></i> Tambah Anggota Keluarga</button>
        </div>
        <div id="keluargaRowsContainer">${renderKeluargaRows()}</div>
      </div>`;
    dokumenHtml = `<div class="row g-3">
      <div class="col-md-6">${singleDropzone('file1', 'KP4 (PDF)')}</div>
      <div class="col-md-6">${singleDropzone('file2', 'Kartu Keluarga (PDF)')}</div>
      </div>
      <div class="row g-3 mt-1" id="keluargaAnakDokumenContainer">${renderKeluargaAnakDokumenSlots()}</div>`;
  } else if (jenis === 'Pangkat/Golongan') {
    const c = profile.pangkat[0] || {};
    dataSaatIniHtml = dataSaatIniBox([['Pangkat', c.Pangkat], ['Golongan', c.Golongan], ['Masa Kerja', c.MasaKerja]]);
    formFieldsHtml = `
      <div class="col-md-6">
        <label class="form-label">Golongan/Ruang Baru <span class="required-asterisk">*</span></label>
        ${golonganSelectHtml('', 'ajukan')}
      </div>
      <div class="col-md-6">${inputField('Masa Kerja Baru', 'MasaKerja', '', 'text', 'Contoh: 6 Tahun 0 Bulan')}</div>
      <div class="col-md-6">${inputField('Nomor SK', 'NomorSK', '')}</div>
      <div class="col-md-6">${inputField('Tanggal Ditetapkan SK', 'TanggalDitetapkan', '', 'date')}</div>
      <div class="col-md-6">${inputField('Tanggal Berlaku (TMT)', 'TanggalBerlaku', '', 'date')}</div>`;
    dokumenHtml = singleDropzone('file1', 'Dokumen SK Pangkat (PDF)');
  } else if (jenis === 'Jabatan') {
    const c = profile.jabatan[0] || {};
    dataSaatIniHtml = dataSaatIniBox([['Jabatan', c.Jabatan]]);
    formFieldsHtml = `
      <div class="col-md-12">${inputField('Jabatan Baru', 'Jabatan', '')}</div>
      <div class="col-md-6">${inputField('Nomor SK', 'NomorSK', '')}</div>
      <div class="col-md-6">${inputField('Tanggal Ditetapkan', 'TanggalDitetapkan', '', 'date')}</div>
      <div class="col-md-6">${inputField('Tanggal Berlaku', 'TanggalBerlaku', '', 'date')}</div>`;
    dokumenHtml = singleDropzone('file1', 'Dokumen SK Jabatan (PDF)');
  } else if (jenis === 'Masa Kerja/KGB') {
    const c = profile.kgb[0] || {};
    dataSaatIniHtml = dataSaatIniBox([['Masa Kerja', c.MasaKerjaBaru]]);
    formFieldsHtml = `
      <div class="col-md-12">${inputField('Masa Kerja Baru', 'MasaKerjaBaru', '', 'text', 'Contoh: 16 Tahun 0 Bulan')}</div>
      <div class="col-md-6">${inputField('Nomor SK', 'NomorSK', '')}</div>
      <div class="col-md-6">${inputField('Tanggal Penetapan', 'TanggalPenetapan', '', 'date')}</div>
      <div class="col-md-6">${inputField('Tanggal Berlaku', 'TanggalBerlaku', '', 'date')}</div>`;
    dokumenHtml = singleDropzone('file1', 'Dokumen SK KGB (PDF)');
  } else if (jenis === 'Satuan Kerja') {
    const c = profile.satker[0] || {};
    dataSaatIniHtml = dataSaatIniBox([['Satuan Kerja', c.SatuanKerja]]);
    formFieldsHtml = `
      <div class="col-md-12">
        <label class="form-label">Satuan Kerja Baru <span class="required-asterisk">*</span></label>
        ${satuanKerjaSelectHtml('SatuanKerja', '')}
      </div>
      <div class="col-md-6">${inputField('Nomor SK', 'NomorSK', '')}</div>
      <div class="col-md-6">${inputField('Tanggal Penetapan', 'TanggalPenetapan', '', 'date')}</div>
      <div class="col-md-6">${inputField('Tanggal Berlaku', 'TanggalBerlaku', '', 'date')}</div>`;
    dokumenHtml = singleDropzone('file1', 'Dokumen SK Mutasi (PDF)');
  }

  const cancelPage = isForOther ? `navigateTo('detailPegawai',{nip:'${targetNip}'})` : "navigateTo('pegawaiDashboard')";
  document.getElementById('app-container').innerHTML = `
    <a href="javascript:void(0)" class="pg-breadcrumb" onclick="${cancelPage}"><i class="bi bi-arrow-left"></i> ${isForOther ? 'Kembali ke Detail Pegawai' : 'Kembali ke Dashboard'}</a>
    <h2 style="font-size:22px;font-weight:700;margin:8px 0 4px;">Ajukan Perubahan: ${jenis}${isForOther ? ' — ' + (profile.pegawai.NamaLengkap || targetNip) : ''}</h2>
    <p class="text-muted-pg mb-4">Lengkapi formulir di bawah ini untuk mengajukan pembaruan data ke bagian kepegawaian.</p>

    <div class="card-pg mb-4" style="background:var(--primary-light);border:none;">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div style="font-weight:700;font-size:14px;"><i class="bi bi-info-circle"></i> Data Saat Ini</div>
        <span class="pill pill-success">Terverifikasi</span>
      </div>
      <div class="row g-3">${dataSaatIniHtml}</div>
    </div>

    <form id="pengajuanForm" onsubmit="submitPengajuanForm(event, '${targetNip || ''}')">
      <div class="card-pg mb-4">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">Data Baru</h3>
        <div class="row g-3">${formFieldsHtml}</div>
      </div>
      <div class="card-pg mb-4">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">Dokumen Pendukung</h3>
        ${dokumenHtml}
      </div>
      <div class="sticky-actionbar">
        <div class="text-muted-pg" style="font-size:12.5px;"><i class="bi bi-shield-lock"></i> Data dikirim secara aman</div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-ghost" onclick="${cancelPage}">Batal</button>
          <button type="submit" class="btn btn-accent" id="submitPengajuanBtn"><i class="bi bi-send"></i> Kirim Pengajuan</button>
        </div>
      </div>
    </form>
  `;
}

function dataSaatIniBox(pairs) {
  return pairs.map(([label, value]) => `<div class="col-md-4"><div class="text-muted-pg" style="font-size:12px;">${label}</div>
    <div style="font-weight:700;font-size:14.5px;">${value || '-'}</div></div>`).join('');
}
function inputField(label, name, value, type, placeholder) {
  type = type || 'text';
  return `<label class="form-label">${label} <span class="required-asterisk">*</span></label>
    <input type="${type}" class="form-control" name="${name}" value="${value || ''}" placeholder="${placeholder || ''}" required>`;
}
function singleDropzone(id, label) {
  return `<div>
    <label class="form-label">${label} <span class="required-asterisk">*</span></label>
    <div class="dropzone" id="dz_${id}" onclick="document.getElementById('input_${id}').click()">
      <i class="bi bi-cloud-arrow-up"></i>
      <div style="font-weight:700;margin-top:8px;">Klik untuk memilih file</div>
      <div class="text-muted-pg" style="font-size:12px;">Maksimal 1 MB, format PDF</div>
      <div id="filename_${id}" style="font-weight:700;color:var(--success);margin-top:6px;"></div>
    </div>
    <input type="file" id="input_${id}" accept="application/pdf" style="display:none" onchange="handleFileSelect(this,'${id}')">
  </div>`;
}
// Round 5 — item 1: batas ukuran unggahan maksimal 1 MB untuk SEMUA unggahan dokumen.
const MAX_UPLOAD_BYTES = 1048576; // 1 MB = 1.048.576 bita
function checkUploadSizeClient(file, input) {
  if (file.size > MAX_UPLOAD_BYTES) { showToast('Ukuran file maksimal 1 MB.', 'warning'); if (input) input.value = ''; return false; }
  return true;
}
function handleFileSelect(input, id) {
  const file = input.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') { showToast('File harus berformat PDF.', 'warning'); input.value=''; return; }
  if (!checkUploadSizeClient(file, input)) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    if (id === 'file1') uploadedFile1 = { base64, name: file.name };
    else uploadedFile2 = { base64, name: file.name };
    document.getElementById('dz_' + id).classList.add('has-file');
    document.getElementById('filename_' + id).innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + file.name;
  };
  reader.readAsDataURL(file);
}

const HUBUNGAN_KELUARGA_OPTIONS = ['Istri', 'Suami', 'Anak', 'Orang Tua', 'Lainnya'];
/** Round 6 — item 8: isian Data Keluarga dikelompokkan — anggota BUKAN Anak (Istri/Suami/
 *  Orang Tua/Lainnya) ditampilkan sebagai baris ringkas, sedangkan setiap Anak mendapat
 *  sub-kartu tersendiri (judul "Data Anak") agar field per-anak (termasuk field kondisional
 *  item 6 & 7) tidak campur-aduk dengan anggota keluarga lain. */
function renderKeluargaRows() {
  if (!keluargaRows.length) return emptyState('bi-people', 'Belum ada anggota keluarga ditambahkan.');
  const nonAnakIdx = [], anakIdx = [];
  keluargaRows.forEach((k, idx) => (k.HubunganKeluarga === 'Anak' ? anakIdx : nonAnakIdx).push(idx));
  let html = '';
  if (nonAnakIdx.length) {
    html += `<div class="text-muted-pg" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Pasangan &amp; Anggota Keluarga Lainnya</div>`;
    html += nonAnakIdx.map(idx => renderKeluargaNonAnakRow(idx)).join('');
  }
  if (anakIdx.length) {
    html += `<div class="text-muted-pg" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin:${nonAnakIdx.length ? '18px' : '0'} 0 8px;">Data Anak</div>`;
    html += `<div class="row g-3">${anakIdx.map((idx, i) => `<div class="col-md-6">${renderKeluargaAnakCard(idx, i + 1)}</div>`).join('')}</div>`;
  }
  return html;
}
function renderKeluargaNonAnakRow(idx) {
  const k = keluargaRows[idx];
  return `
    <div class="row g-2 align-items-end mb-2 p-2" style="background:var(--surface-alt);border-radius:12px;">
      <div class="col-md-4"><label class="form-label" style="font-size:11px;">Nama</label><input class="form-control" value="${k.Nama||''}" oninput="keluargaRows[${idx}].Nama=this.value"></div>
      <div class="col-md-3"><label class="form-label" style="font-size:11px;">Tgl Lahir</label><input type="date" class="form-control" value="${k.TanggalLahir||''}" oninput="onKeluargaTanggalLahirChange(${idx}, this.value)"></div>
      <div class="col-md-2"><label class="form-label" style="font-size:11px;">Hubungan</label>
        <select class="form-select" onchange="onKeluargaHubunganChange(${idx}, this.value)">
          <option value="">— Pilih —</option>
          ${HUBUNGAN_KELUARGA_OPTIONS.map(o => `<option value="${o}" ${k.HubunganKeluarga === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>
      <div class="col-md-2"><label class="form-label" style="font-size:11px;">Pekerjaan</label><input class="form-control" value="${k.Pekerjaan||''}" oninput="keluargaRows[${idx}].Pekerjaan=this.value"></div>
      <div class="col-md-1"><button type="button" class="btn btn-outline-danger-pg btn-sm-pg w-100" onclick="removeKeluargaRow(${idx})"><i class="bi bi-trash"></i></button></div>
    </div>`;
}
/** Round 7 — item 3: pertanyaan "Masih Pendidikan?" DIHAPUS dari form — gerbang wajib
 *  dokumen/Nomor Surat Keterangan kini HANYA bergantung pada usia anak > 21 tahun (bukan lagi
 *  usia > 21 DAN Masih Pendidikan = "Ya"). Kolom MasihPendidikan di Sheet_Keluarga TETAP ada
 *  (tidak dihapus — menghindari perubahan skema yang tidak perlu, lihat addKeluargaRow yang
 *  tetap mengirim 'Ya' secara default agar pengingat usia-21 yang sudah ada tetap berjalan),
 *  hanya saja tidak lagi ditanyakan ke pengguna lewat UI ini.
 *  Unggahan dokumen & Nomor Surat Keterangan JUGA dipindah keluar dari kartu anak ini ke
 *  bagian "Dokumen Pendukung" bersama (lihat renderKeluargaAnakDokumenSlots), supaya semua
 *  dokumen pengajuan terkumpul rapi di satu tempat. */
function renderKeluargaAnakCard(idx, nomorUrut) {
  const k = keluargaRows[idx];
  const usia = calcAgeClient(k.TanggalLahir);
  return `
    <div class="card-pg h-100" style="background:var(--surface-alt);box-shadow:none;">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);">Data Anak ${nomorUrut}</div>
        <button type="button" class="btn btn-outline-danger-pg btn-sm-pg" onclick="removeKeluargaRow(${idx})"><i class="bi bi-trash"></i></button>
      </div>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label" style="font-size:11px;">Nama</label><input class="form-control" value="${k.Nama||''}" oninput="keluargaRows[${idx}].Nama=this.value"></div>
        <div class="col-md-6"><label class="form-label" style="font-size:11px;">Tgl Lahir</label><input type="date" class="form-control" value="${k.TanggalLahir||''}" oninput="onKeluargaTanggalLahirChange(${idx}, this.value)"></div>
        <div class="col-md-6"><label class="form-label" style="font-size:11px;">Pekerjaan</label><input class="form-control" value="${k.Pekerjaan||''}" oninput="keluargaRows[${idx}].Pekerjaan=this.value"></div>
        ${usia !== null && usia > 21 ? `<div class="col-12"><div class="text-muted-pg" style="font-size:11px;"><i class="bi bi-info-circle"></i> Usia anak saat ini: ${usia} tahun — di atas 21 tahun. Lengkapi Nomor Surat Keterangan &amp; unggah dokumennya di bagian "Dokumen Pendukung" di bawah.</div></div>` : ''}
      </div>
    </div>`;
}
/** Round 7 — item 3: slot unggahan "Dokumen Pendidikan — [Nama Anak]" ditambah/dibuang secara
 *  dinamis di dalam bagian Dokumen Pendukung bersama, satu slot per anak yang usianya > 21
 *  tahun saat ini — mengikuti pola dropzone/validasi/batas 1 MB yang sama dengan dokumen
 *  pendukung lain (lihat checkUploadSizeClient), supaya file tetap terhubung dengan benar ke
 *  keluargaRows[idx] lewat keluargaAnakFiles. */
function renderKeluargaAnakDokumenSlots() {
  const idxs = keluargaRows.map((k, i) => i).filter(i => {
    const k = keluargaRows[i];
    if (k.HubunganKeluarga !== 'Anak') return false;
    const usia = calcAgeClient(k.TanggalLahir);
    return usia !== null && usia > 21;
  });
  if (!idxs.length) return '';
  return `<div class="col-12"><hr style="border-color:var(--border);"><div class="text-muted-pg" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Dokumen Pendidikan Anak (usia &gt; 21 tahun)</div></div>` +
    idxs.map(idx => {
      const k = keluargaRows[idx];
      const sudahAdaDokumen = !!k.DokumenPendidikanUrl;
      const fileBaru = keluargaAnakFiles[idx];
      const label = 'Dokumen Pendidikan — ' + (k.Nama || ('Anak ' + (idx + 1)));
      return `
      <div class="col-md-6">
        <label class="form-label" style="font-size:12.5px;">${label} <span class="required-asterisk">*</span></label>
        <input class="form-control mb-2" style="font-size:12.5px;" value="${k.NomorSuratKeterangan||''}" oninput="keluargaRows[${idx}].NomorSuratKeterangan=this.value" placeholder="Nomor Surat Keterangan Aktif Kuliah/Pendidikan">
        <div class="dropzone" id="dz_anakDok_${idx}" onclick="document.getElementById('input_anakDok_${idx}').click()">
          <i class="bi bi-cloud-arrow-up"></i>
          <div style="font-weight:700;margin-top:4px;font-size:13px;">Klik untuk memilih file</div>
          <div class="text-muted-pg" style="font-size:11.5px;">Maksimal 1 MB, format PDF</div>
          <div style="font-weight:700;margin-top:6px;font-size:12.5px;">
            ${fileBaru ? `<span style="color:var(--success);"><i class="bi bi-check-circle-fill"></i> ${fileBaru.name}</span>` :
              (sudahAdaDokumen ? `<span class="text-muted-pg"><i class="bi bi-paperclip"></i> Dokumen sudah tersimpan sebelumnya (klik untuk ganti).</span>` : '')}
          </div>
        </div>
        <input type="file" id="input_anakDok_${idx}" accept="application/pdf" style="display:none" onchange="handleKeluargaAnakFileSelect(this, ${idx})">
      </div>`;
    }).join('');
}
/** Render ulang BERSAMA daftar anggota keluarga & slot dokumen anak (keduanya bergantung pada
 *  TanggalLahir/HubunganKeluarga anak yang sama), supaya selalu sinkron satu sama lain. */
function refreshKeluargaUI() {
  const rowsEl = document.getElementById('keluargaRowsContainer');
  if (rowsEl) rowsEl.innerHTML = renderKeluargaRows();
  const dokEl = document.getElementById('keluargaAnakDokumenContainer');
  if (dokEl) dokEl.innerHTML = renderKeluargaAnakDokumenSlots();
}
function onKeluargaTanggalLahirChange(idx, val) {
  keluargaRows[idx].TanggalLahir = val;
  refreshKeluargaUI();
}
function onKeluargaHubunganChange(idx, val) {
  keluargaRows[idx].HubunganKeluarga = val;
  refreshKeluargaUI();
}
function handleKeluargaAnakFileSelect(input, idx) {
  const file = input.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') { showToast('File harus berformat PDF.', 'warning'); input.value = ''; return; }
  if (!checkUploadSizeClient(file, input)) return;
  const reader = new FileReader();
  reader.onload = () => {
    keluargaAnakFiles[idx] = { base64: reader.result.split(',')[1], name: file.name };
    refreshKeluargaUI();
  };
  reader.readAsDataURL(file);
}
function addKeluargaRow() {
  // MasihPendidikan default 'Ya' (Round 7 — item 3: tidak lagi ditanyakan ke pengguna, tapi
  // tetap diisi 'Ya' agar pengingat usia-21 yang sudah ada — lihat getUpcomingChildAgeReminders
  // di Kode.gs — tetap berfungsi untuk data yang baru diajukan).
  keluargaRows.push({ Nama: '', TanggalLahir: '', HubunganKeluarga: '', Pekerjaan: '', MasihPendidikan: 'Ya', DokumenPendidikanUrl: '', NomorSuratKeterangan: '' });
  refreshKeluargaUI();
}
function removeKeluargaRow(idx) {
  keluargaRows.splice(idx, 1);
  // Geser ulang index file anak yang sudah diunggah supaya tetap sejajar dengan keluargaRows.
  const shifted = {};
  Object.keys(keluargaAnakFiles).forEach(k => {
    const i = parseInt(k, 10);
    if (i < idx) shifted[i] = keluargaAnakFiles[k];
    else if (i > idx) shifted[i - 1] = keluargaAnakFiles[k];
  });
  keluargaAnakFiles = shifted;
  refreshKeluargaUI();
}

function submitPengajuanForm(event, targetNip) {
  event.preventDefault();
  const jenis = AppState.pengajuanTypeSelected;
  const form = event.target;
  const isForOther = !!targetNip;

  if (!uploadedFile1) { showToast('Dokumen pendukung wajib dilampirkan.', 'warning'); return; }
  if (jenis === 'Data Keluarga' && !uploadedFile2) { showToast('KP4 dan Kartu Keluarga wajib dilampirkan.', 'warning'); return; }

  let dataBaru;
  const payload = {};
  if (jenis === 'Data Keluarga') {
    // Round 5 — item 2: validasi NIP Pasangan (jika Pasangan PNS = Ya) dan dokumen anak
    // berusia di atas 21 tahun SEBELUM terkirim ke server (server tetap memvalidasi ulang).
    if (keluargaExtra.pasanganPNS === 'Ya' && !String(keluargaExtra.nipPasangan || '').trim()) {
      showToast('NIP Pasangan wajib diisi karena Pasangan PNS dipilih "Ya".', 'warning'); return;
    }
    for (let i = 0; i < keluargaRows.length; i++) {
      const a = keluargaRows[i];
      if (a.HubunganKeluarga !== 'Anak') continue;
      const usia = calcAgeClient(a.TanggalLahir);
      if (usia !== null && usia > 21 && (a.MasihPendidikan || 'Ya') === 'Ya') {
        const hasNew = !!keluargaAnakFiles[i];
        const hasOld = !!a.DokumenPendidikanUrl;
        if (!hasNew && !hasOld) {
          showToast('Anak "' + (a.Nama || '(tanpa nama)') + '" berusia di atas 21 tahun — dokumen Surat Keterangan Aktif Kuliah/Pendidikan wajib dilampirkan.', 'warning');
          return;
        }
        // Round 6 — item 7: Nomor Surat Keterangan wajib diisi berdampingan dengan dokumen.
        if (!String(a.NomorSuratKeterangan || '').trim()) {
          showToast('Anak "' + (a.Nama || '(tanpa nama)') + '" berusia di atas 21 tahun — Nomor Surat Keterangan wajib diisi.', 'warning');
          return;
        }
      }
    }
    dataBaru = {
      statusPernikahan: (document.getElementById('keluargaStatusPernikahan') || {}).value || '',
      pasanganPNS: keluargaExtra.pasanganPNS || '',
      nipPasangan: keluargaExtra.nipPasangan || '',
      anggota: keluargaRows
    };
    payload.fileDataAnak = keluargaAnakFiles;
  } else {
    dataBaru = {};
    new FormData(form).forEach((v, k) => dataBaru[k] = v);
  }

  payload.jenis = jenis; payload.dataBaru = dataBaru;
  payload.fileData1 = uploadedFile1.base64; payload.fileName1 = uploadedFile1.name;
  payload.fileData2 = uploadedFile2 ? uploadedFile2.base64 : null; payload.fileName2 = uploadedFile2 ? uploadedFile2.name : null;
  if (isForOther) payload.targetNip = targetNip;

  const btn = document.getElementById('submitPengajuanBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-inline"></span> Mengirim...'; btn.disabled = true;

  google.script.run
    .withSuccessHandler(res => {
      btn.innerHTML = original; btn.disabled = false;
      if (res.success) {
        showToast('Pengajuan berhasil dikirim: ' + res.data.idPengajuan, 'success');
        if (isForOther) {
          window.__ajukanTargetProfile = null;
          window.__detailProfileCache = null; // paksa reload agar tab Riwayat Pengajuan ter-update
          navigateTo('detailPegawai', { nip: targetNip });
        } else {
          AppState.myProfileCache = null; // paksa reload data saat kembali
          navigateTo('riwayatSaya');
        }
      } else showToast(res.message, 'danger');
    })
    .withFailureHandler(err => { btn.innerHTML = original; btn.disabled = false; showToast(err.message, 'danger'); })
    .submitPengajuan(AppState.token, payload);
}

// ════════════════════════════════════════════════════════
// BAGIAN PEGAWAI — RIWAYAT PENGAJUAN SAYA
// ════════════════════════════════════════════════════════
function loadRiwayatSaya() {
  const retry = 'loadRiwayatSaya()';
  startWatchdog('riwayatSaya', retry);
  google.script.run
    .withSuccessHandler(safeHandler('riwayatSaya', retry, res => { if (res.success) safeRender(() => renderRiwayatSaya(res.data), retry); else handleAuthError(res, retry); }))
    .withFailureHandler(safeFailure('riwayatSaya', retry))
    .getMyPengajuan(AppState.token);
}
function renderRiwayatSaya(list) {
  const rows = list.length ? list.map(it => `<tr>
      <td style="font-weight:700;">${it.JenisPengajuan}</td>
      <td>${fmtDate(it.TanggalPengajuan)}</td>
      <td>${statusPill(it.Status)}</td>
      <td class="text-muted-pg">${it.CatatanPenolakan || '-'}</td>
      <td><a href="javascript:void(0)" class="link-teal" onclick='alert(${JSON.stringify(JSON.stringify(it.DataBaru))})'>Detail →</a></td>
    </tr>`).join('') : `<tr><td colspan="5"><div class="table-empty"><i class="bi bi-inbox"></i>Belum ada pengajuan yang dikirim.</div></td></tr>`;

  document.getElementById('app-container').innerHTML = `
    <div class="pg-breadcrumb"><a href="javascript:void(0)" onclick="navigateTo('pegawaiDashboard')">Portal</a> / Riwayat Pengajuan</div>
    <h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">Riwayat Pengajuan Saya</h2>
    <div class="table-pg-wrap">
      <table class="table-pg"><thead><tr><th>Jenis Pengajuan</th><th>Tanggal Diajukan</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
}

// ════════════════════════════════════════════════════════
// BAGIAN ADMIN — DASHBOARD
// ════════════════════════════════════════════════════════
let chartInstances = {};

function loadAdminDashboard() {
  const retry = 'loadAdminDashboard()';
  startWatchdog('adminDashboard', retry);
  google.script.run
    .withSuccessHandler(safeHandler('adminDashboard', retry, res => { if (res.success) { safeRender(() => renderAdminDashboard(res.data), retry); loadChildAgeReminders(); } else handleAuthError(res, retry); }))
    .withFailureHandler(safeFailure('adminDashboard', retry))
    .getDashboardData(AppState.token);
}

function renderAdminDashboard(d) {
  // Round 6 — item 10: Dashboard Admin Unit Kerja memakai fungsi render YANG SAMA (data sudah
  // dibatasi di server oleh getDashboardData — lihat isAdminUnit di Kode.gs), hanya judul &
  // sedikit konteks unit kerja yang berbeda, agar tidak ada duplikasi kode grafik.
  const isUnit = AppState.peran === 'AdminUnit';
  const judul = isUnit ? 'Dashboard Unit Kerja' : 'Dashboard';
  const subJudul = isUnit ? `<div class="text-muted-pg" style="font-size:13px;margin-top:2px;margin-bottom:16px;"><i class="bi bi-building"></i> ${AppState.unitKerja || 'Unit kerja belum diatur'}</div>` : '';
  document.getElementById('app-container').innerHTML = `
    <h2 style="font-size:22px;font-weight:700;margin-bottom:${isUnit ? '2px' : '20px'};">${judul}</h2>
    ${subJudul}
    <div id="childAgeReminderBanner"></div>
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-icon teal"><i class="bi bi-people"></i></div><div class="stat-value">${d.totalPegawai}</div><div class="stat-label">Total Pegawai</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div><div class="stat-value">${d.menungguCount}</div><div class="stat-label">Pengajuan Menunggu</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-icon green"><i class="bi bi-check-circle"></i></div><div class="stat-value">${d.disetujuiBulanIni}</div><div class="stat-label">Disetujui Bulan Ini</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-icon red"><i class="bi bi-x-circle"></i></div><div class="stat-value">${d.ditolakBulanIni}</div><div class="stat-label">Ditolak Bulan Ini</div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-12"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;"><i class="bi bi-graph-up-arrow"></i> Tren Pengajuan — 6 Bulan Terakhir</h3><div class="chart-box-tren"><canvas id="chartTren"></canvas></div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-4"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Jumlah Pegawai per Golongan</h3><div class="chart-box"><canvas id="chartGolongan"></canvas></div></div></div>
      <div class="col-md-8"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Jumlah Pegawai per Satuan Kerja</h3><div class="chart-box" id="chartSatkerBox"><canvas id="chartSatker"></canvas></div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-4"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Status Pegawai</h3><div class="chart-box-sm"><canvas id="chartStatusPegawai"></canvas></div></div></div>
      <div class="col-md-4"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Status Keaktifan</h3><div class="chart-box-sm"><canvas id="chartStatusKeaktifan"></canvas></div></div></div>
      <div class="col-md-4"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Jenis Kelamin</h3><div class="chart-box-sm"><canvas id="chartGender"></canvas></div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-5"><div class="card-pg"><h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Status Pengajuan</h3><div class="chart-box-sm"><canvas id="chartStatus"></canvas></div></div></div>
      <div class="col-md-7"><div class="card-pg">
        <h3 style="font-size:14.5px;font-weight:700;margin-bottom:12px;">Pengajuan Terbaru</h3>
        <div>${d.pengajuanTerbaru.length ? d.pengajuanTerbaru.map(p => `
          <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--border)">
            <div><div style="font-weight:700;font-size:13.5px;">${p.NamaPemohon}</div><div class="text-muted-pg" style="font-size:12px;">${p.JenisPengajuan} &middot; ${fmtDate(p.TanggalPengajuan)}</div></div>
            ${statusPill(p.Status)}
          </div>`).join('') : emptyState('bi-inbox', 'Belum ada pengajuan.')}
        </div>
      </div></div>
    </div>
  `;
  // Round 6 — item 2: chartSatker dibuat horizontal (indexAxis:'y') agar nama Satuan Kerja yang
  // panjang tidak saling menumpuk di bawah bar, dan tinggi wadahnya menyesuaikan jumlah satuan
  // kerja (minimal tetap kompak, maksimal dibatasi agar tidak menjadi sangat panjang).
  const satkerBox = document.getElementById('chartSatkerBox');
  if (satkerBox) {
    const n = Object.keys(d.perSatker || {}).length;
    satkerBox.style.height = Math.max(230, Math.min(420, n * 32 + 50)) + 'px';
  }
  if (d.trenBulanan) renderTrendChart('chartTren', d.trenBulanan);
  renderBarChart('chartGolongan', d.perGolongan, CHART_PALETTE.primary, CHART_PALETTE.primaryDark);
  renderBarChart('chartSatker', d.perSatker, CHART_PALETTE.secondary, CHART_PALETTE.primary, true);
  if (d.perStatusPegawai) renderStatPieChart('chartStatusPegawai', d.perStatusPegawai, [CHART_PALETTE.primary, CHART_PALETTE.accent, CHART_PALETTE.secondary]);
  if (d.perStatusKeaktifan) renderStatPieChart('chartStatusKeaktifan', d.perStatusKeaktifan, [CHART_PALETTE.success, CHART_PALETTE.warning, CHART_PALETTE.danger]);
  if (d.perGender) renderStatPieChart('chartGender', d.perGender, [CHART_PALETTE.primary, '#EC4899', CHART_PALETTE.tickColor]);
  renderDoughnutChart('chartStatus', d.statusCount);
}
/** Grafik pie kecil untuk statistik Data Pegawai (Round 4 — item 3): Status Pegawai, Status
 *  Keaktifan, Jenis Kelamin — selaras gaya visual dengan grafik doughnut Status Pengajuan. */
/** Round 5 — item 2: Pengingat anak yang akan berusia 21 tahun — dipanggil setelah Dashboard
 *  SuperAdmin/Admin maupun Portal Pegawai selesai dirender (butuh elemen #childAgeReminderBanner
 *  sudah ada di DOM). Gagal diam-diam (tidak memblokir dashboard) jika pengingat gagal dimuat. */
function loadChildAgeReminders() {
  google.script.run
    .withSuccessHandler(res => {
      const el = document.getElementById('childAgeReminderBanner');
      if (!el) return;
      if (!res || !res.success || !res.data || !res.data.length) { el.innerHTML = ''; return; }
      el.innerHTML = renderChildAgeReminderBanner(res.data);
    })
    .withFailureHandler(() => {})
    .getUpcomingChildAgeReminders(AppState.token);
}
function renderChildAgeReminderBanner(list) {
  const isMine = AppState.peran === 'User';
  const items = list.slice(0, 6).map(r => `
    <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid rgba(245,158,11,.25);">
      <div>
        <div style="font-weight:700;font-size:13px;">${r.NamaAnak || '-'} ${isMine ? '' : ('&middot; ' + (r.NamaPegawai || '-') + ' (NIP ' + r.NIP + ')')}</div>
        <div class="text-muted-pg" style="font-size:12px;">Lahir ${fmtTanggalDMY(r.TanggalLahir)} &middot; akan berusia 21 tahun dalam ${r.HariMenuju21} hari</div>
      </div>
      <span class="pill pill-amber"><i class="bi bi-exclamation-triangle"></i> Dokumen belum lengkap</span>
    </div>`).join('');
  return `<div class="card-pg mb-4" style="background:#FFF8EC;border:1px solid rgba(245,158,11,.35);">
    <div class="d-flex align-items-center gap-2 mb-2">
      <i class="bi bi-bell-fill" style="color:var(--warning);font-size:18px;"></i>
      <h3 style="font-size:14.5px;font-weight:700;margin:0;">Pengingat Dokumen Pendidikan Anak (akan berusia 21 tahun)</h3>
    </div>
    <div class="text-muted-pg" style="font-size:12.5px;margin-bottom:6px;">
      ${isMine ? 'Anak Anda di bawah ini akan segera berusia 21 tahun. Segera unggah Surat Keterangan Aktif Kuliah/Pendidikan melalui menu Ajukan Perubahan &rarr; Data Keluarga.'
        : 'Pegawai berikut memiliki anak yang akan segera berusia 21 tahun dan belum melampirkan dokumen Surat Keterangan Aktif Kuliah/Pendidikan.'}
    </div>
    ${items}
  </div>`;
}

function renderStatPieChart(canvasId, dataObj, colors) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  const labels = Object.keys(dataObj), values = Object.values(dataObj);
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: isDarkMode() ? '#11212C' : '#ffffff', hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, color: chartTickColor(), font: { size: 11 } } } } }
  });
}

/** Palet warna chart — seragam dengan tema biru langit + putih (liquid glass) aplikasi,
 *  dipakai di seluruh grafik Chart.js agar visual konsisten dengan CSS. */
const CHART_PALETTE = {
  primary: '#0EA5E9', primaryDark: '#0284C7', secondary: '#22D3EE',
  accent: '#F2A93C', success: '#22C55E', danger: '#EF4444', warning: '#F59E0B',
  gridLine: 'rgba(14,165,233,0.12)', tickColor: '#5A7A80'
};
function isDarkMode() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function chartGridColor() { return isDarkMode() ? 'rgba(148,219,230,0.12)' : CHART_PALETTE.gridLine; }
function chartTickColor() { return isDarkMode() ? '#8FB4BC' : CHART_PALETTE.tickColor; }

function makeVerticalGradient(canvasEl, colorFrom, colorTo) {
  const ctx2d = canvasEl.getContext('2d');
  // Round 6 — item 2: kanvas grafik kini dibungkus wadah ".chart-box*" bertinggi tetap via CSS
  // (bukan lagi atribut HTML "height" pada <canvas>), jadi tinggi nyata diambil dari tinggi
  // wadah pembungkus (sudah di-layout DOM saat kode ini jalan) — bukan canvasEl.height yang baru
  // disesuaikan Chart.js belakangan (sehingga masih bernilai default 150 di titik ini).
  const h = (canvasEl.parentElement && canvasEl.parentElement.clientHeight) || canvasEl.height || 220;
  const g = ctx2d.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, colorFrom);
  g.addColorStop(1, colorTo);
  return g;
}

/** Round 6 — item 2: `horizontal` (opsional) membuat bar chart horizontal (indexAxis:'y'),
 *  dipakai khusus untuk chartSatker agar nama Satuan Kerja yang panjang tidak saling
 *  menumpuk/bertabrakan di bawah bar seperti pada bar chart vertikal. `maintainAspectRatio:
 *  false` dipakai di SEMUA grafik dashboard (lihat juga renderStatPieChart/renderDoughnutChart/
 *  renderTrendChart) supaya tinggi grafik mengikuti tinggi wadah tetap (lihat .chart-box-* di
 *  renderAdminDashboard) alih-alih rasio lebar:tinggi bawaan Chart.js yang membuat grafik
 *  terlalu tinggi di kartu lebar (ini penyebab utama keluhan "chartTren terlalu tinggi"). */
function renderBarChart(canvasId, dataObj, colorFrom, colorTo, horizontal) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  const labels = Object.keys(dataObj), values = Object.values(dataObj);
  const gradient = makeVerticalGradient(ctx, colorFrom || CHART_PALETTE.primary, (colorTo || CHART_PALETTE.primaryDark) + 'CC');
  const valueAxis = { beginAtZero: true, ticks: { precision: 0, color: chartTickColor() }, grid: { color: chartGridColor() } };
  const categoryAxis = { ticks: { color: chartTickColor(), autoSkip: false, font: { size: 11 } }, grid: { display: false } };
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: gradient, borderRadius: 7, maxBarThickness: horizontal ? 18 : 30 }] },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: horizontal ? { x: valueAxis, y: categoryAxis } : { y: valueAxis, x: categoryAxis }
    }
  });
}
function renderDoughnutChart(canvasId, statusCount) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCount),
      datasets: [{ data: Object.values(statusCount), backgroundColor: [CHART_PALETTE.warning, CHART_PALETTE.success, CHART_PALETTE.danger], borderWidth: 3, borderColor: isDarkMode() ? '#11212C' : '#ffffff', hoverOffset: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, color: chartTickColor() } } } }
  });
}
/** Grafik tren jumlah pengajuan per bulan (6 bulan terakhir) — garis dengan area terisi
 *  gradien biru langit, selaras dengan tema liquid glass aplikasi. */
function renderTrendChart(canvasId, trenBulanan) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  const labels = trenBulanan.map(t => t.bulan), values = trenBulanan.map(t => t.total);
  const areaGradient = makeVerticalGradient(ctx, 'rgba(14,165,233,0.38)', 'rgba(14,165,233,0.02)');
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values, label: 'Pengajuan', borderColor: CHART_PALETTE.primary, backgroundColor: areaGradient,
        fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ffffff', pointBorderColor: CHART_PALETTE.primary,
        pointBorderWidth: 2, pointHoverRadius: 6, borderWidth: 2.5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0, color: chartTickColor() }, grid: { color: chartGridColor() } },
        x: { ticks: { color: chartTickColor() }, grid: { display: false } }
      }
    }
  });
}

function refreshPendingBadge() {
  google.script.run.withSuccessHandler(res => {
    if (!res.success) return;
    const n = res.data.length;
    const badge = document.getElementById('navPendingBadge');
    if (n > 0) { badge.style.display = 'inline-block'; badge.textContent = n; } else badge.style.display = 'none';
  }).getPengajuanMasuk(AppState.token);
}

// ════════════════════════════════════════════════════════
// BAGIAN ADMIN — DATA PEGAWAI (list + search)
// ════════════════════════════════════════════════════════
const PAGE_SIZE = 10; // default lama, dipertahankan sebagai nilai awal page-size selector
let pegawaiPageNum = 1, pegawaiPageSizeVal = 10, pegawaiSearchVal = '', pegawaiSearchFieldVal = '', pegawaiSatuanKerjaVal = '', pegawaiTotalCount = 0, pegawaiFetchSeq = 0;

function loadDataPegawai() {
  pegawaiPageNum = 1; pegawaiSearchVal = ''; pegawaiSearchFieldVal = ''; pegawaiSatuanKerjaVal = '';
  renderDataPegawaiShell();
  fetchDataPegawaiResults();
}
function dataPegawaiGotoPage(p) { pegawaiPageNum = p; fetchDataPegawaiResults(); }
function dataPegawaiChangePageSize(n) { pegawaiPageSizeVal = n; pegawaiPageNum = 1; fetchDataPegawaiResults(); }
/** Round 7 — item 1: pencarian HANYA berjalan saat tombol "Cari" diklik atau Enter ditekan
 *  (menggantikan pencarian per-ketikan huruf dengan debounce 300ms yang dipakai sebelumnya). */
function dataPegawaiSearchGo() {
  const inp = document.getElementById('searchDataPegawai');
  pegawaiSearchVal = inp ? inp.value : pegawaiSearchVal;
  pegawaiPageNum = 1;
  fetchDataPegawaiResults();
}
function dataPegawaiOnSearchFieldChange(val) { pegawaiSearchFieldVal = val; pegawaiPageNum = 1; fetchDataPegawaiResults(); }
function dataPegawaiOnSatkerChange(val) { pegawaiSatuanKerjaVal = val; pegawaiPageNum = 1; fetchDataPegawaiResults(); }

function renderDataPegawaiShell() {
  const isUnitAdmin = AppState.peran === 'AdminUnit';
  document.getElementById('app-container').innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h2 style="font-size:22px;font-weight:700;">Data Pegawai</h2>
        ${isUnitAdmin ? `<div class="text-muted-pg" style="font-size:12.5px;">Unit Kerja: <strong>${AppState.unitKerja || '-'}</strong></div>` : ''}
      </div>
      ${isUnitAdmin ? '' : `<div class="dropdown">
        <button class="btn btn-accent btn-sm-pg dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-download"></i> Ekspor Data</button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><h6 class="dropdown-header">Excel (.xlsx)</h6></li>
          <li><a class="dropdown-item" href="javascript:void(0)" onclick="exportExcel()"><i class="bi bi-file-earmark-excel"></i> Lengkap — Seluruh Riwayat</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" onclick="exportExcelRingkas()"><i class="bi bi-file-earmark-excel"></i> Ringkas — Data Terkini Saja</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><h6 class="dropdown-header">PDF</h6></li>
          <li><a class="dropdown-item" href="javascript:void(0)" onclick="exportPDF()"><i class="bi bi-file-earmark-pdf"></i> Lengkap — Seluruh Riwayat</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" onclick="exportPDFRingkas()"><i class="bi bi-file-earmark-pdf"></i> Ringkas — Data Terkini Saja</a></li>
        </ul>
      </div>`}
    </div>
    <div class="card-pg mb-3">
      <div class="d-flex gap-2 flex-wrap align-items-center">
        ${pegawaiSearchControlsHtml({
          idPrefix: 'DataPegawai', searchVal: pegawaiSearchVal, searchFieldVal: pegawaiSearchFieldVal,
          satkerVal: pegawaiSatuanKerjaVal, showSatkerFilter: !isUnitAdmin,
          onEnterFn: 'dataPegawaiSearchGo', onFieldChangeFn: 'dataPegawaiOnSearchFieldChange', onSatkerChangeFn: 'dataPegawaiOnSatkerChange'
        })}
        ${pageSizeSelectHtml('pegawaiPageSizeSelect', pegawaiPageSizeVal, 'dataPegawaiChangePageSize')}
      </div>
    </div>
    <div id="pegawaiResultsArea" class="pg-results-area">${renderSkeleton()}</div>`;
}

function renderDataPegawaiResultsHtml(pageItems) {
  const totalPages = Math.max(1, Math.ceil(pegawaiTotalCount / pegawaiPageSizeVal));
  const rows = pageItems.length ? pageItems.map(p => `
    <tr>
      <td style="font-family:monospace;">${p.NIP}</td>
      <td><div class="d-flex align-items-center gap-2"><div class="avatar-initials">${initials(p.NamaLengkap)}</div>${p.NamaLengkap}</div></td>
      <td><span class="pill ${p.StatusPegawai === 'PNS' ? 'pill-teal' : 'pill-amber'}">${p.StatusPegawai}</span></td>
      <td><span class="pill pill-neutral">${p.SatuanKerja || '-'}</span></td>
      <td>${p.NomorTelepon || '-'}</td>
      <td><a href="javascript:void(0)" class="link-teal" onclick="navigateTo('detailPegawai',{nip:'${p.NIP}'})">Lihat Detail →</a></td>
    </tr>`).join('') : `<tr><td colspan="6"><div class="table-empty"><i class="bi bi-search"></i>Tidak ada pegawai yang cocok.</div></td></tr>`;

  const el = document.getElementById('pegawaiResultsArea');
  el.classList.remove('pg-loading');
  el.innerHTML = `
    <div class="table-pg-wrap mb-3">
      <table class="table-pg"><thead><tr><th>NIP</th><th>Nama Lengkap</th><th>Status</th><th>Satuan Kerja</th><th>Telepon</th><th>Aksi</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="text-muted-pg" style="font-size:13px;">Menampilkan ${pageItems.length} dari ${pegawaiTotalCount} pegawai</div>
      ${renderPaginationSrv(pegawaiPageNum, totalPages, 'dataPegawaiGotoPage')}
    </div>`;
}

function fetchDataPegawaiResults() {
  const seq = ++pegawaiFetchSeq;
  const retry = 'fetchDataPegawaiResults()';
  startWatchdog('dataPegawaiResults', retry);
  setAreaLoading('pegawaiResultsArea', true);
  google.script.run
    .withSuccessHandler(res => {
      clearWatchdog('dataPegawaiResults');
      if (seq !== pegawaiFetchSeq) return; // respons basi (sudah ada permintaan lebih baru)
      if (!res) { renderErrorInArea('pegawaiResultsArea', 'Server tidak memberikan respons.', retry); return; }
      if (!res.success) { if (res.message === 'SESSION_EXPIRED') { handleAuthError(res, retry); return; } renderErrorInArea('pegawaiResultsArea', res.message, retry); return; }
      pegawaiTotalCount = res.data.totalCount;
      try { renderDataPegawaiResultsHtml(res.data.rows); } catch (e) { console.error(e); renderErrorInArea('pegawaiResultsArea', 'Terjadi kesalahan: ' + e.message, retry); }
    })
    .withFailureHandler(err => { clearWatchdog('dataPegawaiResults'); if (seq === pegawaiFetchSeq) renderErrorInArea('pegawaiResultsArea', 'Gagal terhubung ke server: ' + (err && err.message), retry); })
    .getPegawaiPage(AppState.token, { page: pegawaiPageNum, pageSize: pegawaiPageSizeVal, search: pegawaiSearchVal, searchField: pegawaiSearchFieldVal, satuanKerja: pegawaiSatuanKerjaVal });
}

function renderPagination(current, total, varName, renderFn) {
  if (total <= 1) return '';
  let html = '<div class="pg-pagination">';
  html += `<button class="pg-page-btn" ${current===1?'disabled':''} onclick="${varName}=${current-1};${renderFn}()"><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= Math.min(total, 5); i++) {
    html += `<button class="pg-page-btn ${i===current?'active':''}" onclick="${varName}=${i};${renderFn}()">${i}</button>`;
  }
  if (total > 5) html += `<span class="text-muted-pg">...</span>`;
  html += `<button class="pg-page-btn" ${current===total?'disabled':''} onclick="${varName}=${current+1};${renderFn}()"><i class="bi bi-chevron-right"></i></button>`;
  html += '</div>';
  return html;
}

// ════════════════════════════════════════════════════════
// PAGINASI SERVER-SIDE (Round 4 — item 6): dipakai oleh Data Pegawai, Kelola Pegawai,
// Data Gaji, dan Riwayat Seluruh Pengajuan — menggantikan pola lama "ambil semua data
// sekali di login lalu potong per-halaman di client". Setiap pindah halaman / ganti ukuran
// halaman / ketik di kolom cari (didebounce) memanggil ulang fungsi *Page() di server dan
// HANYA mengganti isi area hasil (bukan seluruh #app-container), supaya fokus & posisi
// kursor pada kolom cari tidak pernah hilang saat permintaan ke server sedang berjalan.
// ════════════════════════════════════════════════════════
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
function pageSizeSelectHtml(id, value, onChangeFnName) {
  return `<select class="form-select form-select-sm" style="width:auto;display:inline-block;" id="${id}" onchange="${onChangeFnName}(parseInt(this.value,10))">
    ${PAGE_SIZE_OPTIONS.map(n => `<option value="${n}" ${n === value ? 'selected' : ''}>${n} / halaman</option>`).join('')}
  </select>`;
}

// ════════════════════════════════════════════════════════
// Round 7 — item 1: kolom "dasar pencarian" (searchField) & filter Satuan Kerja, dipakai
// bersama di layar pencarian pegawai (Data Pegawai, Kelola Pegawai). Pencarian HANYA berjalan
// saat tombol "Cari" diklik atau Enter ditekan pada kolom teks (bukan lagi per-ketikan huruf
// dengan debounce 300ms) — lihat pegawaiSearchControlsHtml() & fungsi *SearchGo() terkait.
// Filter searchField/Satuan Kerja TETAP langsung memicu pencarian ulang saat diganti (sama
// seperti perilaku page-size selector), karena keduanya adalah filter, bukan pengetikan bebas.
// ════════════════════════════════════════════════════════
const PEGAWAI_SEARCH_FIELD_OPTIONS = [
  { value: '', label: 'Semua Field' },
  { value: 'Nama', label: 'Nama' },
  { value: 'NIP', label: 'NIP' },
  { value: 'NIK', label: 'NIK' }
];
function searchFieldSelectHtml(id, value, onChangeFnName) {
  return `<select class="form-select" style="width:auto;" id="${id}" onchange="${onChangeFnName}(this.value)" title="Kolom dasar pencarian">
    ${PEGAWAI_SEARCH_FIELD_OPTIONS.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}
  </select>`;
}
function satkerFilterSelectHtml(id, value, onChangeFnName) {
  return `<select class="form-select" style="width:auto;" id="${id}" onchange="${onChangeFnName}(this.value)" title="Filter Satuan Kerja">
    <option value="">Semua Satuan Kerja</option>
    ${UNIT_KERJA_LIST.map(u => `<option value="${u}" ${u === value ? 'selected' : ''}>${u}</option>`).join('')}
  </select>`;
}
/** Markup gabungan: kolom cari + tombol Cari + dropdown dasar pencarian + (opsional) filter
 *  Satuan Kerja — dipakai di toolbar Data Pegawai & Kelola Pegawai. onEnterFn dipanggil saat
 *  tombol diklik ATAU Enter ditekan pada kolom teks; onFieldChangeFn/onSatkerChangeFn dipanggil
 *  segera saat dropdown filter diganti. showSatkerFilter=false menyembunyikan filter Satuan
 *  Kerja (dipakai untuk Admin Unit Kerja, yang datanya sudah otomatis terkunci ke unit sendiri). */
function pegawaiSearchControlsHtml(opts) {
  const id = opts.idPrefix;
  return `
    <input type="text" class="form-control" style="flex:1;min-width:200px;" id="search${id}" placeholder="${opts.placeholder || 'Cari NIP / Nama / NIK Pegawai...'}"
      value="${opts.searchVal || ''}" onkeydown="if(event.key==='Enter'){event.preventDefault();${opts.onEnterFn}();}">
    <button type="button" class="btn btn-accent btn-sm-pg" onclick="${opts.onEnterFn}()"><i class="bi bi-search"></i> Cari</button>
    ${searchFieldSelectHtml('searchField' + id, opts.searchFieldVal || '', opts.onFieldChangeFn)}
    ${opts.showSatkerFilter ? satkerFilterSelectHtml('satker' + id, opts.satkerVal || '', opts.onSatkerChangeFn) : ''}`;
}
/** Tandai/lepas kondisi "sedang memuat" pada sebuah area hasil berpaginasi (item 4) — overlay
 *  & efek redup CSS murni (lihat .pg-loading / .pg-loading-overlay di Stylesheet.html). Overlay
 *  otomatis ikut terbuang saat innerHTML area diganti dengan hasil baru; classList di elemen
 *  area sendiri TIDAK ikut terbuang oleh penggantian innerHTML, jadi tetap dilepas eksplisit. */
function setAreaLoading(areaId, on) {
  const el = document.getElementById(areaId);
  if (!el) return;
  if (on) {
    el.classList.add('pg-loading');
    if (!el.querySelector('.pg-loading-overlay')) {
      const ov = document.createElement('div');
      ov.className = 'pg-loading-overlay';
      ov.innerHTML = '<div class="spinner-pg"></div><span>Memuat data...</span>';
      el.appendChild(ov);
    }
  } else {
    el.classList.remove('pg-loading');
  }
}
function renderPaginationSrv(current, totalPages, gotoFnName) {
  if (totalPages <= 1) return '';
  let html = '<div class="pg-pagination">';
  html += `<button class="pg-page-btn" ${current===1?'disabled':''} onclick="${gotoFnName}(${current-1})"><i class="bi bi-chevron-left"></i></button>`;
  const start = Math.max(1, Math.min(current - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(current + 2, 5));
  for (let i = start; i <= end; i++) {
    html += `<button class="pg-page-btn ${i===current?'active':''}" onclick="${gotoFnName}(${i})">${i}</button>`;
  }
  html += `<button class="pg-page-btn" ${current===totalPages?'disabled':''} onclick="${gotoFnName}(${current+1})"><i class="bi bi-chevron-right"></i></button>`;
  html += '</div>';
  return html;
}
/** Debounce generik berdasarkan kunci string (dipakai untuk kolom cari server-side). */
const _debounceTimers = {};
function debounceByKey(key, fn, ms) {
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(fn, ms || 300);
}
/** Tampilkan pesan error HANYA di dalam area hasil (bukan seluruh halaman) agar toolbar
 *  (kolom cari, dsb) yang sedang difokuskan pengguna tidak ikut hilang. */
function renderErrorInArea(areaId, message, retryCall) {
  const el = document.getElementById(areaId);
  if (!el) return;
  el.classList.remove('pg-loading');
  el.innerHTML = `<div class="table-empty"><i class="bi bi-exclamation-triangle"></i>${message || 'Terjadi kesalahan saat memuat data.'}
    ${retryCall ? `<div class="mt-2"><button class="btn btn-accent btn-sm-pg" onclick="${retryCall}">Coba Lagi</button></div>` : ''}</div>`;
}

function exportExcel() {
  showToast('Menyiapkan file Excel...', 'info');
  google.script.run.withSuccessHandler(res => {
    if (res.success) { downloadBase64(res.data.base64, res.data.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); showToast('Ekspor Excel berhasil.', 'success'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => showToast(err.message, 'danger')).exportPegawaiExcel(AppState.token);
}
function exportPDF() {
  showToast('Menyiapkan file PDF...', 'info');
  google.script.run.withSuccessHandler(res => {
    if (res.success) { downloadBase64(res.data.base64, res.data.fileName, 'application/pdf'); showToast('Ekspor PDF berhasil.', 'success'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => showToast(err.message, 'danger')).exportPegawaiPDF(AppState.token);
}
function exportExcelRingkas() {
  showToast('Menyiapkan file Excel (ringkas)...', 'info');
  google.script.run.withSuccessHandler(res => {
    if (res.success) { downloadBase64(res.data.base64, res.data.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); showToast('Ekspor Excel ringkas berhasil.', 'success'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => showToast(err.message, 'danger')).exportPegawaiExcelRingkas(AppState.token);
}
function exportPDFRingkas() {
  showToast('Menyiapkan file PDF (ringkas)...', 'info');
  google.script.run.withSuccessHandler(res => {
    if (res.success) { downloadBase64(res.data.base64, res.data.fileName, 'application/pdf'); showToast('Ekspor PDF ringkas berhasil.', 'success'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => showToast(err.message, 'danger')).exportPegawaiPDFRingkas(AppState.token);
}

// ════════════════════════════════════════════════════════
// BAGIAN ADMIN — DETAIL PEGAWAI
// ════════════════════════════════════════════════════════
function loadDetailPegawai(nip) {
  if (!nip) { navigateTo('dataPegawai'); return; }
  const retry = `navigateTo('detailPegawai',{nip:'${nip}'})`;
  const wdKey = 'detailPegawai_' + nip;
  startWatchdog(wdKey, retry);
  google.script.run
    .withSuccessHandler(safeHandler(wdKey, retry, res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      if (!res.data || !res.data.pegawai || !res.data.pegawai.NIP) {
        renderErrorState('Data pegawai dengan NIP ' + nip + ' tidak ditemukan.', "navigateTo('dataPegawai')");
        return;
      }
      safeRender(() => renderDetailPegawai(res.data, nip, 'Data Diri'), retry);
    }))
    .withFailureHandler(safeFailure(wdKey, retry))
    .getPegawaiDetail(AppState.token, nip);
}
function renderDetailPegawai(profile, nip, activeTab) {
  window.__detailProfileCache = profile;
  const p = profile.pegawai;
  const isSuperAdmin = AppState.peran === 'SuperAdmin';
  const isAdminUnit = AppState.peran === 'AdminUnit';
  const tabs = DATA_SAYA_TABS.concat(['Riwayat Pengajuan']);
  let content = tab2Content(profile, activeTab);

  document.getElementById('app-container').innerHTML = `
    <a href="javascript:void(0)" class="pg-breadcrumb" onclick="navigateTo('dataPegawai')"><i class="bi bi-arrow-left"></i> Kembali ke Data Pegawai</a>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 my-2">
      <h2 style="font-size:20px;font-weight:700;">${p.NamaLengkap} <span class="pill pill-neutral" style="font-family:monospace;">${p.NIP}</span></h2>
      ${isSuperAdmin ? `<div class="d-flex gap-2">
        <button class="btn btn-outline-pg btn-sm-pg" onclick="navigateTo('kelolaGaji',{nip:'${nip}'})"><i class="bi bi-cash-coin"></i> Data Gaji</button>
        <button class="btn btn-outline-pg btn-sm-pg" onclick="navigateTo('kelolaPegawai',{nip:'${nip}'})"><i class="bi bi-pencil"></i> Edit Data</button>
      </div>` : ''}
      ${isAdminUnit ? `<button class="btn btn-amber btn-sm-pg" onclick="navigateTo('ajukanPilihJenis',{targetNip:'${nip}'})"><i class="bi bi-pencil-square"></i> Ajukan Perubahan</button>` : ''}
    </div>
    <div class="card-pg">
      <div class="pg-tabs">${tabs.map(t => `<button class="pg-tab ${t===activeTab?'active':''}" onclick="renderDetailPegawai(window.__detailProfileCache,'${nip}','${t}')">${t}</button>`).join('')}</div>
      <div>${content}</div>
    </div>`;
}
function tab2Content(profile, tab) {
  if (tab === 'Riwayat Pengajuan') {
    const rows = profile.riwayatPengajuan || [];
    return simpleTable2(['Jenis', 'Tanggal', 'Status', 'Diproses Oleh'], rows.map(r => [r.JenisPengajuan, fmtDate(r.TanggalPengajuan), statusPill(r.Status), r.DiprosesOleh || '-']));
  }
  return renderDataSayaTabContent(profile, tab);
}
function simpleTable2(headers, rows) {
  if (!rows.length) return emptyState('bi-inbox', 'Belum ada data.');
  return `<div class="table-pg-wrap"><table class="table-pg"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c != null && c !== '' ? c : '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// ════════════════════════════════════════════════════════
// BAGIAN SUPER ADMIN — KELOLA PEGAWAI
// ════════════════════════════════════════════════════════
let kelolaPegawaiPageNum = 1, kelolaPegawaiPageSizeVal = 10, kelolaPegawaiSearchVal = '', kelolaPegawaiSearchFieldVal = '', kelolaPegawaiSatuanKerjaVal = '', kelolaPegawaiTotalCount = 0, kelolaPegawaiFetchSeq = 0;

/** Router halaman Kelola Pegawai: tanpa parameter → daftar pegawai (dengan aksi Edit/Hapus);
 *  dengan {nip} → form edit; dengan {mode:'form'} → form tambah pegawai baru. */
function renderKelolaPegawai(nip, mode) {
  if (nip || mode === 'form') {
    renderKelolaPegawaiForm(nip);
  } else {
    loadKelolaPegawaiList();
  }
}

function loadKelolaPegawaiList() {
  kelolaPegawaiPageNum = 1; kelolaPegawaiSearchVal = ''; kelolaPegawaiSearchFieldVal = ''; kelolaPegawaiSatuanKerjaVal = '';
  renderKelolaPegawaiShell();
  fetchKelolaPegawaiResults();
}
function kelolaPegawaiGotoPage(p) { kelolaPegawaiPageNum = p; fetchKelolaPegawaiResults(); }
function kelolaPegawaiChangePageSize(n) { kelolaPegawaiPageSizeVal = n; kelolaPegawaiPageNum = 1; fetchKelolaPegawaiResults(); }
/** Round 7 — item 1: pencarian HANYA berjalan saat tombol "Cari" diklik atau Enter ditekan. */
function kelolaPegawaiSearchGo() {
  const inp = document.getElementById('searchKelolaPegawai');
  kelolaPegawaiSearchVal = inp ? inp.value : kelolaPegawaiSearchVal;
  kelolaPegawaiPageNum = 1;
  fetchKelolaPegawaiResults();
}
function kelolaPegawaiOnSearchFieldChange(val) { kelolaPegawaiSearchFieldVal = val; kelolaPegawaiPageNum = 1; fetchKelolaPegawaiResults(); }
function kelolaPegawaiOnSatkerChange(val) { kelolaPegawaiSatuanKerjaVal = val; kelolaPegawaiPageNum = 1; fetchKelolaPegawaiResults(); }

function renderKelolaPegawaiShell() {
  document.getElementById('app-container').innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h2 style="font-size:22px;font-weight:700;">Kelola Pegawai</h2>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-pg btn-sm-pg" onclick="openImportPegawaiModal()"><i class="bi bi-file-earmark-excel"></i> Impor Data Pegawai</button>
        <button class="btn btn-accent btn-sm-pg" onclick="navigateTo('kelolaPegawai',{mode:'form'})"><i class="bi bi-person-plus"></i> Tambah Pegawai</button>
      </div>
    </div>
    <div class="card-pg mb-3">
      <div class="d-flex gap-2 flex-wrap align-items-center">
        ${pegawaiSearchControlsHtml({
          idPrefix: 'KelolaPegawai', searchVal: kelolaPegawaiSearchVal, searchFieldVal: kelolaPegawaiSearchFieldVal,
          satkerVal: kelolaPegawaiSatuanKerjaVal, showSatkerFilter: true,
          onEnterFn: 'kelolaPegawaiSearchGo', onFieldChangeFn: 'kelolaPegawaiOnSearchFieldChange', onSatkerChangeFn: 'kelolaPegawaiOnSatkerChange'
        })}
        ${pageSizeSelectHtml('kelolaPegawaiPageSizeSelect', kelolaPegawaiPageSizeVal, 'kelolaPegawaiChangePageSize')}
      </div>
    </div>
    <div id="kelolaPegawaiResultsArea" class="pg-results-area">${renderSkeleton()}</div>`;
}

function renderKelolaPegawaiResultsHtml(pageItems) {
  const totalPages = Math.max(1, Math.ceil(kelolaPegawaiTotalCount / kelolaPegawaiPageSizeVal));
  const rows = pageItems.length ? pageItems.map(p => `
    <tr>
      <td style="font-family:monospace;">${p.NIP}</td>
      <td><div class="d-flex align-items-center gap-2"><div class="avatar-initials">${initials(p.NamaLengkap)}</div>${p.NamaLengkap}</div></td>
      <td><span class="pill ${p.StatusPegawai === 'PNS' ? 'pill-teal' : 'pill-amber'}">${p.StatusPegawai}</span></td>
      <td><span class="pill pill-neutral">${p.SatuanKerja || '-'}</span></td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-pg btn-sm-pg" onclick="navigateTo('kelolaPegawai',{nip:'${p.NIP}'})"><i class="bi bi-pencil"></i> Edit</button>
          <button class="btn btn-outline-pg btn-sm-pg" onclick="openResetPasswordModal('${p.NIP}','${(p.NamaLengkap || p.NIP).replace(/'/g, "\\'")}')"><i class="bi bi-key"></i> Reset Password</button>
          <button class="btn btn-outline-danger-pg btn-sm-pg" onclick="confirmDeletePegawai('${p.NIP}')"><i class="bi bi-trash"></i> Hapus</button>
        </div>
      </td>
    </tr>`).join('') : `<tr><td colspan="5"><div class="table-empty"><i class="bi bi-search"></i>Tidak ada pegawai yang cocok.</div></td></tr>`;

  const el = document.getElementById('kelolaPegawaiResultsArea');
  el.classList.remove('pg-loading');
  el.innerHTML = `
    <div class="table-pg-wrap mb-3">
      <table class="table-pg"><thead><tr><th>NIP</th><th>Nama Lengkap</th><th>Status</th><th>Satuan Kerja</th><th>Aksi</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="text-muted-pg" style="font-size:13px;">Menampilkan ${pageItems.length} dari ${kelolaPegawaiTotalCount} pegawai</div>
      ${renderPaginationSrv(kelolaPegawaiPageNum, totalPages, 'kelolaPegawaiGotoPage')}
    </div>`;
}

function fetchKelolaPegawaiResults() {
  const seq = ++kelolaPegawaiFetchSeq;
  const retry = 'fetchKelolaPegawaiResults()';
  startWatchdog('kelolaPegawaiResults', retry);
  setAreaLoading('kelolaPegawaiResultsArea', true);
  google.script.run
    .withSuccessHandler(res => {
      clearWatchdog('kelolaPegawaiResults');
      if (seq !== kelolaPegawaiFetchSeq) return;
      if (!res) { renderErrorInArea('kelolaPegawaiResultsArea', 'Server tidak memberikan respons.', retry); return; }
      if (!res.success) { if (res.message === 'SESSION_EXPIRED') { handleAuthError(res, retry); return; } renderErrorInArea('kelolaPegawaiResultsArea', res.message, retry); return; }
      kelolaPegawaiTotalCount = res.data.totalCount;
      try { renderKelolaPegawaiResultsHtml(res.data.rows); } catch (e) { console.error(e); renderErrorInArea('kelolaPegawaiResultsArea', 'Terjadi kesalahan: ' + e.message, retry); }
    })
    .withFailureHandler(err => { clearWatchdog('kelolaPegawaiResults'); if (seq === kelolaPegawaiFetchSeq) renderErrorInArea('kelolaPegawaiResultsArea', 'Gagal terhubung ke server: ' + (err && err.message), retry); })
    .getPegawaiPage(AppState.token, { page: kelolaPegawaiPageNum, pageSize: kelolaPegawaiPageSizeVal, search: kelolaPegawaiSearchVal, searchField: kelolaPegawaiSearchFieldVal, satuanKerja: kelolaPegawaiSatuanKerjaVal });
}

// ── Impor Data Pegawai dari Excel (Round 4 — item 2) ──
let importPegawaiFile = null;
function downloadPegawaiTemplate() {
  showToast('Menyiapkan template...', 'info');
  google.script.run.withSuccessHandler(res => {
    if (res.success) { downloadBase64(res.data.base64, res.data.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); showToast('Template berhasil diunduh.', 'success'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => showToast(err.message, 'danger')).generatePegawaiTemplateExcel(AppState.token);
}
function openImportPegawaiModal() {
  importPegawaiFile = null;
  document.getElementById('dz_importPegawai').classList.remove('has-file');
  document.getElementById('filename_importPegawai').innerHTML = '';
  document.getElementById('importPegawaiResult').innerHTML = '';
  document.getElementById('importPegawaiSubmitBtn').disabled = true;
  document.getElementById('input_importPegawai').value = '';
  new bootstrap.Modal(document.getElementById('importPegawaiModal')).show();
}
function handleImportPegawaiFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { showToast('File harus berformat .xlsx.', 'warning'); input.value = ''; return; }
  if (!checkUploadSizeClient(file, input)) return;
  const reader = new FileReader();
  reader.onload = () => {
    importPegawaiFile = { base64: reader.result.split(',')[1], name: file.name };
    document.getElementById('dz_importPegawai').classList.add('has-file');
    document.getElementById('filename_importPegawai').innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + file.name;
    document.getElementById('importPegawaiSubmitBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}
function submitImportPegawai() {
  if (!importPegawaiFile) { showToast('Pilih file Excel terlebih dahulu.', 'warning'); return; }
  const btn = document.getElementById('importPegawaiSubmitBtn');
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Mengimpor...'; btn.disabled = true;
  document.getElementById('importPegawaiResult').innerHTML = '';
  google.script.run
    .withSuccessHandler(res => {
      btn.innerHTML = original; btn.disabled = false;
      const resultEl = document.getElementById('importPegawaiResult');
      if (res.success) {
        showToast(res.message, 'success');
        let detailHtml = '';
        if (res.data && res.data.gagalDetail && res.data.gagalDetail.length) {
          detailHtml = `<div class="mt-2" style="font-size:12px;max-height:120px;overflow-y:auto;">${res.data.gagalDetail.map(d => `<div class="text-muted-pg">• ${d}</div>`).join('')}</div>`;
        }
        resultEl.innerHTML = `<div class="pill pill-success"><i class="bi bi-check-circle"></i> ${res.data.sukses} berhasil, ${res.data.gagal} dilewati</div>${detailHtml}`;
        loadKelolaPegawaiList();
      } else {
        resultEl.innerHTML = `<div class="text-muted-pg" style="font-size:13px;color:var(--danger);">${res.message}</div>`;
        showToast(res.message, 'danger');
      }
    })
    .withFailureHandler(err => { btn.innerHTML = original; btn.disabled = false; showToast(err.message, 'danger'); })
    .importPegawaiExcel(AppState.token, importPegawaiFile.base64, importPegawaiFile.name);
}

/** Konfigurasi 5 kategori data riwayat yang bisa diedit langsung oleh Super Admin,
 *  selaras dengan KELOLA_RIWAYAT_SHEETS di Kode.gs. */
const KELOLA_RIWAYAT_CONFIG = {
  'Pangkat/Golongan': { sheet: 'Sheet_PangkatGolongan', profileKey: 'pangkat', hasStatus: true, fields: [
    { key: 'Golongan', label: 'Golongan/Ruang', type: 'golongan-select' },
    { key: 'Pangkat', label: 'Pangkat', type: 'hidden' },
    { key: 'MasaKerja', label: 'Masa Kerja', type: 'text' },
    { key: 'TanggalDitetapkan', label: 'Tgl Ditetapkan', type: 'date' },
    { key: 'TanggalBerlaku', label: 'Tgl Berlaku', type: 'date' },
    { key: 'NomorSK', label: 'Nomor SK', type: 'text' }
  ] },
  'Jabatan': { sheet: 'Sheet_Jabatan', profileKey: 'jabatan', hasStatus: true, fields: [
    { key: 'Jabatan', label: 'Jabatan', type: 'text' },
    { key: 'TanggalDitetapkan', label: 'Tgl Ditetapkan', type: 'date' },
    { key: 'TanggalBerlaku', label: 'Tgl Berlaku', type: 'date' },
    { key: 'NomorSK', label: 'Nomor SK', type: 'text' }
  ] },
  'Masa Kerja/KGB': { sheet: 'Sheet_MasaKerjaKGB', profileKey: 'kgb', hasStatus: true, fields: [
    { key: 'MasaKerjaBaru', label: 'Masa Kerja Baru', type: 'text' },
    { key: 'TanggalPenetapan', label: 'Tgl Penetapan', type: 'date' },
    { key: 'TanggalBerlaku', label: 'Tgl Berlaku', type: 'date' },
    { key: 'NomorSK', label: 'Nomor SK', type: 'text' }
  ] },
  'Satuan Kerja': { sheet: 'Sheet_SatuanKerja', profileKey: 'satker', hasStatus: true, fields: [
    { key: 'SatuanKerja', label: 'Satuan Kerja', type: 'satker-select' },
    { key: 'TanggalPenetapan', label: 'Tgl Penetapan', type: 'date' },
    { key: 'TanggalBerlaku', label: 'Tgl Berlaku', type: 'date' },
    { key: 'NomorSK', label: 'Nomor SK', type: 'text' }
  ] },
  'Riwayat Cuti': { sheet: 'Sheet_RiwayatCuti', profileKey: 'cuti', hasStatus: false, fields: [
    { key: 'JenisCuti', label: 'Jenis Cuti', type: 'text' },
    { key: 'TanggalMulai', label: 'Tgl Mulai', type: 'date' },
    { key: 'TanggalSelesai', label: 'Tgl Selesai', type: 'date' },
    { key: 'JumlahHari', label: 'Jumlah Hari', type: 'number' },
    { key: 'Keterangan', label: 'Keterangan', type: 'text' }
  ] }
};
const KELOLA_KELUARGA_FIELDS = [
  { key: 'Nama', label: 'Nama', type: 'text' },
  { key: 'TanggalLahir', label: 'Tanggal Lahir', type: 'date' },
  { key: 'HubunganKeluarga', label: 'Hubungan Keluarga', type: 'select', options: HUBUNGAN_KELUARGA_OPTIONS },
  { key: 'Pekerjaan', label: 'Pekerjaan', type: 'text' },
  // Round 5 — item 2: field tambahan khusus anak (dibiarkan kosong/abaikan untuk anggota
  // lain) — dokumen pendidikan tetap diunggah lewat alur Ajukan Perubahan, bukan di sini.
  { key: 'MasihPendidikan', label: 'Masih Pendidikan? (khusus Anak)', type: 'select', options: ['', 'Ya', 'Tidak'] },
  // Round 6 — item 7: Nomor Surat Keterangan Aktif Kuliah/Pendidikan (khusus Anak usia > 21
  // tahun) — disediakan di sini juga agar Super Admin bisa mengoreksi langsung bila perlu.
  { key: 'NomorSuratKeterangan', label: 'Nomor Surat Keterangan (khusus Anak > 21 th)', type: 'text' }
];

function renderKelolaPegawaiForm(nip, activeTab) {
  const isEdit = !!nip;
  activeTab = activeTab || 'Data Diri';

  if (!isEdit) {
    window.__kelolaProfileCache = { pegawai: {}, keluarga: [], pangkat: [], jabatan: [], kgb: [], satker: [], cuti: [] };
    window.__kelolaDraft = {};
    renderKelolaFormShell(nip, false, 'Data Diri');
    return;
  }

  if (window.__kelolaProfileCache && window.__kelolaProfileCache.pegawai && window.__kelolaProfileCache.pegawai.NIP === nip) {
    renderKelolaFormShell(nip, true, activeTab);
    return;
  }

  const container = document.getElementById('app-container');
  if (container) container.innerHTML = renderSkeleton();
  const retry = `navigateTo('kelolaPegawai',{nip:'${nip}'})`;
  const wdKey = 'kelolaPegawaiForm_' + nip;
  startWatchdog(wdKey, retry);
  google.script.run
    .withSuccessHandler(safeHandler(wdKey, retry, res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      if (!res.data || !res.data.pegawai || !res.data.pegawai.NIP) {
        renderErrorState('Data pegawai dengan NIP ' + nip + ' tidak ditemukan.', "navigateTo('kelolaPegawai')");
        return;
      }
      safeRender(() => {
        window.__kelolaProfileCache = res.data;
        window.__kelolaDraft = {};
        renderKelolaFormShell(nip, true, activeTab);
      }, retry);
    }))
    .withFailureHandler(safeFailure(wdKey, retry))
    .getPegawaiDetail(AppState.token, nip);
}

/** Merender shell (breadcrumb + judul + tab bar + konten tab aktif) dari cache profil yang sudah ada,
 *  tanpa fetch ulang ke server — dipakai setiap kali pindah tab atau mengubah draft baris. */
function renderKelolaFormShell(nip, isEdit, activeTab) {
  window.__kelolaActiveTab = activeTab;
  const profile = window.__kelolaProfileCache;
  const content = renderKelolaTabContent(profile, activeTab, isEdit);
  document.getElementById('app-container').innerHTML = `
    <a href="javascript:void(0)" class="pg-breadcrumb" onclick="navigateTo('kelolaPegawai')"><i class="bi bi-arrow-left"></i> Kembali ke Kelola Pegawai</a>
    <h2 style="font-size:20px;font-weight:700;margin:8px 0 16px;">${isEdit ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}</h2>
    ${isEdit ? `<div class="card-pg mb-3" style="padding-bottom:4px;"><div class="pg-tabs">${DATA_SAYA_TABS.map(t => `<button type="button" class="pg-tab ${t === activeTab ? 'active' : ''}" onclick="switchKelolaTab('${nip}','${t}')">${t}</button>`).join('')}</div></div>` : ''}
    <div id="kelolaTabContent">${content}</div>`;
}

function switchKelolaTab(nip, tab) {
  syncKelolaDraftFromDom(window.__kelolaActiveTab);
  renderKelolaFormShell(nip, true, tab);
}

function renderKelolaTabContent(profile, tab, isEdit) {
  if (tab === 'Data Diri') return renderKelolaDataDiriForm(profile.pegawai, isEdit);
  if (!isEdit) {
    return `<div class="card-pg">${emptyState('bi-info-circle', 'Simpan Data Diri terlebih dahulu sebelum menambahkan ' + tab + '.')}</div>`;
  }
  if (tab === 'Data Keluarga') return renderKelolaKeluargaSection(profile);
  if (KELOLA_RIWAYAT_CONFIG[tab]) return renderKelolaRiwayatSection(profile, tab);
  return '';
}

function renderKelolaDataDiriForm(data, isEdit) {
  return `
    <form id="kelolaForm" onsubmit="submitKelolaPegawai(event, ${isEdit})">
      <div class="card-pg mb-3">
        <h3 style="font-size:14.5px;font-weight:700;margin-bottom:14px;">Data Diri</h3>
        ${isEdit ? `<input type="hidden" name="OriginalNIP" value="${data.NIP}">` : ''}
        <div class="row g-3">
          <div class="col-md-6">${inputField('NIP', 'NIP', data.NIP)}</div>
          <div class="col-md-6">
            <label class="form-label">Status Pegawai <span class="required-asterisk">*</span></label>
            <select class="form-select" name="StatusPegawai" required>
              <option value="PNS" ${data.StatusPegawai==='PNS'?'selected':''}>PNS</option>
              <option value="PPPK" ${data.StatusPegawai==='PPPK'?'selected':''}>PPPK</option>
            </select>
          </div>
          <div class="col-md-6">${inputField('NIK', 'NIK', data.NIK)}</div>
          <div class="col-md-6">${inputField('Nama Lengkap', 'NamaLengkap', data.NamaLengkap)}</div>
          <div class="col-md-12">${inputField('Alamat', 'Alamat', data.Alamat)}</div>
          <div class="col-md-6">${inputField('Nomor Telepon', 'NomorTelepon', data.NomorTelepon)}</div>
          <div class="col-md-6">${inputField('Email Notifikasi', 'EmailNotifikasi', data.EmailNotifikasi, 'email')}</div>
          <div class="col-md-6">
            <label class="form-label">Status Keaktifan <span class="required-asterisk">*</span></label>
            <select class="form-select" name="StatusKeaktifan" required>
              <option value="Aktif" ${(data.StatusKeaktifan || 'Aktif') === 'Aktif' ? 'selected' : ''}>Aktif</option>
              <option value="Pensiun" ${data.StatusKeaktifan === 'Pensiun' ? 'selected' : ''}>Pensiun</option>
              <option value="Pindah" ${data.StatusKeaktifan === 'Pindah' ? 'selected' : ''}>Pindah</option>
            </select>
            <div class="text-muted-pg" style="font-size:11.5px;margin-top:4px;">Hanya Super Admin yang dapat mengubah status ini.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Jenis Kelamin</label>
            <select class="form-select" name="Gender">
              <option value="" ${!data.Gender || data.Gender === '-' ? 'selected' : ''}>— Belum Diisi —</option>
              <option value="Laki-laki" ${data.Gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
              <option value="Perempuan" ${data.Gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
            </select>
            <div class="text-muted-pg" style="font-size:11.5px;margin-top:4px;">Hanya Super Admin yang dapat mengubah data ini.</div>
          </div>
          ${!isEdit ? `<div class="col-md-6"><label class="form-label">Password Awal</label><input type="text" class="form-control" name="Password" placeholder="Default = NIP jika dikosongkan"></div>` : ''}
          <div class="col-md-4">
            <label class="form-label">Status Pernikahan</label>
            <select class="form-select" name="StatusPernikahan">
              ${['', 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'].map(o => `<option value="${o}" ${(data.StatusPernikahan || '') === o ? 'selected' : ''}>${o || '— Belum Diisi —'}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">Pasangan PNS?</label>
            <select class="form-select" name="PasanganPNS" id="kelolaPasanganPNS" onchange="document.getElementById('kelolaNipPasanganWrap').style.display = this.value === 'Ya' ? '' : 'none';">
              <option value="" ${!data.PasanganPNS ? 'selected' : ''}>— Pilih —</option>
              <option value="Ya" ${data.PasanganPNS === 'Ya' ? 'selected' : ''}>Ya</option>
              <option value="Tidak" ${data.PasanganPNS === 'Tidak' ? 'selected' : ''}>Tidak</option>
            </select>
          </div>
          <div class="col-md-4" id="kelolaNipPasanganWrap" style="${data.PasanganPNS === 'Ya' ? '' : 'display:none;'}">
            <label class="form-label">NIP Pasangan</label>
            <input type="text" class="form-control" name="NIPPasangan" value="${data.NIPPasangan || ''}">
          </div>
        </div>
      </div>
      <div class="sticky-actionbar">
        <div class="d-flex gap-2">
          ${isEdit ? `<button type="button" class="btn btn-outline-danger-pg" onclick="confirmDeletePegawai('${data.NIP}')"><i class="bi bi-trash"></i> Hapus Pegawai</button>` : ''}
          ${isEdit ? `<button type="button" class="btn btn-outline-pg" onclick="openResetPasswordModal('${data.NIP}','${(data.NamaLengkap || data.NIP).replace(/'/g, "\\'")}')"><i class="bi bi-key"></i> Reset Password</button>` : ''}
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-ghost" onclick="navigateTo('kelolaPegawai')">Batal</button>
          <button type="submit" class="btn btn-accent" id="kelolaSubmitBtn">Simpan</button>
        </div>
      </div>
    </form>`;
}

function renderKelolaKeluargaSection(profile) {
  const draft = ensureKelolaDraft('Data Keluarga');
  const rowsHtml = draft.length ? draft.map((r, i) => kelolaRowCard('Data Keluarga', r, i, KELOLA_KELUARGA_FIELDS, false)).join('')
    : emptyState('bi-inbox', 'Belum ada data Data Keluarga.');
  return `
    <div class="card-pg mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h3 style="font-size:14.5px;font-weight:700;">Data Keluarga</h3>
        <button type="button" class="btn btn-outline-pg btn-sm-pg" onclick="addKelolaDraftRow('Data Keluarga')"><i class="bi bi-plus-lg"></i> Tambah Anggota</button>
      </div>
      <div id="kelolaRowsContainer">${rowsHtml}</div>
    </div>
    <div class="sticky-actionbar">
      <div></div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-ghost" onclick="navigateTo('kelolaPegawai')">Batal</button>
        <button type="button" class="btn btn-accent" id="kelolaSaveBtn" onclick="saveKelolaDraftSection(this, 'Data Keluarga', '${profile.pegawai.NIP}')">Simpan Data Keluarga</button>
      </div>
    </div>`;
}

function renderKelolaRiwayatSection(profile, tab) {
  const cfg = KELOLA_RIWAYAT_CONFIG[tab];
  const draft = ensureKelolaDraft(tab);
  const rowsHtml = draft.length ? draft.map((r, i) => kelolaRowCard(tab, r, i, cfg.fields, cfg.hasStatus)).join('')
    : emptyState('bi-inbox', 'Belum ada data ' + tab + '.');
  return `
    <div class="card-pg mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h3 style="font-size:14.5px;font-weight:700;">${tab}</h3>
        <button type="button" class="btn btn-outline-pg btn-sm-pg" onclick="addKelolaDraftRow('${tab}')"><i class="bi bi-plus-lg"></i> Tambah Baris</button>
      </div>
      ${cfg.hasStatus ? `<p class="text-muted-pg" style="font-size:12.5px;">Pilih "Status Aktif" pada satu baris untuk menandai data yang berlaku saat ini.</p>` : ''}
      <div id="kelolaRowsContainer">${rowsHtml}</div>
    </div>
    <div class="sticky-actionbar">
      <div></div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-ghost" onclick="navigateTo('kelolaPegawai')">Batal</button>
        <button type="button" class="btn btn-accent" id="kelolaSaveBtn" onclick="saveKelolaDraftSection(this, '${tab}', '${profile.pegawai.NIP}')">Simpan ${tab}</button>
      </div>
    </div>`;
}

function kelolaRowCard(tab, row, idx, fields, hasStatus) {
  const radioName = 'statusAktif_' + tab.replace(/[^a-zA-Z0-9]/g, '');
  const uid = tab.replace(/[^a-zA-Z0-9]/g, '') + '_' + idx;
  const visibleFields = fields.filter(f => f.type !== 'hidden');
  const hiddenFields = fields.filter(f => f.type === 'hidden');
  return `<div class="card-pg mb-2" data-kelola-row="${idx}" style="background:#f8fafb;">
    <div class="row g-2">
      ${visibleFields.map(f => `<div class="col-md-6">
        <label class="form-label">${f.label}</label>
        ${renderKelolaFieldControl(f, row, uid)}
      </div>`).join('')}
    </div>
    ${hiddenFields.map(f => `<input type="hidden" data-field="${f.key}" value="${row[f.key] != null ? row[f.key] : ''}">`).join('')}
    <div class="d-flex justify-content-between align-items-center mt-2">
      ${hasStatus ? `<div class="form-check">
        <input class="form-check-input" type="radio" name="${radioName}" ${row.StatusTerkini === 'Ya' ? 'checked' : ''} onchange="setKelolaDraftActive('${tab}', ${idx})">
        <label class="form-check-label" style="font-size:13px;">Status Aktif Saat Ini</label>
      </div>` : '<div></div>'}
      <button type="button" class="btn btn-outline-danger-pg btn-sm-pg" onclick="removeKelolaDraftRow('${tab}', ${idx})"><i class="bi bi-trash"></i> Hapus Baris</button>
    </div>
  </div>`;
}

/** Render kontrol input satu field baris Kelola Riwayat sesuai tipenya — termasuk dropdown
 *  Golongan/Ruang (otomatis mengisi field Pangkat tersembunyi berpasangan) dan dropdown
 *  Satuan Kerja, menggantikan isian teks bebas (lihat permintaan: dropdown data tetap). */
function renderKelolaFieldControl(f, row, uid) {
  if (f.type === 'golongan-select') {
    const found = PANGKAT_GOLONGAN_LIST.find(g => g.golongan === row[f.key]);
    return `<select class="form-select form-select-sm" data-field="Golongan" onchange="onKelolaGolonganChange(this,'${uid}')">
      <option value="">— Pilih Golongan/Ruang —</option>
      ${PANGKAT_GOLONGAN_LIST.map(g => `<option value="${g.golongan}" data-pangkat="${g.pangkat}" ${g.golongan === row[f.key] ? 'selected' : ''}>${g.golongan} — ${g.pangkat}</option>`).join('')}
    </select>
    <div class="text-muted-pg" style="font-size:11px;margin-top:3px;" id="kelolaPangkatPreview_${uid}">${found ? 'Pangkat: ' + found.pangkat : ''}</div>`;
  }
  if (f.type === 'satker-select') {
    return `<select class="form-select form-select-sm" data-field="${f.key}">
      <option value="">— Pilih Satuan Kerja —</option>
      ${UNIT_KERJA_LIST.map(u => `<option value="${u}" ${u === row[f.key] ? 'selected' : ''}>${u}</option>`).join('')}
    </select>`;
  }
  if (f.type === 'select') {
    const opts = f.options || [];
    return `<select class="form-select form-select-sm" data-field="${f.key}">
      ${opts.map(o => `<option value="${o}" ${o === row[f.key] ? 'selected' : ''}>${o || '— Pilih —'}</option>`).join('')}
    </select>`;
  }
  const type = f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : 'text');
  const value = f.type === 'date' ? toDateInputValue(row[f.key]) : (row[f.key] != null ? row[f.key] : '');
  return `<input type="${type}" class="form-control form-control-sm" data-field="${f.key}" value="${value}">`;
}
function onKelolaGolonganChange(sel, uid) {
  const card = sel.closest('[data-kelola-row]');
  const opt = sel.options[sel.selectedIndex];
  const pangkat = opt ? (opt.getAttribute('data-pangkat') || '') : '';
  if (card) {
    const hidden = card.querySelector('input[data-field="Pangkat"]');
    if (hidden) hidden.value = pangkat;
  }
  const prev = document.getElementById('kelolaPangkatPreview_' + uid);
  if (prev) prev.textContent = pangkat ? ('Pangkat: ' + pangkat) : '';
}

function ensureKelolaDraft(tab) {
  window.__kelolaDraft = window.__kelolaDraft || {};
  if (!window.__kelolaDraft[tab]) {
    const profile = window.__kelolaProfileCache;
    const source = tab === 'Data Keluarga' ? (profile.keluarga || []) : (profile[KELOLA_RIWAYAT_CONFIG[tab].profileKey] || []);
    window.__kelolaDraft[tab] = source.map(r => Object.assign({}, r));
  }
  return window.__kelolaDraft[tab];
}

function syncKelolaDraftFromDom(tab) {
  if (!tab || tab === 'Data Diri') return;
  const draft = window.__kelolaDraft && window.__kelolaDraft[tab];
  if (!draft) return;
  const container = document.getElementById('kelolaRowsContainer');
  if (!container) return;
  container.querySelectorAll('[data-kelola-row]').forEach(card => {
    const idx = parseInt(card.getAttribute('data-kelola-row'), 10);
    if (!draft[idx]) return;
    card.querySelectorAll('[data-field]').forEach(input => {
      draft[idx][input.getAttribute('data-field')] = input.value;
    });
  });
}

function addKelolaDraftRow(tab) {
  syncKelolaDraftFromDom(tab);
  ensureKelolaDraft(tab).push({});
  renderKelolaFormShell(window.__kelolaProfileCache.pegawai.NIP, true, tab);
}
function removeKelolaDraftRow(tab, idx) {
  syncKelolaDraftFromDom(tab);
  window.__kelolaDraft[tab].splice(idx, 1);
  renderKelolaFormShell(window.__kelolaProfileCache.pegawai.NIP, true, tab);
}
function setKelolaDraftActive(tab, idx) {
  syncKelolaDraftFromDom(tab);
  window.__kelolaDraft[tab].forEach((r, i) => { r.StatusTerkini = (i === idx) ? 'Ya' : 'Tidak'; });
  renderKelolaFormShell(window.__kelolaProfileCache.pegawai.NIP, true, tab);
}
function toDateInputValue(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
}

function saveKelolaDraftSection(btn, tab, nip) {
  syncKelolaDraftFromDom(tab);
  const draft = window.__kelolaDraft[tab] || [];
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...'; btn.disabled = true;
  const done = (res) => {
    btn.innerHTML = original; btn.disabled = false;
    if (res && res.success) {
      showToast(res.message, 'success');
      if (tab === 'Data Keluarga') window.__kelolaProfileCache.keluarga = draft.slice();
      else window.__kelolaProfileCache[KELOLA_RIWAYAT_CONFIG[tab].profileKey] = draft.slice();
      delete window.__kelolaDraft[tab];
      renderKelolaFormShell(nip, true, tab);
    } else {
      showToast((res && res.message) || 'Terjadi kesalahan saat menyimpan.', 'danger');
    }
  };
  if (tab === 'Data Keluarga') {
    google.script.run.withSuccessHandler(done).withFailureHandler(err => done({ success: false, message: err.message }))
      .saveKelolaKeluarga(AppState.token, nip, draft);
  } else {
    const cfg = KELOLA_RIWAYAT_CONFIG[tab];
    google.script.run.withSuccessHandler(done).withFailureHandler(err => done({ success: false, message: err.message }))
      .saveKelolaRiwayat(AppState.token, nip, cfg.sheet, draft);
  }
}

function submitKelolaPegawai(event, isEdit) {
  event.preventDefault();
  const form = event.target;
  const obj = {}; new FormData(form).forEach((v, k) => obj[k] = v);
  const btn = document.getElementById('kelolaSubmitBtn');
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...'; btn.disabled = true;
  google.script.run.withSuccessHandler(res => {
    btn.innerHTML = original; btn.disabled = false;
    if (res.success) { showToast(res.message, 'success'); navigateTo('kelolaPegawai'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => { btn.innerHTML = original; btn.disabled = false; showToast(err.message, 'danger'); })
    .saveKelolaPegawai(AppState.token, obj, !isEdit);
}
function confirmDeletePegawai(nip) {
  openConfirmModal('Hapus Pegawai', `Apakah Anda yakin ingin menghapus data pegawai NIP ${nip}? Tindakan ini tidak dapat dibatalkan.`, () => {
    google.script.run.withSuccessHandler(res => {
      if (res.success) { showToast(res.message, 'success'); navigateTo('kelolaPegawai'); } else showToast(res.message, 'danger');
    }).withFailureHandler(err => showToast(err.message, 'danger')).deletePegawai(AppState.token, nip);
  }, true);
}

// ════════════════════════════════════════════════════════
// BAGIAN SUPER ADMIN — ADMIN UNIT KERJA (fitur baru)
// Kelola akun yang hanya bisa melihat & mengajukan perubahan data pegawai
// untuk satu Satuan Kerja tertentu (lihat getAllPegawai/getPegawaiDetail/
// submitPengajuan di Kode.gs untuk pembatasan aksesnya).
// ════════════════════════════════════════════════════════
let adminUnitCache = [], unitKerjaOptionsCache = [];

function renderKelolaAdminUnit(username, mode) {
  if (username || mode === 'form') {
    renderKelolaAdminUnitForm(username);
  } else {
    loadKelolaAdminUnitList();
  }
}

function loadKelolaAdminUnitList() {
  const container = document.getElementById('app-container');
  if (container) container.innerHTML = renderSkeleton();
  const retry = 'loadKelolaAdminUnitList()';
  startWatchdog('kelolaAdminUnitList', retry);
  google.script.run
    .withSuccessHandler(safeHandler('kelolaAdminUnitList', retry, res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      adminUnitCache = res.data;
      safeRender(renderKelolaAdminUnitList, retry);
    }))
    .withFailureHandler(safeFailure('kelolaAdminUnitList', retry))
    .getAdminUnitList(AppState.token);
}

function renderKelolaAdminUnitList() {
  const rows = adminUnitCache.length ? adminUnitCache.map(u => `
    <tr>
      <td style="font-weight:700;">${u.Username}</td>
      <td>${u.NamaTampilan}</td>
      <td><span class="pill pill-teal">${u.SatuanKerjaBinaan || '-'}</span></td>
      <td><span class="pill ${u.StatusAktif==='Aktif'?'pill-success':'pill-neutral'}">${u.StatusAktif}</span></td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-pg btn-sm-pg" onclick="navigateTo('kelolaAdminUnit',{username:'${u.Username}'})"><i class="bi bi-pencil"></i> Edit</button>
          <button class="btn btn-outline-pg btn-sm-pg" onclick="openResetPasswordModal('${u.Username}','${(u.NamaTampilan || u.Username).replace(/'/g, "\\'")}')"><i class="bi bi-key"></i> Reset Password</button>
          <button class="btn btn-outline-danger-pg btn-sm-pg" onclick="confirmDeleteAdminUnit('${u.Username}')"><i class="bi bi-trash"></i> Hapus</button>
        </div>
      </td>
    </tr>`).join('') : `<tr><td colspan="5"><div class="table-empty"><i class="bi bi-diagram-3"></i>Belum ada akun Admin Unit Kerja.</div></td></tr>`;

  document.getElementById('app-container').innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h2 style="font-size:22px;font-weight:700;">Admin Unit Kerja</h2>
        <div class="text-muted-pg" style="font-size:12.5px;">Setiap akun di sini hanya bisa melihat &amp; mengajukan perubahan data untuk pegawai di satu Satuan Kerja.</div>
      </div>
      <button class="btn btn-accent btn-sm-pg" onclick="navigateTo('kelolaAdminUnit',{mode:'form'})"><i class="bi bi-person-plus"></i> Tambah Admin Unit</button>
    </div>
    <div class="table-pg-wrap mb-3">
      <table class="table-pg"><thead><tr><th>Username</th><th>Nama</th><th>Satuan Kerja</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
}

function renderKelolaAdminUnitForm(username) {
  const isEdit = !!username;

  if (isEdit && !adminUnitCache.find(u => u.Username === username)) {
    const container = document.getElementById('app-container');
    if (container) container.innerHTML = renderSkeleton();
    const retry = `navigateTo('kelolaAdminUnit',{username:'${username}'})`;
    const wdKey = 'kelolaAdminUnitForm';
    startWatchdog(wdKey, retry);
    google.script.run
      .withSuccessHandler(safeHandler(wdKey, retry, res => {
        if (!res.success) { handleAuthError(res, retry); return; }
        adminUnitCache = res.data;
        const found = adminUnitCache.find(u => u.Username === username);
        if (!found) {
          renderErrorState('Akun Admin Unit Kerja "' + username + '" tidak ditemukan.', "navigateTo('kelolaAdminUnit')");
          return;
        }
        safeRender(() => renderKelolaAdminUnitFormUI(found, true), retry);
      }))
      .withFailureHandler(safeFailure(wdKey, retry))
      .getAdminUnitList(AppState.token);
  } else {
    const existing = isEdit ? (adminUnitCache.find(u => u.Username === username) || {}) : {};
    renderKelolaAdminUnitFormUI(existing, isEdit);
  }
}

function renderKelolaAdminUnitFormUI(existing, isEdit) {
  document.getElementById('app-container').innerHTML = `
    <a href="javascript:void(0)" class="pg-breadcrumb" onclick="navigateTo('kelolaAdminUnit')"><i class="bi bi-arrow-left"></i> Kembali ke Admin Unit Kerja</a>
    <h2 style="font-size:20px;font-weight:700;margin:8px 0 16px;">${isEdit ? 'Edit Admin Unit Kerja' : 'Tambah Admin Unit Kerja'}</h2>
    <form id="adminUnitForm" onsubmit="submitKelolaAdminUnit(event, ${isEdit}, '${existing.Username || ''}')">
      <div class="card-pg mb-3">
        <div class="row g-3">
          <div class="col-md-6">${inputField('Username', 'Username', existing.Username)}</div>
          <div class="col-md-6">${inputField('Nama Tampilan', 'NamaTampilan', existing.NamaTampilan)}</div>
          <div class="col-md-6">
            <label class="form-label">Satuan Kerja Binaan <span class="required-asterisk">*</span></label>
            <select class="form-select" name="SatuanKerjaBinaan" required>
              <option value="">— Pilih Satuan Kerja —</option>
              ${UNIT_KERJA_LIST.map(u => `<option value="${u}" ${existing.SatuanKerjaBinaan===u?'selected':''}>${u}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Password ${isEdit ? '' : '<span class="required-asterisk">*</span>'}</label>
            <input type="text" class="form-control" name="Password" placeholder="${isEdit ? 'Kosongkan jika tidak diubah' : 'Default = Username jika dikosongkan'}">
          </div>
          ${isEdit ? `<div class="col-md-6">
            <label class="form-label">Status Akun</label>
            <select class="form-select" name="StatusAktif">
              <option value="Aktif" ${existing.StatusAktif==='Aktif'?'selected':''}>Aktif</option>
              <option value="Nonaktif" ${existing.StatusAktif==='Nonaktif'?'selected':''}>Nonaktif</option>
            </select>
          </div>` : ''}
        </div>
      </div>
      <div class="sticky-actionbar">
        <div></div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-ghost" onclick="navigateTo('kelolaAdminUnit')">Batal</button>
          <button type="submit" class="btn btn-accent" id="adminUnitSubmitBtn">Simpan</button>
        </div>
      </div>
    </form>`;
}

function submitKelolaAdminUnit(event, isEdit, originalUsername) {
  event.preventDefault();
  const form = event.target;
  const obj = {}; new FormData(form).forEach((v, k) => obj[k] = v);
  obj.OriginalUsername = originalUsername;
  const btn = document.getElementById('adminUnitSubmitBtn');
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...'; btn.disabled = true;
  google.script.run.withSuccessHandler(res => {
    btn.innerHTML = original; btn.disabled = false;
    if (res.success) { showToast(res.message, 'success'); adminUnitCache = []; navigateTo('kelolaAdminUnit'); }
    else showToast(res.message, 'danger');
  }).withFailureHandler(err => { btn.innerHTML = original; btn.disabled = false; showToast(err.message, 'danger'); })
    .saveAdminUnit(AppState.token, obj, !isEdit);
}

function confirmDeleteAdminUnit(username) {
  openConfirmModal('Hapus Admin Unit Kerja', `Apakah Anda yakin ingin menghapus akun "${username}"? Tindakan ini tidak dapat dibatalkan.`, () => {
    google.script.run.withSuccessHandler(res => {
      if (res.success) { showToast(res.message, 'success'); adminUnitCache = []; navigateTo('kelolaAdminUnit'); } else showToast(res.message, 'danger');
    }).withFailureHandler(err => showToast(err.message, 'danger')).deleteAdminUnit(AppState.token, username);
  }, true);
}

// ════════════════════════════════════════════════════════
// BAGIAN ADMIN — PENGAJUAN MASUK (approval queue)
// ════════════════════════════════════════════════════════
let pengajuanMasukCache = [], selectedPengajuan = null;

function loadPengajuanMasuk() {
  const retry = 'loadPengajuanMasuk()';
  startWatchdog('pengajuanMasuk', retry);
  google.script.run
    .withSuccessHandler(safeHandler('pengajuanMasuk', retry, res => { if (res.success) { pengajuanMasukCache = res.data; safeRender(renderPengajuanMasuk, retry); } else handleAuthError(res, retry); }))
    .withFailureHandler(safeFailure('pengajuanMasuk', retry))
    .getPengajuanMasuk(AppState.token);
}

function renderPengajuanMasuk() {
  const list = pengajuanMasukCache;
  const rows = list.length ? list.map((it, idx) => `
    <tr onclick="selectPengajuan(${idx})" style="cursor:pointer;${selectedPengajuan===idx?'background:var(--primary-light)':''}">
      <td style="font-weight:700;">${it.NamaPemohon}</td>
      <td style="font-family:monospace;">${it.NIP_Pemohon}</td>
      <td>${it.JenisPengajuan}</td>
      <td>${fmtDate(it.TanggalPengajuan)}</td>
      <td>${statusPill(it.Status)}</td>
    </tr>`).join('') : `<tr><td colspan="5"><div class="table-empty"><i class="bi bi-inbox"></i>Tidak ada pengajuan menunggu verifikasi.</div></td></tr>`;

  let detailPanel = '<div class="card-pg"><div class="empty-state"><div class="icon-circle"><i class="bi bi-cursor"></i></div><p>Pilih salah satu pengajuan pada tabel untuk meninjau.</p></div></div>';
  if (selectedPengajuan !== null && list[selectedPengajuan]) {
    detailPanel = renderReviewPanel(list[selectedPengajuan]);
  }

  document.getElementById('app-container').innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h2 style="font-size:22px;font-weight:700;">Pengajuan Masuk</h2>
      <span class="pill pill-amber">${list.length} Pengajuan Menunggu Verifikasi</span>
    </div>
    <div class="table-pg-wrap mb-4">
      <table class="table-pg"><thead><tr><th>Nama Pegawai</th><th>NIP</th><th>Jenis</th><th>Tanggal</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div id="reviewPanel">${detailPanel}</div>
  `;
}

function selectPengajuan(idx) { selectedPengajuan = idx; renderPengajuanMasuk(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }

function renderReviewPanel(it) {
  const dataLama = safeParse(it.DataLama), dataBaru = safeParse(it.DataBaru);
  const keys = it.JenisPengajuan === 'Data Keluarga' ? [] : Array.from(new Set([...Object.keys(dataLama || {}), ...Object.keys(dataBaru || {})])).filter(k => !['ID','NIP','StatusTerkini','ID_Keluarga'].includes(k));

  let compareHtml;
  if (it.JenisPengajuan === 'Data Keluarga') {
    const anggotaBaru = Array.isArray(dataBaru) ? dataBaru : (dataBaru && Array.isArray(dataBaru.anggota) ? dataBaru.anggota : []);
    const anggotaLama = Array.isArray(dataLama) ? dataLama : (dataLama && Array.isArray(dataLama.anggota) ? dataLama.anggota : []);
    const pasanganInfo = (dataBaru && !Array.isArray(dataBaru) && dataBaru.pasanganPNS)
      ? `<div class="text-muted-pg" style="font-size:12.5px;margin-bottom:6px;">Pasangan PNS: <b>${dataBaru.pasanganPNS}</b>${dataBaru.pasanganPNS === 'Ya' ? (' &middot; NIP Pasangan: <b>' + (dataBaru.nipPasangan || '-') + '</b>') : ''}</div>` : '';
    compareHtml = pasanganInfo +
      `<div class="text-muted-pg" style="font-size:12.5px;">Data lama: ${anggotaLama.length} anggota &rarr; Data baru: ${anggotaBaru.length} anggota</div>` +
      simpleTable2(['Nama','Hubungan','Pekerjaan','No. Surat Ket.','Dok. Pendidikan'], anggotaBaru.map(k => [k.Nama, k.HubunganKeluarga, k.Pekerjaan, k.NomorSuratKeterangan || '-',
        k.DokumenPendidikanUrl ? `<a href="javascript:void(0)" class="link-teal" onclick="openPreviewModal('${k.DokumenPendidikanUrl}','Dokumen Pendidikan — ${(k.Nama||'').replace(/'/g,"")}')">Lihat</a>` : '-']));
  } else {
    compareHtml = `<table class="table-pg" style="font-size:12.5px;"><thead><tr><th>Field</th><th>Data Lama</th><th>Data Baru</th></tr></thead><tbody>
      ${keys.map(k => `<tr><td style="font-weight:700;">${k}</td><td class="text-muted-pg">${(dataLama&&dataLama[k])||'-'}</td><td style="background:#FDF0DA;font-weight:700;">${(dataBaru&&dataBaru[k])||'-'}</td></tr>`).join('')}
    </tbody></table>`;
  }

  return `<div class="row g-3">
    <div class="col-md-5">
      <div class="card-pg h-100">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;"><i class="bi bi-file-earmark-pdf"></i> Dokumen Pendukung</h3>
        <div class="d-flex flex-column gap-2">
          ${it.LinkDokumen1 ? `<button type="button" class="btn btn-outline-pg btn-sm-pg" onclick="openPreviewModal('${it.LinkDokumen1}','Dokumen 1')"><i class="bi bi-eye"></i> Pratinjau Dokumen 1</button>` : ''}
          ${it.LinkDokumen2 ? `<button type="button" class="btn btn-outline-pg btn-sm-pg" onclick="openPreviewModal('${it.LinkDokumen2}','Dokumen 2 (Kartu Keluarga)')"><i class="bi bi-eye"></i> Pratinjau Dokumen 2 (KK)</button>` : ''}
        </div>
      </div>
    </div>
    <div class="col-md-7">
      <div class="card-pg h-100">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div><div style="font-weight:700;">${it.NamaPemohon}</div><div class="text-muted-pg" style="font-size:12px;font-family:monospace;">${it.NIP_Pemohon} &middot; ${fmtDate(it.TanggalPengajuan)}</div></div>
          <span class="pill pill-info">${it.JenisPengajuan}</span>
        </div>
        <div class="mb-3">${compareHtml}</div>
        <div class="d-flex gap-2">
          <button class="btn btn-accent flex-grow-1" style="background:var(--success)" onclick="confirmApprove('${it.ID_Pengajuan}')"><i class="bi bi-check-circle"></i> Setujui</button>
          <button class="btn btn-outline-danger-pg flex-grow-1" onclick="openRejectModal('${it.ID_Pengajuan}')"><i class="bi bi-x-circle"></i> Tolak</button>
        </div>
      </div>
    </div>
  </div>`;
}
function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

function confirmApprove(id) {
  openConfirmModal('Setujui Pengajuan', 'Data master pegawai akan diperbarui secara otomatis. Lanjutkan?', () => {
    google.script.run.withSuccessHandler(res => {
      if (res.success) { showToast(res.message, 'success'); selectedPengajuan = null; loadPengajuanMasuk(); refreshPendingBadge(); }
      else showToast(res.message, 'danger');
    }).withFailureHandler(err => showToast(err.message, 'danger')).approvePengajuan(AppState.token, id);
  }, false);
}

function openRejectModal(id) {
  document.getElementById('confirmModalTitle').textContent = 'Alasan Penolakan';
  document.getElementById('confirmModalBody').innerHTML = `<label class="form-label">Catatan / Alasan Penolakan <span class="required-asterisk">*</span></label>
    <textarea class="form-control" id="rejectReasonInput" rows="3" placeholder="Jelaskan alasan penolakan..."></textarea>`;
  const btn = document.getElementById('confirmModalBtn');
  btn.className = 'btn btn-danger-fill';
  btn.textContent = 'Konfirmasi Tolak';
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  btn.onclick = () => {
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!reason) { showToast('Catatan alasan penolakan wajib diisi.', 'warning'); return; }
    modal.hide();
    google.script.run.withSuccessHandler(res => {
      if (res.success) { showToast(res.message, 'success'); selectedPengajuan = null; loadPengajuanMasuk(); refreshPendingBadge(); }
      else showToast(res.message, 'danger');
    }).withFailureHandler(err => showToast(err.message, 'danger')).rejectPengajuan(AppState.token, id, reason);
  };
  modal.show();
}

// ════════════════════════════════════════════════════════
// BAGIAN ADMIN — RIWAYAT SELURUH PENGAJUAN
// ════════════════════════════════════════════════════════
let riwayatPageNum = 1, riwayatPageSizeVal = 10, riwayatSearchVal = '', riwayatStatusVal = '', riwayatTotalCount = 0, riwayatFetchSeq = 0;

function loadRiwayatSeluruh() {
  riwayatPageNum = 1; riwayatSearchVal = ''; riwayatStatusVal = '';
  renderRiwayatSeluruhShell();
  fetchRiwayatSeluruhResults();
  // Kartu ringkasan status memakai agregat ringan getDashboardData (sudah di-cache server,
  // lihat invalidateDashboardCache) — bukan fetch seluruh data pengajuan.
  google.script.run.withSuccessHandler(res => {
    if (!res || !res.success) return;
    const el = document.getElementById('riwayatStatCards');
    if (!el) return;
    const sc = res.data.statusCount || {};
    el.innerHTML = `
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value">${(sc.Menunggu||0)+(sc.Disetujui||0)+(sc.Ditolak||0)}</div><div class="stat-label">Total Pengajuan</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value" style="color:var(--success)">${sc.Disetujui||0}</div><div class="stat-label">Disetujui</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value" style="color:var(--danger)">${sc.Ditolak||0}</div><div class="stat-label">Ditolak</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value" style="color:var(--accent-dark)">${sc.Menunggu||0}</div><div class="stat-label">Menunggu</div></div></div>`;
  }).withFailureHandler(() => {}).getDashboardData(AppState.token);
}
function riwayatGotoPage(p) { riwayatPageNum = p; fetchRiwayatSeluruhResults(); }
function riwayatChangePageSize(n) { riwayatPageSizeVal = n; riwayatPageNum = 1; fetchRiwayatSeluruhResults(); }
/** Round 7 — item 1: kolom cari ini juga mencari berdasarkan Nama/NIP pegawai, jadi perilaku
 *  "tombol Cari / Enter" (bukan lagi per-ketikan dengan debounce) diterapkan juga di sini. */
function riwayatSearchGo() {
  const inp = document.getElementById('searchRiwayat');
  riwayatSearchVal = inp ? inp.value : riwayatSearchVal;
  riwayatPageNum = 1;
  fetchRiwayatSeluruhResults();
}
function riwayatOnStatusChange(val) { riwayatStatusVal = val; riwayatPageNum = 1; fetchRiwayatSeluruhResults(); }

function renderRiwayatSeluruhShell() {
  document.getElementById('app-container').innerHTML = `
    <div class="pg-breadcrumb">Dinas Kesehatan Kab. Minahasa Selatan / Audit Trail</div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h2 style="font-size:22px;font-weight:700;">Riwayat Seluruh Pengajuan</h2>
    </div>
    <div class="row g-3 mb-4" id="riwayatStatCards">
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value skeleton" style="height:22px;width:40px;"></div><div class="stat-label">Total Pengajuan</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value skeleton" style="height:22px;width:40px;"></div><div class="stat-label">Disetujui</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value skeleton" style="height:22px;width:40px;"></div><div class="stat-label">Ditolak</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-value skeleton" style="height:22px;width:40px;"></div><div class="stat-label">Menunggu</div></div></div>
    </div>
    <div class="card-pg mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-4 d-flex gap-2">
          <input class="form-control" id="searchRiwayat" placeholder="Cari NIP / Nama..." value="${riwayatSearchVal}"
            onkeydown="if(event.key==='Enter'){event.preventDefault();riwayatSearchGo();}">
          <button type="button" class="btn btn-accent btn-sm-pg" onclick="riwayatSearchGo()"><i class="bi bi-search"></i></button>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="filterStatusRiwayat" onchange="riwayatOnStatusChange(this.value)">
            <option value="">Semua Status</option>
            <option value="Menunggu">Menunggu</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
        <div class="col-md-5 text-md-end">${pageSizeSelectHtml('riwayatPageSizeSelect', riwayatPageSizeVal, 'riwayatChangePageSize')}</div>
      </div>
    </div>
    <div id="riwayatResultsArea" class="pg-results-area">${renderSkeleton()}</div>`;
}

function renderRiwayatSeluruhResultsHtml(pageItems) {
  const totalPages = Math.max(1, Math.ceil(riwayatTotalCount / riwayatPageSizeVal));
  const rows = pageItems.length ? pageItems.map(p => `<tr>
    <td style="font-weight:700;">${p.NamaPemohon}</td><td style="font-family:monospace;">${p.NIP_Pemohon}</td>
    <td>${p.JenisPengajuan}</td><td>${fmtDate(p.TanggalPengajuan)}</td><td>${statusPill(p.Status)}</td>
    <td>${p.DiprosesOleh || '-'}</td><td>${p.TanggalDiproses ? fmtDate(p.TanggalDiproses) : '-'}</td>
  </tr>`).join('') : `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-inbox"></i>Tidak ada data.</div></td></tr>`;

  const el = document.getElementById('riwayatResultsArea');
  el.classList.remove('pg-loading');
  el.innerHTML = `
    <div class="table-pg-wrap mb-3">
      <table class="table-pg"><thead><tr><th>Pegawai</th><th>NIP</th><th>Jenis</th><th>Tgl Diajukan</th><th>Status</th><th>Diproses Oleh</th><th>Tgl Diproses</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="text-muted-pg" style="font-size:13px;">Menampilkan ${pageItems.length} dari ${riwayatTotalCount} hasil</div>
      ${renderPaginationSrv(riwayatPageNum, totalPages, 'riwayatGotoPage')}
    </div>`;
}

function fetchRiwayatSeluruhResults() {
  const seq = ++riwayatFetchSeq;
  const retry = 'fetchRiwayatSeluruhResults()';
  startWatchdog('riwayatResults', retry);
  setAreaLoading('riwayatResultsArea', true);
  google.script.run
    .withSuccessHandler(res => {
      clearWatchdog('riwayatResults');
      if (seq !== riwayatFetchSeq) return;
      if (!res) { renderErrorInArea('riwayatResultsArea', 'Server tidak memberikan respons.', retry); return; }
      if (!res.success) { if (res.message === 'SESSION_EXPIRED') { handleAuthError(res, retry); return; } renderErrorInArea('riwayatResultsArea', res.message, retry); return; }
      riwayatTotalCount = res.data.totalCount;
      try { renderRiwayatSeluruhResultsHtml(res.data.rows); } catch (e) { console.error(e); renderErrorInArea('riwayatResultsArea', 'Terjadi kesalahan: ' + e.message, retry); }
    })
    .withFailureHandler(err => { clearWatchdog('riwayatResults'); if (seq === riwayatFetchSeq) renderErrorInArea('riwayatResultsArea', 'Gagal terhubung ke server: ' + (err && err.message), retry); })
    .getPengajuanPage(AppState.token, { page: riwayatPageNum, pageSize: riwayatPageSizeVal, search: riwayatSearchVal, status: riwayatStatusVal });
}

// ════════════════════════════════════════════════════════
// BAGIAN PEGAWAI — GAJI SAYA (fitur baru)
// ════════════════════════════════════════════════════════
function fmtRupiah(n) {
  n = Number(n) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}
/** Format Periode Gaji (item 4) — selalu "MMMM – YYYY" (nama bulan Indonesia + en-dash),
 *  mis. "Oktober – 2026". Menerima baik format sheet "YYYY-MM", maupun (jaga-jaga) string ISO
 *  timestamp mentah ("2026-10-01T00:00:00...") yang seharusnya tidak lagi muncul setelah
 *  perbaikan ini, tapi tetap ditangani agar tidak menampilkan ISO mentah ke pengguna. */
function fmtPeriode(p) {
  if (!p) return '-';
  let s = String(p);
  const tIdx = s.indexOf('T');
  if (tIdx > -1) s = s.substring(0, tIdx); // buang bagian jam dari string ISO mentah
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const idx = parseInt(m[2], 10) - 1;
  return (BULAN[idx] || m[2]) + ' – ' + m[1];
}
/** Format tanggal "DD-MM-YYYY" (item 4) — dipakai untuk Tanggal Lahir Pegawai (Detail Gaji)
 *  dan Tanggal Lahir Anak (Data Keluarga), BUKAN untuk Periode. Menangani baik objek Date
 *  (bisa dikirim langsung oleh Google Sheets) maupun string (ISO atau "YYYY-MM-DD"), karena
 *  getValues() bisa mengembalikan salah satu tergantung format sel — sumber bug aslinya. */
function fmtTanggalDMY(v) {
  if (!v) return '-';
  let d;
  if (v instanceof Date) d = v;
  else {
    const s = String(v);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    d = m ? new Date(parseInt(m[1],10), parseInt(m[2],10) - 1, parseInt(m[3],10)) : new Date(s);
  }
  if (isNaN(d.getTime())) return String(v);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return dd + '-' + mm + '-' + d.getFullYear();
}
/** Nilai gaji bersih "efektif" untuk ditampilkan — memakai kolom baru "Jumlah Ditransfer"
 *  (format Excel Daftar Gaji) jika ada, kalau tidak memakai kolom lama GajiBersih. */
function gajiBersihTampil(g) {
  const jd = Number(g['Jumlah Ditransfer']);
  if (g['Jumlah Ditransfer'] !== '' && g['Jumlah Ditransfer'] != null && !isNaN(jd) && jd !== 0) return jd;
  return Number(g.GajiBersih) || 0;
}
function gajiTunjanganTampil(g) {
  const jgt = Number(g['Jumlah Gaji dan Tunjangan']);
  if (g['Jumlah Gaji dan Tunjangan'] !== '' && g['Jumlah Gaji dan Tunjangan'] != null && !isNaN(jgt) && jgt !== 0) {
    return jgt - (Number(g['Gaji Pokok']) || Number(g.GajiPokok) || 0);
  }
  return Number(g.Tunjangan) || 0;
}
function gajiPotonganTampil(g) {
  const jp = Number(g['Jumlah Potongan']);
  if (g['Jumlah Potongan'] !== '' && g['Jumlah Potongan'] != null && !isNaN(jp) && jp !== 0) return jp;
  return Number(g.Potongan) || 0;
}
function gajiPokokTampil(g) { return Number(g['Gaji Pokok']) || Number(g.GajiPokok) || 0; }

/** Pengelompokan kolom rincian lengkap gaji (format Excel Daftar Gaji, 43 kolom selain
 *  "Gaji Pokok" yang sudah jadi field inti) — dipakai untuk Modal Detail Gaji (read-only,
 *  item 1) dan bagian "Rincian Lengkap (opsional)" pada form Tambah/Edit Manual (item 1). */
const GAJI_FIELD_GROUPS = [
  { label: 'Identitas & Jabatan', fields: [
    ['Nama Pegawai', 'text'], ['NIK Pegawai', 'text'], ['NPWP Pegawai', 'text'], ['Tanggal Lahir Pegawai', 'date-dmy'],
    ['Tipe Jabatan', 'text'], ['Nama Jabatan', 'text'], ['Eselon', 'text'], ['Status ASN', 'text'], ['golongan', 'text'],
    ['Masa Kerja Golongan', 'text'], ['Alamat', 'text'], ['Status Pernikahan', 'text'], ['Jumlah Istri_Suami', 'count'],
    ['Jumlah Anak', 'count'], ['Jumlah Tanggungan', 'count'], ['Pasangan PNS', 'text'], ['NIP Pasangan', 'text'],
    ['Kode Bank', 'text'], ['Nama Bank', 'text'], ['Nomor Rekening Bank Pegawai', 'text']
  ] },
  { label: 'Tunjangan', fields: [
    ['Perhitungan Suami_Istri', 'currency'], ['Perhitungan Anak', 'currency'], ['Tunjangan Keluarga', 'currency'],
    ['Tunjangan Jabatan', 'currency'], ['Tunjangan Fungsional', 'currency'], ['Tunjangan Fungsional Umum', 'currency'],
    ['Tunjangan Beras', 'currency'], ['Tunjangan PPh', 'currency'], ['Pembulatan Gaji', 'currency'],
    ['Tunjangan Khusus Papua', 'currency'], ['Tunjangan Jaminan Hari Tua', 'currency']
  ] },
  { label: 'Potongan & Iuran', fields: [
    ['Iuran Jaminan Kesehatan', 'currency'], ['Iuran Jaminan Kecelakaan Kerja', 'currency'], ['Iuran Jaminan Kematian', 'currency'],
    ['Iuran Simpanan Tapera', 'currency'], ['Iuran Pensiun', 'currency'], ['Potongan IWP', 'currency'],
    ['Potongan PPh 21', 'currency'], ['Zakat', 'currency'], ['Bulog', 'currency']
  ] },
  { label: 'Total', fields: [
    ['Jumlah Gaji dan Tunjangan', 'currency'], ['Jumlah Potongan', 'currency'], ['Jumlah Ditransfer', 'currency']
  ] }
];
function gajiDetailRow(label, raw, type) {
  let value = raw;
  if (type === 'date-dmy') value = fmtTanggalDMY(raw);
  else if (value === undefined || value === null || value === '') value = '-';
  else if (type === 'currency') value = fmtRupiah(raw);
  return `<div class="col-6 col-md-4 mb-2"><div class="text-muted-pg" style="font-size:11px;">${label}</div><div style="font-weight:600;font-size:13px;word-break:break-word;">${value}</div></div>`;
}
/** Modal Detail Gaji (read-only, item 1) — dipakai dari Gaji Saya maupun Data Gaji (Kelola
 *  Gaji), menampilkan seluruh rincian dikelompokkan: Identitas, Tunjangan, Potongan, Total. */
function openGajiDetailModal(g) {
  const nama = g.NamaPegawai || g['Nama Pegawai'] || '-';
  let html = `<div class="card-pg mb-3" style="background:linear-gradient(135deg, var(--primary), var(--primary-dark));border:none;">
      <div style="color:rgba(255,255,255,.85);font-size:12px;font-weight:700;">${nama} &middot; NIP ${g.NIP || '-'} &middot; ${fmtPeriode(g.Periode)}</div>
      <div style="color:#fff;font-size:24px;font-weight:800;font-family:var(--font-head);margin-top:4px;">${fmtRupiah(gajiBersihTampil(g))}</div>
      <div style="color:rgba(255,255,255,.75);font-size:11.5px;">Jumlah Ditransfer</div>
    </div>
    <div class="row mb-2">
      ${gajiDetailRow('Gaji Pokok', gajiPokokTampil(g), 'currency')}
      ${gajiDetailRow('Jumlah Gaji dan Tunjangan', gajiPokokTampil(g) + gajiTunjanganTampil(g), 'currency')}
      ${gajiDetailRow('Jumlah Potongan', gajiPotonganTampil(g), 'currency')}
    </div>`;
  GAJI_FIELD_GROUPS.forEach(grp => {
    html += `<div class="mb-3"><div style="font-weight:700;font-size:13px;color:var(--primary);margin-bottom:8px;border-top:1px solid var(--border);padding-top:10px;">${grp.label}</div>
      <div class="row">${grp.fields.map(([key, type]) => gajiDetailRow(key, g[key], type)).join('')}</div></div>`;
  });
  document.getElementById('gajiDetailModalBody').innerHTML = html;
  new bootstrap.Modal(document.getElementById('gajiDetailModal')).show();
}
/** Bagian "Rincian Lengkap (opsional)" pada form Tambah/Edit Data Gaji Manual — dibangun
 *  sekali saat pertama kali ditampilkan, berisi seluruh 43 kolom tambahan format Excel
 *  Daftar Gaji di luar field inti (NIP, Periode, Gaji Pokok, Gaji Bersih, Tunjangan, Potongan). */
function buildGajiFormExtraHtml(existing) {
  return GAJI_FIELD_GROUPS.map(grp => `
    <div class="mb-2"><div style="font-weight:700;font-size:12px;margin:10px 0 6px;color:var(--primary);">${grp.label}</div>
      <div class="row g-2">${grp.fields.map(([key, type]) => `
        <div class="col-6 col-md-4"><label class="form-label" style="font-size:11px;">${key}</label>
          <input type="${(type === 'currency' || type === 'count') ? 'number' : 'text'}" class="form-control form-control-sm" data-gaji-extra="${key}" value="${existing && existing[key] != null ? (type === 'date-dmy' ? toDateInputValue(existing[key]) : String(existing[key]).replace(/"/g, '&quot;')) : ''}"></div>
      `).join('')}</div></div>`).join('');
}
function toggleGajiFormExtra() {
  const box = document.getElementById('gajiFormExtra');
  const label = document.getElementById('gajiFormExtraToggleLabel');
  const showing = box.style.display !== 'none';
  if (showing) { box.style.display = 'none'; label.textContent = 'Tampilkan Rincian Lengkap (opsional)'; return; }
  if (!box.dataset.built) { box.innerHTML = buildGajiFormExtraHtml(window.__gajiFormExisting || null); box.dataset.built = '1'; }
  box.style.display = 'block'; label.textContent = 'Sembunyikan Rincian Lengkap';
}

// ── Gaji Saya (Pegawai) — digerbang periode (item 5): daftar periode diambil dulu, data
// gaji BARU diambil setelah pegawai memilih satu periode & menekan "Tampilkan". ──
let gajiSayaSelectedPeriode = '';
function loadGajiSaya() {
  gajiSayaSelectedPeriode = '';
  const retry = 'loadGajiSaya()';
  startWatchdog('gajiSaya', retry);
  google.script.run
    .withSuccessHandler(safeHandler('gajiSaya', retry, res => { if (res.success) safeRender(() => renderGajiSayaPeriodGate(res.data), retry); else handleAuthError(res, retry); }))
    .withFailureHandler(safeFailure('gajiSaya', retry))
    .getAvailableGajiPeriods(AppState.token);
}
function renderGajiSayaPeriodGate(periods) {
  document.getElementById('app-container').innerHTML = `
    <div class="pg-breadcrumb"><a href="javascript:void(0)" onclick="navigateTo('pegawaiDashboard')">Portal</a> / Gaji Saya</div>
    <h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">Gaji Saya</h2>
    <div class="card-pg mb-3">
      ${periods.length ? `
      <label class="form-label">Pilih Periode Gaji</label>
      <div class="d-flex gap-2 flex-wrap">
        <select class="form-select" id="gajiSayaPeriodeSelect" style="max-width:260px;">
          <option value="">— Pilih Periode —</option>
          ${periods.map(p => `<option value="${p}">${fmtPeriode(p)}</option>`).join('')}
        </select>
        <button class="btn btn-accent" onclick="submitGajiSayaPeriode()"><i class="bi bi-eye"></i> Tampilkan</button>
      </div>` : emptyState('bi-cash-coin', 'Belum ada data gaji yang tercatat untuk Anda.')}
    </div>
    <div id="gajiSayaResultArea"></div>`;
}
function submitGajiSayaPeriode() {
  const sel = document.getElementById('gajiSayaPeriodeSelect');
  const periode = sel ? sel.value : '';
  if (!periode) { showToast('Pilih periode terlebih dahulu.', 'warning'); return; }
  gajiSayaSelectedPeriode = periode;
  const area = document.getElementById('gajiSayaResultArea');
  area.innerHTML = renderSkeleton();
  const retry = 'loadGajiSaya()';
  google.script.run
    .withSuccessHandler(res => {
      if (!res || !res.success) { renderErrorInArea('gajiSayaResultArea', (res && res.message) || 'Gagal memuat data.', retry); return; }
      renderGajiSayaResult(res.data);
    })
    .withFailureHandler(err => renderErrorInArea('gajiSayaResultArea', 'Gagal terhubung ke server: ' + (err && err.message), retry))
    .getMyGaji(AppState.token, periode);
}
function renderGajiSayaResult(list) {
  const g = list[0];
  const area = document.getElementById('gajiSayaResultArea');
  if (!g) { area.innerHTML = emptyState('bi-cash-coin', 'Tidak ada data gaji untuk periode yang dipilih.'); return; }
  area.innerHTML = `
    <div class="card-pg mb-3" style="background:linear-gradient(135deg, var(--primary), var(--primary-dark));border:none;">
      <div style="color:rgba(255,255,255,.8);font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Gaji Bersih — ${fmtPeriode(g.Periode)}</div>
      <div style="color:#fff;font-size:30px;font-weight:800;font-family:var(--font-head);margin-top:4px;">${fmtRupiah(gajiBersihTampil(g))}</div>
    </div>
    <div class="card-pg mb-3">
      <div class="row g-2" style="font-size:13px;">
        <div class="col-4"><div class="text-muted-pg" style="font-size:11px;">Gaji Pokok</div><div style="font-weight:700;">${fmtRupiah(gajiPokokTampil(g))}</div></div>
        <div class="col-4"><div class="text-muted-pg" style="font-size:11px;">Tunjangan</div><div style="font-weight:700;color:var(--success);">+ ${fmtRupiah(gajiTunjanganTampil(g))}</div></div>
        <div class="col-4"><div class="text-muted-pg" style="font-size:11px;">Potongan</div><div style="font-weight:700;color:var(--danger);">- ${fmtRupiah(gajiPotonganTampil(g))}</div></div>
      </div>
      <div class="mt-3"><button class="btn btn-outline-pg btn-sm-pg" onclick='openGajiDetailModal(${JSON.stringify(g)})'><i class="bi bi-receipt"></i> Lihat Rincian Lengkap</button></div>
    </div>`;
}

// ════════════════════════════════════════════════════════
// BAGIAN SUPER ADMIN — DATA GAJI (fitur baru): digerbang periode (item 5) + paginasi
// server-side (item 6) — menggantikan pola lama "ambil semua lalu potong di client".
// ════════════════════════════════════════════════════════
let gajiPageNum = 1, gajiPageSizeVal = 10, gajiSearchVal = '', gajiTotalCount = 0, gajiFetchSeq = 0;
let gajiSelectedPeriode = '', gajiPrefilterNip = '';
let importGajiFile = null;

/** prefilterNip: opsional — saat dibuka dari tombol "Data Gaji" di Detail Pegawai (Super Admin),
 *  periode terbaru milik NIP tsb otomatis dipilih (masih bisa diganti) dan kolom cari langsung
 *  diisi NIP tersebut. */
function loadKelolaGaji(prefilterNip) {
  gajiPrefilterNip = prefilterNip || '';
  gajiSelectedPeriode = ''; gajiPageNum = 1; gajiPageSizeVal = 10; gajiSearchVal = gajiPrefilterNip;
  const retry = 'loadKelolaGaji(' + (prefilterNip ? `'${prefilterNip}'` : '') + ')';
  startWatchdog('kelolaGaji', retry);
  const call = google.script.run
    .withSuccessHandler(safeHandler('kelolaGaji', retry, res => {
      if (!res.success) { handleAuthError(res, retry); return; }
      safeRender(() => renderKelolaGajiPeriodGate(res.data), retry);
    }))
    .withFailureHandler(safeFailure('kelolaGaji', retry));
  if (gajiPrefilterNip) call.getAvailableGajiPeriods(AppState.token, gajiPrefilterNip);
  else call.getAvailableGajiPeriods(AppState.token);
}

function renderKelolaGajiPeriodGate(periods) {
  document.getElementById('app-container').innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h2 style="font-size:22px;font-weight:700;">Data Gaji</h2>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-pg btn-sm-pg" onclick="openImportGajiModal()"><i class="bi bi-file-earmark-excel"></i> Impor Excel</button>
        <button class="btn btn-accent btn-sm-pg" onclick="openGajiForm()"><i class="bi bi-plus-lg"></i> Tambah Manual</button>
      </div>
    </div>
    <div class="card-pg mb-3">
      ${periods.length ? `
      <label class="form-label">Pilih Periode Gaji</label>
      <div class="d-flex gap-2 flex-wrap">
        <select class="form-select" id="gajiPeriodeSelect" style="max-width:260px;">
          <option value="">— Pilih Periode —</option>
          ${periods.map(p => `<option value="${p}" ${p === periods[0] && gajiPrefilterNip ? 'selected' : ''}>${fmtPeriode(p)}</option>`).join('')}
        </select>
        <button class="btn btn-accent" onclick="submitKelolaGajiPeriode()"><i class="bi bi-eye"></i> Tampilkan</button>
      </div>` : emptyState('bi-cash-coin', 'Belum ada data gaji yang tercatat. Tambahkan secara manual atau impor dari Excel.')}
    </div>
    <div id="gajiListArea"></div>`;
  // Jika dibuka dari Detail Pegawai (prefilterNip), langsung tampilkan periode terbaru pegawai tsb.
  if (gajiPrefilterNip && periods.length) submitKelolaGajiPeriode();
}
function submitKelolaGajiPeriode() {
  const sel = document.getElementById('gajiPeriodeSelect');
  const periode = sel ? sel.value : gajiSelectedPeriode;
  if (!periode) { showToast('Pilih periode terlebih dahulu.', 'warning'); return; }
  gajiSelectedPeriode = periode; gajiPageNum = 1;
  renderKelolaGajiListShell();
  fetchKelolaGajiResults();
}
function gajiGotoPage(p) { gajiPageNum = p; fetchKelolaGajiResults(); }
function gajiChangePageSize(n) { gajiPageSizeVal = n; gajiPageNum = 1; fetchKelolaGajiResults(); }
/** Round 7 — item 1: kolom cari ini juga mencari berdasarkan Nama/NIP pegawai, jadi perilaku
 *  "tombol Cari / Enter" (bukan lagi per-ketikan dengan debounce) diterapkan juga di sini. */
function gajiSearchGo() {
  const inp = document.getElementById('searchGaji');
  gajiSearchVal = inp ? inp.value : gajiSearchVal;
  gajiPageNum = 1;
  fetchKelolaGajiResults();
}

function renderKelolaGajiListShell() {
  const area = document.getElementById('gajiListArea');
  if (!area) return;
  area.innerHTML = `
    <div class="card-pg mb-3">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div class="pill pill-teal"><i class="bi bi-calendar3"></i> Periode: ${fmtPeriode(gajiSelectedPeriode)}</div>
        <a href="javascript:void(0)" class="link-teal" style="font-size:12.5px;" onclick="loadKelolaGaji()"><i class="bi bi-arrow-left-right"></i> Ganti Periode</a>
      </div>
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <input type="text" class="form-control" style="flex:1;min-width:200px;" id="searchGaji" placeholder="Cari NIP / Nama Pegawai..." value="${gajiSearchVal}"
          onkeydown="if(event.key==='Enter'){event.preventDefault();gajiSearchGo();}">
        <button type="button" class="btn btn-accent btn-sm-pg" onclick="gajiSearchGo()"><i class="bi bi-search"></i> Cari</button>
        ${pageSizeSelectHtml('gajiPageSizeSelect', gajiPageSizeVal, 'gajiChangePageSize')}
      </div>
    </div>
    <div id="gajiResultsArea" class="pg-results-area">${renderSkeleton()}</div>`;
}
function renderKelolaGajiResultsHtml(pageItems) {
  const totalPages = Math.max(1, Math.ceil(gajiTotalCount / gajiPageSizeVal));
  const rows = pageItems.length ? pageItems.map(g => `
    <tr>
      <td style="font-family:monospace;">${g.NIP}</td>
      <td>${g.NamaPegawai}</td>
      <td style="font-weight:700;">${fmtRupiah(gajiPokokTampil(g))}</td>
      <td style="color:var(--success);">${fmtRupiah(gajiPokokTampil(g) + gajiTunjanganTampil(g))}</td>
      <td style="color:var(--danger);">${fmtRupiah(gajiPotonganTampil(g))}</td>
      <td style="font-weight:800;">${fmtRupiah(gajiBersihTampil(g))}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-pg btn-sm-pg" onclick='openGajiDetailModal(${JSON.stringify(g)})'><i class="bi bi-receipt"></i></button>
          <button class="btn btn-outline-pg btn-sm-pg" onclick='openGajiForm(${JSON.stringify(g)})'><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger-pg btn-sm-pg" onclick="confirmDeleteGaji('${g.ID}')"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>`).join('') : `<tr><td colspan="7"><div class="table-empty"><i class="bi bi-cash-coin"></i>Tidak ada data gaji untuk periode/pencarian ini.</div></td></tr>`;

  const el = document.getElementById('gajiResultsArea');
  el.classList.remove('pg-loading');
  el.innerHTML = `
    <div class="table-pg-wrap mb-3">
      <table class="table-pg"><thead><tr><th>NIP</th><th>Nama</th><th>Gaji Pokok</th><th>Jml. Gaji &amp; Tunjangan</th><th>Jml. Potongan</th><th>Jml. Ditransfer</th><th>Aksi</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div class="text-muted-pg" style="font-size:13px;">Menampilkan ${pageItems.length} dari ${gajiTotalCount} data</div>
      ${renderPaginationSrv(gajiPageNum, totalPages, 'gajiGotoPage')}
    </div>`;
}
function fetchKelolaGajiResults() {
  const seq = ++gajiFetchSeq;
  const retry = 'fetchKelolaGajiResults()';
  startWatchdog('gajiResults', retry);
  setAreaLoading('gajiResultsArea', true);
  google.script.run
    .withSuccessHandler(res => {
      clearWatchdog('gajiResults');
      if (seq !== gajiFetchSeq) return;
      if (!res) { renderErrorInArea('gajiResultsArea', 'Server tidak memberikan respons.', retry); return; }
      if (!res.success) { if (res.message === 'SESSION_EXPIRED') { handleAuthError(res, retry); return; } renderErrorInArea('gajiResultsArea', res.message, retry); return; }
      gajiTotalCount = res.data.totalCount;
      try { renderKelolaGajiResultsHtml(res.data.rows); } catch (e) { console.error(e); renderErrorInArea('gajiResultsArea', 'Terjadi kesalahan: ' + e.message, retry); }
    })
    .withFailureHandler(err => { clearWatchdog('gajiResults'); if (seq === gajiFetchSeq) renderErrorInArea('gajiResultsArea', 'Gagal terhubung ke server: ' + (err && err.message), retry); })
    .getGajiPage(AppState.token, { page: gajiPageNum, pageSize: gajiPageSizeVal, search: gajiSearchVal, periode: gajiSelectedPeriode });
}
/** Muat ulang halaman Data Gaji yang sedang tampil setelah tambah/edit/hapus/impor, tanpa
 *  kembali ke gerbang pemilihan periode (kecuali belum ada periode terpilih sama sekali). */
function reloadKelolaGajiAfterChange() {
  if (!gajiSelectedPeriode) { loadKelolaGaji(gajiPrefilterNip); return; }
  gajiPageNum = 1;
  if (document.getElementById('gajiResultsArea')) { fetchKelolaGajiResults(); return; }
  renderKelolaGajiListShell();
  fetchKelolaGajiResults();
}

function openGajiForm(existing) {
  document.getElementById('gajiForm').reset();
  window.__gajiFormExisting = existing || null;
  const extraBox = document.getElementById('gajiFormExtra');
  extraBox.style.display = 'none'; extraBox.innerHTML = ''; delete extraBox.dataset.built;
  document.getElementById('gajiFormExtraToggleLabel').textContent = 'Tampilkan Rincian Lengkap (opsional)';
  document.getElementById('gajiFormModalTitle').innerHTML = existing ? '<i class="bi bi-cash-coin"></i> Edit Data Gaji' : '<i class="bi bi-cash-coin"></i> Tambah Data Gaji';
  document.getElementById('gajiFormId').value = existing ? existing.ID : '';
  document.getElementById('gajiFormNip').value = existing ? existing.NIP : (gajiPrefilterNip || '');
  document.getElementById('gajiFormNip').disabled = !!existing;
  document.getElementById('gajiFormPeriode').value = existing ? existing.Periode : (gajiSelectedPeriode || '');
  document.getElementById('gajiFormPokok').value = existing ? gajiPokokTampil(existing) : 0;
  document.getElementById('gajiFormTunjangan').value = existing ? gajiTunjanganTampil(existing) : 0;
  document.getElementById('gajiFormPotongan').value = existing ? gajiPotonganTampil(existing) : 0;
  document.getElementById('gajiFormBersih').value = existing ? gajiBersihTampil(existing) : 0;
  document.getElementById('gajiFormKeterangan').value = existing ? (existing.Keterangan || '') : '';
  new bootstrap.Modal(document.getElementById('gajiFormModal')).show();
}
function submitGajiForm(event) {
  event.preventDefault();
  const id = document.getElementById('gajiFormId').value;
  const isNew = !id;
  const payload = {
    ID: id,
    NIP: document.getElementById('gajiFormNip').value.trim(),
    Periode: document.getElementById('gajiFormPeriode').value,
    GajiPokok: document.getElementById('gajiFormPokok').value,
    Tunjangan: document.getElementById('gajiFormTunjangan').value,
    Potongan: document.getElementById('gajiFormPotongan').value,
    GajiBersih: document.getElementById('gajiFormBersih').value,
    Keterangan: document.getElementById('gajiFormKeterangan').value
  };
  // Field rincian lengkap (opsional) — hanya dikirim jika bagian "Rincian Lengkap" pernah dibuka.
  document.querySelectorAll('[data-gaji-extra]').forEach(inp => {
    const v = inp.value;
    if (v !== '') payload[inp.getAttribute('data-gaji-extra')] = v;
  });
  const btn = document.getElementById('gajiFormSubmitBtn');
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...'; btn.disabled = true;
  google.script.run.withSuccessHandler(res => {
    btn.innerHTML = original; btn.disabled = false;
    if (res.success) {
      showToast(res.message, 'success');
      const modalEl = document.getElementById('gajiFormModal');
      const inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide();
      gajiSelectedPeriode = payload.Periode;
      reloadKelolaGajiAfterChange();
    } else showToast(res.message, 'danger');
  }).withFailureHandler(err => { btn.innerHTML = original; btn.disabled = false; showToast(err.message, 'danger'); })
    .saveGajiManual(AppState.token, payload, isNew);
}
function confirmDeleteGaji(id) {
  openConfirmModal('Hapus Data Gaji', 'Apakah Anda yakin ingin menghapus data gaji ini? Tindakan ini tidak dapat dibatalkan.', () => {
    google.script.run.withSuccessHandler(res => {
      if (res.success) { showToast(res.message, 'success'); reloadKelolaGajiAfterChange(); } else showToast(res.message, 'danger');
    }).withFailureHandler(err => showToast(err.message, 'danger')).deleteGaji(AppState.token, id);
  }, true);
}

function openImportGajiModal() {
  importGajiFile = null;
  document.getElementById('dz_importGaji').classList.remove('has-file');
  document.getElementById('filename_importGaji').innerHTML = '';
  document.getElementById('importGajiResult').innerHTML = '';
  document.getElementById('importGajiSubmitBtn').disabled = true;
  document.getElementById('input_importGaji').value = '';
  new bootstrap.Modal(document.getElementById('importGajiModal')).show();
}
function handleImportGajiFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { showToast('File harus berformat .xlsx.', 'warning'); input.value = ''; return; }
  if (!checkUploadSizeClient(file, input)) return;
  const reader = new FileReader();
  reader.onload = () => {
    importGajiFile = { base64: reader.result.split(',')[1], name: file.name };
    document.getElementById('dz_importGaji').classList.add('has-file');
    document.getElementById('filename_importGaji').innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + file.name;
    document.getElementById('importGajiSubmitBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}
function submitImportGaji() {
  if (!importGajiFile) { showToast('Pilih file Excel terlebih dahulu.', 'warning'); return; }
  const periode = document.getElementById('importGajiPeriode').value;
  if (!periode) { showToast('Pilih Periode Gaji terlebih dahulu.', 'warning'); return; }
  const btn = document.getElementById('importGajiSubmitBtn');
  const original = btn.innerHTML; btn.innerHTML = '<span class="spinner-inline"></span> Mengimpor...'; btn.disabled = true;
  document.getElementById('importGajiResult').innerHTML = '';
  google.script.run
    .withSuccessHandler(res => {
      btn.innerHTML = original; btn.disabled = false;
      const resultEl = document.getElementById('importGajiResult');
      if (res.success) {
        showToast(res.message, 'success');
        let detailHtml = '';
        if (res.data && res.data.gagalDetail && res.data.gagalDetail.length) {
          detailHtml += `<div class="mt-2" style="font-size:12px;max-height:120px;overflow-y:auto;">${res.data.gagalDetail.map(d => `<div class="text-muted-pg">• ${d}</div>`).join('')}</div>`;
        }
        if (res.data && res.data.peringatan && res.data.peringatan.length) {
          detailHtml += `<div class="mt-2" style="font-size:12px;max-height:120px;overflow-y:auto;color:var(--warning);">${res.data.peringatan.map(d => `<div>• ${d}</div>`).join('')}</div>`;
        }
        resultEl.innerHTML = `<div class="pill pill-success"><i class="bi bi-check-circle"></i> ${res.data.sukses} berhasil, ${res.data.gagal} dilewati</div>${detailHtml}`;
        gajiSelectedPeriode = periode;
        reloadKelolaGajiAfterChange();
      } else {
        resultEl.innerHTML = `<div class="text-muted-pg" style="font-size:13px;color:var(--danger);">${res.message}</div>`;
        showToast(res.message, 'danger');
      }
    })
    .withFailureHandler(err => {
      btn.innerHTML = original; btn.disabled = false;
      showToast(err.message, 'danger');
    })
    .importGajiExcel(AppState.token, importGajiFile.base64, importGajiFile.name, periode);
}
