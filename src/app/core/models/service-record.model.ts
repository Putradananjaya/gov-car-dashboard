export interface ServiceRecord {
  id: string;
  nibar: string;
  tahun: number;
  uraian: string; // narasi asli dari sumber, dipertahankan apa adanya
  odometerKm: number | null;
  biaya: number | null;
  tanggal: string | null; // null bila tidak tercantum
  sumber: 'impor' | 'input-manual';
}
