import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleAsset } from '../../../core/models/vehicle-asset.model';
import { API_BASE_URL } from '../../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class HttpVehicleAssetRepository implements VehicleAssetRepository {
  private http = inject(HttpClient);
  private itemsSignal = signal<VehicleAsset[]>([]);

  public readonly assets = this.itemsSignal.asReadonly();
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.reload();
  }

  private async reload(): Promise<void> {
    const items = await firstValueFrom(
      this.http.get<VehicleAsset[]>(`${API_BASE_URL}/vehicle-assets`)
    );
    this.itemsSignal.set(items);
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
