import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { EntitasSoftDelete } from '../common/soft-delete';

export type SumberServis = 'impor' | 'input-manual';

@Entity('service_records')
export class ServiceRecordEntity extends EntitasSoftDelete {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  nibar!: string;

  @Column({ type: 'int' })
  tahun!: number;

  @Column({ type: 'text' })
  uraian!: string;

  @Column({ name: 'odometer_km', type: 'int', nullable: true })
  odometerKm!: number | null;

  @Column({ type: 'double precision', nullable: true })
  biaya!: number | null;

  @Column({ type: 'varchar', nullable: true })
  tanggal!: string | null;

  @Column({ type: 'varchar' })
  sumber!: SumberServis;
}
