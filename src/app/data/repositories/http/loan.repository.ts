import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { Loan } from '../../../core/models/loan.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class HttpLoanRepository implements LoanRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<Loan[]>([]);

  public readonly loans = this.itemsSignal.asReadonly();
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
      const items = await firstValueFrom(this.http.get<Loan[]>(`${API_BASE_URL}/loans`));
      this.itemsSignal.set(items);
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`.
    }
  }

  public findById(id: string): Loan | undefined {
    return this.itemsSignal().find(l => l.id === id);
  }

  public async upsert(loan: Loan): Promise<void> {
    await firstValueFrom(this.http.put<Loan>(`${API_BASE_URL}/loans/${loan.id}`, loan));
    await this.reload();
  }

  public async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/loans/${id}`));
    await this.reload();
  }
}
