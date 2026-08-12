import 'fake-indexeddb/auto';
import { IndexedDbVehicleAssetRepository } from './vehicle-asset.repository';
import { resetBangliDbConnection } from '../../db/database';
import { VehicleAsset } from '../../../core/models/vehicle-asset.model';

const SAMPLE_ASSET: VehicleAsset = {
  nibar: 'nibar-1',
  nomorRegister: '',
  kodeBarang: { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '01', subRincian: '04', subSub: '001', full: '1.3.2.02.01.04.001' },
  namaBarang: 'MPV',
  spesifikasiNama: 'Innova',
  spesifikasiLainnya: 'Toyota Innova',
  merekTipe: 'Toyota Innova',
  merek: 'Toyota',
  tipe: 'Innova',
  lokasi: 'Sekretariat Daerah',
  nomorPolisi: 'DK 1234 AB',
  nomorRangka: '',
  nomorBpkb: null,
  jumlah: 1,
  satuan: 'Unit',
  hargaSatuanPerolehan: 300000000,
  nilaiPerolehan: 300000000,
  caraPerolehan: 'Pengadaan APBD',
  tanggalPerolehan: '2020-01-01',
  statusPenggunaan: 'Sekretariat Daerah',
  pemegang: 'Budi',
  isOperasionalBersama: false,
  fotoId: null,
  masaBerlakuPajak: '2027-01-01',
  masaBerlakuStnk: '2027-01-01',
  tahunAnggaran: 2026,
  kodeLokasi: '20.00.00',
  sumberImporId: 'test',
  dihapusPada: null
};

describe('IndexedDbVehicleAssetRepository', () => {
  beforeEach(async () => {
    await resetBangliDbConnection();
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase('pusaka-bangli');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('upserts and finds an asset by nibar', async () => {
    const repo = new IndexedDbVehicleAssetRepository();
    await repo.ready;

    await repo.upsert(SAMPLE_ASSET);

    expect(repo.assets().length).toBe(1);
    expect(repo.findByNibar('nibar-1')?.nomorPolisi).toBe('DK 1234 AB');
    expect(repo.findByNibar('tidak-ada')).toBeUndefined();
  });

  it('removes an asset', async () => {
    const repo = new IndexedDbVehicleAssetRepository();
    await repo.ready;
    await repo.upsert(SAMPLE_ASSET);

    await repo.remove('nibar-1');

    expect(repo.assets()).toEqual([]);
  });
});
