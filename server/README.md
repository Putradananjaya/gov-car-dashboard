# PUSAKA BANGLI — Backend (Fase 5a + 5b)

API REST NestJS + PostgreSQL untuk `vehicle-asset`, `vehicle-operational`,
dan autentikasi (JWT + refresh token). Sejak Fase 5b, semua endpoint
`/vehicle-assets` dan `/vehicle-operational` **memerlukan login** (header
`Authorization: Bearer <accessToken>`); `DELETE /vehicle-assets/:nibar`
(hapus permanen) khusus peran `superadmin`.

**Catatan penting**: otorisasi granular penuh (matriks 14 kemampuan yang ada
di `PermissionService` sisi Angular, pembatasan data per-OPD) belum
direplikasi di backend — baru "harus login" + satu contoh role-guard nyata.
`/app/pengguna` (Angular) juga masih memakai daftar pengguna lokal terpisah
(IndexedDB), belum tersambung ke tabel `users` Postgres di sini.

## Menjalankan secara lokal

1. Salin `.env.example` ke `.env` — **ganti `JWT_SECRET`** dengan rahasia
   acak sendiri (mis. `openssl rand -hex 32`), jangan pernah pakai nilai
   placeholder di `.env.example`.
2. Nyalakan PostgreSQL:
   ```
   docker compose up -d
   ```
3. Pasang dependency (sekali saja):
   ```
   npm install
   ```
4. Jalankan server dev (auto-reload):
   ```
   npm run start:dev
   ```
   Server berjalan di `http://localhost:3000`. Skema tabel dibuat otomatis
   dari entity TypeORM (`synchronize: true`, hanya untuk pengembangan lokal).
   Tiga akun demo (superadmin/admin/pegawai) otomatis di-seed saat boot
   pertama bila tabel `users` masih kosong — NIP/kata sandi identik dengan
   `src/app/data/db/seed.ts` di sisi Angular.

## Endpoint autentikasi

- `POST /auth/login` — body `{nip, password}`. Sukses: `{accessToken, user}`
  + cookie `refresh_token` (httpOnly). Gagal: 401 `{reason:'invalid'}` atau
  `{reason:'locked', retryAfterMs}` (5x gagal beruntun per NIP → kunci 15
  menit). Dibatasi 10 permintaan/menit per IP.
- `POST /auth/refresh` — baca cookie `refresh_token`, terbitkan
  `accessToken` baru + **rotasi** cookie (token lama langsung dicabut).
- `POST /auth/logout` — cabut refresh token yang aktif + hapus cookie.

Semua endpoint dibatasi laju 100 permintaan/menit per IP secara umum
(`@nestjs/throttler`).

## Endpoint data

- `GET /vehicle-assets`, `GET /vehicle-assets/:nibar`,
  `PUT /vehicle-assets/:nibar`, `POST /vehicle-assets/:nibar/soft-delete` —
  butuh login (peran apa saja)
- `DELETE /vehicle-assets/:nibar` — butuh login **peran superadmin**
- `GET /vehicle-operational`, `GET /vehicle-operational/:nibar`,
  `PUT /vehicle-operational/:nibar`, `DELETE /vehicle-operational/:nibar` —
  butuh login (peran apa saja)

CORS hanya dibuka untuk `http://localhost:4300` (dev server Angular), dengan
`credentials: true` (dibutuhkan agar cookie refresh token terkirim).

## Mematikan

```
docker compose down
```

Tambahkan `-v` bila ingin ikut menghapus volume data Postgres.
