import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class KembalikanLoanDto {
  @IsInt()
  @Min(0)
  odometerMasuk!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  bbmMasuk!: number;

  @IsIn(['Baik', 'Rusak Ringan', 'Rusak Berat'])
  kondisiMasuk!: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

  @IsOptional()
  @IsString()
  catatanKondisiMasuk!: string | null;

  @IsBoolean()
  kunciDikembalikan!: boolean;
}
