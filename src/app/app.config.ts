import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { CarRepository } from './core/repositories/car.repository';
import { CarCompatRepository } from './data/repositories/indexed-db/car-compat.repository';
import { UserRepository } from './core/repositories/user.repository';
import { HttpUserRepository } from './data/repositories/http/user.repository';
import { VehicleAssetRepository } from './core/repositories/vehicle-asset.repository';
import { HttpVehicleAssetRepository } from './data/repositories/http/vehicle-asset.repository';
import { VehicleOperationalRepository } from './core/repositories/vehicle-operational.repository';
import { HttpVehicleOperationalRepository } from './data/repositories/http/vehicle-operational.repository';
import { LoanRepository } from './core/repositories/loan.repository';
import { HttpLoanRepository } from './data/repositories/http/loan.repository';
import { ServiceRepository } from './core/repositories/service.repository';
import { HttpServiceRepository } from './data/repositories/http/service.repository';
import { AuditRepository } from './core/repositories/audit.repository';
import { HttpAuditRepository } from './data/repositories/http/audit.repository';
import { ImportBatchRepository } from './core/repositories/import-batch.repository';
import { IndexedDbImportBatchRepository } from './data/repositories/indexed-db/import-batch.repository';
import { PhotoRepository } from './core/repositories/photo.repository';
import { HttpPhotoRepository } from './data/repositories/http/photo.repository';
import { LoanDocumentRepository } from './core/repositories/loan-document.repository';
import { HttpLoanDocumentRepository } from './data/repositories/http/loan-document.repository';
import { migrateOrSeedDatabase } from './data/db/migration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: CarRepository, useClass: CarCompatRepository },
    // Fase 5c: aset & data operasional pindah backend-only (Postgres via
    // Railway) lebih dulu; fase berikutnya (migrasi go-live) memindahkan
    // User/Loan/LoanDocument/Audit/Service/Photo dengan pola yang sama —
    // IndexedDB tidak lagi dipakai untuk keenamnya (data harus sinkron
    // lintas pengguna/perangkat, bukan cuma tersimpan per-browser).
    { provide: UserRepository, useClass: HttpUserRepository },
    { provide: VehicleAssetRepository, useClass: HttpVehicleAssetRepository },
    { provide: VehicleOperationalRepository, useClass: HttpVehicleOperationalRepository },
    { provide: LoanRepository, useClass: HttpLoanRepository },
    { provide: ServiceRepository, useClass: HttpServiceRepository },
    { provide: AuditRepository, useClass: HttpAuditRepository },
    { provide: ImportBatchRepository, useClass: IndexedDbImportBatchRepository },
    { provide: PhotoRepository, useClass: HttpPhotoRepository },
    { provide: LoanDocumentRepository, useClass: HttpLoanDocumentRepository },
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
            inject(PhotoRepository),
            inject(LoanDocumentRepository)
          ];
          const authService = inject(AuthService);
          return Promise.all([...repositories.map(repository => repository.ready), authService.refresh()]);
        })
      );
    })
  ]
};
