import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Peran } from '../models/user.model';

/** Baca `route.data['peran']` (daftar peran yang diizinkan) untuk menjaga rute. */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const peranSaatIni = authService.peran();
  if (!peranSaatIni) {
    return router.createUrlTree(['/masuk']);
  }

  const peranDiizinkan = route.data['peran'] as Peran[] | undefined;
  if (!peranDiizinkan || peranDiizinkan.includes(peranSaatIni)) {
    return true;
  }

  return router.createUrlTree(['/app/beranda']);
};
