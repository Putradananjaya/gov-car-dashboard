import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { compareSync, hashSync } from 'bcryptjs';
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
  /** Terisi hanya pada daftar arsip (`findTerhapus`); null untuk akun aktif. */
  dihapusPada: string | null;
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
    terakhirMasuk: entity.terakhirMasuk,
    dihapusPada: entity.dihapusPada?.toISOString() ?? null
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>
  ) {}

  /** Hanya akun yang belum dihapus — TypeORM menyaring sendiri lewat `@DeleteDateColumn`. */
  async findAll(): Promise<UserDto[]> {
    const entities = await this.repository.find();
    return entities.map(toDto);
  }

  /** Arsip: akun yang sudah dihapus, untuk ditinjau atau dipulihkan kembali. */
  async findTerhapus(): Promise<UserDto[]> {
    const entities = await this.repository.find({
      where: { dihapusPada: Not(IsNull()) },
      withDeleted: true
    });
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
    // `withDeleted` penting: kolom `nip` unique, jadi akun yang sudah dihapus
    // tetap memegang NIP-nya. Tanpa ini pesannya jadi "NIP sudah terdaftar"
    // untuk akun yang tidak kelihatan di mana pun — buntu tanpa petunjuk.
    const existing = await this.repository.findOne({ where: { nip: dto.nip }, withDeleted: true });
    if (existing?.dihapusPada) {
      throw new ConflictException(
        `NIP "${dto.nip}" milik akun yang sudah dihapus (${existing.nama}). ` +
          'Pulihkan akun itu dari arsip "Pengguna Terhapus" daripada membuat akun baru.'
      );
    }
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

  /**
   * `actorId` adalah superadmin yang sedang masuk. Kata sandi lama yang
   * dikirim diperiksa terhadap miliknya sendiri, bukan milik `id` yang
   * disetel ulang — pemilik akun target justru sedang tidak bisa masuk,
   * itulah sebabnya sandinya disetel ulang.
   */
  async resetPassword(id: string, dto: ResetPasswordDto, actorId: string): Promise<UserDto> {
    const aktor = await this.repository.findOneBy({ id: actorId });
    if (!aktor || !aktor.aktif) {
      throw new UnauthorizedException('Sesi Anda tidak lagi sah. Masuk ulang lalu coba lagi.');
    }
    if (!compareSync(dto.kataSandiLama, aktor.passwordHash)) {
      throw new UnauthorizedException('Kata sandi Anda salah. Setel ulang dibatalkan.');
    }

    const entity = await this.findEntity(id);
    entity.passwordHash = hashSync(dto.password, 10);
    await this.repository.save(entity);
    return toDto(entity);
  }

  /**
   * Menghapus akun = soft delete. Barisnya tetap di tabel `users` lengkap
   * dengan NIP dan riwayatnya, hanya berhenti ikut terbaca — termasuk oleh
   * `AuthService`, jadi akun yang dihapus otomatis tidak bisa masuk lagi dan
   * refresh token miliknya ditolak pada rotasi berikutnya.
   *
   * Jejak peminjaman tidak ikut terbawa: `loans.pemohon` menyimpan snapshot
   * data pemohon, bukan join ke tabel ini, jadi riwayat permohonan tetap utuh
   * dan terbaca walau akunnya sudah dihapus.
   */
  async softDelete(id: string, actorId: string): Promise<UserDto> {
    if (id === actorId) {
      throw new BadRequestException('Tidak bisa menghapus akun Anda sendiri.');
    }

    const entity = await this.findEntity(id);
    // Menghapus = sekaligus menonaktifkan, jadi penjaga superadmin terakhir
    // berlaku sama persis seperti saat akun dinonaktifkan lewat `update`.
    await this.assertNotLastActiveSuperadmin(id, entity.peran, false);

    await this.repository.softDelete({ id });
    return toDto(await this.findEntityTerhapus(id));
  }

  /** Kebalikan `softDelete` — akun kembali terbaca, statusnya seperti sebelum dihapus. */
  async restore(id: string): Promise<UserDto> {
    const entity = await this.findEntityTerhapus(id);
    if (!entity.dihapusPada) {
      throw new BadRequestException(`Pengguna "${entity.nama}" tidak sedang dalam keadaan terhapus.`);
    }

    await this.repository.restore({ id });
    return toDto(await this.findEntity(id));
  }

  /** Seperti `findEntity`, tapi ikut melihat baris yang sudah dihapus. */
  private async findEntityTerhapus(id: string): Promise<UserEntity> {
    const entity = await this.repository.findOne({ where: { id }, withDeleted: true });
    if (!entity) throw new NotFoundException(`Pengguna dengan id "${id}" tidak ditemukan.`);
    return entity;
  }
}
