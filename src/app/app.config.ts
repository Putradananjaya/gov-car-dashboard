import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { CarRepository } from './core/repositories/car.repository';
import { CarCompatRepository } from './data/repositories/indexed-db/car-compat.repository';
import { UserRepository } from './core/repositories/user.repository';
import { IndexedDbUserRepository } from './data/repositories/indexed-db/user.repository';
import { VehicleAssetRepository } from './core/repositories/vehicle-asset.repository';
import { IndexedDbVehicleAssetRepository } from './data/repositories/indexed-db/vehicle-asset.repository';
import { VehicleOperationalRepository } from './core/repositories/vehicle-operational.repository';
import { IndexedDbVehicleOperationalRepository } from './data/repositories/indexed-db/vehicle-operational.repository';
import { LoanRepository } from './core/repositories/loan.repository';
import { IndexedDbLoanRepository } from './data/repositories/indexed-db/loan.repository';
import { ServiceRepository } from './core/repositories/service.repository';
import { IndexedDbServiceRepository } from './data/repositories/indexed-db/service.repository';
import { AuditRepository } from './core/repositories/audit.repository';
import { IndexedDbAuditRepository } from './data/repositories/indexed-db/audit.repository';
import { migrateOrSeedDatabase } from './data/db/migration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: CarRepository, useClass: CarCompatRepository },
    { provide: UserRepository, useClass: IndexedDbUserRepository },
    { provide: VehicleAssetRepository, useClass: IndexedDbVehicleAssetRepository },
    { provide: VehicleOperationalRepository, useClass: IndexedDbVehicleOperationalRepository },
    { provide: LoanRepository, useClass: IndexedDbLoanRepository },
    { provide: ServiceRepository, useClass: IndexedDbServiceRepository },
    { provide: AuditRepository, useClass: IndexedDbAuditRepository },
    // Pastikan skema/migrasi/seed IndexedDB & semua repository selesai memuat
    // SEBELUM navigasi/guard pertama jalan — menghindari race AuthService
    // membaca UserRepository yang masih kosong saat halaman di-reload.
    //
    // inject() hanya boleh dipanggil secara sinkron dalam konteks injeksi —
    // begitu melewati satu `await`, konteksnya hilang (NG0203). Karena
    // migrateOrSeedDatabase() harus selesai LEBIH DULU (baru repository boleh
    // dibuat, supaya baca pertamanya tidak balapan dengan tulis migrasi/seed),
    // injector ditangkap di awal lalu dipakai ulang lewat runInInjectionContext.
    provideAppInitializer(() => {
      const injector = inject(EnvironmentInjector);

      return migrateOrSeedDatabase().then(() =>
        runInInjectionContext(injector, () => {
          const repositories = [
            inject(UserRepository),
            inject(VehicleAssetRepository),
            inject(VehicleOperationalRepository),
            inject(LoanRepository),
            inject(ServiceRepository),
            inject(AuditRepository)
          ];
          return Promise.all(repositories.map(repository => repository.ready));
        })
      );
    })
  ]
};
