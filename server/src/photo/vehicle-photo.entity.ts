import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('vehicle_photos')
export class VehiclePhotoEntity {
  @PrimaryColumn({ type: 'varchar', length: 45 })
  nibar!: string;

  @Column({ name: 'mime_type', type: 'varchar', default: 'image/jpeg' })
  mimeType!: string;

  @Column({ type: 'bytea' })
  blob!: Buffer;
}
