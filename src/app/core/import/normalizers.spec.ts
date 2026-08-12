import { collapseSpaces, excelSerialToIso, parseIndonesianDate, parseMerekTipe, parseNomorPolisi, parsePemegang } from './normalizers';

describe('collapseSpaces', () => {
  it('trims and collapses internal double spaces', () => {
    expect(collapseSpaces('  I Nengah   Kariasa, SE  ')).toBe('I Nengah Kariasa, SE');
  });

  it('treats a cell of only spaces as empty', () => {
    expect(collapseSpaces('    ')).toBe('');
  });

  it('treats null/undefined as empty', () => {
    expect(collapseSpaces(null)).toBe('');
    expect(collapseSpaces(undefined)).toBe('');
  });
});

describe('parseIndonesianDate', () => {
  it('parses standard capitalized month names', () => {
    expect(parseIndonesianDate('21 Desember 2026')).toBe('2026-12-21');
  });

  it('parses the old spelling "Nopember"', () => {
    expect(parseIndonesianDate('12 Nopember 2026')).toBe('2026-11-12');
  });

  it('parses lowercase month names', () => {
    expect(parseIndonesianDate('14 nopember 2026')).toBe('2026-11-14');
  });

  it('parses the old spelling "Pebruari"', () => {
    expect(parseIndonesianDate('5 Pebruari 2026')).toBe('2026-02-05');
  });

  it('parses a single-digit day', () => {
    expect(parseIndonesianDate('9 Agustus 2026')).toBe('2026-08-09');
  });

  it('parses a zero-padded two-digit day', () => {
    expect(parseIndonesianDate('09 Agustus 2026')).toBe('2026-08-09');
  });

  it('returns null for unreadable text', () => {
    expect(parseIndonesianDate('bukan tanggal')).toBeNull();
  });

  it('returns null for an empty cell', () => {
    expect(parseIndonesianDate('')).toBeNull();
  });

  it('returns null for an impossible day/month combination', () => {
    expect(parseIndonesianDate('31 Februari 2026')).toBeNull();
  });
});

describe('excelSerialToIso', () => {
  it('converts a known serial to the correct ISO date', () => {
    // 42342 dari berkas asli klien, kolom Tanggal Perolehan.
    expect(excelSerialToIso(42342)).toBe('2015-12-04');
  });

  it('returns null for non-numeric input', () => {
    expect(excelSerialToIso('bukan angka')).toBeNull();
  });

  it('returns null for zero/negative serials', () => {
    expect(excelSerialToIso(0)).toBeNull();
    expect(excelSerialToIso(-5)).toBeNull();
  });
});

describe('parseMerekTipe', () => {
  it('strips the "Merk:" prefix and splits brand from type', () => {
    expect(parseMerekTipe('Merk: Toyota New Rush 1.5 S M/T TRD VIN ')).toEqual({
      merek: 'Toyota',
      tipe: 'New Rush 1.5 S M/T TRD VIN'
    });
  });

  it('handles a brand with no further type text', () => {
    expect(parseMerekTipe('Merk: Toyota')).toEqual({ merek: 'Toyota', tipe: '' });
  });

  it('returns empty strings for an empty cell', () => {
    expect(parseMerekTipe('')).toEqual({ merek: '', tipe: '' });
  });
});

describe('parsePemegang', () => {
  it('maps "Kendaraan Operasional" to a shared vehicle', () => {
    expect(parsePemegang('Kendaraan Operasional')).toEqual({ pemegang: null, isOperasionalBersama: true });
  });

  it('keeps a real name as the pemegang, trimmed', () => {
    expect(parsePemegang('  I Nengah Kariasa, SE  ')).toEqual({ pemegang: 'I Nengah Kariasa, SE', isOperasionalBersama: false });
  });

  it('treats an empty cell as unassigned', () => {
    expect(parsePemegang('')).toEqual({ pemegang: null, isOperasionalBersama: false });
  });
});

describe('parseNomorPolisi', () => {
  it('passes through a single plate unchanged', () => {
    expect(parseNomorPolisi('DK 1904 P')).toEqual({ nomorPolisi: 'DK 1904 P', catatan: null });
  });

  it('splits two plates in one cell and flags it for manual review', () => {
    const result = parseNomorPolisi('DK 18 P/1570 P');
    expect(result.nomorPolisi).toBe('DK 18 P');
    expect(result.catatan).toContain('DK 18 P/1570 P');
  });
});
