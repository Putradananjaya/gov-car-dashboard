import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashSync } from 'bcryptjs';
import { UserEntity } from '../user/user.entity';

/**
 * Akun sesuai struktur organisasi Badan Keuangan, Pendapatan dan Aset
 * Daerah Kabupaten Bangli (per bidang) — kata sandi awal mengikuti pola
 * "{Peran}#123" per peran, WAJIB diganti oleh masing-masing pengguna
 * setelah login pertama kali (lihat fitur "Setel Ulang Kata Sandi" di
 * Manajemen Pengguna).
 */
const DEMO_ACCOUNTS = [
  {
    id: 'user-pemohon-pdrl',
    nip: '198307112010012027',
    nama: 'Ni Made Pitriani',
    jabatan: 'Staf Bidang PDRL',
    unitKerja: 'Bidang PDRL',
    peran: 'pegawai' as const,
    password: 'Pegawai#123'
  },
  {
    id: 'user-pemohon-anggaran',
    nip: '197901012005011026',
    nama: 'I Putu Mertayasa',
    jabatan: 'Staf Bidang Anggaran',
    unitKerja: 'Bidang Anggaran',
    peran: 'pegawai' as const,
    password: 'Pegawai#123'
  },
  {
    id: 'user-kabid-aset',
    nip: '198009182010011021',
    nama: 'Sang Kompiang Gde Suyastawan',
    jabatan: 'Kepala Bidang Aset',
    unitKerja: 'Bidang Aset',
    peran: 'superadmin' as const,
    password: 'Superadmin#123'
  },
  {
    id: 'user-pemohon-pembukuan',
    nip: '198307162009022003',
    nama: 'Ni Putu Tentamini',
    jabatan: 'Staf Bidang Pembukuan',
    unitKerja: 'Bidang Pembukuan',
    peran: 'pegawai' as const,
    password: 'Pegawai#123'
  },
  {
    id: 'user-pemohon-perbendaharaan',
    nip: '197106122000031004',
    nama: 'I Made Anom Wiranata',
    jabatan: 'Staf Bidang Perbendaharaan',
    unitKerja: 'Bidang Perbendaharaan',
    peran: 'pegawai' as const,
    password: 'Pegawai#123'
  },
  {
    id: 'user-pemohon-pbb',
    nip: '198411302010011022',
    nama: 'Edwin Kristinata',
    jabatan: 'Staf Bidang PBB',
    unitKerja: 'Bidang PBB',
    peran: 'pegawai' as const,
    password: 'Pegawai#123'
  },
  {
    id: 'user-pengurus-barang',
    nip: '198303232010011043',
    nama: 'I Wayan Busmartana',
    jabatan: 'Pengurus Barang',
    unitKerja: 'Sekretariat Badan Keuangan, Pendapatan dan Aset Daerah',
    peran: 'admin' as const,
    password: 'Admin#123'
  },
  {
    id: 'user-pejabat-penatausahaan',
    nip: '198301172010011019',
    nama: 'I Nengah Witra Dana',
    jabatan: 'Pejabat Penatausahaan Pengguna Barang',
    unitKerja: 'Badan Keuangan, Pendapatan dan Aset Daerah',
    peran: 'pejabat_penatausahaan' as const,
    password: 'Penatausahaan#123'
  },
  {
    id: 'user-pimpinan',
    nip: '197612102009021003',
    nama: 'Putu Agus Muliawan',
    jabatan: 'Kepala Badan',
    unitKerja: 'Badan Keuangan, Pendapatan dan Aset Daerah',
    peran: 'pimpinan' as const,
    password: 'Pimpinan#123'
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
