import { hashSync } from 'bcryptjs';
import { User } from '../../core/models/user.model';
import { VehicleAsset } from '../../core/models/vehicle-asset.model';
import { VehicleOperational } from '../../core/models/vehicle-operational.model';
import { generateLegacyCars } from './legacy-car-generator';
import { carToVehicleAsset, carToVehicleOperational } from './car-vehicle-mapper';

const SEED_TAHUN_ANGGARAN = 2026;
const SEED_KODE_LOKASI = '20.00.00';
const SEED_SUMBER_IMPOR_ID = 'seed-demo-fase2';

export function buildSeedFleet(): { assets: VehicleAsset[]; operational: VehicleOperational[] } {
  const cars = generateLegacyCars();
  return {
    assets: cars.map(car => carToVehicleAsset(car, SEED_TAHUN_ANGGARAN, SEED_KODE_LOKASI, SEED_SUMBER_IMPOR_ID)),
    operational: cars.map(car => carToVehicleOperational(car, 'sistem (data bawaan)'))
  };
}

/**
 * Akun contoh untuk pengembangan lokal (belum ada backend sungguhan).
 * NIP / kata sandi (jangan ditampilkan di UI publik, hanya untuk QA):
 *   superadmin — 196801011990031001 / Superadmin#123
 *   admin      — 198203152010012005 / Admin#123
 *   pegawai    — 199005202015031002 / Pegawai#123
 */
export function buildSeedUsers(): User[] {
  return [
    {
      id: 'user-superadmin-1',
      nip: '196801011990031001',
      nama: 'I Wayan Sudiarta',
      jabatan: 'Kepala Badan',
      unitKerja: 'Badan Keuangan, Pendapatan dan Aset Daerah',
      peran: 'superadmin',
      aktif: true,
      passwordHash: hashSync('Superadmin#123', 10),
      terakhirMasuk: null
    },
    {
      id: 'user-admin-1',
      nip: '198203152010012005',
      nama: 'Ni Made Suryani',
      jabatan: 'Pengurus Barang',
      unitKerja: 'Dinas Pekerjaan Umum & Penataan Ruang',
      peran: 'admin',
      aktif: true,
      passwordHash: hashSync('Admin#123', 10),
      terakhirMasuk: null
    },
    {
      id: 'user-pegawai-1',
      nip: '199005202015031002',
      nama: 'I Ketut Ardika',
      jabatan: 'Staf Pelaksana',
      unitKerja: 'Dinas Kesehatan',
      peran: 'pegawai',
      aktif: true,
      passwordHash: hashSync('Pegawai#123', 10),
      terakhirMasuk: null
    }
  ];
}
