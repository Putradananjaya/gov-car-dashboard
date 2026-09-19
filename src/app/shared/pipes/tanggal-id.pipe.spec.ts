import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { formatTanggalId } from './tanggal-id.pipe';

registerLocaleData(localeId, 'id-ID');

describe('formatTanggalId', () => {
  it('menampilkan tanggal ISO tanpa jam sebagai "Tanggal Bulan Tahun"', () => {
    expect(formatTanggalId('2026-09-19', 'id-ID')).toBe('19 September 2026');
  });

  it('menambahkan jam untuk nilai yang punya komponen waktu', () => {
    expect(formatTanggalId('2026-09-19T14:30:00', 'id-ID')).toBe('19 September 2026 - 14:30');
  });

  it('memakai jam 24 dengan dua digit', () => {
    expect(formatTanggalId('2026-01-05T08:07:00', 'id-ID')).toBe('5 Januari 2026 - 08:07');
  });

  it('bisa dipaksa tanpa jam meski nilainya timestamp', () => {
    expect(formatTanggalId('2026-09-19T14:30:00', 'id-ID', 'tanggal')).toBe('19 September 2026');
  });

  it('bisa dipaksa dengan jam meski nilainya tanggal saja', () => {
    expect(formatTanggalId('2026-09-19', 'id-ID', 'lengkap')).toBe('19 September 2026 - 00:00');
  });

  it('mengembalikan teks pengganti untuk nilai kosong', () => {
    expect(formatTanggalId(null, 'id-ID')).toBe('—');
    expect(formatTanggalId('', 'id-ID')).toBe('—');
    expect(formatTanggalId(undefined, 'id-ID', 'auto', 'Belum pernah')).toBe('Belum pernah');
  });

  it('menampilkan apa adanya bila nilainya tidak terbaca sebagai tanggal', () => {
    expect(formatTanggalId('bukan tanggal', 'id-ID')).toBe('bukan tanggal');
  });
});
