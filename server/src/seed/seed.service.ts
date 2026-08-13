import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashSync } from 'bcryptjs';
import { UserEntity } from '../user/user.entity';

/**
 * Akun demo identik dengan src/app/data/db/seed.ts (Angular) — NIP/kata
 * sandi sengaja sama supaya login sungguhan (backend) berperilaku sama
 * seperti demo lokal sebelumnya.
 */
const DEMO_ACCOUNTS = [
  {
    id: 'user-superadmin-1',
    nip: '196801011990031001',
    nama: 'I Wayan Sudiarta',
    jabatan: 'Kepala Badan',
    unitKerja: 'Badan Keuangan, Pendapatan dan Aset Daerah',
    peran: 'superadmin' as const,
    password: 'Superadmin#123'
  },
  {
    id: 'user-admin-1',
    nip: '198203152010012005',
    nama: 'Ni Made Suryani',
    jabatan: 'Pengurus Barang',
    unitKerja: 'Dinas Pekerjaan Umum & Penataan Ruang',
    peran: 'admin' as const,
    password: 'Admin#123'
  },
  {
    id: 'user-pegawai-1',
    nip: '199005202015031002',
    nama: 'I Ketut Ardika',
    jabatan: 'Staf Pelaksana',
    unitKerja: 'Dinas Kesehatan',
    peran: 'pegawai' as const,
    password: 'Pegawai#123'
  }
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(@InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>) {}

  async onModuleInit(): Promise<void> {
    const existingCount = await this.userRepository.count();
    if (existingCount > 0) return;

    for (const account of DEMO_ACCOUNTS) {
      await this.userRepository.save({
        id: account.id,
        nip: account.nip,
        nama: account.nama,
        jabatan: account.jabatan,
        unitKerja: account.unitKerja,
        peran: account.peran,
        aktif: true,
        passwordHash: hashSync(account.password, 10),
        terakhirMasuk: null
      });
    }
    this.logger.log(`Seed ${DEMO_ACCOUNTS.length} akun demo selesai.`);
  }
}
