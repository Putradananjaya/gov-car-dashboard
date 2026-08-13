import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, Peran } from '../models/user.model';
import { API_BASE_URL } from '../config/api.config';

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'locked'; retryAfterMs: number }
  | { ok: false; reason: 'error' };

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface LoginErrorBody {
  reason?: 'invalid' | 'locked';
  retryAfterMs?: number;
}

const REFRESH_TOKEN_STORAGE_KEY = 'pusaka_bangli_refresh_token';

/**
 * Sejak Fase 5b, autentikasi sepenuhnya di backend (JWT + refresh token) —
 * tidak lagi membaca/membandingkan hash password di browser lewat
 * UserRepository seperti sebelumnya. Access token HANYA hidup di memori
 * (signal), tidak pernah ditulis ke sessionStorage/localStorage.
 *
 * Refresh token AWALNYA (Fase 5b) murni cookie httpOnly. Fase 5c menambah
 * jalur kedua: token JUGA dikembalikan di body respons & disimpan di
 * sessionStorage, dikirim eksplisit di body permintaan `/auth/refresh` &
 * `/auth/logout` — browser modern (Chromium dkk.) memblokir pengiriman
 * cookie SameSite=None pada fetch/XHR cross-site ketika frontend & backend
 * di domain yang SAMA SEKALI berbeda (github.io vs railway.app, bukan cuma
 * beda port seperti dev lokal), meski cookie-nya tersimpan & valid di
 * server — dikonfirmasi manual saat deploy sungguhan. Trade-off yang
 * disadari: refresh token di sessionStorage bisa dibaca skrip XSS di
 * halaman (beda dari access token yang tetap murni in-memory) — ini
 * levelnya sama dengan token sesi Fase 1 lama, bukan regresi total karena
 * password/hash tetap tidak pernah meninggalkan server.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private accessTokenSignal = signal<string | null>(null);
  private currentUserSignal = signal<User | null>(null);
  private refreshInFlight: Promise<void> | null = null;

  public readonly currentUser = computed(() => this.currentUserSignal());
  public readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  public readonly peran = computed<Peran | null>(() => this.currentUserSignal()?.peran ?? null);

  /** Dipakai oleh auth.interceptor.ts untuk melampirkan header Authorization. */
  public getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  public async login(nip: string, password: string): Promise<LoginResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${API_BASE_URL}/auth/login`, { nip, password }, { withCredentials: true })
      );
      this.applySession(response);
      return { ok: true };
    } catch (error) {
      return this.mapLoginError(error);
    }
  }

  /**
   * Pulihkan sesi diam-diam (mis. saat aplikasi baru dimuat). Refresh token
   * DIROTASI setiap dipakai — kalau beberapa pemanggil (app initializer +
   * auth.interceptor.ts yang dipicu beberapa repository sekaligus)
   * memanggil ini bersamaan, masing-masing memakai token yang SAMA; siapa
   * pun yang lebih dulu sampai ke server merotasi token dan membuat
   * panggilan lain (yang masih pakai token lama) gagal 401 — bukan karena
   * sesi tidak valid, tapi karena kalah balapan. Deduplikasi lewat
   * `refreshInFlight` supaya hanya satu permintaan HTTP nyata yang jalan.
   */
  public refresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<void> {
    const storedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(
          `${API_BASE_URL}/auth/refresh`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          { withCredentials: true }
        )
      );
      this.applySession(response);
    } catch {
      // Tidak ada sesi valid — bukan galat, cukup anggap belum masuk.
      this.clearSession();
    }
  }

  public async logout(): Promise<void> {
    const storedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    try {
      await firstValueFrom(
        this.http.post(
          `${API_BASE_URL}/auth/logout`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          { withCredentials: true }
        )
      );
    } catch {
      // Abaikan galat jaringan saat logout — state lokal tetap dibersihkan di bawah.
    }
    this.clearSession();
  }

  private applySession(response: AuthResponse): void {
    this.accessTokenSignal.set(response.accessToken);
    this.currentUserSignal.set(response.user);
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken);
  }

  private clearSession(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  private mapLoginError(error: unknown): LoginResult {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      const body = error.error as LoginErrorBody | null;
      if (body?.reason === 'locked' && typeof body.retryAfterMs === 'number') {
        return { ok: false, reason: 'locked', retryAfterMs: body.retryAfterMs };
      }
      return { ok: false, reason: 'invalid' };
    }
    return { ok: false, reason: 'error' };
  }
}
