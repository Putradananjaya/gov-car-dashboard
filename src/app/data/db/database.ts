import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { VehicleAsset } from '../../core/models/vehicle-asset.model';
import { VehicleOperational } from '../../core/models/vehicle-operational.model';
import { Loan } from '../../core/models/loan.model';
import { ServiceRecord } from '../../core/models/service-record.model';
import { User } from '../../core/models/user.model';
import { AuditLog } from '../../core/models/audit-log.model';

const DB_NAME = 'pusaka-bangli';
const DB_VERSION = 1;

export interface BangliDbSchema extends DBSchema {
  assets: {
    key: string; // nibar
    value: VehicleAsset;
    indexes: { kodeBarang: string; nomorPolisi: string; statusPenggunaan: string };
  };
  operational: {
    key: string; // nibar
    value: VehicleOperational;
  };
  loans: {
    key: string; // id
    value: Loan;
    indexes: { nibar: string; pemohonId: string; status: string };
  };
  services: {
    key: string; // id
    value: ServiceRecord;
    indexes: { nibar: string };
  };
  users: {
    key: string; // id
    value: User;
    indexes: { nip: string };
  };
  audit: {
    key: string; // id
    value: AuditLog;
  };
  // Belum dipakai sampai Fase 3 (impor Excel e-BMD), disiapkan sekarang
  // supaya tidak perlu migrasi versi skema lagi nanti.
  photos: {
    key: string; // nibar
    value: { nibar: string; blob: Blob };
  };
  imports: {
    key: string; // batchId
    value: { batchId: string; [key: string]: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<BangliDbSchema>> | null = null;

export function openBangliDb(): Promise<IDBPDatabase<BangliDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<BangliDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const assets = db.createObjectStore('assets', { keyPath: 'nibar' });
        assets.createIndex('kodeBarang', 'kodeBarang.full');
        assets.createIndex('nomorPolisi', 'nomorPolisi');
        assets.createIndex('statusPenggunaan', 'statusPenggunaan');

        db.createObjectStore('operational', { keyPath: 'nibar' });

        const loans = db.createObjectStore('loans', { keyPath: 'id' });
        loans.createIndex('nibar', 'nibar');
        loans.createIndex('pemohonId', 'pemohonId');
        loans.createIndex('status', 'status');

        const services = db.createObjectStore('services', { keyPath: 'id' });
        services.createIndex('nibar', 'nibar');

        const users = db.createObjectStore('users', { keyPath: 'id' });
        users.createIndex('nip', 'nip');

        db.createObjectStore('audit', { keyPath: 'id' });
        db.createObjectStore('photos', { keyPath: 'nibar' });
        db.createObjectStore('imports', { keyPath: 'batchId' });
      }
    });
  }
  return dbPromise;
}

/**
 * Hanya untuk pengujian: tutup koneksi yang sedang terbuka (kalau ada) dan
 * paksa koneksi berikutnya membuka ulang database. Menutup koneksi lama itu
 * penting — kalau tidak, `indexedDB.deleteDatabase()` di test berikutnya akan
 * menggantung menunggu event `blocked` yang tidak pernah ditangani.
 */
export async function resetBangliDbConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
}
