import { IsString } from 'class-validator';

export class UpsertVehiclePhotoDto {
  @IsString()
  mimeType!: string;

  /** Isi berkas dalam base64 (bukan multipart) — lihat catatan desain di rencana migrasi. */
  @IsString()
  blobBase64!: string;
}
