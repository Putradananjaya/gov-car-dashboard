import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested
} from 'class-validator';
import { KodeBarangDto } from './kode-barang.dto';

export class UpsertVehicleAssetDto {
  @IsString()
  @Length(45, 45)
  nibar!: string;

  @IsString()
  nomorRegister!: string;

  @ValidateNested()
  @Type(() => KodeBarangDto)
  kodeBarang!: KodeBarangDto;

  @IsString()
  namaBarang!: string;

  @IsString()
  spesifikasiNama!: string;

  @IsString()
  spesifikasiLainnya!: string;

  @IsString()
  merekTipe!: string;

  @IsString()
  merek!: string;

  @IsString()
  tipe!: string;

  @IsString()
  lokasi!: string;

  @IsString()
  nomorPolisi!: string;

  @IsString()
  nomorRangka!: string;

  @IsOptional()
  @IsString()
  nomorBpkb!: string | null;

  @IsInt()
  jumlah!: number;

  @IsString()
  satuan!: string;

  @IsNumber()
  hargaSatuanPerolehan!: number;

  @IsNumber()
  nilaiPerolehan!: number;

  @IsString()
  caraPerolehan!: string;

  @IsString()
  tanggalPerolehan!: string;

  @IsString()
  statusPenggunaan!: string;

  @IsOptional()
  @IsString()
  pemegang!: string | null;

  @IsBoolean()
  isOperasionalBersama!: boolean;

  @IsOptional()
  @IsString()
  fotoId!: string | null;

  @IsString()
  masaBerlakuPajak!: string;

  @IsString()
  masaBerlakuStnk!: string;

  @IsInt()
  tahunAnggaran!: number;

  @IsString()
  kodeLokasi!: string;

  @IsString()
  sumberImporId!: string;

  @IsOptional()
  @IsString()
  dihapusPada!: string | null;
}
