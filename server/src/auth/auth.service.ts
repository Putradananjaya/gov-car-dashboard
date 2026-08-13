import { randomBytes, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { compareSync, hashSync } from 'bcryptjs';
import { UserEntity } from '../user/user.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { LoginAttemptEntity } from './login-attempt.entity';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Dipakai untuk membandingkan waktu proses saat NIP tidak ditemukan, supaya
// respons tidak membocorkan lewat perbedaan waktu apakah NIP terdaftar.
// Logika identik dengan core/auth/auth.service.ts (Angular) sebelum putaran ini.
const DUMMY_HASH = hashSync('dummy-password-untuk-timing', 10);

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type LoginOutcome =
  | ({ ok: true; user: UserEntity } & AuthTokens)
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'locked'; retryAfterMs: number };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(LoginAttemptEntity)
    private readonly loginAttemptRepository: Repository<LoginAttemptEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(nip: string, password: string): Promise<LoginOutcome> {
    const now = new Date();
    const lockout = await this.loginAttemptRepository.findOneBy({ nip });

    if (lockout?.lockedUntil && lockout.lockedUntil.getTime() > now.getTime()) {
      return { ok: false, reason: 'locked', retryAfterMs: lockout.lockedUntil.getTime() - now.getTime() };
    }

    const user = await this.userRepository.findOneBy({ nip });
    const passwordValid =
      user && user.aktif ? compareSync(password, user.passwordHash) : (compareSync(password, DUMMY_HASH), false);

    if (!passwordValid) {
      const attempts = (lockout?.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await this.loginAttemptRepository.save({ nip, attempts: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) });
        return { ok: false, reason: 'locked', retryAfterMs: LOCKOUT_MS };
      }
      await this.loginAttemptRepository.save({ nip, attempts, lockedUntil: null });
      return { ok: false, reason: 'invalid' };
    }

    await this.loginAttemptRepository.delete({ nip });
    await this.userRepository.update({ id: user!.id }, { terakhirMasuk: now.toISOString() });

    const tokens = await this.issueTokens(user!);
    return { ok: true, user: user!, ...tokens };
  }

  async refresh(rawRefreshToken: string): Promise<(AuthTokens & { user: UserEntity }) | null> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepository.findOneBy({ tokenHash });
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const user = await this.userRepository.findOneBy({ id: stored.userId });
    if (!user || !user.aktif) {
      await this.refreshTokenRepository.update({ id: stored.id }, { revokedAt: new Date() });
      return null;
    }

    // Rotasi: token lama dicabut, token baru diterbitkan.
    await this.refreshTokenRepository.update({ id: stored.id }, { revokedAt: new Date() });
    const tokens = await this.issueTokens(user);
    return { ...tokens, user };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    // update() no-ops harmlessly if no row matches (already revoked / never existed) — idempotent by design.
    await this.refreshTokenRepository.update({ tokenHash }, { revokedAt: new Date() });
  }

  /** Bersihkan token refresh yang sudah kedaluwarsa — dipanggil berkala oleh SeedService/cron ringan bila diperlukan. */
  async pruneExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({ expiresAt: LessThanOrEqual(new Date()) });
  }

  private async issueTokens(user: UserEntity): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      peran: user.peran,
      unitKerja: user.unitKerja
    });

    const rawRefreshToken = randomBytes(48).toString('hex');
    const refreshTtlDays = Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS', '7'));
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt,
      revokedAt: null
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
