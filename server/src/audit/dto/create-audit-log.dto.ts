import { IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  pelakuId!: string;

  @IsString()
  pelakuNama!: string;

  @IsString()
  aksi!: string;

  @IsString()
  entitas!: string;

  @IsString()
  entitasId!: string;

  @IsOptional()
  nilaiLama?: unknown;

  @IsOptional()
  nilaiBaru?: unknown;
}
