import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PhotoRepository, VehiclePhoto } from '../../../core/repositories/photo.repository';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { base64ToBlob, blobToBase64 } from '../../../shared/blob-base64';

interface VehiclePhotoWire {
  nibar: string;
  mimeType: string;
  blobBase64: string;
}

function fromWire(wire: VehiclePhotoWire): VehiclePhoto {
  return { nibar: wire.nibar, blob: base64ToBlob(wire.blobBase64, wire.mimeType) };
}

@Injectable({ providedIn: 'root' })
export class HttpPhotoRepository implements PhotoRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<VehiclePhoto[]>([]);

  public readonly photos = this.itemsSignal.asReadonly();
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
      const items = await firstValueFrom(this.http.get<VehiclePhotoWire[]>(`${API_BASE_URL}/photos`));
      this.itemsSignal.set(items.map(fromWire));
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`.
    }
  }

  public findByNibar(nibar: string): VehiclePhoto | undefined {
    return this.itemsSignal().find(p => p.nibar === nibar);
  }

  public async upsert(photo: VehiclePhoto): Promise<void> {
    const blobBase64 = await blobToBase64(photo.blob);
    await firstValueFrom(
      this.http.put<VehiclePhotoWire>(`${API_BASE_URL}/photos/${photo.nibar}`, {
        mimeType: photo.blob.type || 'image/jpeg',
        blobBase64
      })
    );
    await this.reload();
  }

  public async remove(nibar: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/photos/${nibar}`));
    await this.reload();
  }
}
