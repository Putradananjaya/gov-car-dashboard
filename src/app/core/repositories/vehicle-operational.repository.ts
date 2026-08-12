import { Signal } from '@angular/core';
import { VehicleOperational } from '../models/vehicle-operational.model';

export abstract class VehicleOperationalRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly operational: Signal<VehicleOperational[]>;

  public abstract findByNibar(nibar: string): VehicleOperational | undefined;
  public abstract upsert(operational: VehicleOperational): Promise<void>;
  public abstract remove(nibar: string): Promise<void>;
}
