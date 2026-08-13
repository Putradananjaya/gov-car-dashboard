import { IsIn, IsNumber, IsString } from 'class-validator';

export class TelemetriDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsNumber()
  kecepatan!: number;

  @IsNumber()
  levelBbm!: number;

  @IsIn(['simulasi', 'perangkat'])
  sumber!: 'simulasi' | 'perangkat';

  @IsString()
  waktu!: string;
}
