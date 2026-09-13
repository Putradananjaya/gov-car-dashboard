import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AuditLogEntity } from './audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>
  ) {}

  findAll(): Promise<AuditLogEntity[]> {
    return this.repository.find();
  }

  async append(dto: CreateAuditLogDto): Promise<AuditLogEntity> {
    const entity = new AuditLogEntity();
    entity.id = randomUUID();
    entity.waktu = new Date().toISOString();
    entity.pelakuId = dto.pelakuId;
    entity.pelakuNama = dto.pelakuNama;
    entity.aksi = dto.aksi;
    entity.entitas = dto.entitas;
    entity.entitasId = dto.entitasId;
    entity.nilaiLama = dto.nilaiLama ?? null;
    entity.nilaiBaru = dto.nilaiBaru ?? null;
    return this.repository.save(entity);
  }
}
