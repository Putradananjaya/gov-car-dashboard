import { Peran } from '../core/models/user.model';
import { DAFTAR_KEMAMPUAN, LABEL_PERAN } from '../core/auth/kemampuan';

/**
 * Menerjemahkan isi jejak audit ke bahasa yang bisa dibaca pegawai non-teknis.
 *
 * Yang tersimpan di basis data tetap apa adanya (slug aksi, nama entitas
 * teknis, nilai mentah) — penerjemahan hanya di tampilan, supaya jejaknya
 * tetap sah sebagai bukti dan tidak berubah artinya.
 */

const LABEL_AKSI: Record<string, string> = {
  'ajukan-peminjaman': 'Mengajukan peminjaman',
  'simpan-draf-peminjaman': 'Menyimpan draf peminjaman',
  'verifikasi-ketersediaan-peminjaman': 'Menyatakan kendaraan tersedia',
  // Alur lama (sebelum langkah SOP dipisah) — masih ada di data lama.
  'setujui-tahap1-peminjaman': 'Menyetujui peminjaman (alur lama)',
  'setujui-peminjaman': 'Menyetujui permohonan',
  'tolak-peminjaman': 'Menolak permohonan',
  'serah-terima-peminjaman': 'Menyerahkan kendaraan & kunci',
  'kembalikan-peminjaman': 'Menerima pengembalian kendaraan',
  tambah: 'Menambah data',
  ubah: 'Mengubah data',
  hapus: 'Menghapus data',
  'hapus-permanen': 'Menghapus permanen',
  'tambah-servis': 'Mencatat riwayat servis',
  'ubah-legalitas': 'Memperbarui pajak & STNK',
  'ubah-kondisi-massal': 'Mengubah kondisi kendaraan (banyak sekaligus)',
  'tetapkan-pemegang-massal': 'Menetapkan pemegang kendaraan (banyak sekaligus)',
  impor: 'Mengunggah berkas e-BMD',
  'terapkan-impor': 'Menerapkan hasil impor',
  'batalkan-impor': 'Membatalkan impor',
  'reset-kata-sandi': 'Menyetel ulang kata sandi',
  'aktifkan-pengguna': 'Mengaktifkan akun',
  'nonaktifkan-pengguna': 'Menonaktifkan akun',
  'ubah-hak-akses': 'Mengubah hak akses peran'
};

const LABEL_ENTITAS: Record<string, string> = {
  Loan: 'Peminjaman',
  User: 'Pengguna',
  VehicleAsset: 'Aset kendaraan',
  VehicleOperational: 'Status operasional',
  ServiceRecord: 'Riwayat servis',
  ImportBatch: 'Berkas impor',
  HakAkses: 'Hak akses'
};

/** Nama kolom teknis → sebutan yang dipakai di formulir. */
const LABEL_KOLOM: Record<string, string> = {
  nama: 'Nama',
  nip: 'NIP',
  jabatan: 'Jabatan',
  unitKerja: 'Unit kerja',
  peran: 'Peran',
  aktif: 'Status akun',
  status: 'Status',
  kondisi: 'Kondisi',
  pemegang: 'Pemegang',
  masaBerlakuPajak: 'Masa berlaku pajak',
  masaBerlakuStnk: 'Masa berlaku STNK',
  nomorPolisi: 'Nomor polisi',
  keperluan: 'Keperluan',
  tujuan: 'Tujuan'
};

const LABEL_KEMAMPUAN = new Map(DAFTAR_KEMAMPUAN.map(k => [k.kemampuan as string, k.label]));

/** Slug tak dikenal tetap terbaca: "ubah-sesuatu" → "Ubah sesuatu". */
function daruratDariSlug(slug: string): string {
  const teks = slug.replace(/[-_]+/g, ' ').trim();
  return teks.charAt(0).toUpperCase() + teks.slice(1);
}

export function labelAksi(aksi: string): string {
  return LABEL_AKSI[aksi] ?? daruratDariSlug(aksi);
}

export function labelEntitas(entitas: string): string {
  return LABEL_ENTITAS[entitas] ?? entitas;
}

export function labelKolom(kolom: string): string {
  return LABEL_KOLOM[kolom] ?? LABEL_KEMAMPUAN.get(kolom) ?? daruratDariSlug(kolom);
}

function adalahPeran(nilai: string): nilai is Peran {
  return nilai in LABEL_PERAN;
}

/** Ubah satu nilai jadi teks yang bisa dibaca; objek besar ditandai saja. */
export function nilaiTerbaca(nilai: unknown): string {
  if (nilai === undefined || nilai === null || nilai === '') return '—';
  if (typeof nilai === 'boolean') return nilai ? 'Aktif' : 'Nonaktif';
  if (typeof nilai === 'number') return String(nilai);
  if (typeof nilai === 'string') return adalahPeran(nilai) ? LABEL_PERAN[nilai] : nilai;

  if (Array.isArray(nilai)) {
    if (nilai.length === 0) return 'Tidak ada';
    return nilai.map(v => nilaiTerbaca(v)).join(', ');
  }

  return '(rincian)';
}

/**
 * Ringkasan perubahan dalam kalimat pendek. Objek dibandingkan per kolom
 * sehingga yang tampil hanya yang benar-benar berubah — bukan seluruh isi
 * datanya seperti sebelumnya.
 */
export function ringkasPerubahan(lama: unknown, baru: unknown): string[] {
  const lamaObjek = adalahObjek(lama);
  const baruObjek = adalahObjek(baru);

  if (lamaObjek && baruObjek) {
    const kunci = [...new Set([...Object.keys(lama), ...Object.keys(baru)])];
    const berubah = kunci.filter(k => JSON.stringify(lama[k]) !== JSON.stringify(baru[k]));
    if (berubah.length === 0) return ['Tidak ada perubahan nilai'];
    return berubah.map(k => `${labelKolom(k)}: ${nilaiTerbaca(lama[k])} → ${nilaiTerbaca(baru[k])}`);
  }

  // Pembuatan data baru: cukup tampilkan penanda yang dikenali orang.
  if (!lamaObjek && baruObjek) {
    const penanda = ringkasPenanda(baru);
    return penanda.length > 0 ? penanda : ['Data baru dibuat'];
  }

  if (lamaObjek && !baruObjek) {
    const penanda = ringkasPenanda(lama);
    return penanda.length > 0 ? penanda.map(t => `Dihapus — ${t}`) : ['Data dihapus'];
  }

  if (lama === undefined || lama === null) {
    return baru === undefined || baru === null ? [] : [nilaiTerbaca(baru)];
  }
  return [`${nilaiTerbaca(lama)} → ${nilaiTerbaca(baru)}`];
}

function adalahObjek(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === 'object' && nilai !== null && !Array.isArray(nilai);
}

/** Kolom yang paling menolong untuk mengenali sebuah baris data. */
const KOLOM_PENANDA = ['nama', 'nomorPolisi', 'nip', 'keperluan', 'tujuan', 'status', 'peran'];

function ringkasPenanda(objek: Record<string, unknown>): string[] {
  return KOLOM_PENANDA.filter(k => objek[k] !== undefined && objek[k] !== null && objek[k] !== '')
    .slice(0, 3)
    .map(k => `${labelKolom(k)}: ${nilaiTerbaca(objek[k])}`);
}
