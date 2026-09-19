import { tentukanAksiMasuk } from './landing';

describe('tentukanAksiMasuk', () => {
  it('mengarahkan pengunjung yang belum masuk ke formulir login', () => {
    expect(tentukanAksiMasuk(false)).toEqual({ tujuan: '/masuk', label: 'Masuk Admin' });
  });

  it('mengarahkan pengguna yang sesinya masih hidup langsung ke dashboard', () => {
    // Regresi: tombol halaman publik dulu mati ke /login, jadi pengguna yang
    // sudah masuk tetap disuguhi formulir login.
    expect(tentukanAksiMasuk(true)).toEqual({ tujuan: '/app/beranda', label: 'Buka Dashboard' });
  });
});
