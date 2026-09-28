import { Signal } from '@angular/core';
import { PaktaIntegritas } from '../models/pakta-integritas.model';

export abstract class PaktaIntegritasRepository {
  public abstract readonly pakta: Signal<PaktaIntegritas[]>;

  /** Muat ulang daftar ringkas dari server — dipanggil saat halaman Data Kendaraan dibuka. */
  public abstract refresh(): Promise<void>;
  public abstract findByNibar(nibar: string): PaktaIntegritas | undefined;
  public abstract ambilBerkas(nibar: string): Promise<Blob>;
  public abstract upsert(nibar: string, berkas: File, diunggahOleh: string): Promise<void>;
  public abstract remove(nibar: string): Promise<void>;
}
