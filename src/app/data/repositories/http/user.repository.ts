import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CreateUserInput, UserRepository } from '../../../core/repositories/user.repository';
import { User } from '../../../core/models/user.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { MuatanSignal } from './muatan-signal';

@Injectable({ providedIn: 'root' })
export class HttpUserRepository implements UserRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<User[]>([]);
  private muatan = new MuatanSignal(this.itemsSignal);

  public readonly users = this.itemsSignal.asReadonly();
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
      const items = await firstValueFrom(this.http.get<User[]>(`${API_BASE_URL}/users`));
      this.muatan.set(items);
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`.
    }
  }

  public findByNip(nip: string): User | undefined {
    return this.itemsSignal().find(u => u.nip === nip);
  }

  public findById(id: string): User | undefined {
    return this.itemsSignal().find(u => u.id === id);
  }

  public async create(input: CreateUserInput): Promise<void> {
    await firstValueFrom(this.http.post<User>(`${API_BASE_URL}/users`, input));
    await this.reload();
  }

  public async update(user: User): Promise<void> {
    await firstValueFrom(
      this.http.put<User>(`${API_BASE_URL}/users/${user.id}`, {
        nama: user.nama,
        jabatan: user.jabatan,
        unitKerja: user.unitKerja,
        peran: user.peran,
        aktif: user.aktif
      })
    );
    await this.reload();
  }

  public async resetPassword(id: string, password: string, kataSandiLama: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/users/${id}/reset-password`, { kataSandiLama, password })
    );
    await this.reload();
  }

  public refresh(): Promise<void> {
    return this.reload();
  }
}
