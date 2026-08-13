import { Injectable, Signal, computed } from '@angular/core';
import { ImportBatchRepository } from '../../../core/repositories/import-batch.repository';
import { ImportBatch } from '../../../core/models/import-batch.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbImportBatchRepository implements ImportBatchRepository {
  private store = new IndexedDbSignalStore('imports');

  public readonly ready = this.store.ready;
  public readonly batches: Signal<ImportBatch[]> = computed(() => this.store.items() as unknown as ImportBatch[]);

  public findById(batchId: string): ImportBatch | undefined {
    return this.batches().find(b => b.batchId === batchId);
  }

  public upsert(batch: ImportBatch): Promise<void> {
    return this.store.put(batch as unknown as { batchId: string; [key: string]: unknown });
  }
}
