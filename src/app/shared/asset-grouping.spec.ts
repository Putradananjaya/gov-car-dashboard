import { VehicleView } from '../core/adapters/vehicle-view.model';
import { computeStatusPajak, groupAssetsByNamaBarang } from './asset-grouping';

function buildAsset(overrides: Partial<VehicleView> = {}): VehicleView {
  return {
    nibar: '1'.repeat(45),
    nomorRegister: '',
    kodeBarang: { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '01', subRincian: '04', subSub: '001', full: '1.3.2.02.01.04.001' },
    namaBarang: 'Sepeda Motor',
    spesifikasiNama: '',
    spesifikasiLainnya: '',
    merekTipe: '',
    merek: '',
    tipe: '',
    lokasi: '',
    nomorPolisi: 'DK 1 P',
    nomorRangka: '',
    nomorBpkb: null,
    jumlah: 1,
    satuan: 'unit',
    hargaSatuanPerolehan: 10000000,
    nilaiPerolehan: 10000000,
    caraPerolehan: 'Pengadaan APBD',
    tanggalPerolehan: '2020-01-01',
    statusPenggunaan: 'Dinas Kesehatan',
    pemegang: null,
    isOperasionalBersama: true,
    fotoId: null,
    masaBerlakuPajak: '2026-12-31',
    masaBerlakuStnk: '2026-12-31',
    tahunAnggaran: 2026,
    kodeLokasi: '20.00.00',
    sumberImporId: 'test',
    dihapusPada: null,
    kondisi: 'Baik',
    status: 'Tersedia',
    penanggungJawabId: null,
    telepon: null,
    telemetri: null,
    catatan: '',
    diperbaruiPada: '2026-01-01T00:00:00.000Z',
    diperbaruiOleh: 'test',
    ...overrides
  };
}

describe('groupAssetsByNamaBarang', () => {
  it('groups assets by namaBarang with unit/value subtotals', () => {
    const groups = groupAssetsByNamaBarang([
      buildAsset({ nibar: 'a', namaBarang: 'Sepeda Motor', nilaiPerolehan: 10000000 }),
      buildAsset({ nibar: 'b', namaBarang: 'Sepeda Motor', nilaiPerolehan: 15000000 }),
      buildAsset({ nibar: 'c', namaBarang: 'Jeep', nilaiPerolehan: 200000000 })
    ]);

    const motor = groups.find(g => g.namaBarang === 'Sepeda Motor');
    expect(motor?.items.length).toBe(2);
    expect(motor?.subtotalJumlah).toBe(2);
    expect(motor?.subtotalNilai).toBe(25000000);

    const jeep = groups.find(g => g.namaBarang === 'Jeep');
    expect(jeep?.subtotalNilai).toBe(200000000);
  });

  it('sorts groups alphabetically', () => {
    const groups = groupAssetsByNamaBarang([
      buildAsset({ namaBarang: 'Sepeda Motor' }),
      buildAsset({ namaBarang: 'Jeep' })
    ]);
    expect(groups.map(g => g.namaBarang)).toEqual(['Jeep', 'Sepeda Motor']);
  });

  it('falls back to a placeholder label for an empty namaBarang', () => {
    const groups = groupAssetsByNamaBarang([buildAsset({ namaBarang: '' })]);
    expect(groups[0].namaBarang).toBe('(Tanpa Kategori)');
  });
});

describe('computeStatusPajak', () => {
  const NOW = new Date('2026-08-12T00:00:00Z');

  it('returns "berlaku" when more than 60 days remain', () => {
    expect(computeStatusPajak('2026-12-31', NOW)).toBe('berlaku');
  });

  it('returns "segera-habis" within the 60-day threshold', () => {
    expect(computeStatusPajak('2026-09-15', NOW)).toBe('segera-habis');
  });

  it('returns "segera-habis" exactly at the 60-day boundary', () => {
    const dueIn60Days = new Date(NOW.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(computeStatusPajak(dueIn60Days, NOW)).toBe('segera-habis');
  });

  it('returns "kadaluarsa" for a past date', () => {
    expect(computeStatusPajak('2026-01-01', NOW)).toBe('kadaluarsa');
  });

  it('returns "tidak-diketahui" for an empty or unreadable value', () => {
    expect(computeStatusPajak('', NOW)).toBe('tidak-diketahui');
    expect(computeStatusPajak('bukan tanggal', NOW)).toBe('tidak-diketahui');
  });
});
