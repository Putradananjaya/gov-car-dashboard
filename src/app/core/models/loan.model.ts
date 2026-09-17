export type StatusPeminjaman = 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Berjalan' | 'Selesai';

/** Kolom "Status" pada FRM-01 — bukan status alur kerja (lihat StatusPeminjaman). */
export type StatusPermohonan = 'Baru' | 'Perubahan' | 'Darurat';

export type JenisPermohonan = 'Penggunaan' | 'Peminjaman';

export type TingkatUrgensi = 'Biasa' | 'Penting' | 'Mendesak/Darurat';

export type JenisKendaraan = 'Roda 2' | 'Roda 4' | 'Lainnya';

export type KondisiAset = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

/**
 * Salinan data identitas pemohon pada saat pengajuan dibuat — disengaja
 * disalin (bukan hanya lookup lewat pemohonId) supaya riwayat permohonan
 * tetap akurat walau profil pengguna berubah di kemudian hari.
 */
export interface LoanApplicantSnapshot {
  nama: string;
  nip: string;
  jabatan: string;
  unitKerja: string;
  noHp: string;
}

/**
 * Field & label mengikuti FRM-01 "Formulir Permohonan Penggunaan/Peminjaman
 * Kendaraan Dinas" (Paket Dokumen PUSAKA BANGLI, bagian A-C) apa adanya —
 * jangan menambah/ubah field di sini tanpa merujuk balik ke dokumen resmi.
 */
export interface Loan {
  id: string;
  nibar: string;
  pemohonId: string;
  pemohon: LoanApplicantSnapshot;

  // Header FRM-01
  statusPermohonan: StatusPermohonan;
  jenisPermohonan: JenisPermohonan;

  // A. Identitas Pemohon/Pengguna
  namaPengemudi: string | null;

  // B. Rencana Penggunaan
  keperluan: string; // Maksud/Keperluan
  tujuan: string; // Tujuan/Lokasi
  rute: string | null; // Rute Perjalanan
  rencanaMulai: string; // Hari/Tanggal Berangkat, ISO 8601 (YYYY-MM-DD)
  rencanaSelesai: string; // Hari/Tanggal Kembali, ISO 8601 (YYYY-MM-DD)
  nomorSurat: string | null; // Surat Tugas/Dasar Kegiatan — Nomor
  tanggalSurat: string | null; // Surat Tugas/Dasar Kegiatan — Tanggal
  tingkatUrgensi: TingkatUrgensi;

  // C. Kebutuhan Kendaraan
  jenisKendaraan: JenisKendaraan;
  jenisKendaraanLainnya: string | null;
  kapasitasSpesifikasi: string | null;
  keteranganTambahan: string | null;

  realisasiKembali: string | null;
  status: StatusPeminjaman;
  disetujuiOleh: string | null;
  catatanPenolakan: string | null;
  odometerKeluar: number | null;
  odometerMasuk: number | null;
  bbmKeluar: number | null;
  bbmMasuk: number | null;
  kondisiKeluar: KondisiAset | null;
  kondisiMasuk: KondisiAset | null;
  catatanKondisiKeluar: string | null;
  catatanKondisiMasuk: string | null;
  kunciDiserahkanPada: string | null;
  kunciDikembalikanPada: string | null;
}
