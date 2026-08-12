import { VehicleView } from '../core/adapters/vehicle-view.model';

export interface AssetGroup {
  namaBarang: string;
  items: VehicleView[];
  subtotalJumlah: number;
  subtotalNilai: number;
}

/** Kelompokkan aset per kategori (namaBarang) dengan subtotal jumlah & nilai, urut alfabet. */
export function groupAssetsByNamaBarang(assets: VehicleView[]): AssetGroup[] {
  const groups = new Map<string, VehicleView[]>();

  for (const asset of assets) {
    const key = asset.namaBarang || '(Tanpa Kategori)';
    const items = groups.get(key) ?? [];
    items.push(asset);
    groups.set(key, items);
  }

  return [...groups.entries()]
    .map(([namaBarang, items]) => ({
      namaBarang,
      items,
      subtotalJumlah: items.reduce((sum, item) => sum + item.jumlah, 0),
      subtotalNilai: items.reduce((sum, item) => sum + item.nilaiPerolehan, 0)
    }))
    .sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));
}

export type StatusPajak = 'berlaku' | 'segera-habis' | 'kadaluarsa' | 'tidak-diketahui';

const AMBANG_SEGERA_HABIS_HARI = 60;

/** Status masa pajak relatif ke `now` — "segera-habis" dalam ≤60 hari (dokumen v2 dashboard admin). */
export function computeStatusPajak(masaBerlakuPajak: string, now: Date = new Date()): StatusPajak {
  if (!masaBerlakuPajak) return 'tidak-diketahui';

  const due = new Date(`${masaBerlakuPajak}T00:00:00Z`);
  if (Number.isNaN(due.getTime())) return 'tidak-diketahui';

  const diffDays = (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

  if (diffDays < 0) return 'kadaluarsa';
  if (diffDays <= AMBANG_SEGERA_HABIS_HARI) return 'segera-habis';
  return 'berlaku';
}
