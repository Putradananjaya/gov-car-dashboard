import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertServiceRecordDto {
  @IsString()
  nibar!: string;

  @IsInt()
  tahun!: number;

  @IsString()
  uraian!: string;

  @IsOptional()
  @IsInt()
  odometerKm!: number | null;

  @IsOptional()
  @IsNumber()
  biaya!: number | null;

  @IsOptional()
  @IsString()
  tanggal!: string | null;

  @IsIn(['impor', 'input-manual'])
  sumber!: 'impor' | 'input-manual';
}
