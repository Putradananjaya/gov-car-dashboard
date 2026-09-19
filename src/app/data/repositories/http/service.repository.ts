import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServiceRepository } from '../../../core/repositories/service.repository';
import { ServiceRecord } from '../../../core/models/service-record.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { MuatanSignal } from './muatan-signal';

@Injectable({ providedIn: 'root' })
export class HttpServiceRepository implements ServiceRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<ServiceRecord[]>([]);
  private muatan = new MuatanSignal(this.itemsSignal);

  public readonly records = this.itemsSignal.asReadonly();
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
      const items = await firstValueFrom(this.http.get<ServiceRecord[]>(`${API_BASE_URL}/service-records`));
      this.muatan.set(items);
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`.
    }
  }

  public findByNibar(nibar: string): ServiceRecord[] {
    return this.itemsSignal().filter(r => r.nibar === nibar);
  }

  public async upsert(record: ServiceRecord): Promise<void> {
    await firstValueFrom(this.http.put<ServiceRecord>(`${API_BASE_URL}/service-records/${record.id}`, record));
    await this.reload();
  }

  public async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/service-records/${id}`));
    await this.reload();
  }

  public refresh(): Promise<void> {
    return this.reload();
  }
}
