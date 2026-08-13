import { VehicleAsset } from './vehicle-asset.model';

export interface ImportBatch {
  batchId: string;
  waktu: string;
  namaBerkas: string;
  pelakuId: string;
  pelakuNama: string;
  jumlahDitambah: number;
  jumlahDiperbarui: number;
  jumlahDilewati: number;
  /** null = NIBAR ini baru (tidak ada sebelum impor) — dipakai untuk membatalkan impor. */
  previousSnapshots: Record<string, VehicleAsset | null>;
  dibatalkan: boolean;
}
