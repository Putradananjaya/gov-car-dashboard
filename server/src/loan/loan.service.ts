import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanEntity } from './loan.entity';
import { UpsertLoanDto } from './dto/upsert-loan.dto';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(LoanEntity)
    private readonly repository: Repository<LoanEntity>
  ) {}

  findAll(): Promise<LoanEntity[]> {
    return this.repository.find();
  }

  async findOne(id: string): Promise<LoanEntity> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Peminjaman dengan id "${id}" tidak ditemukan.`);
    return entity;
  }

  async upsert(id: string, dto: UpsertLoanDto): Promise<LoanEntity> {
    const entity = new LoanEntity();
    Object.assign(entity, dto);
    entity.id = id;
    await this.repository.save(entity);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Peminjaman dengan id "${id}" tidak ditemukan.`);
    }
  }
}
