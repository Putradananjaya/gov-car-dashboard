import { IsString } from 'class-validator';

export class KodeBarangDto {
  @IsString()
  akun!: string;

  @IsString()
  kelompok!: string;

  @IsString()
  jenis!: string;

  @IsString()
  objek!: string;

  @IsString()
  rincianObjek!: string;

  @IsString()
  subRincian!: string;

  @IsString()
  subSub!: string;

  @IsString()
  full!: string;
}
