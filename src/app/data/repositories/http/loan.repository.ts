import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { KembalikanPayload, LoanRepository, SerahTerimaPayload } from '../../../core/repositories/loan.repository';
import { Loan } from '../../../core/models/loan.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { MuatanSignal } from './muatan-signal';

@Injectable({ providedIn: 'root' })
export class HttpLoanRepository implements LoanRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<Loan[]>([]);
  private muatan = new MuatanSignal(this.itemsSignal);

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
      this.muatan.set(items);
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

  public async verifikasi(id: string): Promise<Loan> {
    const result = await firstValueFrom(this.http.post<Loan>(`${API_BASE_URL}/loans/${id}/verifikasi`, {}));
    await this.reload();
    return result;
  }

  public async setujui(id: string): Promise<Loan> {
    const result = await firstValueFrom(this.http.post<Loan>(`${API_BASE_URL}/loans/${id}/setujui`, {}));
    await this.reload();
    return result;
  }

  public async serahTerima(id: string, payload: SerahTerimaPayload): Promise<Loan> {
    const result = await firstValueFrom(this.http.post<Loan>(`${API_BASE_URL}/loans/${id}/serah-terima`, payload));
    await this.reload();
    return result;
  }

  public async tolak(id: string, catatanPenolakan: string): Promise<Loan> {
    const result = await firstValueFrom(
      this.http.post<Loan>(`${API_BASE_URL}/loans/${id}/tolak`, { catatanPenolakan })
    );
    await this.reload();
    return result;
  }

  public async kembalikan(id: string, payload: KembalikanPayload): Promise<Loan> {
    const result = await firstValueFrom(this.http.post<Loan>(`${API_BASE_URL}/loans/${id}/kembalikan`, payload));
    await this.reload();
    return result;
  }

  public refresh(): Promise<void> {
    return this.reload();
  }
}
