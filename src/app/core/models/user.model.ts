export type Peran = 'superadmin' | 'admin' | 'pegawai' | 'pejabat_penatausahaan' | 'pimpinan';

export interface User {
  id: string;
  nip: string; // identitas resmi ASN
  nama: string;
  jabatan: string;
  unitKerja: string; // OPD — dasar pembatasan data
  peran: Peran;
  aktif: boolean;
  // Sejak auth pindah backend-only, field ini tidak lagi terisi/dibaca lewat
  // UserRepository — dibiarkan opsional supaya seed IndexedDB lama (tidak
  // lagi dipakai auth) tetap type-compatible tanpa perlu diubah.
  passwordHash?: string;
  terakhirMasuk: string | null;
  /**
   * Waktu akun dihapus (soft delete). Hanya terisi pada daftar arsip
   * (`UserRepository.usersTerhapus`) — akun di `users` selalu null, karena
   * yang sudah dihapus tidak pernah ikut terkirim ke sana.
   */
  dihapusPada?: string | null;
}
