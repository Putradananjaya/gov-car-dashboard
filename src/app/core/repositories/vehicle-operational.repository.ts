import { Signal } from '@angular/core';
import { VehicleOperational } from '../models/vehicle-operational.model';

export abstract class VehicleOperationalRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly operational: Signal<VehicleOperational[]>;

  public abstract findByNibar(nibar: string): VehicleOperational | undefined;
  public abstract upsert(operational: VehicleOperational): Promise<void>;
  public abstract remove(nibar: string): Promise<void>;

  /** Muat ulang dari server — dipakai setelah aksi lain (mis. serah-terima/kembalikan peminjaman) mengubah status kendaraan di backend tanpa lewat `upsert()` di repository ini. */
  public abstract refresh(): Promise<void>;
}
