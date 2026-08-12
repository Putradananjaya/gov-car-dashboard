export type KondisiAset = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
export type StatusOperasional = 'Tersedia' | 'Dipinjam' | 'Servis' | 'Tidak Layak';

export interface Telemetri {
  lat: number;
  lng: number; // koordinat asli, bukan x/y kanvas
  kecepatan: number;
  levelBbm: number;
  sumber: 'simulasi' | 'perangkat';
  waktu: string;
}

/** Data yang dimiliki aplikasi — tidak pernah ditimpa proses impor. */
export interface VehicleOperational {
  nibar: string; // foreign key ke VehicleAsset
  kondisi: KondisiAset;
  status: StatusOperasional;
  penanggungJawabId: string | null; // user id, bukan nama bebas
  telepon: string | null; // tidak ada di sumber e-BMD — diisi manual
  telemetri: Telemetri | null; // null bila unit tidak terpasang GPS
  catatan: string;
  diperbaruiPada: string;
  diperbaruiOleh: string;
}
