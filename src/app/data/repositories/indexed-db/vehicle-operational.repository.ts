import { Injectable } from '@angular/core';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { VehicleOperational } from '../../../core/models/vehicle-operational.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbVehicleOperationalRepository implements VehicleOperationalRepository {
  private store = new IndexedDbSignalStore('operational');

  public readonly ready = this.store.ready;
  public readonly operational = this.store.items;

  public findByNibar(nibar: string): VehicleOperational | undefined {
    return this.operational().find(o => o.nibar === nibar);
  }

  public upsert(operational: VehicleOperational): Promise<void> {
    return this.store.put(operational);
  }

  public remove(nibar: string): Promise<void> {
    return this.store.delete(nibar);
  }
}
