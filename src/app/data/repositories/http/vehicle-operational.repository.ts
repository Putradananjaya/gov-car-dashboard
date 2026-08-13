import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { VehicleOperational } from '../../../core/models/vehicle-operational.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class HttpVehicleOperationalRepository implements VehicleOperationalRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<VehicleOperational[]>([]);

  public readonly operational = this.itemsSignal.asReadonly();
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.reload();

    // Sama seperti HttpVehicleAssetRepository — permintaan pertama sebelum
    // login SELALU 401 (wajar), dan repository singleton ini perlu dipicu
    // ulang secara eksplisit begitu login berhasil.
    effect(() => {
      if (this.authService.isLoggedIn()) {
        untracked(() => void this.reload());
      }
    });
  }

  private async reload(): Promise<void> {
    try {
      const items = await firstValueFrom(
        this.http.get<VehicleOperational[]>(`${API_BASE_URL}/vehicle-operational`)
      );
      this.itemsSignal.set(items);
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`.
    }
  }

  public findByNibar(nibar: string): VehicleOperational | undefined {
    return this.itemsSignal().find(o => o.nibar === nibar);
  }

  public async upsert(operational: VehicleOperational): Promise<void> {
    await firstValueFrom(
      this.http.put<VehicleOperational>(
        `${API_BASE_URL}/vehicle-operational/${operational.nibar}`,
        operational
      )
    );
    await this.reload();
  }

  public async remove(nibar: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/vehicle-operational/${nibar}`));
    await this.reload();
  }
}
