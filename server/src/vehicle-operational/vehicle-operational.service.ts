import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleOperationalEntity } from './vehicle-operational.entity';
import { UpsertVehicleOperationalDto } from './dto/upsert-vehicle-operational.dto';

@Injectable()
export class VehicleOperationalService {
  constructor(
    @InjectRepository(VehicleOperationalEntity)
    private readonly repository: Repository<VehicleOperationalEntity>
  ) {}

  findAll(): Promise<VehicleOperationalEntity[]> {
    return this.repository.find();
  }

  async findOne(nibar: string): Promise<VehicleOperationalEntity> {
    const entity = await this.repository.findOneBy({ nibar });
    if (!entity) {
      throw new NotFoundException(`Data operasional untuk NIBAR "${nibar}" tidak ditemukan.`);
    }
    return entity;
  }

  async upsert(nibar: string, dto: UpsertVehicleOperationalDto): Promise<VehicleOperationalEntity> {
    const entity = new VehicleOperationalEntity();
    entity.nibar = nibar;
    entity.kondisi = dto.kondisi;
    entity.status = dto.status;
    entity.penanggungJawabId = dto.penanggungJawabId ?? null;
    entity.telepon = dto.telepon ?? null;
    entity.telemetri = dto.telemetri ?? null;
    entity.catatan = dto.catatan;
    entity.diperbaruiPada = dto.diperbaruiPada;
    entity.diperbaruiOleh = dto.diperbaruiOleh;
    await this.repository.save(entity);
    return this.findOne(nibar);
  }

  async remove(nibar: string): Promise<void> {
    const result = await this.repository.delete({ nibar });
    if (result.affected === 0) {
      throw new NotFoundException(`Data operasional untuk NIBAR "${nibar}" tidak ditemukan.`);
    }
  }
}
