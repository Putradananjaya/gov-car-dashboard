import { SetMetadata } from '@nestjs/common';
import type { Kemampuan } from '../role-permission/kemampuan';

export const IZIN_KEY = 'izin';

/**
 * Menjaga endpoint dengan kemampuan dari matriks hak akses, bukan daftar peran
 * yang dikunci di kode. Pengaturan superadmin di Manajemen Pengguna langsung
 * berlaku di sini — menggantikan penjagaan berbasis daftar peran yang dulu dikunci di kode.
 *
 * Diberi lebih dari satu kemampuan berarti "cukup salah satu".
 */
export const ButuhIzin = (...kemampuan: Kemampuan[]) => SetMetadata(IZIN_KEY, kemampuan);
