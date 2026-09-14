import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  // ID dibuat di kode aplikasi (crypto.randomUUID()), bukan
  // @PrimaryGeneratedColumn('uuid') — itu butuh fungsi uuid_generate_v4()
  // dari ekstensi Postgres "uuid-ossp" yang belum tentu tersedia/boleh
  // diaktifkan di hosting bersama (mis. Dewaweb cPanel PostgreSQL).
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  /** SHA-256 dari token mentah — bukan bcrypt, token sudah berentropi tinggi. */
  @Column({ name: 'token_hash', type: 'varchar', unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
