import { IsIn, IsString } from 'class-validator';

// Pakta integritas berupa surat — hanya PDF. Berkas gambar lama tetap bisa dibuka.
export const TIPE_BERKAS_PAKTA = ['application/pdf'] as const;

export class UpsertPaktaIntegritasDto {
  @IsString()
  fileName!: string;

  @IsIn(TIPE_BERKAS_PAKTA)
  mimeType!: string;

  /** Isi berkas dalam base64 (bukan multipart) — sama seperti foto & dokumen peminjaman. */
  @IsString()
  blobBase64!: string;

  @IsString()
  diunggahOleh!: string;
}
