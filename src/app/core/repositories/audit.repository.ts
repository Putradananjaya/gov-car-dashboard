import { Signal } from '@angular/core';
import { AuditLog } from '../models/audit-log.model';

export abstract class AuditRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly entries: Signal<AuditLog[]>;

  public abstract append(entry: Omit<AuditLog, 'id' | 'waktu'>): Promise<void>;

  /** Muat ulang dari server — dipakai oleh DataSyncService supaya perubahan
   * dari pengguna/perangkat lain ikut tampil tanpa memuat ulang halaman. */
  public abstract refresh(): Promise<void>;
}
