import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Peran } from '../models/user.model';

/**
 * Satu sumber kebenaran matriks hak akses (dokumen v2, bagian 2.2).
 * Nama kemampuan mengikuti baris matriks apa adanya.
 */
export type Kemampuan =
  | 'aset.lihat' // Lihat daftar aset (superadmin: seluruh OPD, admin: OPD sendiri)
  | 'aset.ubah' // Tambah / ubah data BMD
  | 'aset.hapus' // Hapus aset (soft delete)
  | 'aset.hapusPermanen' // Hapus permanen
  | 'aset.impor' // Impor berkas Excel e-BMD
  | 'aset.ubahStatusOperasional' // Ubah kondisi & status operasional
  | 'peminjaman.ajukan' // Ajukan peminjaman
  | 'peminjaman.setujui' // Setujui / tolak peminjaman
  | 'servis.input' // Input riwayat servis & pajak
  | 'kerusakan.lapor' // Lapor kerusakan
  | 'aset.lihatDataSensitif' // Lihat nomor rangka & BPKB
  | 'laporan.cetak' // Cetak laporan resmi
  | 'pengguna.kelola' // Kelola pengguna & peran
  | 'audit.lihat' // Lihat jejak audit
  | 'sistem.resetBasisData'; // Setel ulang basis data

const MATRIKS_HAK_AKSES: Record<Kemampuan, Peran[]> = {
  'aset.lihat': ['superadmin', 'admin'],
  'aset.ubah': ['superadmin', 'admin'],
  'aset.hapus': ['superadmin', 'admin'],
  'aset.hapusPermanen': ['superadmin'],
  'aset.impor': ['superadmin', 'admin'],
  'aset.ubahStatusOperasional': ['superadmin', 'admin'],
  'peminjaman.ajukan': ['superadmin', 'admin', 'pegawai'],
  'peminjaman.setujui': ['superadmin', 'admin'],
  'servis.input': ['superadmin', 'admin'],
  'kerusakan.lapor': ['superadmin', 'admin', 'pegawai'],
  'aset.lihatDataSensitif': ['superadmin', 'admin'],
  'laporan.cetak': ['superadmin', 'admin'],
  'pengguna.kelola': ['superadmin'],
  'audit.lihat': ['superadmin'],
  'sistem.resetBasisData': ['superadmin']
};

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private authService = inject(AuthService);

  public can(kemampuan: Kemampuan): boolean {
    const peran = this.authService.peran();
    if (!peran) return false;
    return MATRIKS_HAK_AKSES[kemampuan].includes(peran);
  }
}
