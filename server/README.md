# PUSAKA BANGLI — Backend (Fase 5a)

API REST NestJS + PostgreSQL untuk `vehicle-asset` dan `vehicle-operational`
(dokumen v2 bag. 5). Ini fondasi awal Fase 5 — **belum ada autentikasi sama
sekali** di endpoint manapun. Jangan expose ke jaringan publik atau mesin
mana pun selain `localhost` sampai putaran "Auth backend" selesai.

## Menjalankan secara lokal

1. Salin `.env.example` ke `.env` (nilai default sudah cocok untuk
   `docker-compose.yml` di bawah).
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

## Endpoint

- `GET /vehicle-assets` — daftar semua aset
- `GET /vehicle-assets/:nibar` — satu aset
- `PUT /vehicle-assets/:nibar` — buat/perbarui (upsert), body = objek
  `VehicleAsset` penuh (termasuk `kodeBarang` bersarang)
- `DELETE /vehicle-assets/:nibar` — hapus permanen
- `POST /vehicle-assets/:nibar/soft-delete` — isi `dihapusPada`

- `GET /vehicle-operational`
- `GET /vehicle-operational/:nibar`
- `PUT /vehicle-operational/:nibar` — upsert, body = objek
  `VehicleOperational` penuh (termasuk `telemetri` bersarang, boleh `null`)
- `DELETE /vehicle-operational/:nibar`

CORS hanya dibuka untuk `http://localhost:4300` (dev server Angular).

## Mematikan

```
docker compose down
```

Tambahkan `-v` bila ingin ikut menghapus volume data Postgres.
