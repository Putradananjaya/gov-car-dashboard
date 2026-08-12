export type Peran = 'superadmin' | 'admin' | 'pegawai';

export interface User {
  id: string;
  nip: string; // identitas resmi ASN
  nama: string;
  jabatan: string;
  unitKerja: string; // OPD — dasar pembatasan data
  peran: Peran;
  aktif: boolean;
  passwordHash: string; // tidak pernah plaintext
  terakhirMasuk: string | null;
}
