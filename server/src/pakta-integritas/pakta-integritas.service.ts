import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { PaktaIntegritasEntity } from './pakta-integritas.entity';
import { UpsertPaktaIntegritasDto } from './dto/upsert-pakta-integritas.dto';
import { VehicleAssetEntity } from '../vehicle-asset/vehicle-asset.entity';

/** Sama dengan batas berkas dokumen peminjaman di frontend. */
export const MAKS_UKURAN_PAKTA = 5 * 1024 * 1024;

export interface PaktaIntegritasDto {
  nibar: string;
  pemegang: string;
  fileName: string;
  mimeType: string;
  size: number;
  diunggahPada: string;
  diunggahOleh: string;
}

export interface PaktaIntegritasBerkasDto extends PaktaIntegritasDto {
  blobBase64: string;
}

// Kolom `blob` bertanda select: false, jadi harus diminta eksplisit.
const KOLOM_DENGAN_BERKAS: FindOptionsSelect<PaktaIntegritasEntity> = {
  nibar: true,
  pemegang: true,
  fileName: true,
  mimeType: true,
  size: true,
  blob: true,
  diunggahPada: true,
  diunggahOleh: true
};

function toDto(entity: PaktaIntegritasEntity): PaktaIntegritasDto {
  return {
    nibar: entity.nibar,
    pemegang: entity.pemegang,
    fileName: entity.fileName,
    mimeType: entity.mimeType,
    size: entity.size,
    diunggahPada: new Date(entity.diunggahPada).toISOString(),
    diunggahOleh: entity.diunggahOleh
  };
}

@Injectable()
export class PaktaIntegritasService {
  constructor(
    @InjectRepository(PaktaIntegritasEntity)
    private readonly repository: Repository<PaktaIntegritasEntity>,
    @InjectRepository(VehicleAssetEntity)
    private readonly assetRepository: Repository<VehicleAssetEntity>
  ) {}

  async findAll(): Promise<PaktaIntegritasDto[]> {
    const entities = await this.repository.find();
    return entities.map(toDto);
  }

  async findBerkas(nibar: string): Promise<PaktaIntegritasBerkasDto> {
    const entity = await this.repository.findOne({ where: { nibar }, select: KOLOM_DENGAN_BERKAS });
    if (!entity) throw new NotFoundException(`Pakta integritas untuk NIBAR "${nibar}" tidak ditemukan.`);
    return { ...toDto(entity), blobBase64: entity.blob.toString('base64') };
  }

  async upsert(nibar: string, dto: UpsertPaktaIntegritasDto): Promise<PaktaIntegritasDto> {
    const asset = await this.assetRepository.findOneBy({ nibar });
    if (!asset || asset.dihapusPada) {
      throw new NotFoundException(`Aset dengan NIBAR "${nibar}" tidak ditemukan.`);
    }
    // Pakta hanya untuk kendaraan yang dibawa perorangan — nama pemegang
    // diambil dari data aset, bukan dari klien.
    if (asset.isOperasionalBersama || !asset.pemegang) {
      throw new BadRequestException('Kendaraan operasional bersama tidak memerlukan pakta integritas.');
    }

    const blob = Buffer.from(dto.blobBase64, 'base64');
    if (blob.length === 0) throw new BadRequestException('Berkas pakta integritas kosong.');
    if (blob.length > MAKS_UKURAN_PAKTA) throw new BadRequestException('Ukuran berkas pakta integritas maksimal 5MB.');

    const entity = new PaktaIntegritasEntity();
    entity.nibar = nibar;
    entity.pemegang = asset.pemegang;
    entity.fileName = dto.fileName;
    entity.mimeType = dto.mimeType;
    entity.size = blob.length;
    entity.blob = blob;
    entity.diunggahPada = new Date();
    entity.diunggahOleh = dto.diunggahOleh;
    await this.repository.save(entity);
    return toDto(entity);
  }

  async remove(nibar: string): Promise<void> {
    const result = await this.repository.delete({ nibar });
    if (result.affected === 0) {
      throw new NotFoundException(`Pakta integritas untuk NIBAR "${nibar}" tidak ditemukan.`);
    }
  }
}
