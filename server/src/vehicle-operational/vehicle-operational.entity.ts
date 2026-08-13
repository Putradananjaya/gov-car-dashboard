import { Column, Entity, PrimaryColumn } from 'typeorm';

export type KondisiAset = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
export type StatusOperasional = 'Tersedia' | 'Dipinjam' | 'Servis' | 'Tidak Layak';

export interface Telemetri {
  lat: number;
  lng: number;
  kecepatan: number;
  levelBbm: number;
  sumber: 'simulasi' | 'perangkat';
  waktu: string;
}

@Entity('vehicle_operational')
export class VehicleOperationalEntity {
  @PrimaryColumn({ type: 'varchar', length: 45 })
  nibar!: string;

  @Column({ type: 'varchar' })
  kondisi!: KondisiAset;

  @Column({ type: 'varchar' })
  status!: StatusOperasional;

  @Column({ name: 'penanggung_jawab_id', type: 'varchar', nullable: true })
  penanggungJawabId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  telepon!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  telemetri!: Telemetri | null;

  @Column({ type: 'text' })
  catatan!: string;

  @Column({ name: 'diperbarui_pada', type: 'varchar' })
  diperbaruiPada!: string;

  @Column({ name: 'diperbarui_oleh', type: 'varchar' })
  diperbaruiOleh!: string;
}
