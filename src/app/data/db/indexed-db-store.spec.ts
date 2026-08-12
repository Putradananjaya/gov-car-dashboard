import 'fake-indexeddb/auto';
import { IndexedDbSignalStore } from './indexed-db-store';
import { resetBangliDbConnection } from './database';

describe('IndexedDbSignalStore', () => {
  beforeEach(async () => {
    await resetBangliDbConnection();
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase('pusaka-bangli');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('starts empty and resolves ready once loaded', async () => {
    const store = new IndexedDbSignalStore('audit');
    await store.ready;
    expect(store.items()).toEqual([]);
  });

  it('put() persists a row and updates the signal', async () => {
    const store = new IndexedDbSignalStore('audit');
    await store.ready;

    await store.put({ id: 'a1', waktu: '2026-01-01T00:00:00.000Z', pelakuId: 'u1', pelakuNama: 'Tester', aksi: 'tambah', entitas: 'VehicleAsset', entitasId: 'car-1' });

    expect(store.items().length).toBe(1);
    expect(store.items()[0].id).toBe('a1');
  });

  it('delete() removes a row', async () => {
    const store = new IndexedDbSignalStore('audit');
    await store.ready;
    await store.put({ id: 'a1', waktu: '2026-01-01T00:00:00.000Z', pelakuId: 'u1', pelakuNama: 'Tester', aksi: 'tambah', entitas: 'VehicleAsset', entitasId: 'car-1' });

    await store.delete('a1');

    expect(store.items()).toEqual([]);
  });

  it('a second store instance on the same object store sees persisted data after reload', async () => {
    const first = new IndexedDbSignalStore('audit');
    await first.ready;
    await first.put({ id: 'a1', waktu: '2026-01-01T00:00:00.000Z', pelakuId: 'u1', pelakuNama: 'Tester', aksi: 'tambah', entitas: 'VehicleAsset', entitasId: 'car-1' });

    const second = new IndexedDbSignalStore('audit');
    await second.ready;

    expect(second.items().length).toBe(1);
  });
});
