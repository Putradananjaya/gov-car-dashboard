import type { Peran } from '../user/user.entity';

/**
 * Daftar kemampuan yang bisa diatur superadmin lewat Manajemen Pengguna.
 *
 * HARUS tetap sama persis dengan `Kemampuan` di
 * `src/app/core/auth/permission.service.ts` (frontend). Keduanya sengaja
 * diduplikasi karena frontend & backend adalah dua proyek TypeScript terpisah
 * tanpa paket bersama — kalau menambah kemampuan baru, ubah di kedua tempat.
 */
export const SEMUA_KEMAMPUAN = [
  'aset.lihat',
  'aset.ubah',
  'aset.hapus',
  'aset.impor',
  'aset.ubahStatusOperasional',
  'aset.lihatDataSensitif',
  'peminjaman.ajukan',
  'peminjaman.verifikasi',
  'peminjaman.setujui',
  'peminjaman.serahTerima',
  'servis.input',
  'kerusakan.lapor',
  'laporan.cetak',
  'pengguna.kelola',
  'pengguna.hapus',
  'audit.lihat',
  'sistem.resetBasisData'
] as const;

export type Kemampuan = (typeof SEMUA_KEMAMPUAN)[number];

export const SEMUA_PERAN: Peran[] = [
  'superadmin',
  'admin',
  'pegawai',
  'pejabat_penatausahaan',
  'pimpinan'
];

/**
 * Nilai awal matriks — dipakai saat provisioning baris yang belum ada di
 * database, dan sebagai jaring pengaman kalau satu baris hilang. Isinya sama
 * dengan matriks yang dulu dikunci di kode frontend, kecuali
 * `peminjaman.setujui` yang dipecah jadi dua tahap sesuai SOP.
 */
export const MATRIKS_BAWAAN: Record<Kemampuan, Peran[]> = {
  'aset.lihat': ['superadmin', 'admin'],
  'aset.ubah': ['superadmin', 'admin'],
  'aset.hapus': ['superadmin', 'admin'],
  'aset.impor': ['superadmin', 'admin'],
  'aset.ubahStatusOperasional': ['superadmin', 'admin'],
  'aset.lihatDataSensitif': ['superadmin', 'admin'],
  'peminjaman.ajukan': ['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'],
  // Pembagian aktor mengikuti kolom "Pelaksana" pada SOP: Pengurus Barang
  // memeriksa ketersediaan (langkah 2) lalu menyerahkan kunci (langkah 4 & 6),
  // Pejabat Penatausahaan yang memberi persetujuan (langkah 3).
  'peminjaman.verifikasi': ['superadmin', 'admin'],
  'peminjaman.setujui': ['superadmin', 'pejabat_penatausahaan'],
  'peminjaman.serahTerima': ['superadmin', 'admin'],
  'servis.input': ['superadmin', 'admin'],
  'kerusakan.lapor': ['superadmin', 'admin', 'pegawai'],
  'laporan.cetak': ['superadmin', 'admin', 'pimpinan'],
  'pengguna.kelola': ['superadmin'],
  'pengguna.hapus': ['superadmin'],
  'audit.lihat': ['superadmin'],
  'sistem.resetBasisData': ['superadmin']
};

export function adalahKemampuan(nilai: string): nilai is Kemampuan {
  return (SEMUA_KEMAMPUAN as readonly string[]).includes(nilai);
}
