import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpVehicleAssetRepository } from './vehicle-asset.repository';
import { VehicleAsset } from '../../../core/models/vehicle-asset.model';
import { API_BASE_URL } from '../../../core/config/api.config';

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

describe('HttpVehicleAssetRepository', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the asset list on creation and exposes it via findByNibar', async () => {
    const repo = TestBed.inject(HttpVehicleAssetRepository);

    const req = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`);
    expect(req.request.method).toBe('GET');
    req.flush([SAMPLE_ASSET]);
    await repo.ready;

    expect(repo.assets()).toEqual([SAMPLE_ASSET]);
    expect(repo.findByNibar('nibar-1')?.nomorPolisi).toBe('DK 1234 AB');
    expect(repo.findByNibar('tidak-ada')).toBeUndefined();
  });

  it('upserts via PUT to /vehicle-assets/:nibar and refetches the list', async () => {
    const repo = TestBed.inject(HttpVehicleAssetRepository);
    httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`).flush([]);
    await repo.ready;

    const upsertPromise = repo.upsert(SAMPLE_ASSET);

    const putReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets/nibar-1`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual(SAMPLE_ASSET);
    putReq.flush(SAMPLE_ASSET);

    // upsert() chains a second HTTP call (reload) after the PUT resolves —
    // give the PUT's firstValueFrom promise a microtask tick to continue
    // before asserting the reload GET was registered.
    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`).flush([SAMPLE_ASSET]);
    await upsertPromise;

    expect(repo.assets()).toEqual([SAMPLE_ASSET]);
  });

  it('removes via DELETE to /vehicle-assets/:nibar and refetches the list', async () => {
    const repo = TestBed.inject(HttpVehicleAssetRepository);
    httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`).flush([SAMPLE_ASSET]);
    await repo.ready;

    const removePromise = repo.remove('nibar-1');

    const deleteReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets/nibar-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`).flush([]);
    await removePromise;

    expect(repo.assets()).toEqual([]);
  });

  it('soft-deletes via POST to /vehicle-assets/:nibar/soft-delete and refetches the list', async () => {
    const repo = TestBed.inject(HttpVehicleAssetRepository);
    httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`).flush([SAMPLE_ASSET]);
    await repo.ready;

    const softDeletePromise = repo.softDelete('nibar-1');

    const postReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets/nibar-1/soft-delete`);
    expect(postReq.request.method).toBe('POST');
    const updated: VehicleAsset = { ...SAMPLE_ASSET, dihapusPada: '2026-01-01T00:00:00.000Z' };
    postReq.flush(updated);

    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`).flush([updated]);
    await softDeletePromise;

    expect(repo.assets()[0].dihapusPada).toBe('2026-01-01T00:00:00.000Z');
  });
});
