import { Column, Entity, PrimaryColumn } from 'typeorm';

export type Peran = 'superadmin' | 'admin' | 'pegawai';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar', unique: true })
  nip!: string;

  @Column({ type: 'varchar' })
  nama!: string;

  @Column({ type: 'varchar' })
  jabatan!: string;

  @Column({ name: 'unit_kerja', type: 'varchar' })
  unitKerja!: string;

  @Column({ type: 'varchar' })
  peran!: Peran;

  @Column({ type: 'boolean' })
  aktif!: boolean;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ name: 'terakhir_masuk', type: 'varchar', nullable: true })
  terakhirMasuk!: string | null;
}
