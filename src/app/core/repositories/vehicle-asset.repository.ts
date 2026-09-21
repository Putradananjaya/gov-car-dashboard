import { Signal } from '@angular/core';
import { VehicleAsset } from '../models/vehicle-asset.model';

export abstract class VehicleAssetRepository {
  /** Selesai (resolve) setelah data pertama kali termuat dari penyimpanan. */
  public abstract readonly ready: Promise<void>;
  public abstract readonly assets: Signal<VehicleAsset[]>;

  public abstract findByNibar(nibar: string): VehicleAsset | undefined;
  public abstract upsert(asset: VehicleAsset): Promise<void>;
  /**
   * Alias lawas dari `softDelete` — tidak ada penghapusan permanen di aplikasi
   * ini. Masih dipakai jalur pembatalan impor, yang perlu menghapus aset yang
   * baru saja masuk tanpa perlu tahu bedanya.
   */
  public abstract remove(nibar: string): Promise<void>;
  /** Tandai terhapus tanpa menghilangkan baris (aset.hapus, admin/superadmin). */
  public abstract softDelete(nibar: string): Promise<void>;

  /** Muat ulang dari server — dipakai oleh DataSyncService supaya perubahan
   * dari pengguna/perangkat lain ikut tampil tanpa memuat ulang halaman. */
  public abstract refresh(): Promise<void>;
}
