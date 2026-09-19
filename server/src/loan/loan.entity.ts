import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Mengikuti SOP Peminjaman Kendaraan Dinas No. 000.2.3.2/3336/BKPAD/2026:
 * Diajukan (langkah 1) → Diverifikasi (langkah 2, ketersediaan diperiksa
 * Pengurus Barang) → Disetujui (langkah 3, persetujuan Pejabat
 * Penatausahaan) → Berjalan (langkah 4, kunci diserahkan) → Selesai
 * (langkah 6, kondisi akhir diperiksa).
 */
export type StatusPeminjaman =
  | 'Draft'
  | 'Diajukan'
  | 'Diverifikasi'
  | 'Disetujui'
  | 'Ditolak'
  | 'Berjalan'
  | 'Selesai';
export type StatusPermohonan = 'Baru' | 'Perubahan' | 'Darurat';
export type JenisPermohonan = 'Penggunaan' | 'Peminjaman';
export type TingkatUrgensi = 'Biasa' | 'Penting' | 'Mendesak/Darurat';
export type JenisKendaraan = 'Roda 2' | 'Roda 4' | 'Lainnya';
export type KondisiAset = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

export interface LoanApplicantSnapshot {
  nama: string;
  nip: string;
  jabatan: string;
  unitKerja: string;
  noHp: string;
}

/** Field & label mengikuti FRM-01 — lihat `src/app/core/models/loan.model.ts` (frontend) untuk penjelasan tiap kolom. */
@Entity('loans')
export class LoanEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  nibar!: string;

  @Index()
  @Column({ name: 'pemohon_id', type: 'varchar' })
  pemohonId!: string;

  @Column({ type: 'jsonb' })
  pemohon!: LoanApplicantSnapshot;

  @Column({ name: 'status_permohonan', type: 'varchar' })
  statusPermohonan!: StatusPermohonan;

  @Column({ name: 'jenis_permohonan', type: 'varchar' })
  jenisPermohonan!: JenisPermohonan;

  @Column({ name: 'nama_pengemudi', type: 'varchar', nullable: true })
  namaPengemudi!: string | null;

  @Column({ type: 'text' })
  keperluan!: string;

  @Column({ type: 'text' })
  tujuan!: string;

  @Column({ type: 'text', nullable: true })
  rute!: string | null;

  @Column({ name: 'rencana_mulai', type: 'varchar' })
  rencanaMulai!: string;

  @Column({ name: 'rencana_selesai', type: 'varchar' })
  rencanaSelesai!: string;

  @Column({ name: 'nomor_surat', type: 'varchar', nullable: true })
  nomorSurat!: string | null;

  @Column({ name: 'tanggal_surat', type: 'varchar', nullable: true })
  tanggalSurat!: string | null;

  @Column({ name: 'tingkat_urgensi', type: 'varchar' })
  tingkatUrgensi!: TingkatUrgensi;

  @Column({ name: 'jenis_kendaraan', type: 'varchar' })
  jenisKendaraan!: JenisKendaraan;

  @Column({ name: 'jenis_kendaraan_lainnya', type: 'varchar', nullable: true })
  jenisKendaraanLainnya!: string | null;

  @Column({ name: 'kapasitas_spesifikasi', type: 'varchar', nullable: true })
  kapasitasSpesifikasi!: string | null;

  @Column({ name: 'keterangan_tambahan', type: 'text', nullable: true })
  keteranganTambahan!: string | null;

  @Column({ name: 'realisasi_kembali', type: 'varchar', nullable: true })
  realisasiKembali!: string | null;

  @Index()
  @Column({ type: 'varchar' })
  status!: StatusPeminjaman;

  /** Pengurus Barang yang menyatakan kendaraan tersedia (langkah 2 SOP). */
  @Column({ name: 'diverifikasi_oleh', type: 'varchar', nullable: true })
  diverifikasiOleh!: string | null;

  /** Pejabat Penatausahaan yang memberi persetujuan (langkah 3 SOP). */
  @Column({ name: 'disetujui_oleh', type: 'varchar', nullable: true })
  disetujuiOleh!: string | null;

  @Column({ name: 'catatan_penolakan', type: 'varchar', nullable: true })
  catatanPenolakan!: string | null;

  @Column({ name: 'odometer_keluar', type: 'int', nullable: true })
  odometerKeluar!: number | null;

  @Column({ name: 'odometer_masuk', type: 'int', nullable: true })
  odometerMasuk!: number | null;

  @Column({ name: 'bbm_keluar', type: 'int', nullable: true })
  bbmKeluar!: number | null;

  @Column({ name: 'bbm_masuk', type: 'int', nullable: true })
  bbmMasuk!: number | null;

  @Column({ name: 'kondisi_keluar', type: 'varchar', nullable: true })
  kondisiKeluar!: KondisiAset | null;

  @Column({ name: 'kondisi_masuk', type: 'varchar', nullable: true })
  kondisiMasuk!: KondisiAset | null;

  @Column({ name: 'catatan_kondisi_keluar', type: 'text', nullable: true })
  catatanKondisiKeluar!: string | null;

  @Column({ name: 'catatan_kondisi_masuk', type: 'text', nullable: true })
  catatanKondisiMasuk!: string | null;

  @Column({ name: 'kunci_diserahkan_pada', type: 'varchar', nullable: true })
  kunciDiserahkanPada!: string | null;

  @Column({ name: 'kunci_dikembalikan_pada', type: 'varchar', nullable: true })
  kunciDikembalikanPada!: string | null;
}
