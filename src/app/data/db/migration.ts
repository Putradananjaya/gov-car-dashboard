import { Car } from '../../core/models/car.model';
import { openBangliDb } from './database';
import { buildSeedFleet, buildSeedUsers } from './seed';
import { carToVehicleAsset, carToVehicleOperational } from './car-vehicle-mapper';

const LEGACY_CARS_KEY = 'bangli_cars';
const MIGRATION_TAHUN_ANGGARAN = 2026;
const MIGRATION_KODE_LOKASI = '20.00.00';
const MIGRATION_SUMBER_IMPOR_ID = 'legacy-migrasi-fase2';

function readLegacyCars(): Car[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_CARS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Car[]) : null;
  } catch {
    return null;
  }
}

function backupLegacyCars(): void {
  const raw = localStorage.getItem(LEGACY_CARS_KEY);
  if (!raw) return;
  localStorage.setItem(`${LEGACY_CARS_KEY}_backup_${Date.now()}`, raw);
  localStorage.removeItem(LEGACY_CARS_KEY);
}

/**
 * Migrasi/seed sekali-jalan, dijalankan sebelum repository manapun dibaca
 * (lihat provideAppInitializer di app.config.ts). Kalau store `assets` sudah
 * berisi data (migrasi/seed pernah jalan sebelumnya), fungsi ini tidak
 * melakukan apa pun.
 */
export async function migrateOrSeedDatabase(): Promise<void> {
  const db = await openBangliDb();

  const assetCount = await db.count('assets');
  if (assetCount === 0) {
    const legacyCars = readLegacyCars();

    const { assets, operational } = legacyCars
      ? {
          assets: legacyCars.map(car => carToVehicleAsset(car, MIGRATION_TAHUN_ANGGARAN, MIGRATION_KODE_LOKASI, MIGRATION_SUMBER_IMPOR_ID)),
          operational: legacyCars.map(car => carToVehicleOperational(car, 'sistem (migrasi fase 2)'))
        }
      : buildSeedFleet();

    const tx = db.transaction(['assets', 'operational'], 'readwrite');
    await Promise.all([
      ...assets.map(asset => tx.objectStore('assets').put(asset)),
      ...operational.map(op => tx.objectStore('operational').put(op)),
      tx.done
    ]);

    if (legacyCars) {
      backupLegacyCars();
    }
  }

  const userCount = await db.count('users');
  if (userCount === 0) {
    const users = buildSeedUsers();
    const tx = db.transaction('users', 'readwrite');
    await Promise.all([...users.map(user => tx.store.put(user)), tx.done]);
  }
}
