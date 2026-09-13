import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanDocumentEntity } from './loan-document.entity';
import { UpsertLoanDocumentDto } from './dto/upsert-loan-document.dto';

export interface LoanDocumentDto {
  id: string;
  loanId: string;
  kind: 'utama' | 'lain';
  fileName: string;
  mimeType: string;
  size: number;
  blobBase64: string;
}

function toDto(entity: LoanDocumentEntity): LoanDocumentDto {
  return {
    id: entity.id,
    loanId: entity.loanId,
    kind: entity.kind,
    fileName: entity.fileName,
    mimeType: entity.mimeType,
    size: entity.size,
    blobBase64: entity.blob.toString('base64')
  };
}

@Injectable()
export class LoanDocumentService {
  constructor(
    @InjectRepository(LoanDocumentEntity)
    private readonly repository: Repository<LoanDocumentEntity>
  ) {}

  async findAll(): Promise<LoanDocumentDto[]> {
    const entities = await this.repository.find();
    return entities.map(toDto);
  }

  private async findEntity(id: string): Promise<LoanDocumentEntity> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Dokumen dengan id "${id}" tidak ditemukan.`);
    return entity;
  }

  async upsert(id: string, dto: UpsertLoanDocumentDto): Promise<LoanDocumentDto> {
    const entity = new LoanDocumentEntity();
    entity.id = id;
    entity.loanId = dto.loanId;
    entity.kind = dto.kind;
    entity.fileName = dto.fileName;
    entity.mimeType = dto.mimeType;
    entity.size = dto.size;
    entity.blob = Buffer.from(dto.blobBase64, 'base64');
    await this.repository.save(entity);
    return toDto(await this.findEntity(id));
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Dokumen dengan id "${id}" tidak ditemukan.`);
    }
  }
}
