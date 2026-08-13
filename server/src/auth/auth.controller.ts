import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from '../user/user.entity';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/auth';

function sanitizeUser(user: UserEntity) {
  const { passwordHash, ...rest } = user;
  return rest;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  private setRefreshCookie(res: Response, token: string): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const refreshTtlDays = Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS', '7'));
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: REFRESH_COOKIE_PATH,
      maxAge: refreshTtlDays * 24 * 60 * 60 * 1000
    });
  }

  private clearRefreshCookie(res: Response): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: REFRESH_COOKIE_PATH
    });
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const outcome = await this.authService.login(dto.nip, dto.password);

    if (!outcome.ok) {
      if (outcome.reason === 'locked') {
        throw new UnauthorizedException({ reason: 'locked', retryAfterMs: outcome.retryAfterMs });
      }
      throw new UnauthorizedException({ reason: 'invalid', message: 'NIP atau kata sandi tidak sesuai' });
    }

    this.setRefreshCookie(res, outcome.refreshToken);
    return { accessToken: outcome.accessToken, user: sanitizeUser(outcome.user) };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      throw new UnauthorizedException();
    }

    const result = await this.authService.refresh(rawToken);
    if (!result) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException();
    }

    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: sanitizeUser(result.user) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawToken) {
      await this.authService.logout(rawToken);
    }
    this.clearRefreshCookie(res);
    return { ok: true };
  }
}
