import { Injectable, signal, computed, inject } from '@angular/core';
import { compareSync, hashSync } from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { User, Peran } from '../models/user.model';

const SESSION_KEY = 'pusaka_bangli_session';
const LOCKOUT_KEY = 'pusaka_bangli_lockout';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 menit

// Dipakai untuk membandingkan waktu proses saat NIP tidak ditemukan,
// supaya respons tidak membocorkan lewat perbedaan waktu apakah NIP terdaftar.
const DUMMY_HASH = hashSync('dummy-password-untuk-timing', 10);

interface SessionToken {
  sub: string;
  peran: Peran;
  unitKerja: string;
  exp: number;
}

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'locked'; retryAfterMs: number };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userRepository = inject(UserRepository);

  private currentUserSignal = signal<User | null>(null);

  public readonly currentUser = computed(() => this.currentUserSignal());
  public readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  public readonly peran = computed<Peran | null>(() => this.currentUserSignal()?.peran ?? null);

  constructor() {
    this.refresh();
  }

  /** Muat ulang sesi dari sessionStorage (mis. setelah reload halaman). */
  public refresh(): void {
    const token = this.readSession();
    if (!token) {
      this.currentUserSignal.set(null);
      return;
    }

    const user = this.userRepository.users().find(u => u.id === token.sub && u.aktif);
    this.currentUserSignal.set(user ?? null);
    if (!user) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  public login(nip: string, password: string): LoginResult {
    const now = Date.now();
    const lockout = this.getLockoutState(nip);

    if (lockout.lockedUntil && lockout.lockedUntil > now) {
      return { ok: false, reason: 'locked', retryAfterMs: lockout.lockedUntil - now };
    }

    const user = this.userRepository.findByNip(nip);
    const passwordValid = user && user.aktif
      ? compareSync(password, user.passwordHash)
      : (compareSync(password, DUMMY_HASH), false);

    if (!passwordValid) {
      const attempts = lockout.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        this.setLockoutState(nip, { attempts: 0, lockedUntil: now + LOCKOUT_MS });
        return { ok: false, reason: 'locked', retryAfterMs: LOCKOUT_MS };
      }
      this.setLockoutState(nip, { attempts, lockedUntil: null });
      return { ok: false, reason: 'invalid' };
    }

    this.clearLockoutState(nip);
    this.writeSession(user as User);
    this.userRepository.updateLastLogin((user as User).id, new Date().toISOString());
    this.currentUserSignal.set(user as User);
    return { ok: true };
  }

  public logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.currentUserSignal.set(null);
  }

  private writeSession(user: User) {
    const token: SessionToken = {
      sub: user.id,
      peran: user.peran,
      unitKerja: user.unitKerja,
      exp: Date.now() + SESSION_TTL_MS
    };
    sessionStorage.setItem(SESSION_KEY, btoa(JSON.stringify(token)));
  }

  private readSession(): SessionToken | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      const token = JSON.parse(atob(raw)) as SessionToken;
      if (!token.exp || token.exp < Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return token;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  private getLockoutState(nip: string): LockoutState {
    const all = this.readLockoutMap();
    return all[nip] ?? { attempts: 0, lockedUntil: null };
  }

  private setLockoutState(nip: string, state: LockoutState) {
    const all = this.readLockoutMap();
    all[nip] = state;
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(all));
  }

  private clearLockoutState(nip: string) {
    const all = this.readLockoutMap();
    if (!(nip in all)) return;
    delete all[nip];
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(all));
  }

  private readLockoutMap(): Record<string, LockoutState> {
    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, LockoutState>;
    } catch {
      return {};
    }
  }
}
