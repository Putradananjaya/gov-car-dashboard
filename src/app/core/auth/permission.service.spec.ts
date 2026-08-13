import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { User, Peran } from '../models/user.model';
import { API_BASE_URL } from '../config/api.config';

function buildUser(peran: Peran): User {
  return {
    id: `user-${peran}-1`,
    nip: '000000000000000000',
    nama: 'Pengguna Uji',
    jabatan: 'Jabatan Uji',
    unitKerja: 'Unit Uji',
    peran,
    aktif: true,
    passwordHash: '',
    terakhirMasuk: null
  };
}

describe('PermissionService', () => {
  let authService: AuthService;
  let permissionService: PermissionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    authService = TestBed.inject(AuthService);
    permissionService = TestBed.inject(PermissionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function loginAs(peran: Peran): Promise<void> {
    const loginPromise = authService.login('000000000000000000', 'password-uji');
    httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush({ accessToken: 'token-uji', user: buildUser(peran) });
    await loginPromise;
  }

  it('denies everything when nobody is logged in', () => {
    expect(permissionService.can('aset.lihat')).toBe(false);
    expect(permissionService.can('peminjaman.ajukan')).toBe(false);
  });

  it('grants superadmin full access, including system-only capabilities', async () => {
    await loginAs('superadmin');

    expect(permissionService.can('aset.lihat')).toBe(true);
    expect(permissionService.can('aset.hapusPermanen')).toBe(true);
    expect(permissionService.can('pengguna.kelola')).toBe(true);
    expect(permissionService.can('audit.lihat')).toBe(true);
    expect(permissionService.can('sistem.resetBasisData')).toBe(true);
  });

  it('grants admin asset management but not system-level capabilities', async () => {
    await loginAs('admin');

    expect(permissionService.can('aset.lihat')).toBe(true);
    expect(permissionService.can('aset.ubah')).toBe(true);
    expect(permissionService.can('peminjaman.setujui')).toBe(true);
    expect(permissionService.can('aset.hapusPermanen')).toBe(false);
    expect(permissionService.can('pengguna.kelola')).toBe(false);
    expect(permissionService.can('audit.lihat')).toBe(false);
    expect(permissionService.can('sistem.resetBasisData')).toBe(false);
  });

  it('restricts pegawai to self-service capabilities only', async () => {
    await loginAs('pegawai');

    expect(permissionService.can('peminjaman.ajukan')).toBe(true);
    expect(permissionService.can('kerusakan.lapor')).toBe(true);
    expect(permissionService.can('aset.lihat')).toBe(false);
    expect(permissionService.can('aset.ubah')).toBe(false);
    expect(permissionService.can('aset.hapus')).toBe(false);
    expect(permissionService.can('laporan.cetak')).toBe(false);
    expect(permissionService.can('sistem.resetBasisData')).toBe(false);
  });
});
