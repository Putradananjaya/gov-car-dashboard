import { IsBoolean, IsIn, IsString } from 'class-validator';
import type { Peran } from '../user.entity';

export class UpdateUserDto {
  @IsString()
  nama!: string;

  @IsString()
  jabatan!: string;

  @IsString()
  unitKerja!: string;

  @IsIn(['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'])
  peran!: Peran;

  @IsBoolean()
  aktif!: boolean;
}
