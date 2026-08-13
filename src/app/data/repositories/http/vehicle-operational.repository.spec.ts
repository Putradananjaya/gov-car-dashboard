import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpVehicleOperationalRepository } from './vehicle-operational.repository';
import { VehicleOperational } from '../../../core/models/vehicle-operational.model';
import { API_BASE_URL } from '../../../core/config/api.config';

const SAMPLE_OPERATIONAL: VehicleOperational = {
  nibar: 'nibar-1',
  kondisi: 'Baik',
  status: 'Tersedia',
  penanggungJawabId: null,
  telepon: null,
  telemetri: { lat: -8.19, lng: 115.22, kecepatan: 0, levelBbm: 80, sumber: 'simulasi', waktu: '2026-01-01T00:00:00.000Z' },
  catatan: 'Uji coba',
  diperbaruiPada: '2026-01-01T00:00:00.000Z',
  diperbaruiOleh: 'tester'
};

describe('HttpVehicleOperationalRepository', () => {
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

  it('loads the operational list on creation, telemetri intact, and exposes it via findByNibar', async () => {
    const repo = TestBed.inject(HttpVehicleOperationalRepository);

    const req = httpMock.expectOne(`${API_BASE_URL}/vehicle-operational`);
    expect(req.request.method).toBe('GET');
    req.flush([SAMPLE_OPERATIONAL]);
    await repo.ready;

    expect(repo.operational()).toEqual([SAMPLE_OPERATIONAL]);
    expect(repo.findByNibar('nibar-1')?.telemetri?.lat).toBe(-8.19);
    expect(repo.findByNibar('tidak-ada')).toBeUndefined();
  });

  it('upserts via PUT to /vehicle-operational/:nibar and refetches the list', async () => {
    const repo = TestBed.inject(HttpVehicleOperationalRepository);
    httpMock.expectOne(`${API_BASE_URL}/vehicle-operational`).flush([]);
    await repo.ready;

    const upsertPromise = repo.upsert(SAMPLE_OPERATIONAL);

    const putReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-operational/nibar-1`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual(SAMPLE_OPERATIONAL);
    putReq.flush(SAMPLE_OPERATIONAL);

    // upsert() chains a second HTTP call (reload) after the PUT resolves —
    // give the PUT's firstValueFrom promise a microtask tick to continue
    // before asserting the reload GET was registered.
    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/vehicle-operational`).flush([SAMPLE_OPERATIONAL]);
    await upsertPromise;

    expect(repo.operational()).toEqual([SAMPLE_OPERATIONAL]);
  });

  it('removes via DELETE to /vehicle-operational/:nibar and refetches the list', async () => {
    const repo = TestBed.inject(HttpVehicleOperationalRepository);
    httpMock.expectOne(`${API_BASE_URL}/vehicle-operational`).flush([SAMPLE_OPERATIONAL]);
    await repo.ready;

    const removePromise = repo.remove('nibar-1');

    const deleteReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-operational/nibar-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/vehicle-operational`).flush([]);
    await removePromise;

    expect(repo.operational()).toEqual([]);
  });
});
