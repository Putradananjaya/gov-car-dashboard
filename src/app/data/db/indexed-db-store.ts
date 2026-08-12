import { signal, Signal, WritableSignal } from '@angular/core';
import { StoreKey, StoreNames, StoreValue } from 'idb';
import { BangliDbSchema, openBangliDb } from './database';

/**
 * Bungkus satu object store IndexedDB dengan signal reaktif. Setiap mutasi
 * membaca ulang seluruh isi store ke signal — sederhana & benar untuk ukuran
 * data di aplikasi ini (puluhan-ratusan baris), lebih murah daripada risiko
 * bug patch-manual pada signal.
 */
export class IndexedDbSignalStore<Name extends StoreNames<BangliDbSchema>> {
  private readonly itemsSignal: WritableSignal<StoreValue<BangliDbSchema, Name>[]> = signal([]);

  /** Selesai setelah data pertama kali termuat dari IndexedDB. */
  public readonly ready: Promise<void>;

  constructor(private readonly storeName: Name) {
    this.ready = this.reload();
  }

  public get items(): Signal<StoreValue<BangliDbSchema, Name>[]> {
    return this.itemsSignal;
  }

  public async put(value: StoreValue<BangliDbSchema, Name>): Promise<void> {
    const db = await openBangliDb();
    await db.put(this.storeName, value);
    await this.reload();
  }

  public async putMany(values: StoreValue<BangliDbSchema, Name>[]): Promise<void> {
    if (values.length === 0) return;
    const db = await openBangliDb();
    const tx = db.transaction(this.storeName, 'readwrite');
    await Promise.all([...values.map(value => tx.store.put(value)), tx.done]);
    await this.reload();
  }

  public async delete(key: StoreKey<BangliDbSchema, Name>): Promise<void> {
    const db = await openBangliDb();
    await db.delete(this.storeName, key);
    await this.reload();
  }

  public async clear(): Promise<void> {
    const db = await openBangliDb();
    await db.clear(this.storeName);
    await this.reload();
  }

  public async count(): Promise<number> {
    const db = await openBangliDb();
    return db.count(this.storeName);
  }

  private async reload(): Promise<void> {
    const db = await openBangliDb();
    const all = await db.getAll(this.storeName);
    this.itemsSignal.set(all);
  }
}
