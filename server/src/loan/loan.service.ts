import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanEntity, StatusPeminjaman } from './loan.entity';
import { UpsertLoanDto } from './dto/upsert-loan.dto';
import { SerahTerimaLoanDto } from './dto/serah-terima.dto';
import { TolakLoanDto } from './dto/tolak-loan.dto';
import { KembalikanLoanDto } from './dto/kembalikan-loan.dto';
import { UserEntity, Peran } from '../user/user.entity';
import { VehicleOperationalEntity } from '../vehicle-operational/vehicle-operational.entity';

const STATUS_TERKUNCI: StatusPeminjaman[] = ['Disetujui', 'Berjalan', 'Ditolak', 'Selesai'];
const STATUS_MEMBLOKIR_JADWAL: StatusPeminjaman[] = ['Diajukan', 'Disetujui', 'Berjalan'];

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(LoanEntity)
    private readonly repository: Repository<LoanEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(VehicleOperationalEntity)
    private readonly operationalRepository: Repository<VehicleOperationalEntity>
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
    if (STATUS_TERKUNCI.includes(dto.status)) {
      throw new BadRequestException('Gunakan endpoint aksi khusus untuk mengubah status peminjaman.');
    }
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

  async assertNoScheduleConflict(
    nibar: string,
    rencanaMulai: string,
    rencanaSelesai: string,
    excludeLoanId?: string
  ): Promise<void> {
    const qb = this.repository
      .createQueryBuilder('loan')
      .where('loan.nibar = :nibar', { nibar })
      .andWhere('loan.status IN (:...statuses)', { statuses: STATUS_MEMBLOKIR_JADWAL })
      .andWhere('loan.rencana_mulai <= :selesai', { selesai: rencanaSelesai })
      .andWhere('loan.rencana_selesai >= :mulai', { mulai: rencanaMulai });
    if (excludeLoanId) {
      qb.andWhere('loan.id != :id', { id: excludeLoanId });
    }
    const konflik = await qb.getOne();
    if (konflik) {
      throw new ConflictException(
        `Kendaraan sudah dijadwalkan pada rentang ${konflik.rencanaMulai} s/d ${konflik.rencanaSelesai} (status: ${konflik.status}).`
      );
    }
  }

  private async namaAktor(actorId: string): Promise<string> {
    const user = await this.userRepository.findOneBy({ id: actorId });
    return user?.nama ?? 'sistem';
  }

  private async flipStatusKendaraan(nibar: string, status: 'Dipinjam' | 'Tersedia', actorNama: string): Promise<void> {
    const operational = await this.operationalRepository.findOneBy({ nibar });
    if (!operational) return;
    operational.status = status;
    operational.diperbaruiPada = new Date().toISOString();
    operational.diperbaruiOleh = actorNama;
    await this.operationalRepository.save(operational);
  }

  async setujuiTahap1(id: string, actorId: string): Promise<LoanEntity> {
    const loan = await this.findOne(id);
    if (loan.status !== 'Diajukan') {
      throw new BadRequestException(`Tidak dapat menyetujui peminjaman berstatus "${loan.status}".`);
    }
    await this.assertNoScheduleConflict(loan.nibar, loan.rencanaMulai, loan.rencanaSelesai, loan.id);

    loan.status = 'Disetujui';
    loan.disetujuiOleh = await this.namaAktor(actorId);
    await this.repository.save(loan);
    return this.findOne(id);
  }

  async serahTerima(id: string, dto: SerahTerimaLoanDto, actorId: string): Promise<LoanEntity> {
    const loan = await this.findOne(id);
    if (loan.status !== 'Disetujui') {
      throw new BadRequestException(`Tidak dapat melakukan serah terima untuk status "${loan.status}".`);
    }
    if (!dto.kunciDiserahkan) {
      throw new BadRequestException('Konfirmasi serah terima kunci wajib dicentang.');
    }
    await this.assertNoScheduleConflict(loan.nibar, loan.rencanaMulai, loan.rencanaSelesai, loan.id);

    const actorNama = await this.namaAktor(actorId);
    loan.status = 'Berjalan';
    loan.odometerKeluar = dto.odometerKeluar;
    loan.bbmKeluar = dto.bbmKeluar;
    loan.kondisiKeluar = dto.kondisiKeluar;
    loan.catatanKondisiKeluar = dto.catatanKondisiKeluar ?? null;
    loan.kunciDiserahkanPada = new Date().toISOString();
    await this.repository.save(loan);

    await this.flipStatusKendaraan(loan.nibar, 'Dipinjam', actorNama);
    return this.findOne(id);
  }

  async tolak(id: string, dto: TolakLoanDto): Promise<LoanEntity> {
    const loan = await this.findOne(id);
    if (loan.status !== 'Diajukan' && loan.status !== 'Disetujui') {
      throw new BadRequestException(`Tidak dapat menolak peminjaman berstatus "${loan.status}".`);
    }
    loan.status = 'Ditolak';
    loan.catatanPenolakan = dto.catatanPenolakan;
    await this.repository.save(loan);
    return this.findOne(id);
  }

  async kembalikan(id: string, dto: KembalikanLoanDto, requesterId: string, requesterPeran: Peran): Promise<LoanEntity> {
    const loan = await this.findOne(id);
    if (loan.status !== 'Berjalan') {
      throw new BadRequestException(`Tidak dapat mengembalikan peminjaman berstatus "${loan.status}".`);
    }
    const isOwner = loan.pemohonId === requesterId;
    const isApprover = requesterPeran === 'admin' || requesterPeran === 'superadmin';
    if (!isOwner && !isApprover) {
      throw new ForbiddenException('Anda tidak berhak mengembalikan peminjaman ini.');
    }
    if (!dto.kunciDikembalikan) {
      throw new BadRequestException('Konfirmasi pengembalian kunci wajib dicentang.');
    }

    const actorNama = await this.namaAktor(requesterId);
    loan.status = 'Selesai';
    loan.realisasiKembali = new Date().toISOString().slice(0, 10);
    loan.odometerMasuk = dto.odometerMasuk;
    loan.bbmMasuk = dto.bbmMasuk;
    loan.kondisiMasuk = dto.kondisiMasuk;
    loan.catatanKondisiMasuk = dto.catatanKondisiMasuk ?? null;
    loan.kunciDikembalikanPada = new Date().toISOString();
    await this.repository.save(loan);

    await this.flipStatusKendaraan(loan.nibar, 'Tersedia', actorNama);
    return this.findOne(id);
  }
}
