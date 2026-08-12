/**
 * Indeks kolom (0-based) berkas FORMAT II.O.2.2, dikonfirmasi lewat
 * pemeriksaan langsung terhadap berkas asli klien (Badan Keuangan,
 * Pendapatan dan Aset Daerah). Baris kop di 1-9, header berlapis di 10-12,
 * baris detail mulai baris 14 (index 13).
 */

export const FIRST_DETAIL_ROW_INDEX = 13; // baris 14 (1-indexed)

/** Kolom Kode Barang: A-F + H (kolom G selalu kosong di berkas ini). */
export const KODE_BARANG_COLUMNS = {
  AKUN: 0, // A
  KELOMPOK: 1, // B
  JENIS: 2, // C
  OBJEK: 3, // D
  RINCIAN_OBJEK: 4, // E
  SUB_RINCIAN: 5, // F
  SUB_SUB: 7 // H (G dilewati)
} as const;

export const COLUMN = {
  NAMA_BARANG: 8, // I
  NIBAR: 9, // J
  NOMOR_REGISTER: 10, // K
  SPESIFIKASI_NAMA: 11, // L
  SPESIFIKASI_LAINNYA: 12, // M
  MEREK_TIPE: 14, // O
  LOKASI: 15, // P
  NOMOR_POLISI: 16, // Q — penanda baris detail vs baris rekap
  NOMOR_RANGKA: 17, // R
  NOMOR_BPKB: 18, // S
  JUMLAH: 19, // T
  SATUAN: 20, // U
  HARGA_SATUAN_PEROLEHAN: 22, // W
  NILAI_PEROLEHAN: 23, // X
  CARA_PEROLEHAN: 24, // Y
  TANGGAL_PEROLEHAN: 25, // Z — serial numerik Excel
  STATUS_PENGGUNAAN: 26, // AA
  PENGGUNA: 28, // AC
  FOTO: 30, // AE — anchor gambar, bukan nilai sel; diisi fase ekstraksi foto
  MASA_BERLAKU_PAJAK: 32, // AG — teks tanggal Indonesia
  MASA_BERLAKU_STNK: 34, // AI — teks tanggal Indonesia
  RIWAYAT_SERVIS: 36, // AK
  JUMLAH_HARGA: 38 // AM — biaya servis
} as const;

/** Baris kop (0-based index). */
export const KOP_ROW = {
  TAHUN_ANGGARAN: 5, // baris 6: "TAHUN 2026"
  PENGGUNA_BARANG: 7, // baris 8, kolom I
  KODE_LOKASI: 8 // baris 9, kolom I
} as const;

export const KOP_VALUE_COLUMN = 8; // kolom I, tempat nilai kop setelah label+titik dua
