import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpPaktaIntegritasRepository } from './pakta-integritas.repository';
import { PaktaIntegritas } from '../../../core/models/pakta-integritas.model';
import { API_BASE_URL } from '../../../core/config/api.config';

const SAMPLE_PAKTA: PaktaIntegritas = {
  nibar: 'nibar-1',
  pemegang: 'Budi',
  fileName: 'pakta.pdf',
  mimeType: 'application/pdf',
  size: 3,
  diunggahPada: '2026-09-01T00:00:00.000Z',
  diunggahOleh: 'Pengurus Barang'
};

/** upsert() membaca berkas lewat FileReader (asinkron) sebelum PUT dikirim. */
async function waitForRequest(httpMock: HttpTestingController, url: string): Promise<TestRequest> {
  for (let i = 0; i < 50; i++) {
    const [req] = httpMock.match(url);
    if (req) return req;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  throw new Error(`No request to ${url}`);
}

describe('HttpPaktaIntegritasRepository', () => {
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

  it('does not load anything until refresh() is called, then exposes the list via findByNibar', async () => {
    const repo = TestBed.inject(HttpPaktaIntegritasRepository);
    httpMock.expectNone(`${API_BASE_URL}/pakta-integritas`);

    const refreshPromise = repo.refresh();
    httpMock.expectOne(`${API_BASE_URL}/pakta-integritas`).flush([SAMPLE_PAKTA]);
    await refreshPromise;

    expect(repo.findByNibar('nibar-1')?.fileName).toBe('pakta.pdf');
    expect(repo.findByNibar('tidak-ada')).toBeUndefined();
  });

  it('keeps the list empty when the server refuses (no aset.lihat permission)', async () => {
    const repo = TestBed.inject(HttpPaktaIntegritasRepository);

    const refreshPromise = repo.refresh();
    httpMock.expectOne(`${API_BASE_URL}/pakta-integritas`).flush(null, { status: 403, statusText: 'Forbidden' });
    await refreshPromise;

    expect(repo.pakta()).toEqual([]);
  });

  it('uploads the file as base64 via PUT and refetches the list', async () => {
    const repo = TestBed.inject(HttpPaktaIntegritasRepository);
    const berkas = new File(['abc'], 'pakta.pdf', { type: 'application/pdf' });

    const upsertPromise = repo.upsert('nibar-1', berkas, 'Pengurus Barang');

    const putReq = await waitForRequest(httpMock, `${API_BASE_URL}/pakta-integritas/nibar-1`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      fileName: 'pakta.pdf',
      mimeType: 'application/pdf',
      blobBase64: btoa('abc'),
      diunggahOleh: 'Pengurus Barang'
    });
    putReq.flush(SAMPLE_PAKTA);

    (await waitForRequest(httpMock, `${API_BASE_URL}/pakta-integritas`)).flush([SAMPLE_PAKTA]);
    await upsertPromise;

    expect(repo.pakta()).toEqual([SAMPLE_PAKTA]);
  });

  it('fetches the file content on demand and decodes it into a Blob', async () => {
    const repo = TestBed.inject(HttpPaktaIntegritasRepository);

    const blobPromise = repo.ambilBerkas('nibar-1');
    httpMock
      .expectOne(`${API_BASE_URL}/pakta-integritas/nibar-1/berkas`)
      .flush({ ...SAMPLE_PAKTA, blobBase64: btoa('abc') });
    const blob = await blobPromise;

    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe('abc');
  });
});
