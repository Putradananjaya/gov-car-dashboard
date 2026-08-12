import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/user.repository';
import { IndexedDbUserRepository } from '../../data/repositories/indexed-db/user.repository';
import { resetBangliDbConnection } from '../../data/db/database';
import { migrateOrSeedDatabase } from '../../data/db/migration';

// NIP/kata sandi akun contoh, lihat data/db/seed.ts
const SUPERADMIN_NIP = '196801011990031001';
const SUPERADMIN_PASSWORD = 'Superadmin#123';
const PEGAWAI_NIP = '199005202015031002';
const PEGAWAI_PASSWORD = 'Pegawai#123';

describe('AuthService', () => {
  let authService: AuthService;

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
  });

  it('starts logged out when no session exists', () => {
    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.currentUser()).toBeNull();
  });

  it('logs in with valid NIP and password', () => {
    const result = authService.login(SUPERADMIN_NIP, SUPERADMIN_PASSWORD);

    expect(result.ok).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.peran()).toBe('superadmin');
  });

  it('rejects an unknown NIP with a generic reason', () => {
    const result = authService.login('000000000000000000', 'apa-saja');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('invalid');
    expect(authService.isLoggedIn()).toBe(false);
  });

  it('rejects a wrong password with a generic reason', () => {
    const result = authService.login(SUPERADMIN_NIP, 'salah-sekali');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('invalid');
  });

  it('locks the account after 5 failed attempts', () => {
    for (let i = 0; i < 4; i++) {
      const result = authService.login(PEGAWAI_NIP, 'salah');
      expect(result.ok === false && result.reason).toBe('invalid');
    }

    const fifth = authService.login(PEGAWAI_NIP, 'salah');
    expect(fifth.ok).toBe(false);
    expect(fifth.ok === false && fifth.reason).toBe('locked');

    // Percobaan berikutnya, walau kata sandi benar, tetap ditolak karena terkunci.
    const sixth = authService.login(PEGAWAI_NIP, PEGAWAI_PASSWORD);
    expect(sixth.ok).toBe(false);
    expect(sixth.ok === false && sixth.reason).toBe('locked');
  });

  it('logs out and clears the session', () => {
    authService.login(SUPERADMIN_NIP, SUPERADMIN_PASSWORD);
    expect(authService.isLoggedIn()).toBe(true);

    authService.logout();

    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.currentUser()).toBeNull();
  });
});
