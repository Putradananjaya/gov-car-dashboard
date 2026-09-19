import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { Peran } from '../user/user.entity';

/**
 * Satu baris per kemampuan, berisi daftar peran yang diizinkan.
 *
 * Disimpan sebagai JSON lewat transformer, bukan `simple-array`, karena
 * `simple-array` mengubah daftar kosong menjadi `['']` saat dibaca kembali —
 * dan daftar kosong adalah kondisi yang sah di sini (kemampuan yang dicabut
 * dari semua peran non-superadmin).
 */
@Entity('role_permissions')
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'varchar' })
  kemampuan!: string;

  @Column({
    type: 'text',
    transformer: {
      to: (value: Peran[] | null): string => JSON.stringify(value ?? []),
      from: (value: string | null): Peran[] => {
        if (!value) return [];
        try {
          const hasil: unknown = JSON.parse(value);
          return Array.isArray(hasil) ? (hasil as Peran[]) : [];
        } catch {
          return [];
        }
      }
    }
  })
  peran!: Peran[];
}
