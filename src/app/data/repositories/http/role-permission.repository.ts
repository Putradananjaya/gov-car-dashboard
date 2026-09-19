import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RolePermissionRepository } from '../../../core/repositories/role-permission.repository';
import { MATRIKS_BAWAAN, MatriksHakAkses, SEMUA_KEMAMPUAN } from '../../../core/auth/kemampuan';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class HttpRolePermissionRepository implements RolePermissionRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private matriksSignal = signal<MatriksHakAkses>(MATRIKS_BAWAAN);

  public readonly matriks = this.matriksSignal.asReadonly();
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.reload();

    effect(() => {
      if (this.authService.isLoggedIn()) {
        untracked(() => void this.reload());
      }
    });
  }

  private async reload(): Promise<void> {
    try {
      const matriks = await firstValueFrom(
        this.http.get<Partial<MatriksHakAkses>>(`${API_BASE_URL}/role-permissions`)
      );
      this.matriksSignal.set(this.lengkapi(matriks));
    } catch {
      // Belum masuk / sesi belum pulih — biarkan memakai matriks bawaan.
      // Ini hanya memengaruhi tampilan; server tetap menegakkan matriks
      // sebenarnya pada setiap permintaan.
    }
  }

  /**
   * Server bisa saja lebih lama dari frontend (urutan deploy tidak dijamin),
   * jadi kemampuan yang belum dikenalnya diisi nilai bawaan daripada
   * meninggalkan lubang `undefined` yang membuat `can()` melempar.
   */
  private lengkapi(masukan: Partial<MatriksHakAkses>): MatriksHakAkses {
    const hasil = {} as MatriksHakAkses;
    for (const kemampuan of SEMUA_KEMAMPUAN) {
      hasil[kemampuan] = masukan[kemampuan] ?? MATRIKS_BAWAAN[kemampuan];
    }
    return hasil;
  }

  public async simpan(matriks: MatriksHakAkses): Promise<void> {
    const hasil = await firstValueFrom(
      this.http.put<Partial<MatriksHakAkses>>(`${API_BASE_URL}/role-permissions`, { matriks })
    );
    // Pakai jawaban server, bukan kiriman kita — server yang memaksa
    // superadmin tetap ada di setiap baris.
    this.matriksSignal.set(this.lengkapi(hasil));
  }

  public refresh(): Promise<void> {
    return this.reload();
  }
}
