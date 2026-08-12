import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { UserRepository } from '../repositories/user.repository';
import { IndexedDbUserRepository } from '../../data/repositories/indexed-db/user.repository';
import { resetBangliDbConnection } from '../../data/db/database';
import { migrateOrSeedDatabase } from '../../data/db/migration';

const SUPERADMIN_NIP = '196801011990031001';
const SUPERADMIN_PASSWORD = 'Superadmin#123';
const ADMIN_NIP = '198203152010012005';
const ADMIN_PASSWORD = 'Admin#123';
const PEGAWAI_NIP = '199005202015031002';
const PEGAWAI_PASSWORD = 'Pegawai#123';

describe('PermissionService', () => {
  let authService: AuthService;
  let permissionService: PermissionService;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    await resetBangliDbConnection();
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase('pusaka-bangli');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    await migrateOrSeedDatabase();

    TestBed.configureTestingModule({
      providers: [{ provide: UserRepository, useClass: IndexedDbUserRepository }]
    });
    await TestBed.inject(UserRepository).ready;
    authService = TestBed.inject(AuthService);
    permissionService = TestBed.inject(PermissionService);
  });

  it('denies everything when nobody is logged in', () => {
    expect(permissionService.can('aset.lihat')).toBe(false);
    expect(permissionService.can('peminjaman.ajukan')).toBe(false);
  });

  it('grants superadmin full access, including system-only capabilities', () => {
    authService.login(SUPERADMIN_NIP, SUPERADMIN_PASSWORD);

    expect(permissionService.can('aset.lihat')).toBe(true);
    expect(permissionService.can('aset.hapusPermanen')).toBe(true);
    expect(permissionService.can('pengguna.kelola')).toBe(true);
    expect(permissionService.can('audit.lihat')).toBe(true);
    expect(permissionService.can('sistem.resetBasisData')).toBe(true);
  });

  it('grants admin asset management but not system-level capabilities', () => {
    authService.login(ADMIN_NIP, ADMIN_PASSWORD);

    expect(permissionService.can('aset.lihat')).toBe(true);
    expect(permissionService.can('aset.ubah')).toBe(true);
    expect(permissionService.can('peminjaman.setujui')).toBe(true);
    expect(permissionService.can('aset.hapusPermanen')).toBe(false);
    expect(permissionService.can('pengguna.kelola')).toBe(false);
    expect(permissionService.can('audit.lihat')).toBe(false);
    expect(permissionService.can('sistem.resetBasisData')).toBe(false);
  });

  it('restricts pegawai to self-service capabilities only', () => {
    authService.login(PEGAWAI_NIP, PEGAWAI_PASSWORD);

    expect(permissionService.can('peminjaman.ajukan')).toBe(true);
    expect(permissionService.can('kerusakan.lapor')).toBe(true);
    expect(permissionService.can('aset.lihat')).toBe(false);
    expect(permissionService.can('aset.ubah')).toBe(false);
    expect(permissionService.can('aset.hapus')).toBe(false);
    expect(permissionService.can('laporan.cetak')).toBe(false);
    expect(permissionService.can('sistem.resetBasisData')).toBe(false);
  });
});
