import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

/**
 * Lampirkan `Authorization: Bearer <accessToken>` untuk setiap permintaan ke
 * backend, dan coba satu kali refresh-diam-diam + ulangi permintaan saat
 * dapat 401 (access token kedaluwarsa di tengah pemakaian) — supaya sesi
 * tidak terputus tiba-tiba selama refresh token (cookie) masih berlaku.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const isAuthRoute = req.url.endsWith('/auth/login') || req.url.endsWith('/auth/refresh');

  const token = authService.getAccessToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthRoute) {
        return throwError(() => error);
      }

      return from(authService.refresh()).pipe(
        switchMap(() => {
          const newToken = authService.getAccessToken();
          if (!newToken) return throwError(() => error);
          const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
          return next(retryReq);
        })
      );
    })
  );
};
