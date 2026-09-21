import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleAssetEntity } from './vehicle-asset.entity';
import { UpsertVehicleAssetDto } from './dto/upsert-vehicle-asset.dto';

export interface VehicleAssetDto {
  nibar: string;
  nomorRegister: string;
  kodeBarang: {
    akun: string;
    kelompok: string;
    jenis: string;
    objek: string;
    rincianObjek: string;
    subRincian: string;
    subSub: string;
    full: string;
  };
  namaBarang: string;
  spesifikasiNama: string;
  spesifikasiLainnya: string;
  merekTipe: string;
  merek: string;
  tipe: string;
  lokasi: string;
  nomorPolisi: string;
  nomorRangka: string;
  nomorBpkb: string | null;
  jumlah: number;
  satuan: string;
  hargaSatuanPerolehan: number;
  nilaiPerolehan: number;
  caraPerolehan: string;
  tanggalPerolehan: string;
  statusPenggunaan: string;
  pemegang: string | null;
  isOperasionalBersama: boolean;
  fotoId: string | null;
  masaBerlakuPajak: string;
  masaBerlakuStnk: string;
  tahunAnggaran: number;
  kodeLokasi: string;
  sumberImporId: string;
  dihapusPada: string | null;
}

function toDto(entity: VehicleAssetEntity): VehicleAssetDto {
  return {
    nibar: entity.nibar,
    nomorRegister: entity.nomorRegister,
    kodeBarang: {
      akun: entity.kodeBarangAkun,
      kelompok: entity.kodeBarangKelompok,
      jenis: entity.kodeBarangJenis,
      objek: entity.kodeBarangObjek,
      rincianObjek: entity.kodeBarangRincianObjek,
      subRincian: entity.kodeBarangSubRincian,
      subSub: entity.kodeBarangSubSub,
      full: entity.kodeBarangFull
    },
    namaBarang: entity.namaBarang,
    spesifikasiNama: entity.spesifikasiNama,
    spesifikasiLainnya: entity.spesifikasiLainnya,
    merekTipe: entity.merekTipe,
    merek: entity.merek,
    tipe: entity.tipe,
    lokasi: entity.lokasi,
    nomorPolisi: entity.nomorPolisi,
    nomorRangka: entity.nomorRangka,
    nomorBpkb: entity.nomorBpkb,
    jumlah: entity.jumlah,
    satuan: entity.satuan,
    hargaSatuanPerolehan: entity.hargaSatuanPerolehan,
    nilaiPerolehan: entity.nilaiPerolehan,
    caraPerolehan: entity.caraPerolehan,
    tanggalPerolehan: entity.tanggalPerolehan,
    statusPenggunaan: entity.statusPenggunaan,
    pemegang: entity.pemegang,
    isOperasionalBersama: entity.isOperasionalBersama,
    fotoId: entity.fotoId,
    masaBerlakuPajak: entity.masaBerlakuPajak,
    masaBerlakuStnk: entity.masaBerlakuStnk,
    tahunAnggaran: entity.tahunAnggaran,
    kodeLokasi: entity.kodeLokasi,
    sumberImporId: entity.sumberImporId,
    dihapusPada: entity.dihapusPada
  };
}

function toEntity(dto: UpsertVehicleAssetDto): VehicleAssetEntity {
  const entity = new VehicleAssetEntity();
  entity.nibar = dto.nibar;
  entity.nomorRegister = dto.nomorRegister;
  entity.kodeBarangAkun = dto.kodeBarang.akun;
  entity.kodeBarangKelompok = dto.kodeBarang.kelompok;
  entity.kodeBarangJenis = dto.kodeBarang.jenis;
  entity.kodeBarangObjek = dto.kodeBarang.objek;
  entity.kodeBarangRincianObjek = dto.kodeBarang.rincianObjek;
  entity.kodeBarangSubRincian = dto.kodeBarang.subRincian;
  entity.kodeBarangSubSub = dto.kodeBarang.subSub;
  entity.kodeBarangFull = dto.kodeBarang.full;
  entity.namaBarang = dto.namaBarang;
  entity.spesifikasiNama = dto.spesifikasiNama;
  entity.spesifikasiLainnya = dto.spesifikasiLainnya;
  entity.merekTipe = dto.merekTipe;
  entity.merek = dto.merek;
  entity.tipe = dto.tipe;
  entity.lokasi = dto.lokasi;
  entity.nomorPolisi = dto.nomorPolisi;
  entity.nomorRangka = dto.nomorRangka;
  entity.nomorBpkb = dto.nomorBpkb ?? null;
  entity.jumlah = dto.jumlah;
  entity.satuan = dto.satuan;
  entity.hargaSatuanPerolehan = dto.hargaSatuanPerolehan;
  entity.nilaiPerolehan = dto.nilaiPerolehan;
  entity.caraPerolehan = dto.caraPerolehan;
  entity.tanggalPerolehan = dto.tanggalPerolehan;
  entity.statusPenggunaan = dto.statusPenggunaan;
  entity.pemegang = dto.pemegang ?? null;
  entity.isOperasionalBersama = dto.isOperasionalBersama;
  entity.fotoId = dto.fotoId ?? null;
  entity.masaBerlakuPajak = dto.masaBerlakuPajak;
  entity.masaBerlakuStnk = dto.masaBerlakuStnk;
  entity.tahunAnggaran = dto.tahunAnggaran;
  entity.kodeLokasi = dto.kodeLokasi;
  entity.sumberImporId = dto.sumberImporId;
  entity.dihapusPada = dto.dihapusPada ?? null;
  return entity;
}

@Injectable()
export class VehicleAssetService {
  constructor(
    @InjectRepository(VehicleAssetEntity)
    private readonly repository: Repository<VehicleAssetEntity>
  ) {}

  async findAll(): Promise<VehicleAssetDto[]> {
    const entities = await this.repository.find();
    return entities.map(toDto);
  }

  async findOne(nibar: string): Promise<VehicleAssetDto> {
    const entity = await this.repository.findOneBy({ nibar });
    if (!entity) throw new NotFoundException(`Aset dengan NIBAR "${nibar}" tidak ditemukan.`);
    return toDto(entity);
  }

  async upsert(nibar: string, dto: UpsertVehicleAssetDto): Promise<VehicleAssetDto> {
    const entity = toEntity(dto);
    entity.nibar = nibar;
    await this.repository.save(entity);
    return this.findOne(nibar);
  }

  /**
   * Dulu `DELETE` beneran. Sekarang penghapusan aset di aplikasi ini hanya
   * ada satu rasa — soft delete — jadi endpoint lama diarahkan ke sana supaya
   * klien versi lama tidak tiba-tiba kehilangan baris BMD. Nilai perolehan
   * aset daerah harus tetap bisa ditelusuri sesudah barangnya dihapus dari
   * daftar aktif; itulah gunanya baris yang tetap tinggal.
   */
  remove(nibar: string): Promise<VehicleAssetDto> {
    return this.softDelete(nibar);
  }

  /**
   * Penanda `dihapusPada` di sini sengaja tetap kolom `varchar` ISO miliknya
   * sendiri, bukan `@DeleteDateColumn` seperti entity lain: nilainya ikut
   * terkirim di DTO dan dipakai frontend (pembatalan impor menyimpannya
   * sebagai bagian dari snapshot), jadi ia memang harus terlihat, bukan
   * disaring diam-diam oleh TypeORM.
   */
  async softDelete(nibar: string): Promise<VehicleAssetDto> {
    const entity = await this.repository.findOneBy({ nibar });
    if (!entity) throw new NotFoundException(`Aset dengan NIBAR "${nibar}" tidak ditemukan.`);
    entity.dihapusPada ??= new Date().toISOString();
    await this.repository.save(entity);
    return toDto(entity);
  }
}
