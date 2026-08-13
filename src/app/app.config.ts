import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { CarRepository } from './core/repositories/car.repository';
import { CarCompatRepository } from './data/repositories/indexed-db/car-compat.repository';
import { UserRepository } from './core/repositories/user.repository';
import { IndexedDbUserRepository } from './data/repositories/indexed-db/user.repository';
import { VehicleAssetRepository } from './core/repositories/vehicle-asset.repository';
import { HttpVehicleAssetRepository } from './data/repositories/http/vehicle-asset.repository';
import { VehicleOperationalRepository } from './core/repositories/vehicle-operational.repository';
import { HttpVehicleOperationalRepository } from './data/repositories/http/vehicle-operational.repository';
import { LoanRepository } from './core/repositories/loan.repository';
import { IndexedDbLoanRepository } from './data/repositories/indexed-db/loan.repository';
import { ServiceRepository } from './core/repositories/service.repository';
import { IndexedDbServiceRepository } from './data/repositories/indexed-db/service.repository';
import { AuditRepository } from './core/repositories/audit.repository';
import { IndexedDbAuditRepository } from './data/repositories/indexed-db/audit.repository';
import { ImportBatchRepository } from './core/repositories/import-batch.repository';
import { IndexedDbImportBatchRepository } from './data/repositories/indexed-db/import-batch.repository';
import { PhotoRepository } from './core/repositories/photo.repository';
import { IndexedDbPhotoRepository } from './data/repositories/indexed-db/photo.repository';
import { migrateOrSeedDatabase } from './data/db/migration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: CarRepository, useClass: CarCompatRepository },
    { provide: UserRepository, useClass: IndexedDbUserRepository },
    // Fase 5c: aset & data operasional sekarang backend-only (Postgres via
    // Railway), bukan lagi IndexedDB per-browser — momen ini dipilih karena
    // backend akhirnya benar-benar online (sebelumnya sengaja ditunda di
    // Fase 5a/5b supaya dev lokal murni tidak butuh backend berjalan).
    { provide: VehicleAssetRepository, useClass: HttpVehicleAssetRepository },
    { provide: VehicleOperationalRepository, useClass: HttpVehicleOperationalRepository },
    { provide: LoanRepository, useClass: IndexedDbLoanRepository },
    { provide: ServiceRepository, useClass: IndexedDbServiceRepository },
    { provide: AuditRepository, useClass: IndexedDbAuditRepository },
    { provide: ImportBatchRepository, useClass: IndexedDbImportBatchRepository },
    { provide: PhotoRepository, useClass: IndexedDbPhotoRepository },
    // Pastikan skema/migrasi/seed IndexedDB & semua repository selesai memuat
    // SEBELUM navigasi/guard pertama jalan — plus pulihkan sesi login (kalau
    // ada cookie refresh token valid) lewat AuthService.refresh(), supaya
    // authGuard/roleGuard tidak salah menganggap pengguna belum masuk saat
    // halaman baru saja di-reload (Fase 5b — auth sekarang backend-only,
    // AuthService tidak lagi bergantung UserRepository).
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
            inject(AuditRepository),
            inject(ImportBatchRepository),
            inject(PhotoRepository)
          ];
          const authService = inject(AuthService);
          return Promise.all([...repositories.map(repository => repository.ready), authService.refresh()]);
        })
      );
    })
  ]
};
