import { Injectable } from '@angular/core';
import { PhotoRepository, VehiclePhoto } from '../../../core/repositories/photo.repository';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbPhotoRepository implements PhotoRepository {
  private store = new IndexedDbSignalStore('photos');

  public readonly ready = this.store.ready;
  public readonly photos = this.store.items;

  public findByNibar(nibar: string): VehiclePhoto | undefined {
    return this.photos().find(p => p.nibar === nibar);
  }

  public upsert(photo: VehiclePhoto): Promise<void> {
    return this.store.put(photo);
  }

  public remove(nibar: string): Promise<void> {
    return this.store.delete(nibar);
  }
}
