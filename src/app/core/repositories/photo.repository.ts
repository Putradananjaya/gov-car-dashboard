import { Signal } from '@angular/core';

export interface VehiclePhoto {
  nibar: string;
  blob: Blob;
}

export abstract class PhotoRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly photos: Signal<VehiclePhoto[]>;

  public abstract findByNibar(nibar: string): VehiclePhoto | undefined;
  public abstract upsert(photo: VehiclePhoto): Promise<void>;
  public abstract remove(nibar: string): Promise<void>;
}
