import { Signal } from '@angular/core';
import { ServiceRecord } from '../models/service-record.model';

export abstract class ServiceRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly records: Signal<ServiceRecord[]>;

  public abstract findByNibar(nibar: string): ServiceRecord[];
  public abstract upsert(record: ServiceRecord): Promise<void>;
  public abstract remove(id: string): Promise<void>;
}
