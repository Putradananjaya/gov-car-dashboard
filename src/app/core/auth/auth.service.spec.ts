import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';
import { API_BASE_URL } from '../config/api.config';

const SAMPLE_USER: User = {
  id: 'user-superadmin-1',
  nip: '196801011990031001',
  nama: 'I Wayan Sudiarta',
  jabatan: 'Kepala Badan',
  unitKerja: 'Badan Keuangan, Pendapatan dan Aset Daerah',
  peran: 'superadmin',
  aktif: true,
  passwordHash: '',
  terakhirMasuk: null
};

describe('AuthService', () => {
  let authService: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('starts logged out', () => {
    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.currentUser()).toBeNull();
    expect(authService.peran()).toBeNull();
    expect(authService.getAccessToken()).toBeNull();
  });

  it('login success sets accessToken + currentUser, stores refreshToken, and returns {ok:true}', async () => {
    const loginPromise = authService.login('196801011990031001', 'Superadmin#123');

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nip: '196801011990031001', password: 'Superadmin#123' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accessToken: 'token-abc', refreshToken: 'refresh-abc', user: SAMPLE_USER });

    const result = await loginPromise;
    expect(result).toEqual({ ok: true });
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.currentUser()).toEqual(SAMPLE_USER);
    expect(authService.peran()).toBe('superadmin');
    expect(authService.getAccessToken()).toBe('token-abc');
    expect(sessionStorage.getItem('pusaka_bangli_refresh_token')).toBe('refresh-abc');
  });

  it('login with wrong password returns {ok:false, reason:"invalid"}', async () => {
    const loginPromise = authService.login('196801011990031001', 'salah');

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    req.flush({ reason: 'invalid', message: 'NIP atau kata sandi tidak sesuai' }, { status: 401, statusText: 'Unauthorized' });

    const result = await loginPromise;
    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(authService.isLoggedIn()).toBe(false);
  });

  it('login while locked returns {ok:false, reason:"locked", retryAfterMs}', async () => {
    const loginPromise = authService.login('196801011990031001', 'salah');

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    req.flush({ reason: 'locked', retryAfterMs: 900000 }, { status: 401, statusText: 'Unauthorized' });

    const result = await loginPromise;
    expect(result).toEqual({ ok: false, reason: 'locked', retryAfterMs: 900000 });
  });

  it('login on network/server failure returns {ok:false, reason:"error"}', async () => {
    const loginPromise = authService.login('196801011990031001', 'Superadmin#123');

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    req.flush({ message: 'Internal error' }, { status: 500, statusText: 'Internal Server Error' });

    const result = await loginPromise;
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('refresh() restores session from a valid stored refresh token', async () => {
    const refreshPromise = authService.refresh();

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accessToken: 'token-xyz', refreshToken: 'refresh-xyz', user: SAMPLE_USER });

    await refreshPromise;
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.getAccessToken()).toBe('token-xyz');
    expect(sessionStorage.getItem('pusaka_bangli_refresh_token')).toBe('refresh-xyz');
  });

  it('refresh() with no valid session silently leaves the user logged out (not an error)', async () => {
    const refreshPromise = authService.refresh();

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/refresh`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await refreshPromise;
    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.getAccessToken()).toBeNull();
  });

  it('deduplicates concurrent refresh() calls into a single HTTP request', async () => {
    const first = authService.refresh();
    const second = authService.refresh();

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/refresh`);
    req.flush({ accessToken: 'token-dedup', refreshToken: 'refresh-dedup', user: SAMPLE_USER });

    await Promise.all([first, second]);
    expect(authService.getAccessToken()).toBe('token-dedup');
  });

  it('logout() sends the stored refreshToken and clears local session state + storage', async () => {
    const loginPromise = authService.login('196801011990031001', 'Superadmin#123');
    httpMock
      .expectOne(`${API_BASE_URL}/auth/login`)
      .flush({ accessToken: 'token-abc', refreshToken: 'refresh-abc', user: SAMPLE_USER });
    await loginPromise;
    expect(authService.isLoggedIn()).toBe(true);

    const logoutPromise = authService.logout();
    const req = httpMock.expectOne(`${API_BASE_URL}/auth/logout`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-abc' });
    req.flush({ ok: true });
    await logoutPromise;

    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.currentUser()).toBeNull();
    expect(authService.getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('pusaka_bangli_refresh_token')).toBeNull();
  });
});
