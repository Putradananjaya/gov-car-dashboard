# Ringkasan Proyek: PUSAKA BANGLI (gov-car-dashboard)

> Dokumen ini dibuat untuk memindahkan pemahaman arsitektur, alur bisnis, database, dan infrastruktur proyek ke pihak/AI lain yang belum familiar dengan codebase ini. Ditulis berdasarkan kondisi kode & deployment per **2026-09-20** (diperbarui setelah putaran matriks hak akses dinamis, penyelarasan alur peminjaman dengan SOP resmi, dan beberapa siklus deploy ke Dewaweb yang sempat gagal — pelajarannya dirangkum di bagian 11).

---

## 1. Apa Proyek Ini

**PUSAKA BANGLI** ("Pusat Administrasi Kendaraan Aset Bangli") adalah sistem administrasi kendaraan dinas milik Pemerintah Kabupaten Bangli, Bali. Fungsinya: mencatat inventaris kendaraan dinas (aset BMD/Barang Milik Daerah), memantau status operasional & lokasi, mengelola peminjaman/penggunaan kendaraan antar-OPD, mencatat riwayat servis & pajak STNK, dan menyimpan jejak audit — semua dengan kontrol akses berbasis peran (superadmin/admin/pegawai/pejabat_penatausahaan/pimpinan — lihat bagian 5).

Ini bukan proyek greenfield murni — ada sejarah evolusi arsitektur yang penting dipahami:

- **Fase 1** (awal): SPA Angular murni, semua data di **IndexedDB** browser (tidak ada backend sama sekali), password di-hash di client dengan bcryptjs.
- **Fase 2**: domain model "Car" (monolitik) dipecah jadi `VehicleAsset` (data BMD statis) + `VehicleOperational` (kondisi/status dinamis), dengan `CarCompatRepository` sebagai adapter supaya kode lama (dashboard/inventory/tracking) tidak perlu ditulis ulang.
- **Fase 5a–5c**: dibangun **backend NestJS + PostgreSQL** sungguhan, autentikasi dipindah ke server (JWT + refresh token), lalu **semua repository data dipindah dari IndexedDB ke HTTP** satu per satu (`UserRepository`, `VehicleAssetRepository`, `VehicleOperationalRepository`, `LoanRepository`, `ServiceRepository`, `AuditRepository`, `PhotoRepository`, `LoanDocumentRepository`). Hanya `ImportBatchRepository` yang masih IndexedDB (riwayat impor Excel, dianggap boleh lokal-per-browser).
- **Deploy production**: awalnya backend di Railway, sekarang backend **dan** frontend keduanya di **Dewaweb** (hosting cPanel Indonesia).
- **Fase 6** (putaran kerja terbaru): implementasi alur peminjaman sesuai SOP resmi Bangli (2 tahap persetujuan terpisah + serah terima dengan odometer/BBM/kondisi/kunci + BAST cetak + cek bentrok jadwal otomatis), ekspansi role dari 3 ke 5 (`pejabat_penatausahaan`, `pimpinan`), halaman **Panduan Aplikasi** in-app, penggantian peta simulasi SVG di Monitoring GPS dengan peta nyata (Leaflet + OpenStreetMap), dan statistik landing page yang sebelumnya hardcode diganti data agregat sungguhan dari database lewat endpoint publik baru.

Banyak komentar kode secara eksplisit merujuk ke "dokumen v2" (spesifikasi/keputusan desain) dan nomor fase — dokumen itu **tidak ada di repo**, hanya jejaknya di komentar. Jangan kaget kalau ada referensi ke keputusan yang sumbernya tidak ketemu di kode.

---

## 2. Tech Stack

**Frontend** (root folder):
- Angular 22 (standalone components, signals, `@for`/`@if` control flow syntax baru, `provideAppInitializer`)
- TypeScript ~6.0.2, RxJS 7.8
- Testing: **Vitest** (bukan Jasmine/Karma default Angular) via `@angular/build:unit-test`
- `idb` (wrapper IndexedDB) — sisa legacy, masih dipakai `ImportBatchRepository`
- `xlsx` (SheetJS, dari CDN, bukan npm registry biasa) + `jszip` — untuk impor/parsing file Excel e-BMD
- `leaflet` (+ `@types/leaflet`) — peta nyata di halaman Monitoring GPS, tile dari OpenStreetMap (gratis, tanpa API key). Terdaftar di `allowedCommonJsDependencies` (angular.json) karena bukan paket ESM murni; `leaflet.css` di-load lewat array `styles` di `angular.json`, bukan di-import dari `styles.css`.
- `angular-cli-ghpages` — dipakai untuk **deploy frontend** (build → push ke branch git terpisah)
- Tidak pakai UI framework (Material/Tailwind) — semua styling manual di **satu file** `src/styles.css` (2000+ baris), custom design system bernama **MD3** (Material Design 3-inspired, tapi buatan sendiri, bukan `@angular/material`)

**Backend** (`server/` — subfolder, tapi git repo yang **sama** dengan root):
- NestJS 11, TypeORM 1.1, PostgreSQL (driver `pg`)
- `@nestjs/jwt` + `passport-jwt` untuk access token; refresh token custom (bukan library)
- `@nestjs/throttler` untuk rate limiting
- `bcryptjs` untuk hash password (bukan `bcrypt` native — kemungkinan supaya tidak perlu native build di shared hosting)
- Testing: Jest

**Database**: PostgreSQL. Lokal via `docker-compose.yml` di `server/` (image `postgres:16-alpine`, port host `5434`). **`synchronize: true`** di TypeORM — skema tabel dibuat otomatis dari entity class saat boot, **tidak ada migration file formal**. Ini eksplisit ditandai di komentar sebagai keputusan sementara — tapi kenyataannya ini JUGA yang jalan di production Dewaweb saat ini.

---

## 3. Struktur Repo (satu repo, dua aplikasi)

```
gov-car-dashboard/               ← root = Angular frontend
├── src/app/
│   ├── core/                    ← kontrak (interface/abstract class repository), model, auth, config
│   ├── data/                    ← implementasi konkret (HTTP + IndexedDB legacy)
│   ├── presentation/            ← komponen halaman & shared UI
│   └── shared/
├── public/                      ← assets statis + .htaccess (SPA rewrite Apache)
├── angular.json, package.json
└── server/                      ← NestJS backend (subfolder, TAPI git repo yang SAMA dengan root)
    ├── src/
    │   ├── auth/, user/, vehicle-asset/, vehicle-operational/,
    │   │   loan/, service-record/, photo/, audit/, seed/
    │   ├── app.module.ts, main.ts
    ├── docker-compose.yml       ← Postgres lokal
    ├── railway.json             ← sisa config Railway (sudah tidak dipakai, backend sekarang di Dewaweb)
    └── .env / .env.example
```

**Penting**: ini bukan monorepo dengan tooling khusus (bukan Nx/Turborepo) — `server/` cuma folder biasa di dalam repo Angular, punya `package.json` & `node_modules` sendiri yang terpisah total dari root. Root `package.json` **tidak tahu apa-apa** tentang `server/`.

---

## 4. Arsitektur Frontend: Repository Pattern dengan DI Token Swap

Pola desain utama di frontend adalah **abstract repository classes** di `core/repositories/*.repository.ts` (mis. `VehicleAssetRepository`) yang di-`inject()` di komponen, tapi implementasi konkretnya di-*wire* di **satu tempat**: `app.config.ts`.

```ts
{ provide: VehicleAssetRepository, useClass: HttpVehicleAssetRepository },
{ provide: ImportBatchRepository, useClass: IndexedDbImportBatchRepository },
{ provide: CarRepository, useClass: CarCompatRepository },  // adapter, bukan implementasi asli
```

Implikasi penting untuk siapa pun yang mengubah data layer: **jangan ubah komponen halaman untuk ganti sumber data** — ganti binding di `app.config.ts` saja. Semua repository HTTP punya pola sama: signal-based state (`assets = signal<VehicleAsset[]>([])`), method `ready: Promise<void>` yang di-*await* di `provideAppInitializer` sebelum app boot (supaya guard/komponen tidak baca data kosong saat load pertama), dan CRUD lewat `HttpClient` ke `API_BASE_URL`.

`CarRepository`/`CarCompatRepository` adalah **adapter kompatibilitas mundur** — domain model lama "Car" (satu objek gabungan: plat nomor, driver, status, x/y posisi peta) dipertahankan supaya `dashboard`, `inventory`, `tracking` tidak perlu ditulis ulang, padahal di baliknya sudah memanggil `VehicleAssetRepository` + `VehicleOperationalRepository` (HTTP) + `TelemetrySimulatorService` (posisi GPS **disimulasikan di client**, bukan data GPS asli dari perangkat).

`ImportBatchRepository` (riwayat batch impor Excel) sengaja **tidak** dipindah ke HTTP — masih murni IndexedDB per-browser.

---

## 5. Autentikasi & Otorisasi (bagian paling kompleks & paling banyak trade-off)

### Alur token
- **Access token**: JWT, hidup **hanya di memori** (Angular `signal`), TTL 15 menit (`JWT_ACCESS_TTL`). Tidak pernah disimpan di storage apa pun.
- **Refresh token**: string random 96-hex-char (`crypto.randomBytes(48)`), disimpan di DB sebagai **hash SHA-256** (bukan raw), TTL 7 hari (`JWT_REFRESH_TTL_DAYS`), **dirotasi setiap dipakai** (token lama langsung di-revoke saat refresh berhasil).
- **DUA jalur pengiriman refresh token sekaligus** (sengaja, tercatat di komentar kode):
  1. Cookie `httpOnly` bernama `refresh_token`, path `/auth`, `sameSite: 'none'` + `secure: true` di production.
  2. **Body request** — refresh token JUGA dikembalikan di response body dan disimpan frontend di `sessionStorage`, lalu dikirim eksplisit di body `POST /auth/refresh` dan `/auth/logout`.

  **Alasan** (dikonfirmasi manual saat deploy sungguhan): browser modern (Chromium) **memblokir cookie `SameSite=None` pada fetch/XHR cross-site** ketika frontend & backend di domain yang benar-benar berbeda (bukan cuma beda port) — cookie tersimpan & valid di server, tapi tidak terkirim balik dari fetch() browser. Jalur body adalah workaround-nya. **Trade-off yang disadari developer**: refresh token di `sessionStorage` bisa dibaca skrip XSS (beda dari access token yang murni in-memory) — dianggap setara level risiko sesi lama Fase 1, bukan regresi baru.

- **Deduplikasi refresh**: kalau beberapa request 401 sekaligus (dari beberapa repository yang manggil API paralel), semua nunggu **satu** promise refresh yang sama (`refreshInFlight`), supaya tidak balapan rotasi token.

### Login flow keamanan
- Rate limit: 10 request/menit/IP khusus endpoint `/auth/login` (Throttler decorator), + 100/menit/IP global.
- **Account lockout**: 5x gagal beruntun per NIP → lock 15 menit (`LoginAttemptEntity`, tabel `login_attempts`).
- **Timing-attack mitigation**: kalau NIP tidak ditemukan, tetap jalankan `compareSync` terhadap `DUMMY_HASH` supaya waktu respons tidak membocorkan apakah NIP terdaftar.

### Role & permission
- **5 peran** (sejak Fase 6, sebelumnya 3): `superadmin`, `admin`, `pegawai`, `pejabat_penatausahaan`, `pimpinan` (tipe `Peran`, didefinisikan **identik** di backend `user.entity.ts` dan frontend `user.model.ts` — kalau ubah salah satu, harus ubah dua tempat, tidak ada shared package).
  - `admin` = "Pengurus Barang" (tahap 1 persetujuan peminjaman: cek ketersediaan).
  - `pejabat_penatausahaan` (baru) = "Pejabat Penatausahaan Pengguna Barang" (tahap 2: serah terima/persetujuan final). Role sistem terpisah dari `admin` — dua orang berbeda secara nyata di struktur organisasi Bangli.
  - `pimpinan` (baru) = read-only untuk oversight (Kepala Dinas/Badan) — cuma dapat izin `laporan.cetak` + lihat dashboard agregat, tidak ikut proses persetujuan.
- **Backend**: `RolesGuard` + `@Roles(...)` decorator, hanya dipasang di endpoint tertentu (lihat tabel endpoint bagian 7). Guard ini generik, **tapi granularitasnya jauh lebih kasar dari frontend** — banyak endpoint hanya cek "sudah login" tanpa cek role sama sekali. **Perkecualian yang sudah diperbaiki di Fase 6**: endpoint aksi peminjaman (`setujui-tahap1`, `serah-terima`, `tolak`, `kembalikan`) sekarang punya `@Roles()` yang benar per tahap — sebelumnya endpoint `PUT /loans/:id` generik bisa dipakai siapa saja yang login untuk mengubah status ke apa pun.
- **Frontend**: `PermissionService` (`core/auth/permission.service.ts`) — **matriks kemampuan** (`Kemampuan` type) → daftar peran yang boleh, single source of truth di sisi UI (tombol/menu disembunyikan via `HasPermissionDirective` di `presentation/components/has-permission/`). **PERINGATAN eksplisit dari README backend**: matriks kemampuan ini di sisi Angular **belum sepenuhnya direplikasi** di backend untuk endpoint di luar `loans` — backend adalah pertahanan yang lebih lemah dari yang terlihat di UI untuk endpoint tersebut.
- Route guard: `authGuard` (harus login) dan `roleGuard` (baca `route.data['peran']`) di `app.routes.ts`.
- Halaman **Manajemen Pengguna** (`pengguna-list`) sudah punya dropdown 5 peran dengan label human-readable (`peranLabel()`), dan daftar OPD/Bidang (`known-opd-list.ts`) sudah ditambah 7 Bidang di bawah Badan Keuangan, Pendapatan dan Aset Daerah (PDRL, Anggaran, Aset, Pembukuan, Perbendaharaan, PBB, Sekretariat) supaya bisa dipilih saat membuat akun.

---

## 6. Skema Database (PostgreSQL, via TypeORM, `synchronize: true`)

Semua entity pakai `@PrimaryColumn` string manual (bukan auto-increment/serial), **tidak ada foreign key constraint TypeORM `@ManyToOne` dkk** — semua relasi antar tabel adalah **soft reference** lewat kolom string biasa (mis. `nibar`, `userId`, `loanId`) yang dicocokkan manual di service layer. Tidak ada `ON DELETE CASCADE` di level DB.

| Tabel | PK | Kolom kunci | Catatan |
|---|---|---|---|
| `users` | `id` (varchar) | `nip` (unique), `nama`, `jabatan`, `unitKerja`, `peran`, `aktif`, `passwordHash` (bcrypt), `terakhirMasuk` | Peran: superadmin/admin/pegawai/pejabat_penatausahaan/pimpinan (5 sejak Fase 6). Kolom `peran` tetap `varchar` biasa (bukan Postgres ENUM), jadi menambah nilai baru tidak perlu perubahan skema |
| `refresh_tokens` | `id` (uuid, **dibuat di app code** via `crypto.randomUUID()`, bukan `uuid_generate_v4()` Postgres — sengaja, karena ekstensi `uuid-ossp` belum tentu boleh diaktifkan di shared hosting) | `userId`, `tokenHash` (unique, SHA-256), `expiresAt`, `revokedAt` | |
| `login_attempts` | `nip` | `attempts`, `lockedUntil` | |
| `vehicle_assets` | `nibar` (varchar 45) | ~35 kolom: kode barang berjenjang (`kodeBarangAkun/Kelompok/Jenis/Objek/RincianObjek/SubRincian/SubSub/Full` — struktur kode BMD Indonesia), `nomorPolisi`, `nomorRangka`, `nomorBpkb`, `hargaSatuanPerolehan`, `nilaiPerolehan`, `masaBerlakuPajak`, `masaBerlakuStnk`, `dihapusPada` (soft delete timestamp, nullable) | **NIBAR = primary key sistem ini**, dipakai sebagai foreign key implisit di hampir semua tabel lain |
| `vehicle_operational` | `nibar` | `kondisi` ('Baik'/'Rusak Ringan'/'Rusak Berat'), `status` ('Tersedia'/'Dipinjam'/'Servis'/'Tidak Layak'), `telemetri` (jsonb: lat/lng/kecepatan/levelBbm/sumber/waktu), `catatan` | 1:1 dengan `vehicle_assets` lewat `nibar` |
| `loans` | `id` | `nibar`, `pemohonId`, `pemohon` (jsonb snapshot: nama/nip/jabatan/unitKerja/noHp — **disalin**, bukan join, supaya histori tidak berubah kalau data user berubah), `statusPermohonan`, `jenisPermohonan`, `rute` (baru, Fase 6), `status` (workflow **2 tahap**: Draft→Diajukan→**Disetujui** (tahap 1, cek ketersediaan)→**Berjalan** (tahap 2, serah terima)→Selesai, atau Ditolak dari Diajukan/Disetujui), `tingkatUrgensi`, `odometerKeluar/Masuk`, `bbmKeluar/Masuk` (baru), `kondisiKeluar/Masuk` + `catatanKondisiKeluar/Masuk` (baru, enum sama seperti `KondisiAset` di `vehicle_operational`, diduplikasi bukan di-reference), `kunciDiserahkanPada/Dikembalikan Pada` (baru, timestamp ISO, wajib dicentang di modal serah-terima/kembalikan sebelum submit) | Form peminjaman kendaraan, field-nya mengikuti form resmi "FRM-01" (disebut di komentar). Field baru Fase 6 semuanya nullable — aman ditambah lewat `synchronize: true` tanpa migration manual. |
| `loan_documents` | `id` | `loanId`, `kind` ('utama'/'lain'), `fileName`, `mimeType`, `size`, **`blob` (bytea)** | Dokumen surat tugas dkk disimpan **langsung di Postgres sebagai binary**, bukan filesystem/S3 |
| `service_records` | `id` | `nibar`, `tahun`, `uraian`, `odometerKm`, `biaya`, `sumber` ('impor'/'input-manual') | Riwayat servis & histori pajak |
| `vehicle_photos` | `nibar` | `mimeType`, **`blob` (bytea)** | Foto kendaraan, juga disimpan sebagai binary di Postgres |
| `audit_logs` | `id` | `waktu`, `pelakuId`, `pelakuNama`, `aksi`, `entitas`, `entitasId`, `nilaiLama`/`nilaiBaru` (jsonb) | Log audit generik untuk semua entitas |

**Catatan operasional penting**: foto & dokumen sebagai `bytea` di Postgres berarti **ukuran database akan tumbuh cepat** kalau banyak upload — dan `main.ts` sudah menaikkan limit body JSON Express ke **15MB** (default 100kb) khusus untuk menampung base64 foto/dokumen (maks asli 5MB, base64-nya ~6.7MB). Kalau hosting Dewaweb punya limit resource ketat, ini titik rawan.

Koneksi pool DB **sengaja dibatasi** `max: 3` (`DB_POOL_MAX`) — komentar eksplisit: "hosting dengan kuota memori/proses ketat (shared hosting cPanel)".

---

## 7. Daftar Lengkap API Endpoint (backend NestJS)

Base URL production: `https://api.pusaka-bangli.my.id`. Semua butuh `Authorization: Bearer <accessToken>` (via `JwtAuthGuard`) **kecuali** yang ditandai publik.

| Method & Path | Guard tambahan | Keterangan |
|---|---|---|
| `POST /auth/login` | publik, throttle 10/menit | `{nip, password}` → `{accessToken, refreshToken, user}` + cookie |
| `POST /auth/refresh` | publik | Baca cookie ATAU body `{refreshToken}` |
| `POST /auth/logout` | publik | |
| `GET/POST/PUT/:id /users` | `@Roles('superadmin')` untuk create/update/reset-password | `GET` daftar bisa semua role login |
| `POST /users/:id/reset-password` | superadmin | |
| `GET, GET/:nibar, PUT/:nibar /vehicle-assets` | login saja (tidak ada role check!) | |
| `DELETE /vehicle-assets/:nibar` | `@Roles('superadmin')` | Hapus permanen |
| `POST /vehicle-assets/:nibar/soft-delete` | login saja | Isi `dihapusPada` |
| `GET, GET/:nibar, PUT/:nibar, DELETE/:nibar /vehicle-operational` | login saja (semua, termasuk DELETE — tidak ada role check) | |
| `GET, GET/:id, PUT/:id, DELETE/:id /loans` | login saja (lihat baris khusus di bawah untuk transisi status) | `PUT/:id` generik **ditolak** (400) kalau `status` di body termasuk `Disetujui/Berjalan/Ditolak/Selesai` — dipaksa lewat endpoint aksi khusus |
| `POST /loans/:id/setujui-tahap1` | `@Roles('superadmin','admin')` | Diajukan→Disetujui. Cek bentrok jadwal (`assertNoScheduleConflict`) terhadap peminjaman lain (status Diajukan/Disetujui/Berjalan) untuk `nibar` yang sama |
| `POST /loans/:id/serah-terima` | `@Roles('superadmin','pejabat_penatausahaan')` | Disetujui→Berjalan. Body: odometerKeluar, bbmKeluar, kondisiKeluar, kunciDiserahkan (wajib true). Set status kendaraan `vehicle_operational` jadi `Dipinjam` |
| `POST /loans/:id/tolak` | `@Roles('superadmin','admin','pejabat_penatausahaan')` | Boleh dari status Diajukan **atau** Disetujui |
| `POST /loans/:id/kembalikan` | login saja, tapi **service** cek: pemohon asli ATAU role admin/superadmin/pejabat_penatausahaan | Berjalan→Selesai. Set status kendaraan balik `Tersedia` |
| `GET, PUT/:nibar, DELETE/:nibar /photos` | login saja | |
| `GET, PUT/:id /service-records` | PUT: `@Roles('superadmin','admin')` | `DELETE/:id`: login saja |
| `GET, POST /audit` | GET: `@Roles('superadmin')` | POST (append log): login saja — siapa pun yang login bisa menulis audit log |
| `GET /public-stats` | **publik, tanpa `JwtAuthGuard` sama sekali** (Fase 6) | Statistik agregat untuk landing page (total kendaraan aktif, armada siap pakai, jumlah OPD unik, jumlah aset pajak kadaluarsa) — sengaja tanpa data per-unit/sensitif, aman diakses sebelum login |

Banyak operasi tulis/hapus data sensitif **tidak punya role check di backend**, hanya "sudah login". Kalau ada tugas "perketat keamanan API", ini daftar prioritasnya (endpoint `loans` sudah dibereskan di Fase 6 — sisanya belum: `vehicle-assets` PUT, `vehicle-operational` PUT/DELETE, `photos` PUT/DELETE, `service-records` DELETE, `audit` POST).

CORS: `app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:4300', credentials: true })` — **hanya SATU origin** yang diizinkan (bukan array/wildcard). Di production, `FRONTEND_ORIGIN` di `.env` server **harus** di-set ke domain frontend asli persis — kalau lupa/salah, semua request dari frontend akan gagal CORS.

---

## 8. Routing Frontend (`app.routes.ts`)

```
/                           → landing (publik, hero slideshow)
/masuk                      → login (publik)
/app  (canActivate: authGuard)
  /app/beranda              → dashboard (role-aware: render dashboard-superadmin/admin/pegawai berbeda)
  /app/aset, /aset/baru, /aset/impor, /aset/:nibar   → roleGuard: superadmin/admin
  /app/inventory            → roleGuard: superadmin/admin
  /app/tracking, /tracking/:id                        → roleGuard: superadmin/admin (peta nyata Leaflet+OSM, posisi kendaraan tetap simulasi)
  /app/peminjaman, /peminjaman/buat(/:id)             → tanpa roleGuard (semua peran login, termasuk pegawai)
  /app/peminjaman/persetujuan                          → roleGuard: superadmin/admin/pejabat_penatausahaan (Fase 6, sebelumnya cuma superadmin/admin)
  /app/jadwal                                          → tanpa roleGuard (semua peran login) — BARU Fase 6, daftar peminjaman terjadwal per kendaraan
  /app/panduan                                         → tanpa roleGuard (semua peran login) — BARU Fase 6, halaman dokumentasi in-app
  /app/pengguna                                        → roleGuard: superadmin saja
  /app/audit                                           → roleGuard: superadmin saja
# redirect kompatibilitas: /login→/masuk, /dashboard→/app/beranda, dst. /** → /
```

Semua page di-*lazy load* (`loadComponent`), semua standalone components (bukan NgModule).

---

## 9. Halaman-Halaman Utama (fungsi bisnis tiap page)

- **`landing`** — halaman publik, ada slideshow background foto (ganti tiap 5 detik, crossfade). **Fase 6**: 3 angka statistik hero ("Total Kendaraan Dinas", "Armada Siap Pakai", "OPD Pengelola Aset") dan angka "aset pajak kadaluarsa" di kartu fitur **tidak lagi hardcode** — diambil dari `GET /public-stats` saat halaman dimuat (gagal fetch → tampil "—", tidak crash).
- **`login`** — form NIP + password.
- **`dashboard`** (+ sub-komponen `dashboard-superadmin/admin/pegawai`) — tampilan beranda berbeda per peran. Role baru `pejabat_penatausahaan` dipetakan ke `dashboard-admin`, `pimpinan` ke `dashboard-superadmin` (lihat `dashboard.html` `@switch`).
- **`aset-list`, `aset-baru`, `aset-detail`** — CRUD inventaris kendaraan (VehicleAsset).
- **`aset-impor`** — **impor massal dari file Excel e-BMD** (`ebmd-parser.ts` parse workbook via `xlsx`), plus ekstraksi foto dari drawing anchor di file Excel (`photo-extractor.worker.ts` — jalan di **Web Worker**, ada `drawing-anchor-parser.ts` untuk baca posisi gambar tertanam di sheet Excel).
- **`inventory`** — tampilan agregat/list gabungan aset+operasional.
- **`tracking`** (+ `/:id`) — **Fase 6: peta nyata** (Leaflet + tile OpenStreetMap, gratis tanpa API key) menggantikan mockup SVG jalan/landmark buatan tangan. Posisi kendaraan (`Car.x/y`, skala kanvas 0-800×0-500 dari `TelemetrySimulatorService`) **tetap simulasi**, tapi sekarang dipetakan (`xyKeLatLng`) ke koordinat GPS asli wilayah Bangli untuk ditampilkan di atas peta sungguhan. 5 landmark (Kintamani, Susut, Tembuku, Kawasan Besakih, Pusat Kota Bangli) pakai koordinat real, bukan hasil transform. Panel telemetri sidebar juga dirombak total di fase ini — banyak class CSS (`date-item`, `driver-details`, `gauge-title`, `telemetry-fuel-bar`, dst.) yang dipakai di template ternyata **tidak pernah punya definisi CSS** sejak awal (bug lama, bukan regresi), sudah dilengkapi.
- **`peminjaman`, `peminjaman-form`, `persetujuan`** — workflow pengajuan & approval peminjaman kendaraan (form FRM-01), termasuk upload dokumen (PDF/JPG/PNG maks 5MB, divalidasi client `MAX_UKURAN_BERKAS`/`TIPE_BERKAS_DIIZINKAN`). **Fase 6, dirombak sesuai SOP resmi**: form tambah field "Rute Perjalanan"; `persetujuan` sekarang 2 antrean terpisah ("Menunggu Persetujuan" tahap 1 oleh admin, "Menunggu Serah Terima" tahap 2 oleh pejabat_penatausahaan) dengan tombol yang otomatis menyesuaikan role login; semua `prompt()`/`alert()` browser diganti modal terstruktur (`TolakModalComponent`, `SerahTerimaModalComponent`, `KembalikanModalComponent` — catat odometer/BBM/kondisi/konfirmasi kunci); setelah serah-terima atau kembalikan bisa cetak **BAST** (`BastPrintComponent`, reuse pola `.report-overlay`/`.report-modal`/`@media print` yang sudah ada, bukan komponen baru dari nol).
- **`jadwal`** — **BARU Fase 6**. Daftar peminjaman berstatus Diajukan/Disetujui/Berjalan, dikelompokkan per kendaraan, urut tanggal — murni computed di client dari `LoanRepository.loans()` yang sudah ada, tidak ada endpoint backend baru. Menggantikan tombol sidebar "Jadwal" yang sebelumnya cuma `scrollToSchedule()` (scroll ke anchor di dashboard, bukan halaman sungguhan).
- **`panduan`** — **BARU Fase 6**. Halaman dokumentasi aplikasi in-app (bukan dokumen eksternal) — pencarian, accordion per menu (progressive disclosure), badge "Relevan untuk Anda" yang auto-expand berdasar role yang login, diagram alur kerja peminjaman 5 langkah, dan daftar istilah (NIBAR/OPD/BAST/SOP/dst). Data section didefinisikan di `DAFTAR_SEKSI` (`panduan.ts`), body tiap section ditulis langsung di template (bukan data-driven penuh, sesuai konvensi codebase ini yang jarang generate UI dari array).
- **`pengguna-list`** — manajemen user (superadmin only). **Fase 6**: dropdown peran sekarang 5 opsi dengan label human-readable (`peranLabel()`), daftar Unit Kerja/OPD ditambah 7 Bidang di bawah Badan Keuangan, Pendapatan dan Aset Daerah.
- **`audit-list`** — lihat jejak audit (superadmin only).

Komponen shared: `has-permission` (directive struktural, sembunyikan elemen berdasar `Kemampuan`), `asset-form`, `car-form`, dan (Fase 6) `tolak-modal`, `serah-terima-modal`, `kembalikan-modal`, `bast-print` di `presentation/components/`.

---

## 10. Frontend Build & Konfigurasi Environment

- `src/app/core/config/api.config.ts` (dev, `API_BASE_URL = 'http://localhost:3000'`) ditukar otomatis dengan `api.config.production.ts` (`API_BASE_URL = 'https://api.pusaka-bangli.my.id'`) via **Angular `fileReplacements`** di `angular.json` saat `ng build --configuration production` — **bukan** environment variable runtime, jadi kalau URL API berubah, harus edit file + build ulang + deploy ulang.
- Dev server **harus** jalan di port **4300** (`ng serve --port 4300`), bukan default 4200 — karena backend `FRONTEND_ORIGIN`/CORS di-hardcode expect origin itu untuk dev.
- Design system: satu file global `src/styles.css`, custom properties `--md-sys-color-*` (skema warna terinspirasi Material 3, tema terang saja — dark mode sempat ada tapi `toggleTheme()` sekarang **no-op** sengaja dikosongkan, tombolnya sudah dihapus dari UI).
- `.htaccess` di `public/.htaccess` — wajib ikut ke-build ke `dist/` (otomatis, karena ada di folder `public/`) untuk SPA routing di Apache/cPanel (rewrite semua path non-file ke `index.html`).

---

## 11. Deployment & Infrastruktur (Dewaweb / cPanel) — paling rawan salah paham

**Topologi server** (hasil eksplorasi langsung via cPanel Terminal):

```
/home/pusakaba/
├── public_html/                    ← document root domain UTAMA (frontend statis)
│                                      Berisi: index.html, chunk-*.js, styles-*.css, assets/, .htaccess
│                                      BUKAN git repo — file di-drop langsung (hasil build),
│                                      juga ada .well-known/, .user.ini, php.ini (JANGAN PERNAH dihapus/ditimpa)
├── api.pusaka-bangli.my.id/         ← document root subdomain backend (Node.js Selector)
├── pusaka-repo/                     ← clone git lengkap (source code, branch `main`)
│   └── server/                      ← dari sini backend di-build (`npm run build` → `nest build`) & dijalankan
└── nodevenv/                        ← Node.js Selector cPanel (virtualenv Node per-app)
```

**Dua branch git yang relevan di GitHub (`Putradananjaya/gov-car-dashboard`)**:
- `main` — source code lengkap (frontend Angular + `server/` backend).
- `dist-frontend` — **hanya hasil build statis frontend** (isi `dist/gov-car-dashboard/browser/`), dibuat & di-push oleh command:
  ```
  npx ng deploy --branch dist-frontend
  ```
  (builder `angular-cli-ghpages:deploy`, dikonfigurasi di `angular.json` target `"deploy"`. Target ini **tidak punya konfigurasi `production` terdaftar** — jangan pakai `--configuration production`, cukup `ng deploy --branch dist-frontend`.)

### Checklist deploy — urutan wajib: **backend dulu, baru frontend**

> **Kenapa urutannya tidak boleh dibalik.** `main.ts` memakai
> `ValidationPipe({ whitelist: true })` **tanpa** `forbidNonWhitelisted`, artinya
> kolom yang tidak dikenal backend **dibuang diam-diam, bukan ditolak**. Kalau
> frontend baru naik lebih dulu, permintaan yang membawa kolom baru tetap
> diproses backend lama — kolomnya hilang tanpa pesan apa pun. Kasus nyata:
> popup setel ulang kata sandi meminta kata sandi superadmin sebagai
> re-autentikasi; dengan backend lama kolom itu dibuang dan penyetelan ulang
> tetap berhasil **tanpa verifikasi** — keamanan palsu. Dengan urutan yang
> benar, frontend lama justru ditolak 400 oleh backend baru: gagal dengan aman.

#### Langkah 0 — Lokal (siapkan dua branch)

```bash
git add -A && git commit -m "..." && git push        # 1. source ke `main`
npx ng deploy --branch dist-frontend                  # 2. hasil build ke `dist-frontend`
```

> ⚠️ **Jebakan yang sudah dua kali terjadi.** Branch `dist-frontend` **tidak ikut
> berubah** saat Anda commit & push ke `main` — isinya hanya diperbarui oleh
> `npx ng deploy` dari mesin lokal. Melewatkan langkah 2 membuat server menyalin
> build lama, dan gejalanya membingungkan: kode sudah di-push, backend sudah
> di-restart, tapi tampilan tidak berubah sama sekali.
>
> Cara cepat memastikan `dist-frontend` sudah terbaru:
> ```bash
> git fetch origin && git log -1 --format="%h %ad" --date=iso origin/dist-frontend
> ```
> Waktunya harus **lebih baru** dari commit terakhir di `main`.

#### Langkah 1 — Server: backend

```bash
source /home/pusakaba/nodevenv/pusaka-repo/server/20/bin/activate && \
cd ~/pusaka-repo/server && git pull && git log -1 --oneline
```

Pastikan commit yang muncul adalah yang baru saja di-push. Kalau masih tertinggal,
`~/pusaka-repo` kemungkinan ada di branch lain — periksa dengan `git branch`. Lalu:

```bash
npm install --include=dev && npm run build
```

`--include=dev` **wajib** (atau `NODE_ENV=development npm install`): `@nestjs/cli`
penyedia command `nest` ada di `devDependencies`, sedangkan Node.js Selector cPanel
biasanya menyetel `NODE_ENV=production` sehingga `npm install` biasa melewatinya →
`nest: command not found`.

Terakhir — **dan ini yang paling sering lupa** — **restart** aplikasi lewat menu cPanel
**"Setup Node.js App"** (ikon panah melingkar). `npm run build` hanya menulis berkas ke
`server/dist/`; proses Node yang sedang melayani permintaan tetap memakai kode lama di
memori sampai di-restart.

#### Langkah 2 — Server: frontend

```bash
cd ~ && rm -rf dist-frontend-tmp && \
git clone -b dist-frontend https://github.com/Putradananjaya/gov-car-dashboard.git dist-frontend-tmp && \
rm -rf dist-frontend-tmp/.git && \
cp -rf dist-frontend-tmp/. ~/public_html/ && \
rm -rf dist-frontend-tmp
```

`rsync` **tidak tersedia** di server ini — pakai `cp` biasa. `cp -rf source/. dest/`
menyalin & menimpa berkas bernama sama tapi **tidak menghapus** berkas lain di tujuan,
jadi `.well-known/`, `.user.ini`, dan `php.ini` di `public_html` aman. Konsekuensinya:
chunk JS dari build lama menumpuk di sana dan sesekali perlu dibersihkan manual.

#### Langkah 3 — Verifikasi dari luar

Jangan mengandalkan tampilan saja; pastikan versinya benar dengan memeriksa rute yang
hanya ada di versi baru. Rute yang **ada tapi butuh login** menjawab `401`; rute yang
**belum ada** menjawab `404`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.pusaka-bangli.my.id/role-permissions
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' \
  https://api.pusaka-bangli.my.id/loans/x/verifikasi
# 401 = backend baru sudah jalan · 404 = masih backend lama (restart belum dilakukan)

curl -s -o /dev/null -w "%{http_code}\n" https://api.pusaka-bangli.my.id/public-stats
# 200 = sehat (endpoint publik, tanpa login)

curl -s -X POST -H "Content-Type: application/json" -d '{}' \
  https://api.pusaka-bangli.my.id/auth/login
# 400 berisi pesan validasi = server hidup & routing normal (tes kontrol)
```

Untuk frontend: buka situs dengan **hard refresh** (Cmd/Ctrl+Shift+R). Nama berkas JS/CSS
ber-hash, jadi begitu `index.html` baru terambil semuanya ikut baru — hard refresh hanya
memastikan `index.html`-nya sendiri tidak dilayani dari cache.

#### Efek samping wajar setelah restart backend

- **Akun baku dibuat otomatis.** `SeedService.onModuleInit()` memeriksa daftar akun
  per-NIP dan membuat yang belum ada, dengan kata sandi bawaan yang mudah ditebak
  (`Superadmin#123`, `Admin#123`, `Pegawai#123`, `Penatausahaan#123`, `Pimpinan#123`).
  NIP yang sudah ada **dilewati** — jadi untuk akun yang dibuat manual lewat UI, sandi
  bawaan itu tidak pernah berlaku. Setel ulang sandi akun penting setelah deploy.
- **Skema tabel menyesuaikan sendiri** lewat TypeORM `synchronize: true`. Kolom baru yang
  nullable ditambahkan tanpa mengganggu baris lama, tapi tidak ada jaring pengaman
  migrasi — pantau log boot pertama setelah ada perubahan entity.
- **Matriks hak akses terisi nilai bawaan** untuk kemampuan yang barisnya belum ada di
  tabel `role_permissions` (lihat bagian 5).

**Kesalahan yang pernah terjadi & pelajarannya**:
- `git clone -b dist-frontend ... .` gagal kalau dijalankan di folder yang **sudah ada isinya** ("not an empty directory") — clone ke folder temp kosong dulu, baru copy.
- Command berantai tanpa `&&` bisa membuat langkah `rm -rf` di akhir **tetap jalan** meski langkah sebelumnya gagal — folder hasil clone bisa terhapus sebelum sempat dipakai. **Selalu rantai command penting dengan `&&`** saat ada langkah destruktif di akhir.
- Salah folder: `~/pusaka-repo/server` (backend) bukan tempat untuk menaruh build frontend.
- **`npm`/`node` tidak ada di PATH default cPanel Terminal** — harus aktifkan virtual environment Node.js Selector dulu, baru `npm install`/`npm run build` bisa jalan. Kalau langsung coba `npm ...` tanpa aktivasi: `bash: npm: command not found`.
- **Path virtual environment TIDAK sama dengan angka versi yang ditampilkan di UI "Setup Node.js App"**. UI menampilkan `started (v20.20.2)`, tapi folder venv sesungguhnya di disk cuma pakai **angka versi major saja, tanpa "v"**:
  ```bash
  source /home/pusakaba/nodevenv/pusaka-repo/server/20/bin/activate && cd ~/pusaka-repo/server
  ```
  (`pusaka-repo/server` di tengah path itu = App Root Directory relatif dari `/home/pusakaba/`, lihat kolom "App Root Directory" di halaman Setup Node.js App). **Jangan tebak** — kalau ragu, jalankan `find /home/pusakaba/nodevenv -name "activate"` untuk dapat path persis, atau buka halaman edit aplikasi di "Setup Node.js App" (klik ikon pensil) yang menampilkan command aktivasi siap-copy secara eksplisit.
- **Push ke `main` ≠ frontend terdeploy.** Dua kali terjadi: source sudah di-push dan
  backend sudah naik, tapi `dist-frontend` masih build lama karena `npx ng deploy` belum
  dijalankan. Gejalanya menyesatkan — orang mengira deploy-nya gagal, padahal yang tersalin
  memang build kemarin.
- **Versi campur (backend baru + frontend lama) bisa dikenali tanpa akses server.** Tanda
  yang terbaca langsung dari layar & DevTools: istilah lama masih muncul di sidebar, jumlah
  antrean di halaman Persetujuan tidak sesuai alur terbaru, dan tombol memanggil endpoint
  yang sudah dihapus sehingga menjawab `404`. Kalau tiga hal itu muncul bersamaan,
  hampir pasti frontend-nya yang tertinggal, bukan backend-nya.
- Setelah `npm run build` di server, aplikasi Node.js yang **sedang berjalan tidak otomatis reload** — proses lama masih pakai build lama di memori sampai di-**restart manual** lewat menu "Setup Node.js App" (ikon restart/panah melingkar). Ini langkah yang paling sering lupa dilakukan.

---

## 12. Environment Variables (nama saja)

**`server/.env`** (tidak di-commit, ada `.env.example` sebagai template):
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (diabaikan kalau `DATABASE_URL` di-set — pola Railway/Heroku), `DB_POOL_MAX`, `PORT`, `NODE_ENV`, `JWT_SECRET` (**harus** diganti dari placeholder di setiap environment), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL_DAYS`, `FRONTEND_ORIGIN` (dipakai untuk CORS — **kritis**, harus match domain frontend production persis).

Tidak ada file `.env` di sisi frontend Angular — konfigurasi environment-nya pakai mekanisme `fileReplacements` Angular (lihat bagian 10), bukan dotenv.

---

## 13. Utang Teknis & Hal yang Perlu Diwaspadai

1. **Role check tidak konsisten di backend** (bagian 7) — UI menyembunyikan tombol lewat `PermissionService`, tapi API di baliknya sering hanya cek "sudah login", bukan role spesifik. Serangan langsung ke API (skip UI) bisa melewati banyak batasan yang user lihat di frontend. **Sudah diperbaiki untuk `loans`** di Fase 6 (endpoint aksi khusus + `@Roles()` per tahap); endpoint lain (`vehicle-assets`, `vehicle-operational`, `photos`, dst.) masih longgar.
2. **`synchronize: true`** — tidak ada migration history, perubahan skema production bergantung penuh pada urutan deploy & TypeORM auto-sync saat boot. Field baru Loan (Fase 6) sudah lewat siklus ini di production tanpa masalah (semua nullable).
3. **`CarCompatRepository`** adalah lapisan adapter yang mengaburkan bahwa `dashboard`/`inventory`/`tracking` sebenarnya bicara ke dua repository terpisah (`VehicleAsset` + `VehicleOperational`) yang digabung ulang jadi bentuk "Car" lama. Tidak ada tabel/endpoint "Car" langsung — nama tabelnya `vehicle_assets`/`vehicle_operational`.
4. **Tracking GPS itu simulasi**, bukan device asli — `TelemetrySimulatorService` menghasilkan posisi bergerak sepanjang rute hardcoded.
5. **`bcryptjs` di frontend** (`data/db/seed.ts`) adalah sisa Fase 1 (hash password di client) — kemungkinan besar dead code sekarang karena auth sudah backend-only, belum dihapus.
6. **`ImportBatchRepository`** masih IndexedDB murni — riwayat impor Excel **tidak sinkron antar device/browser**.
7. **File binary (foto & dokumen) disimpan sebagai `bytea` di Postgres**, bukan object storage — risiko skalabilitas/ukuran DB, apalagi di shared hosting dengan kuota storage terbatas.
8. **Tidak ada CI/CD otomatis** — semua deploy manual lewat command di terminal lokal + cPanel Terminal.
9. `server/railway.json` masih ada di repo tapi **sudah tidak relevan** (backend sudah pindah dari Railway ke Dewaweb).
10. Route `/app/peminjaman*` **tidak** dijaga `roleGuard` (sengaja, karena `pegawai` juga boleh ajukan peminjaman) — jangan tambahkan roleGuard di situ tanpa cek matriks kemampuan dulu.
11. **`GET /public-stats` sengaja publik tanpa `JwtAuthGuard`** (Fase 6) — by design (statistik agregat untuk landing page, tidak ada data per-unit/sensitif), tapi perlu diingat kalau ada audit keamanan supaya tidak dikira celah yang belum sengaja.
12. **Seed akun (`server/src/seed/seed.service.ts`) sekarang mengecek per-NIP setiap boot** (bukan cuma "kalau tabel users kosong") — supaya 9 akun organisasi asli (Fase 6) otomatis ter-provisioning di production yang sudah punya akun lain, tanpa perlu input manual. Efek sampingnya: akun demo lama (`I Wayan Sudiarta`/`Ni Made Suryani`/`I Ketut Ardika`, NIP beda dari 9 akun baru) **tetap ada** di database production, tidak dihapus otomatis — kalau mau dibersihkan, harus manual lewat Manajemen Pengguna atau langsung ke DB.
13. Database dev lokal per 2026-09-17 juga punya 2 akun uji coba tersisa (NIP `200001012020011001` "Test User" dan `199912312099001001` "UI Created User") dari sesi testing sebelumnya — aman diabaikan/dihapus, bukan bagian dari data resmi.

---

## 14. Cara Menjalankan Secara Lokal

```bash
# 1. Database
cd server && docker compose up -d

# 2. Backend
cd server && npm install && npm run start:dev   # → http://localhost:3000
# akun organisasi asli auto-seed per-NIP setiap boot (Fase 6 — lihat AKUN_BAKU
# di seed.service.ts untuk daftar & NIP lengkap), kata sandi awal pola "{Peran}#123":
#   superadmin (Kabid Aset):            NIP 198009182010011021 / Superadmin#123
#   admin (Pengurus Barang):             NIP 198303232010011043 / Admin#123
#   pejabat_penatausahaan:                NIP 198301172010011019 / Penatausahaan#123
#   pimpinan (Kepala Badan):              NIP 197612102009021003 / Pimpinan#123
#   pegawai (6 akun Pemohon per Bidang): Pegawai#123 — lihat AKUN_BAKU untuk NIP masing-masing

# 3. Frontend (WAJIB port 4300, match CORS)
npm install && npm start -- --port 4300         # → http://localhost:4300
```
