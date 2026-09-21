import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { EntitasSoftDelete } from '../common/soft-delete';

export type JenisDokumenPeminjaman = 'utama' | 'lain';

@Entity('loan_documents')
export class LoanDocumentEntity extends EntitasSoftDelete {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Index()
  @Column({ name: 'loan_id', type: 'varchar' })
  loanId!: string;

  @Column({ type: 'varchar' })
  kind!: JenisDokumenPeminjaman;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar' })
  mimeType!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'bytea' })
  blob!: Buffer;
}
