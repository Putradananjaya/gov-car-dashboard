import { IsIn, IsString, Length, MinLength } from 'class-validator';
import type { Peran } from '../user.entity';

export class CreateUserDto {
  @IsString()
  @Length(8, 20)
  nip!: string;

  @IsString()
  nama!: string;

  @IsString()
  jabatan!: string;

  @IsString()
  unitKerja!: string;

  @IsIn(['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'])
  peran!: Peran;

  @IsString()
  @MinLength(8)
  password!: string;
}
