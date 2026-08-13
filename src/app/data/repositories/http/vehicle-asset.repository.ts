import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleAsset } from '../../../core/models/vehicle-asset.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class HttpVehicleAssetRepository implements VehicleAssetRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<VehicleAsset[]>([]);

  public readonly assets = this.itemsSignal.asReadonly();
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.reload();

    // Endpoint ini butuh login (Fase 5b) — permintaan pertama saat aplikasi
    // baru dimuat SELALU 401 kalau belum ada sesi (kasus wajar, bukan
    // galat). Repository ini singleton seumur hidup app, jadi begitu login
    // berhasil (isLoggedIn beralih false→true), data perlu dimuat ulang
    // secara eksplisit — tidak ada yang memicunya otomatis selain ini.
    effect(() => {
      if (this.authService.isLoggedIn()) {
        untracked(() => void this.reload());
      }
    });
  }

  private async reload(): Promise<void> {
    try {
      const items = await firstValueFrom(
        this.http.get<VehicleAsset[]>(`${API_BASE_URL}/vehicle-assets`)
      );
      this.itemsSignal.set(items);
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`
      // (lihat komentar di constructor). Biarkan kosong sampai effect() di
      // atas memicu reload setelah login berhasil.
    }
  }

  public findByNibar(nibar: string): VehicleAsset | undefined {
    return this.itemsSignal().find(a => a.nibar === nibar);
  }

  public async upsert(asset: VehicleAsset): Promise<void> {
    await firstValueFrom(
      this.http.put<VehicleAsset>(`${API_BASE_URL}/vehicle-assets/${asset.nibar}`, asset)
    );
    await this.reload();
  }

  public async remove(nibar: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/vehicle-assets/${nibar}`));
    await this.reload();
  }

  public async softDelete(nibar: string): Promise<void> {
    await firstValueFrom(
      this.http.post<VehicleAsset>(`${API_BASE_URL}/vehicle-assets/${nibar}/soft-delete`, {})
    );
    await this.reload();
  }
}
