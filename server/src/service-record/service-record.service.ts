import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRecordEntity } from './service-record.entity';
import { UpsertServiceRecordDto } from './dto/upsert-service-record.dto';

@Injectable()
export class ServiceRecordService {
  constructor(
    @InjectRepository(ServiceRecordEntity)
    private readonly repository: Repository<ServiceRecordEntity>
  ) {}

  findAll(): Promise<ServiceRecordEntity[]> {
    return this.repository.find();
  }

  async findOne(id: string): Promise<ServiceRecordEntity> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Riwayat servis dengan id "${id}" tidak ditemukan.`);
    return entity;
  }

  async upsert(id: string, dto: UpsertServiceRecordDto): Promise<ServiceRecordEntity> {
    const entity = new ServiceRecordEntity();
    Object.assign(entity, dto);
    entity.id = id;
    await this.repository.save(entity);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Riwayat servis dengan id "${id}" tidak ditemukan.`);
    }
  }
}
