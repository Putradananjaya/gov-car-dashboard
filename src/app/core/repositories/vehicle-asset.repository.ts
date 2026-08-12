import { Signal } from '@angular/core';
import { VehicleAsset } from '../models/vehicle-asset.model';

export abstract class VehicleAssetRepository {
  /** Selesai (resolve) setelah data pertama kali termuat dari penyimpanan. */
  public abstract readonly ready: Promise<void>;
  public abstract readonly assets: Signal<VehicleAsset[]>;

  public abstract findByNibar(nibar: string): VehicleAsset | undefined;
  public abstract upsert(asset: VehicleAsset): Promise<void>;
  /** Hapus permanen — superadmin saja (aset.hapusPermanen). */
  public abstract remove(nibar: string): Promise<void>;
  /** Tandai terhapus tanpa menghilangkan baris (aset.hapus, admin/superadmin). */
  public abstract softDelete(nibar: string): Promise<void>;
}
