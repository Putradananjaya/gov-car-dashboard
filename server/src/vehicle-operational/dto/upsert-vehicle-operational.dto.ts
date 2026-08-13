import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { TelemetriDto } from './telemetri.dto';

export class UpsertVehicleOperationalDto {
  @IsString()
  @Length(45, 45)
  nibar!: string;

  @IsIn(['Baik', 'Rusak Ringan', 'Rusak Berat'])
  kondisi!: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

  @IsIn(['Tersedia', 'Dipinjam', 'Servis', 'Tidak Layak'])
  status!: 'Tersedia' | 'Dipinjam' | 'Servis' | 'Tidak Layak';

  @IsOptional()
  @IsString()
  penanggungJawabId!: string | null;

  @IsOptional()
  @IsString()
  telepon!: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TelemetriDto)
  telemetri!: TelemetriDto | null;

  @IsString()
  catatan!: string;

  @IsString()
  diperbaruiPada!: string;

  @IsString()
  diperbaruiOleh!: string;
}
