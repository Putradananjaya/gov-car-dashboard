import { HttpErrorResponse } from '@angular/common/http';
import { pesanGalat } from './pesan-galat';

describe('pesanGalat', () => {
  it('menggabungkan daftar galat validasi NestJS', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['peran must be one of the following values: superadmin, admin, pegawai'], statusCode: 400 }
    });

    expect(pesanGalat(error)).toBe('peran must be one of the following values: superadmin, admin, pegawai');
  });

  it('memakai pesan tunggal apa adanya', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'NIP "123" sudah terdaftar.', statusCode: 409 }
    });

    expect(pesanGalat(error)).toBe('NIP "123" sudah terdaftar.');
  });

  it('menjelaskan kegagalan jaringan saat permintaan tidak pernah sampai', () => {
    expect(pesanGalat(new HttpErrorResponse({ status: 0 })))
      .toBe('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
  });

  it('jatuh ke pesan bawaan untuk bentuk galat yang tidak dikenal', () => {
    expect(pesanGalat(new HttpErrorResponse({ status: 500, error: null }), 'Gagal menyimpan.')).toBe('Gagal menyimpan.');
    expect(pesanGalat(new Error('bukan galat HTTP'), 'Gagal menyimpan.')).toBe('Gagal menyimpan.');
  });
});
