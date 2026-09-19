import { pakaiKerangkaAplikasi } from './app';

describe('pakaiKerangkaAplikasi', () => {
  it('memakai kerangka dashboard untuk rute di bawah /app', () => {
    expect(pakaiKerangkaAplikasi(true, '/app/beranda')).toBe(true);
    expect(pakaiKerangkaAplikasi(true, '/app/aset?kondisi=Rusak%20Berat')).toBe(true);
  });

  it('tidak membungkus halaman publik meski sesi masih hidup', () => {
    // Regresi: membuka tautan beranda di tab baru tanpa logout dulu membuat
    // halaman publik tampil di dalam sidebar + header dashboard.
    expect(pakaiKerangkaAplikasi(true, '/')).toBe(false);
    expect(pakaiKerangkaAplikasi(true, '/masuk')).toBe(false);
  });

  it('tidak memakai kerangka dashboard saat belum login', () => {
    expect(pakaiKerangkaAplikasi(false, '/app/beranda')).toBe(false);
  });
});
