import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Pakta integritas pemegang kendaraan perorangan (bukan kendaraan operasional
 * bersama). Satu berkas aktif per kendaraan; unggah ulang menimpa berkas lama.
 */
@Entity('pakta_integritas')
export class PaktaIntegritasEntity {
  @PrimaryColumn({ type: 'varchar', length: 45 })
  nibar!: string;

  /** Nama pemegang saat berkas diunggah — dipakai untuk menandai pakta yang sudah tidak sesuai bila pemegang berganti. */
  @Column({ type: 'varchar' })
  pemegang!: string;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar' })
  mimeType!: string;

  @Column({ type: 'int' })
  size!: number;

  /** Tidak ikut dimuat di daftar — isi berkas hanya diambil saat dibuka. */
  @Column({ type: 'bytea', select: false })
  blob!: Buffer;

  @Column({ name: 'diunggah_pada', type: 'timestamptz' })
  diunggahPada!: Date;

  @Column({ name: 'diunggah_oleh', type: 'varchar' })
  diunggahOleh!: string;
}
