import { IsIn, IsInt, IsString } from 'class-validator';

export class UpsertLoanDocumentDto {
  @IsString()
  loanId!: string;

  @IsIn(['utama', 'lain'])
  kind!: 'utama' | 'lain';

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  size!: number;

  /** Isi berkas dalam base64 (bukan multipart) — lihat catatan desain di rencana migrasi. */
  @IsString()
  blobBase64!: string;
}
