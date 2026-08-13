import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('login_attempts')
export class LoginAttemptEntity {
  @PrimaryColumn({ type: 'varchar' })
  nip!: string;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;
}
