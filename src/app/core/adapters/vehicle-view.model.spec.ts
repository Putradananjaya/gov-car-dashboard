import { VehicleAsset } from '../models/vehicle-asset.model';
import { VehicleOperational } from '../models/vehicle-operational.model';
import { toVehicleView } from './vehicle-view.model';

const ASSET: VehicleAsset = {
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

const OPERATIONAL: VehicleOperational = {
  nibar: 'nibar-1',
  kondisi: 'Baik',
  status: 'Tersedia',
  penanggungJawabId: null,
  telepon: '0812-0000-0000',
  telemetri: null,
  catatan: '',
  diperbaruiPada: '2026-01-01T00:00:00.000Z',
  diperbaruiOleh: 'tester'
};

describe('toVehicleView', () => {
  it('combines asset and operational fields into one object', () => {
    const view = toVehicleView(ASSET, OPERATIONAL);

    expect(view.nibar).toBe('nibar-1');
    expect(view.nomorPolisi).toBe('DK 1234 AB');
    expect(view.status).toBe('Tersedia');
    expect(view.kondisi).toBe('Baik');
    expect(view.telepon).toBe('0812-0000-0000');
  });

  it('does not leak a duplicate nibar key from the operational side', () => {
    const view = toVehicleView(ASSET, { ...OPERATIONAL, nibar: 'should-not-appear' });
    expect(view.nibar).toBe('nibar-1');
  });
});
