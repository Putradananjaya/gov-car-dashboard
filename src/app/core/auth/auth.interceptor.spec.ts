import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

class FakeAuthService {
  public refreshCallCount = 0;
  private token: string | null = 'initial-token';

  getAccessToken(): string | null {
    return this.token;
  }

  async refresh(): Promise<void> {
    this.refreshCallCount++;
    this.token = 'refreshed-token';
  }
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let fakeAuth: FakeAuthService;

  beforeEach(() => {
    fakeAuth = new FakeAuthService();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: fakeAuth }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches Authorization: Bearer header for requests to API_BASE_URL', () => {
    http.get(`${API_BASE_URL}/vehicle-assets`).subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer initial-token');
    req.flush([]);
  });

  it('does not attach Authorization header for requests outside API_BASE_URL', () => {
    http.get('https://unrelated.example.com/data').subscribe();
    const req = httpMock.expectOne('https://unrelated.example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('on 401, refreshes once and retries the original request with the new token', async () => {
    const resultPromise = firstValueFrom(http.get(`${API_BASE_URL}/vehicle-assets`));

    const firstReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`);
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer initial-token');
    firstReq.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    // authService.refresh() is async — give it a microtask tick before the retry request appears.
    await Promise.resolve();
    await Promise.resolve();

    const retryReq = httpMock.expectOne(`${API_BASE_URL}/vehicle-assets`);
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    retryReq.flush([{ nibar: 'ok' }]);

    const result = await resultPromise;
    expect(result).toEqual([{ nibar: 'ok' }]);
    expect(fakeAuth.refreshCallCount).toBe(1);
  });

  it('does not attempt refresh on a 401 from /auth/login itself (avoids loops)', async () => {
    const resultPromise = firstValueFrom(http.post(`${API_BASE_URL}/auth/login`, {})).catch(err => err);

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    req.flush({ reason: 'invalid' }, { status: 401, statusText: 'Unauthorized' });

    await resultPromise;
    expect(fakeAuth.refreshCallCount).toBe(0);
  });
});
