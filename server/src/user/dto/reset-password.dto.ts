import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  /**
   * Kata sandi milik superadmin yang sedang masuk — bukan milik pengguna yang
   * disetel ulang. Dipakai sebagai bukti identitas sebelum tindakan sensitif
   * ini dijalankan, supaya layar superadmin yang tertinggal terbuka tidak bisa
   * dipakai mengambil alih akun lain.
   */
  @IsString()
  @MinLength(1)
  kataSandiLama!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
