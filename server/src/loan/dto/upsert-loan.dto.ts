import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { LoanApplicantSnapshotDto } from './loan-applicant-snapshot.dto';

export class UpsertLoanDto {
  @IsString()
  nibar!: string;

  @IsString()
  pemohonId!: string;

  @ValidateNested()
  @Type(() => LoanApplicantSnapshotDto)
  pemohon!: LoanApplicantSnapshotDto;

  @IsIn(['Baru', 'Perubahan', 'Darurat'])
  statusPermohonan!: 'Baru' | 'Perubahan' | 'Darurat';

  @IsIn(['Penggunaan', 'Peminjaman'])
  jenisPermohonan!: 'Penggunaan' | 'Peminjaman';

  @IsOptional()
  @IsString()
  namaPengemudi!: string | null;

  @IsString()
  keperluan!: string;

  @IsString()
  tujuan!: string;

  @IsOptional()
  @IsString()
  rute!: string | null;

  @IsString()
  rencanaMulai!: string;

  @IsString()
  rencanaSelesai!: string;

  @IsOptional()
  @IsString()
  nomorSurat!: string | null;

  @IsOptional()
  @IsString()
  tanggalSurat!: string | null;

  @IsIn(['Biasa', 'Penting', 'Mendesak/Darurat'])
  tingkatUrgensi!: 'Biasa' | 'Penting' | 'Mendesak/Darurat';

  @IsIn(['Roda 2', 'Roda 4', 'Lainnya'])
  jenisKendaraan!: 'Roda 2' | 'Roda 4' | 'Lainnya';

  @IsOptional()
  @IsString()
  jenisKendaraanLainnya!: string | null;

  @IsOptional()
  @IsString()
  kapasitasSpesifikasi!: string | null;

  @IsOptional()
  @IsString()
  keteranganTambahan!: string | null;

  @IsOptional()
  @IsString()
  realisasiKembali!: string | null;

  @IsIn(['Draft', 'Diajukan', 'Disetujui', 'Ditolak', 'Berjalan', 'Selesai'])
  status!: 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Berjalan' | 'Selesai';

  @IsOptional()
  @IsString()
  disetujuiOleh!: string | null;

  @IsOptional()
  @IsString()
  catatanPenolakan!: string | null;

  @IsOptional()
  @IsInt()
  odometerKeluar!: number | null;

  @IsOptional()
  @IsInt()
  odometerMasuk!: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bbmKeluar!: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bbmMasuk!: number | null;

  @IsOptional()
  @IsIn(['Baik', 'Rusak Ringan', 'Rusak Berat'])
  kondisiKeluar!: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | null;

  @IsOptional()
  @IsIn(['Baik', 'Rusak Ringan', 'Rusak Berat'])
  kondisiMasuk!: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | null;

  @IsOptional()
  @IsString()
  catatanKondisiKeluar!: string | null;

  @IsOptional()
  @IsString()
  catatanKondisiMasuk!: string | null;

  @IsOptional()
  @IsString()
  kunciDiserahkanPada!: string | null;

  @IsOptional()
  @IsString()
  kunciDikembalikanPada!: string | null;
}
