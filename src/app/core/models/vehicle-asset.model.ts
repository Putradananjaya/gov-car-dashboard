export interface KodeBarang {
  akun: string;
  kelompok: string;
  jenis: string; // Kol. A, B, C
  objek: string;
  rincianObjek: string; // Kol. D, E
  subRincian: string;
  subSub: string; // Kol. F, H
  full: string; // "1.3.2.02.01.04.001"
}

/**
 * Cerminan langsung kolom e-BMD (FORMAT II.O.2.2). Hanya boleh diubah lewat
 * impor Excel atau form khusus pengurus barang — bukan oleh alur operasional.
 */
export interface VehicleAsset {
  nibar: string; // Kol. J — identitas utama
  nomorRegister: string; // Kol. K
  kodeBarang: KodeBarang; // Kol. A-H, berjenjang
  namaBarang: string; // Kol. I
  spesifikasiNama: string; // Kol. L
  spesifikasiLainnya: string; // Kol. M
  merekTipe: string; // Kol. O — string mentah, dipertahankan untuk ditelusuri
  merek: string; // hasil parsing dari merekTipe
  tipe: string; // hasil parsing dari merekTipe
  lokasi: string; // Kol. P
  nomorPolisi: string; // Kol. Q
  nomorRangka: string; // Kol. R
  nomorBpkb: string | null; // Kol. S — boleh kosong
  jumlah: number; // Kol. T
  satuan: string; // Kol. U
  hargaSatuanPerolehan: number; // Kol. W
  nilaiPerolehan: number; // Kol. X
  caraPerolehan: string; // Kol. Y
  tanggalPerolehan: string; // Kol. Z — ISO 8601
  statusPenggunaan: string; // Kol. AA — nama OPD penatausaha
  pemegang: string | null; // Kol. AC — null bila "Kendaraan Operasional"
  isOperasionalBersama: boolean; // true bila Kol. AC = "Kendaraan Operasional"
  fotoId: string | null; // Kol. AE — referensi ke object store foto
  masaBerlakuPajak: string; // Kol. AG — ISO 8601
  masaBerlakuStnk: string; // Kol. AI — ISO 8601
  tahunAnggaran: number; // dari kop laporan
  kodeLokasi: string; // dari kop laporan
  sumberImporId: string; // referensi batch impor, untuk telusur audit
  dihapusPada: string | null; // ISO 8601 — soft delete; null berarti masih aktif
}
