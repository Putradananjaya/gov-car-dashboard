import { Injectable } from '@angular/core';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleAsset } from '../../../core/models/vehicle-asset.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbVehicleAssetRepository implements VehicleAssetRepository {
  private store = new IndexedDbSignalStore('assets');

  public readonly ready = this.store.ready;
  public readonly assets = this.store.items;

  public findByNibar(nibar: string): VehicleAsset | undefined {
    return this.assets().find(a => a.nibar === nibar);
  }

  public upsert(asset: VehicleAsset): Promise<void> {
    return this.store.put(asset);
  }

  public remove(nibar: string): Promise<void> {
    return this.store.delete(nibar);
  }

  public softDelete(nibar: string): Promise<void> {
    const asset = this.findByNibar(nibar);
    if (!asset) return Promise.resolve();
    return this.store.put({ ...asset, dihapusPada: new Date().toISOString() });
  }
}
