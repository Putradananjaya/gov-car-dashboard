import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  waktu!: string;

  @Column({ name: 'pelaku_id', type: 'varchar' })
  pelakuId!: string;

  @Column({ name: 'pelaku_nama', type: 'varchar' })
  pelakuNama!: string;

  @Column({ type: 'varchar' })
  aksi!: string;

  @Index()
  @Column({ type: 'varchar' })
  entitas!: string;

  @Column({ name: 'entitas_id', type: 'varchar' })
  entitasId!: string;

  @Column({ name: 'nilai_lama', type: 'jsonb', nullable: true })
  nilaiLama!: unknown;

  @Column({ name: 'nilai_baru', type: 'jsonb', nullable: true })
  nilaiBaru!: unknown;
}
