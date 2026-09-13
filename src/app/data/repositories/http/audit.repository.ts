import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuditLog } from '../../../core/models/audit-log.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class HttpAuditRepository implements AuditRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<AuditLog[]>([]);

  public readonly entries = this.itemsSignal.asReadonly();
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
      const items = await firstValueFrom(this.http.get<AuditLog[]>(`${API_BASE_URL}/audit`));
      this.itemsSignal.set(items);
    } catch {
      // Belum login, atau bukan superadmin (GET /audit dibatasi peran) — bukan galat fatal.
    }
  }

  public async append(entry: Omit<AuditLog, 'id' | 'waktu'>): Promise<void> {
    await firstValueFrom(this.http.post<AuditLog>(`${API_BASE_URL}/audit`, entry));
    await this.reload();
  }
}
