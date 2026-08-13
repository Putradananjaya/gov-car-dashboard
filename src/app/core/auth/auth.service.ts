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
  user: User;
}

interface LoginErrorBody {
  reason?: 'invalid' | 'locked';
  retryAfterMs?: number;
}

/**
 * Sejak Fase 5b, autentikasi sepenuhnya di backend (JWT + refresh token
 * httpOnly cookie) — tidak lagi membaca/membandingkan hash password di
 * browser lewat UserRepository seperti sebelumnya. Access token HANYA hidup
 * di memori (signal), tidak pernah ditulis ke sessionStorage/localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private accessTokenSignal = signal<string | null>(null);
  private currentUserSignal = signal<User | null>(null);

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
      this.accessTokenSignal.set(response.accessToken);
      this.currentUserSignal.set(response.user);
      return { ok: true };
    } catch (error) {
      return this.mapLoginError(error);
    }
  }

  /** Pulihkan sesi diam-diam lewat cookie refresh token (mis. saat aplikasi baru dimuat). */
  public async refresh(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      );
      this.accessTokenSignal.set(response.accessToken);
      this.currentUserSignal.set(response.user);
    } catch {
      // Tidak ada cookie valid — bukan galat, cukup anggap belum masuk.
      this.accessTokenSignal.set(null);
      this.currentUserSignal.set(null);
    }
  }

  public async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true }));
    } catch {
      // Abaikan galat jaringan saat logout — state lokal tetap dibersihkan di bawah.
    }
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
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
