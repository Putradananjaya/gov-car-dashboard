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
import { RolePermissionService } from '../role-permission/role-permission.service';
import { pulihkanBilaPernahDihapus } from '../common/soft-delete';

const STATUS_TERKUNCI: StatusPeminjaman[] = ['Diverifikasi', 'Disetujui', 'Berjalan', 'Ditolak', 'Selesai'];
const STATUS_MEMBLOKIR_JADWAL: StatusPeminjaman[] = ['Diajukan', 'Diverifikasi', 'Disetujui', 'Berjalan'];
/** Selama belum diserahterimakan, permohonan masih bisa ditolak. */
const STATUS_DAPAT_DITOLAK: StatusPeminjaman[] = ['Diajukan', 'Diverifikasi', 'Disetujui'];

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(LoanEntity)
    private readonly repository: Repository<LoanEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(VehicleOperationalEntity)
    private readonly operationalRepository: Repository<VehicleOperationalEntity>,
    private readonly rolePermissionService: RolePermissionService
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
    await pulihkanBilaPernahDihapus(this.repository, { id });

    const entity = new LoanEntity();
    Object.assign(entity, dto);
    entity.id = id;
    await this.repository.save(entity);
    return this.findOne(id);
  }

  /**
   * Soft delete — barisnya tetap ada di Postgres. Peminjaman yang "dihapus"
   * juga berhenti memblokir jadwal kendaraan, karena `assertNoScheduleConflict`
   * memakai QueryBuilder yang ikut menyaring baris terhapus.
   */
  async remove(id: string): Promise<void> {
    const result = await this.repository.softDelete({ id });
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

  /**
   * Langkah 2 SOP — Pengurus Barang memeriksa ketersediaan kendaraan. Ini
   * BUKAN persetujuan: keluarannya rekomendasi "tersedia", lalu permohonan
   * diteruskan ke Pejabat Penatausahaan untuk disetujui (langkah 3).
   */
  async verifikasi(id: string, actorId: string): Promise<LoanEntity> {
    const loan = await this.findOne(id);
    if (loan.status !== 'Diajukan') {
      throw new BadRequestException(`Tidak dapat memverifikasi peminjaman berstatus "${loan.status}".`);
    }
    await this.assertNoScheduleConflict(loan.nibar, loan.rencanaMulai, loan.rencanaSelesai, loan.id);

    loan.status = 'Diverifikasi';
    loan.diverifikasiOleh = await this.namaAktor(actorId);
    await this.repository.save(loan);
    return this.findOne(id);
  }

  /** Langkah 3 SOP — persetujuan elektronik oleh Pejabat Penatausahaan. */
  async setujui(id: string, actorId: string): Promise<LoanEntity> {
    const loan = await this.findOne(id);
    if (loan.status !== 'Diverifikasi') {
      throw new BadRequestException(
        `Permohonan harus diverifikasi ketersediaannya lebih dulu — status sekarang "${loan.status}".`
      );
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
    if (!STATUS_DAPAT_DITOLAK.includes(loan.status)) {
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
    // Langkah 5-6 SOP: pemohon mengembalikan kendaraan, petugas yang
    // berwenang serah terima memeriksa kondisi akhir. Keduanya sah, dan
    // sisi petugas kini mengikuti matriks hak akses, bukan daftar peran tetap.
    const isOwner = loan.pemohonId === requesterId;
    const isPetugas = await this.rolePermissionService.boleh(requesterPeran, ['peminjaman.serahTerima']);
    if (!isOwner && !isPetugas) {
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
