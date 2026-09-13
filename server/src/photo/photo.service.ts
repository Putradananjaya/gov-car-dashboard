import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclePhotoEntity } from './vehicle-photo.entity';
import { UpsertVehiclePhotoDto } from './dto/upsert-vehicle-photo.dto';

export interface VehiclePhotoDto {
  nibar: string;
  mimeType: string;
  blobBase64: string;
}

function toDto(entity: VehiclePhotoEntity): VehiclePhotoDto {
  return {
    nibar: entity.nibar,
    mimeType: entity.mimeType,
    blobBase64: entity.blob.toString('base64')
  };
}

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(VehiclePhotoEntity)
    private readonly repository: Repository<VehiclePhotoEntity>
  ) {}

  async findAll(): Promise<VehiclePhotoDto[]> {
    const entities = await this.repository.find();
    return entities.map(toDto);
  }

  private async findEntity(nibar: string): Promise<VehiclePhotoEntity> {
    const entity = await this.repository.findOneBy({ nibar });
    if (!entity) throw new NotFoundException(`Foto untuk NIBAR "${nibar}" tidak ditemukan.`);
    return entity;
  }

  async upsert(nibar: string, dto: UpsertVehiclePhotoDto): Promise<VehiclePhotoDto> {
    const entity = new VehiclePhotoEntity();
    entity.nibar = nibar;
    entity.mimeType = dto.mimeType;
    entity.blob = Buffer.from(dto.blobBase64, 'base64');
    await this.repository.save(entity);
    return toDto(await this.findEntity(nibar));
  }

  async remove(nibar: string): Promise<void> {
    const result = await this.repository.delete({ nibar });
    if (result.affected === 0) {
      throw new NotFoundException(`Foto untuk NIBAR "${nibar}" tidak ditemukan.`);
    }
  }
}
