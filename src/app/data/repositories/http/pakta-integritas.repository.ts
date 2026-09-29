import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PaktaIntegritasRepository } from '../../../core/repositories/pakta-integritas.repository';
import { PaktaIntegritas } from '../../../core/models/pakta-integritas.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { base64ToBlob, blobToBase64 } from '../../../shared/blob-base64';

interface PaktaIntegritasBerkasWire extends PaktaIntegritas {
  blobBase64: string;
}

/**
 * Berbeda dari foto & dokumen peminjaman, daftar di sini tidak membawa isi
 * berkas — isinya diambil satu per satu saat dibuka. Daftar juga tidak dimuat
 * saat aplikasi mulai (endpoint-nya butuh izin aset.lihat), cukup setiap kali
 * halaman Data Kendaraan dibuka.
 */
@Injectable({ providedIn: 'root' })
export class HttpPaktaIntegritasRepository implements PaktaIntegritasRepository {
  private http = inject(HttpClient);
  private itemsSignal = signal<PaktaIntegritas[]>([]);

  public readonly pakta = this.itemsSignal.asReadonly();

  public async refresh(): Promise<void> {
    try {
      const items = await firstValueFrom(this.http.get<PaktaIntegritas[]>(`${API_BASE_URL}/pakta-integritas`));
      this.itemsSignal.set(items);
    } catch {
      // Belum login / tidak punya izin — kolom pakta cukup tampil kosong.
    }
  }

  public findByNibar(nibar: string): PaktaIntegritas | undefined {
    return this.itemsSignal().find(p => p.nibar === nibar);
  }

  public async ambilBerkas(nibar: string): Promise<Blob> {
    const wire = await firstValueFrom(
      this.http.get<PaktaIntegritasBerkasWire>(`${API_BASE_URL}/pakta-integritas/${nibar}/berkas`)
    );
    return base64ToBlob(wire.blobBase64, wire.mimeType);
  }

  public async upsert(nibar: string, berkas: File, diunggahOleh: string): Promise<void> {
    const blobBase64 = await blobToBase64(berkas);
    await firstValueFrom(
      this.http.put<PaktaIntegritas>(`${API_BASE_URL}/pakta-integritas/${nibar}`, {
        fileName: berkas.name,
        // Sebagian peramban mengirim type kosong untuk PDF; validasi sudah memastikan ekstensinya .pdf.
        mimeType: berkas.type || 'application/pdf',
        blobBase64,
        diunggahOleh
      })
    );
    await this.refresh();
  }

  public async remove(nibar: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/pakta-integritas/${nibar}`));
    await this.refresh();
  }
}
