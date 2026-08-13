import { Signal } from '@angular/core';
import { ImportBatch } from '../models/import-batch.model';

export abstract class ImportBatchRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly batches: Signal<ImportBatch[]>;

  public abstract findById(batchId: string): ImportBatch | undefined;
  public abstract upsert(batch: ImportBatch): Promise<void>;
}
