/**
 * Pakta integritas pemegang kendaraan perorangan (bukan kendaraan operasional
 * bersama). Hanya data ringkas — isi berkas diambil terpisah saat dibuka.
 */
export interface PaktaIntegritas {
  nibar: string;
  pemegang: string; // nama pemegang saat berkas diunggah
  fileName: string;
  mimeType: string;
  size: number;
  diunggahPada: string; // ISO 8601
  diunggahOleh: string;
}
