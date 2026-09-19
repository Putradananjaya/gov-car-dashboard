import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DataSyncService } from './data-sync.service';
import { AuthService } from '../../core/auth/auth.service';
import { VehicleAssetRepository } from '../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../core/repositories/loan.repository';
import { UserRepository } from '../../core/repositories/user.repository';
import { ServiceRepository } from '../../core/repositories/service.repository';
import { AuditRepository } from '../../core/repositories/audit.repository';
import { RolePermissionRepository } from '../../core/repositories/role-permission.repository';

/** Repository palsu yang hanya mencatat berapa kali refresh() dipanggil. */
function buatRepositoryPalsu() {
  const state = { hitung: 0, tahan: null as null | (() => void) };
  return {
    state,
    refresh(): Promise<void> {
      state.hitung++;
      if (state.tahan) return new Promise<void>(resolve => (state.tahan = resolve));
      return Promise.resolve();
    }
  };
}

describe('DataSyncService', () => {
  let service: DataSyncService;
  let isLoggedIn: ReturnType<typeof signal<boolean>>;
  let aset: ReturnType<typeof buatRepositoryPalsu>;
  let operasional: ReturnType<typeof buatRepositoryPalsu>;
  let peminjaman: ReturnType<typeof buatRepositoryPalsu>;
  let pengguna: ReturnType<typeof buatRepositoryPalsu>;
  let servis: ReturnType<typeof buatRepositoryPalsu>;
  let audit: ReturnType<typeof buatRepositoryPalsu>;
  let hakAkses: ReturnType<typeof buatRepositoryPalsu>;

  beforeEach(() => {
    isLoggedIn = signal(true);
    aset = buatRepositoryPalsu();
    operasional = buatRepositoryPalsu();
    peminjaman = buatRepositoryPalsu();
    pengguna = buatRepositoryPalsu();
    servis = buatRepositoryPalsu();
    audit = buatRepositoryPalsu();
    hakAkses = buatRepositoryPalsu();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn } },
        { provide: Router, useValue: { events: new Subject() } },
        { provide: VehicleAssetRepository, useValue: aset },
        { provide: VehicleOperationalRepository, useValue: operasional },
        { provide: LoanRepository, useValue: peminjaman },
        { provide: UserRepository, useValue: pengguna },
        { provide: ServiceRepository, useValue: servis },
        { provide: AuditRepository, useValue: audit },
        { provide: RolePermissionRepository, useValue: hakAkses }
      ]
    });

    service = TestBed.inject(DataSyncService);
  });

  it('tidak menarik data apa pun saat pengguna belum login', async () => {
    isLoggedIn.set(false);
    await service.sinkron(true);

    expect(aset.state.hitung).toBe(0);
    expect(peminjaman.state.hitung).toBe(0);
  });

  it('menarik data inti dan mencatat waktu sinkronisasi', async () => {
    await service.sinkron(true);

    expect(aset.state.hitung).toBe(1);
    expect(operasional.state.hitung).toBe(1);
    expect(peminjaman.state.hitung).toBe(1);
    // Matriks hak akses ikut putaran cepat supaya perubahan izin lekas terasa.
    expect(hakAkses.state.hitung).toBe(1);
    expect(service.terakhirSinkron()).not.toBeNull();
  });

  it('menyertakan koleksi berat hanya pada sinkronisasi penuh', async () => {
    await service.sinkron(true);
    expect(pengguna.state.hitung).toBe(1);
    expect(audit.state.hitung).toBe(1);

    // Putaran berikutnya masih dalam jeda dua menit — koleksi berat dilewati.
    await service.sinkron(false);
    expect(aset.state.hitung).toBe(2);
    expect(pengguna.state.hitung).toBe(1);
    expect(audit.state.hitung).toBe(1);
  });

  it('meredam pemicu beruntun dari fokus/navigasi', async () => {
    service.picu();
    await Promise.resolve();
    service.picu();
    service.picu();
    await Promise.resolve();

    // Pemicu kedua dan ketiga jatuh di dalam jeda minimum, jadi diabaikan.
    expect(aset.state.hitung).toBe(1);
  });

  it('mengabaikan permintaan baru selama sinkronisasi masih berjalan', async () => {
    aset.state.tahan = () => undefined;
    const berjalan = service.sinkron(true);

    await service.sinkron(true);
    expect(operasional.state.hitung).toBe(1);

    aset.state.tahan?.();
    await berjalan;
  });

  it('tetap menyelesaikan koleksi lain saat satu koleksi gagal', async () => {
    peminjaman.refresh = () => Promise.reject(new Error('jaringan putus'));

    await service.sinkron(true);

    expect(aset.state.hitung).toBe(1);
    expect(operasional.state.hitung).toBe(1);
    expect(service.terakhirSinkron()).not.toBeNull();
  });
});
