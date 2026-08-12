import { Injectable } from '@angular/core';
import { ServiceRepository } from '../../../core/repositories/service.repository';
import { ServiceRecord } from '../../../core/models/service-record.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbServiceRepository implements ServiceRepository {
  private store = new IndexedDbSignalStore('services');

  public readonly ready = this.store.ready;
  public readonly records = this.store.items;

  public findByNibar(nibar: string): ServiceRecord[] {
    return this.records().filter(r => r.nibar === nibar);
  }

  public upsert(record: ServiceRecord): Promise<void> {
    return this.store.put(record);
  }

  public remove(id: string): Promise<void> {
    return this.store.delete(id);
  }
}
