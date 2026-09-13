import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashSync } from 'bcryptjs';
import { UserEntity } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface UserDto {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  peran: UserEntity['peran'];
  aktif: boolean;
  terakhirMasuk: string | null;
}

function toDto(entity: UserEntity): UserDto {
  return {
    id: entity.id,
    nip: entity.nip,
    nama: entity.nama,
    jabatan: entity.jabatan,
    unitKerja: entity.unitKerja,
    peran: entity.peran,
    aktif: entity.aktif,
    terakhirMasuk: entity.terakhirMasuk
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>
  ) {}

  async findAll(): Promise<UserDto[]> {
    const entities = await this.repository.find();
    return entities.map(toDto);
  }

  private async findEntity(id: string): Promise<UserEntity> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Pengguna dengan id "${id}" tidak ditemukan.`);
    return entity;
  }

  /** Dokumen v2: superadmin aktif terakhir tidak boleh dinonaktifkan / diturunkan perannya. */
  private async assertNotLastActiveSuperadmin(id: string, peranBaru: UserEntity['peran'], aktifBaru: boolean): Promise<void> {
    const target = await this.repository.findOneBy({ id });
    if (!target || target.peran !== 'superadmin' || !target.aktif) return;
    if (peranBaru === 'superadmin' && aktifBaru) return;

    const otherActiveSuperadmins = await this.repository.count({ where: { peran: 'superadmin', aktif: true } });
    if (otherActiveSuperadmins <= 1) {
      throw new BadRequestException('Tidak bisa mengubah peran/menonaktifkan superadmin terakhir yang masih aktif.');
    }
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.repository.findOneBy({ nip: dto.nip });
    if (existing) throw new ConflictException(`NIP "${dto.nip}" sudah terdaftar.`);

    const entity = new UserEntity();
    entity.id = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    entity.nip = dto.nip;
    entity.nama = dto.nama;
    entity.jabatan = dto.jabatan;
    entity.unitKerja = dto.unitKerja;
    entity.peran = dto.peran;
    entity.aktif = true;
    entity.passwordHash = hashSync(dto.password, 10);
    entity.terakhirMasuk = null;

    await this.repository.save(entity);
    return toDto(entity);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const entity = await this.findEntity(id);
    await this.assertNotLastActiveSuperadmin(id, dto.peran, dto.aktif);

    entity.nama = dto.nama;
    entity.jabatan = dto.jabatan;
    entity.unitKerja = dto.unitKerja;
    entity.peran = dto.peran;
    entity.aktif = dto.aktif;

    await this.repository.save(entity);
    return toDto(entity);
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<UserDto> {
    const entity = await this.findEntity(id);
    entity.passwordHash = hashSync(dto.password, 10);
    await this.repository.save(entity);
    return toDto(entity);
  }
}
