import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('vehicle_assets')
export class VehicleAssetEntity {
  @PrimaryColumn({ type: 'varchar', length: 45 })
  nibar!: string;

  @Column({ name: 'nomor_register', type: 'varchar' })
  nomorRegister!: string;

  @Column({ name: 'kode_barang_akun', type: 'varchar' })
  kodeBarangAkun!: string;

  @Column({ name: 'kode_barang_kelompok', type: 'varchar' })
  kodeBarangKelompok!: string;

  @Column({ name: 'kode_barang_jenis', type: 'varchar' })
  kodeBarangJenis!: string;

  @Column({ name: 'kode_barang_objek', type: 'varchar' })
  kodeBarangObjek!: string;

  @Column({ name: 'kode_barang_rincian_objek', type: 'varchar' })
  kodeBarangRincianObjek!: string;

  @Column({ name: 'kode_barang_sub_rincian', type: 'varchar' })
  kodeBarangSubRincian!: string;

  @Column({ name: 'kode_barang_sub_sub', type: 'varchar' })
  kodeBarangSubSub!: string;

  @Column({ name: 'kode_barang_full', type: 'varchar' })
  kodeBarangFull!: string;

  @Column({ name: 'nama_barang', type: 'varchar' })
  namaBarang!: string;

  @Column({ name: 'spesifikasi_nama', type: 'varchar' })
  spesifikasiNama!: string;

  @Column({ name: 'spesifikasi_lainnya', type: 'varchar' })
  spesifikasiLainnya!: string;

  @Column({ name: 'merek_tipe', type: 'varchar' })
  merekTipe!: string;

  @Column({ type: 'varchar' })
  merek!: string;

  @Column({ type: 'varchar' })
  tipe!: string;

  @Column({ type: 'varchar' })
  lokasi!: string;

  @Column({ name: 'nomor_polisi', type: 'varchar' })
  nomorPolisi!: string;

  @Column({ name: 'nomor_rangka', type: 'varchar' })
  nomorRangka!: string;

  @Column({ name: 'nomor_bpkb', type: 'varchar', nullable: true })
  nomorBpkb!: string | null;

  @Column({ type: 'integer' })
  jumlah!: number;

  @Column({ type: 'varchar' })
  satuan!: string;

  @Column({ name: 'harga_satuan_perolehan', type: 'double precision' })
  hargaSatuanPerolehan!: number;

  @Column({ name: 'nilai_perolehan', type: 'double precision' })
  nilaiPerolehan!: number;

  @Column({ name: 'cara_perolehan', type: 'varchar' })
  caraPerolehan!: string;

  @Column({ name: 'tanggal_perolehan', type: 'varchar' })
  tanggalPerolehan!: string;

  @Column({ name: 'status_penggunaan', type: 'varchar' })
  statusPenggunaan!: string;

  @Column({ type: 'varchar', nullable: true })
  pemegang!: string | null;

  @Column({ name: 'is_operasional_bersama', type: 'boolean' })
  isOperasionalBersama!: boolean;

  @Column({ name: 'foto_id', type: 'varchar', nullable: true })
  fotoId!: string | null;

  @Column({ name: 'masa_berlaku_pajak', type: 'varchar' })
  masaBerlakuPajak!: string;

  @Column({ name: 'masa_berlaku_stnk', type: 'varchar' })
  masaBerlakuStnk!: string;

  @Column({ name: 'tahun_anggaran', type: 'integer' })
  tahunAnggaran!: number;

  @Column({ name: 'kode_lokasi', type: 'varchar' })
  kodeLokasi!: string;

  @Column({ name: 'sumber_impor_id', type: 'varchar' })
  sumberImporId!: string;

  @Column({ name: 'dihapus_pada', type: 'varchar', nullable: true })
  dihapusPada!: string | null;
}
