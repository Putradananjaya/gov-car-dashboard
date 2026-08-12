import 'fake-indexeddb/auto';
import { openBangliDb, resetBangliDbConnection } from './database';
import { migrateOrSeedDatabase } from './migration';
import { Car } from '../../core/models/car.model';

const LEGACY_CAR: Car = {
  id: 'legacy-car-1',
  plateNumber: 'DK 9999 ZZ',
  model: 'Avanza',
  brand: 'Toyota',
  type: 'MPV',
  agency: 'Dinas Kesehatan',
  driverName: 'Legacy Driver',
  driverPhone: '0812-1111-2222',
  status: 'Aktif',
  fuelLevel: 88,
  speed: 0,
  x: 0,
  y: 0,
  routeProgress: 0,
  routeId: 0,
  acquisitionYear: 2019,
  lastServiceDate: '2026-01-01',
  nextServiceDate: '2026-07-01',
  stnkActive: true,
  price: 200000000
};

describe('migrateOrSeedDatabase', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetBangliDbConnection();
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase('pusaka-bangli');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('seeds default demo data when there is no legacy localStorage and no existing IndexedDB data', async () => {
    await migrateOrSeedDatabase();

    const db = await openBangliDb();
    const assetCount = await db.count('assets');
    const operationalCount = await db.count('operational');
    const userCount = await db.count('users');

    expect(assetCount).toBeGreaterThan(0);
    expect(operationalCount).toBe(assetCount);
    expect(userCount).toBe(3);
  });

  it('migrates legacy localStorage Car[] data and backs it up', async () => {
    localStorage.setItem('bangli_cars', JSON.stringify([LEGACY_CAR]));

    await migrateOrSeedDatabase();

    const db = await openBangliDb();
    const asset = await db.get('assets', 'legacy-car-1');
    expect(asset?.nomorPolisi).toBe('DK 9999 ZZ');

    expect(localStorage.getItem('bangli_cars')).toBeNull();
    const backupKey = Object.keys(localStorage).find(key => key.startsWith('bangli_cars_backup_'));
    expect(backupKey).toBeDefined();
  });

  it('does nothing on a second run once data already exists', async () => {
    await migrateOrSeedDatabase();
    const db = await openBangliDb();
    const firstCount = await db.count('assets');

    await migrateOrSeedDatabase();
    const secondCount = await db.count('assets');

    expect(secondCount).toBe(firstCount);
  });
});
