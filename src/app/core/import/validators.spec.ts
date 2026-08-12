import { RowForBatchValidation, RowForRowValidation, validateBatch, validateRow } from './validators';

const VALID_NIBAR = '1'.repeat(45);

function buildRow(overrides: Partial<RowForRowValidation> = {}): RowForRowValidation {
  return {
    rowNumber: 21,
    nibar: VALID_NIBAR,
    nomorPolisi: 'DK 1904 P',
    nilaiPerolehan: 229470000,
    tanggalPerolehanIso: '2015-12-04',
    ...overrides
  };
}

describe('validateRow', () => {
  it('produces no errors for a complete row', () => {
    expect(validateRow(buildRow())).toEqual([]);
  });

  it('rejects an empty NIBAR', () => {
    const issues = validateRow(buildRow({ nibar: '' }));
    expect(issues.some(i => i.level === 'error' && i.message.includes('NIBAR kosong'))).toBe(true);
  });

  it('rejects a NIBAR that is not 45 characters', () => {
    const issues = validateRow(buildRow({ nibar: '12345' }));
    expect(issues.some(i => i.level === 'error' && i.message.includes('45 karakter'))).toBe(true);
  });

  it('rejects an empty nomor polisi', () => {
    const issues = validateRow(buildRow({ nomorPolisi: '' }));
    expect(issues.some(i => i.message.includes('Nomor polisi kosong'))).toBe(true);
  });

  it('rejects a non-numeric nilai perolehan', () => {
    const issues = validateRow(buildRow({ nilaiPerolehan: NaN }));
    expect(issues.some(i => i.message.includes('Nilai perolehan'))).toBe(true);
  });

  it('rejects an unreadable tanggal perolehan', () => {
    const issues = validateRow(buildRow({ tanggalPerolehanIso: null }));
    expect(issues.some(i => i.message.includes('Tanggal perolehan tidak terbaca'))).toBe(true);
  });
});

function buildBatchRow(overrides: Partial<RowForBatchValidation> = {}): RowForBatchValidation {
  return {
    rowNumber: 34,
    nibar: VALID_NIBAR,
    nomorRangka: 'MH1KEVA183K523400',
    nomorBpkb: '5941926-0',
    tanggalPerolehanIso: '2015-12-04',
    masaBerlakuPajakIso: '2027-09-29',
    masaBerlakuStnkIso: '2028-09-29',
    ...overrides
  };
}

const NOW = new Date('2026-08-12T00:00:00Z');

describe('validateBatch', () => {
  it('produces no warnings for a clean batch', () => {
    expect(validateBatch([buildBatchRow()], NOW)).toEqual([]);
  });

  it('flags duplicate nomor rangka across rows, both directions', () => {
    const rowA = buildBatchRow({ rowNumber: 34, nibar: 'A'.repeat(45), nomorRangka: 'DUPLICATE-VIN' });
    const rowB = buildBatchRow({ rowNumber: 35, nibar: 'B'.repeat(45), nomorRangka: 'DUPLICATE-VIN' });

    const issues = validateBatch([rowA, rowB], NOW);

    expect(issues.filter(i => i.message.includes('juga dipakai oleh')).length).toBe(2);
  });

  it('flags an empty nomor BPKB', () => {
    const issues = validateBatch([buildBatchRow({ nomorBpkb: null })], NOW);
    expect(issues.some(i => i.message.includes('BPKB kosong'))).toBe(true);
  });

  it('flags masa pajak identical to masa STNK', () => {
    const issues = validateBatch(
      [buildBatchRow({ masaBerlakuPajakIso: '2026-08-09', masaBerlakuStnkIso: '2026-08-09' })],
      NOW
    );
    expect(issues.some(i => i.message.includes('sama persis'))).toBe(true);
  });

  it('flags an expired masa pajak relative to the given "now"', () => {
    const issues = validateBatch([buildBatchRow({ masaBerlakuPajakIso: '2026-01-01' })], NOW);
    expect(issues.some(i => i.message.includes('sudah lewat'))).toBe(true);
  });

  it('does not flag a masa pajak that is still valid', () => {
    const issues = validateBatch([buildBatchRow({ masaBerlakuPajakIso: '2027-01-01' })], NOW);
    expect(issues.some(i => i.message.includes('sudah lewat'))).toBe(false);
  });

  it('flags an acquisition year more than 20 years before "now"', () => {
    const issues = validateBatch([buildBatchRow({ tanggalPerolehanIso: '2000-01-01' })], NOW);
    expect(issues.some(i => i.message.includes('20 tahun'))).toBe(true);
  });
});
