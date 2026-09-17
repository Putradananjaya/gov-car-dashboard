import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SerahTerimaLoanDto {
  @IsInt()
  @Min(0)
  odometerKeluar!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  bbmKeluar!: number;

  @IsIn(['Baik', 'Rusak Ringan', 'Rusak Berat'])
  kondisiKeluar!: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

  @IsOptional()
  @IsString()
  catatanKondisiKeluar!: string | null;

  @IsBoolean()
  kunciDiserahkan!: boolean;
}
