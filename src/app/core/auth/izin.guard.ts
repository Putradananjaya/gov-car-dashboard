import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { Kemampuan } from './kemampuan';

/**
 * Menjaga rute dengan kemampuan dari matriks hak akses, bukan daftar peran
 * yang dikunci di `app.routes.ts`. Dengan begitu, begitu superadmin memberi
 * sebuah peran akses ke satu menu, rutenya ikut terbuka — tanpa perlu
 * mengubah kode.
 *
 * `route.data['kemampuan']` boleh satu kemampuan atau beberapa (cukup salah
 * satu terpenuhi).
 */
export const izinGuard: CanActivateFn = route => {
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/masuk']);
  }

  const data = route.data['kemampuan'] as Kemampuan | Kemampuan[] | undefined;
  if (!data) return true;

  const dibutuhkan = Array.isArray(data) ? data : [data];
  if (permissionService.canAny(...dibutuhkan)) return true;

  // Sudah masuk tapi tidak berhak — kembalikan ke beranda, bukan ke formulir
  // login (pengguna sudah punya sesi yang sah).
  return router.createUrlTree(['/app/beranda']);
};
