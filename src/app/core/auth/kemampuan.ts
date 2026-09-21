import { Peran } from '../models/user.model';

/**
 * Daftar kemampuan yang bisa diatur superadmin lewat Manajemen Pengguna.
 *
 * HARUS tetap sama persis dengan `SEMUA_KEMAMPUAN` di
 * `server/src/role-permission/kemampuan.ts`. Keduanya diduplikasi karena
 * frontend & backend adalah dua proyek TypeScript terpisah tanpa paket
 * bersama — kalau menambah kemampuan baru, ubah di kedua tempat.
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

export type MatriksHakAkses = Record<Kemampuan, Peran[]>;

/** Peran selain superadmin — hanya kolom inilah yang bisa dicentang-lepas. */
export const PERAN_DAPAT_DIATUR: Peran[] = ['admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'];

export const SEMUA_PERAN: Peran[] = ['superadmin', ...PERAN_DAPAT_DIATUR];

/**
 * Penyebutan peran mengikuti dokumen "Aktor Pusaka BKPAD" — satu-satunya
 * sumber kebenaran istilah di seluruh aplikasi.
 *
 * Sebelumnya peta ini ada tiga salinan dengan dua versi kata yang berbeda
 * ("Admin OPD" di sidebar & tabel hak akses, "Admin (Pengurus Barang)" di
 * daftar pengguna), sehingga satu peran yang sama terlihat seperti dua hal.
 */
export const LABEL_PERAN: Record<Peran, string> = {
  superadmin: 'Kabid Aset (Superadmin)',
  admin: 'Pengurus Barang (Admin)',
  pegawai: 'Pemohon',
  pejabat_penatausahaan: 'Pejabat Penatausahaan Pengguna Barang',
  pimpinan: 'Pimpinan (Kepala Dinas/Badan)'
};

/** Bentuk ringkas untuk tempat sempit: judul kolom matriks dan badge sidebar. */
export const LABEL_PERAN_SINGKAT: Record<Peran, string> = {
  superadmin: 'Kabid Aset',
  admin: 'Pengurus Barang',
  pegawai: 'Pemohon',
  pejabat_penatausahaan: 'Pejabat Penatausahaan',
  pimpinan: 'Pimpinan'
};

/**
 * Nilai awal matriks. Dipakai selama matriks dari server belum termuat, dan
 * sebagai jaring pengaman kalau satu kemampuan belum punya baris di database.
 */
export const MATRIKS_BAWAAN: MatriksHakAkses = {
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

export interface InfoKemampuan {
  kemampuan: Kemampuan;
  label: string;
  keterangan: string;
  kelompok: string;
}

/** Urutan & penamaan yang dipakai tabel pengaturan hak akses. */
export const DAFTAR_KEMAMPUAN: InfoKemampuan[] = [
  { kemampuan: 'aset.lihat', label: 'Lihat data aset', keterangan: 'Membuka menu Data Kendaraan & daftar aset', kelompok: 'Aset & BMD' },
  { kemampuan: 'aset.ubah', label: 'Tambah & ubah aset', keterangan: 'Menyimpan data BMD baru atau perubahannya', kelompok: 'Aset & BMD' },
  { kemampuan: 'aset.hapus', label: 'Hapus aset', keterangan: 'Menyembunyikan aset dari daftar — barisnya tetap tersimpan di basis data', kelompok: 'Aset & BMD' },
  { kemampuan: 'aset.impor', label: 'Impor berkas e-BMD', keterangan: 'Mengunggah Excel e-BMD dan membatalkan impor', kelompok: 'Aset & BMD' },
  { kemampuan: 'aset.lihatDataSensitif', label: 'Lihat nomor rangka & BPKB', keterangan: 'Menampilkan kolom identitas legal kendaraan', kelompok: 'Aset & BMD' },
  { kemampuan: 'aset.ubahStatusOperasional', label: 'Ubah kondisi & status operasional', keterangan: 'Mengubah status pakai dan kondisi kendaraan', kelompok: 'Operasional' },
  { kemampuan: 'servis.input', label: 'Input riwayat servis & pajak', keterangan: 'Mencatat pemeliharaan dan perpanjangan pajak', kelompok: 'Operasional' },
  { kemampuan: 'kerusakan.lapor', label: 'Lapor kerusakan', keterangan: 'Mengirim laporan kerusakan kendaraan', kelompok: 'Operasional' },
  { kemampuan: 'peminjaman.ajukan', label: 'Ajukan peminjaman', keterangan: 'Mengisi formulir FRM-01 dan mengirim pengajuan', kelompok: 'Peminjaman' },
  { kemampuan: 'peminjaman.verifikasi', label: 'Verifikasi ketersediaan kendaraan', keterangan: 'Langkah 2 SOP — memeriksa kendaraan tersedia lalu meneruskannya', kelompok: 'Peminjaman' },
  { kemampuan: 'peminjaman.setujui', label: 'Setujui / tolak permohonan', keterangan: 'Langkah 3 SOP — persetujuan elektronik atas permohonan', kelompok: 'Peminjaman' },
  { kemampuan: 'peminjaman.serahTerima', label: 'Serah terima & terima pengembalian', keterangan: 'Langkah 4 & 6 SOP — menyerahkan kunci lalu memeriksa kondisi akhir', kelompok: 'Peminjaman' },
  { kemampuan: 'laporan.cetak', label: 'Cetak laporan resmi', keterangan: 'Membuka menu Laporan dan mencetaknya', kelompok: 'Sistem' },
  { kemampuan: 'pengguna.kelola', label: 'Kelola pengguna & hak akses', keterangan: 'Membuka halaman ini dan mengubah isinya', kelompok: 'Sistem' },
  { kemampuan: 'pengguna.hapus', label: 'Hapus & pulihkan pengguna', keterangan: 'Menghapus akun dari daftar aktif, serta memulihkannya dari arsip', kelompok: 'Sistem' },
  { kemampuan: 'audit.lihat', label: 'Lihat jejak audit', keterangan: 'Membuka riwayat seluruh aktivitas pengguna', kelompok: 'Sistem' },
  { kemampuan: 'sistem.resetBasisData', label: 'Setel ulang basis data', keterangan: 'Mengembalikan data ke kondisi bawaan', kelompok: 'Sistem' }
];
