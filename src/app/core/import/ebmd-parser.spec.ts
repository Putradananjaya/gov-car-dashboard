import { readFileSync } from 'fs';
import { resolve } from 'path';
import { read, utils, write } from 'xlsx';
import { parseEbmdWorkbook } from './ebmd-parser';
import { COLUMN } from './column-map';

const FIXTURE_PATH = resolve(process.cwd(), 'src/app/core/import/fixtures/ebmd-format-ii-o-2-2.fixture.xlsx');

// Baris duplikat rangka & baris "DK 18 P/1570 P" / "DK 1853 P" di berkas asli
// klien — NIBAR-nya tidak diubah oleh anonimisasi (hanya nama/rangka/BPKB).
const NIBAR_DUPLICATE_RANGKA_1 = '120151062000000000000020031320201040010000001';
const NIBAR_DUPLICATE_RANGKA_2 = '120151062000000000000020031320201040010000003';
const NIBAR_EMPTY_BPKB_DUAL_PLATE = '120151062000000000000020031320201019990000001';
const NIBAR_PAJAK_EQUALS_STNK = '120151062000000000000020031320201020030000001';

function loadFixtureBuffer(): ArrayBuffer {
  const buf = readFileSync(FIXTURE_PATH);
  // new Uint8Array(buf).buffer, bukan buf.buffer.slice(...) — yang terakhir
  // menghasilkan ArrayBuffer korup di lingkungan Node test runner ini.
  return new Uint8Array(buf).buffer as ArrayBuffer;
}

// "now" jauh di masa lalu relatif ke data supaya aturan "masa pajak sudah
// lewat" dan "tahun perolehan >20 tahun" tidak ikut campur di uji integrasi
// ini — keduanya sudah diuji tersendiri di validators.spec.ts.
const STABLE_NOW = new Date('2020-01-01T00:00:00Z');

describe('parseEbmdWorkbook', () => {
  it('parses exactly 42 accepted assets with no row-level errors from a clean file', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);

    expect(result.errors).toEqual([]);
    expect(result.assets.length).toBe(42);
  });

  it('extracts the kop (header) correctly', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);

    expect(result.kop).toEqual({
      tahunAnggaran: 2026,
      penggunaBarang: 'BADAN KEUANGAN, PENDAPATAN DAN ASET DAERAH',
      kodeLokasi: '20.00.00'
    });
  });

  it('skips summary/group rows without counting them as errors', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);
    expect(result.skippedRowCount).toBeGreaterThan(0);
  });

  it('flags the real duplicate nomor rangka as a warning on both rows', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);

    const duplicateWarnings = result.warnings.filter(
      w => w.message.includes('juga dipakai oleh') && (w.nibar === NIBAR_DUPLICATE_RANGKA_1 || w.nibar === NIBAR_DUPLICATE_RANGKA_2)
    );
    expect(duplicateWarnings.length).toBe(2);
  });

  it('flags the empty BPKB and dual-plate cell on the same known row', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);

    const rowWarnings = result.warnings.filter(w => w.nibar === NIBAR_EMPTY_BPKB_DUAL_PLATE);
    expect(rowWarnings.some(w => w.message.includes('BPKB kosong'))).toBe(true);
    expect(rowWarnings.some(w => w.message.includes('lebih dari satu nomor polisi'))).toBe(true);

    const asset = result.assets.find(a => a.nibar === NIBAR_EMPTY_BPKB_DUAL_PLATE);
    expect(asset?.nomorPolisi).toBe('DK 18 P');
    expect(asset?.nomorBpkb).toBeNull();
  });

  it('flags masa pajak identical to masa STNK on the known row', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);

    const warning = result.warnings.find(w => w.nibar === NIBAR_PAJAK_EQUALS_STNK && w.message.includes('sama persis'));
    expect(warning).toBeDefined();
  });

  it('correctly normalizes mixed-case/old-spelling Indonesian month names into masaBerlakuPajak', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);
    // DK 8604 P (baris 31 di berkas asli) — "14 nopember 2026" huruf kecil.
    const asset = result.assets.find(a => a.nomorPolisi === 'DK 8604 P');
    expect(asset?.masaBerlakuPajak).toBe('2026-11-14');
  });

  it('builds a ServiceRecord only for rows with a non-empty riwayat servis narrative', () => {
    const result = parseEbmdWorkbook(loadFixtureBuffer(), { sumberImporId: 'test-batch-1' }, STABLE_NOW);
    expect(result.serviceRecords.length).toBeGreaterThan(0);
    expect(result.serviceRecords.length).toBeLessThan(result.assets.length);
    expect(result.serviceRecords.every(r => r.uraian.length > 0)).toBe(true);
  });

  it('rejects a row with a blank NIBAR as an error and excludes it from assets', () => {
    const workbook = read(loadFixtureBuffer(), { type: 'array', raw: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Baris 21 (index 20) = DK 1904 P di berkas fixture — kosongkan NIBAR-nya.
    const cellAddress = utils.encode_cell({ r: 20, c: COLUMN.NIBAR });
    sheet[cellAddress] = { t: 's', v: '' };

    const corruptedBuffer = write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const result = parseEbmdWorkbook(corruptedBuffer, { sumberImporId: 'test-batch-2' }, STABLE_NOW);

    expect(result.errors.some(e => e.message.includes('NIBAR kosong'))).toBe(true);
    expect(result.assets.length).toBe(41);
    expect(result.assets.some(a => a.nomorPolisi === 'DK 1904 P')).toBe(false);
  });
});
