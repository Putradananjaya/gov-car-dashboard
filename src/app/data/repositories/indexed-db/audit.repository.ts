import { Injectable } from '@angular/core';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuditLog } from '../../../core/models/audit-log.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbAuditRepository implements AuditRepository {
  private store = new IndexedDbSignalStore('audit');

  public readonly ready = this.store.ready;
  public readonly entries = this.store.items;

  public async append(entry: Omit<AuditLog, 'id' | 'waktu'>): Promise<void> {
    const full: AuditLog = {
      ...entry,
      id: crypto.randomUUID(),
      waktu: new Date().toISOString()
    };
    await this.store.put(full);
  }
}
