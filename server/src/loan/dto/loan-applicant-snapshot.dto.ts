import { IsString } from 'class-validator';

export class LoanApplicantSnapshotDto {
  @IsString()
  nama!: string;

  @IsString()
  nip!: string;

  @IsString()
  jabatan!: string;

  @IsString()
  unitKerja!: string;

  @IsString()
  noHp!: string;
}
