import { IsObject } from 'class-validator';

export class UpdateRolePermissionDto {
  /**
   * Peta kemampuan → daftar peran. Kunci yang tidak dikenal dan peran yang
   * tidak sah disaring di service, jadi klien lama tidak membuat permintaan
   * gagal seluruhnya hanya karena satu kunci asing.
   */
  @IsObject()
  matriks!: Record<string, string[]>;
}
