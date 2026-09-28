import { IsIn, IsString } from 'class-validator';

export const TIPE_BERKAS_PAKTA = ['application/pdf', 'image/jpeg', 'image/png'] as const;

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
