export type StatusPeminjaman = 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Berjalan' | 'Selesai';

export interface Loan {
  id: string;
  nibar: string;
  pemohonId: string;
  keperluan: string;
  tujuan: string;
  rencanaMulai: string;
  rencanaSelesai: string;
  realisasiKembali: string | null;
  status: StatusPeminjaman;
  disetujuiOleh: string | null;
  catatanPenolakan: string | null;
  odometerKeluar: number | null;
  odometerMasuk: number | null;
}
