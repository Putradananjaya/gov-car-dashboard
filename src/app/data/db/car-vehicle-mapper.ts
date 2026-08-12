import { Car } from '../../core/models/car.model';
import { KodeBarang, VehicleAsset } from '../../core/models/vehicle-asset.model';
import { KondisiAset, StatusOperasional, Telemetri, VehicleOperational } from '../../core/models/vehicle-operational.model';
import { ROUTES } from './legacy-car-generator';

/**
 * Pemetaan Car (model demo lama, Fase 1) <-> VehicleAsset/VehicleOperational
 * (model e-BMD, Fase 2). Dipakai untuk migrasi data lama dan untuk menyusun
 * data demo bawaan. Hasilnya best-effort/placeholder — akan tertimpa begitu
 * impor Excel e-BMD sungguhan tersedia di Fase 3.
 */

const KODE_BARANG_PER_TIPE: Record<Car['type'], Omit<KodeBarang, 'full'> & { kodeSuffix: string }> = {
  Sedan: { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '01', subRincian: '04', subSub: '001', kodeSuffix: '01' },
  SUV: { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '01', subRincian: '04', subSub: '001', kodeSuffix: '02' },
  MPV: { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '01', subRincian: '04', subSub: '001', kodeSuffix: '03' },
  Elektrik: { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '01', subRincian: '04', subSub: '001', kodeSuffix: '04' },
  'Sepeda Motor': { akun: '1', kelompok: '3', jenis: '2', objek: '02', rincianObjek: '02', subRincian: '01', subSub: '001', kodeSuffix: '05' }
};

const STATUS_OPERASIONAL_PER_CAR_STATUS: Record<Car['status'], StatusOperasional> = {
  Aktif: 'Tersedia',
  Digunakan: 'Dipinjam',
  Service: 'Servis',
  Rusak: 'Tidak Layak'
};

const CAR_STATUS_PER_STATUS_OPERASIONAL: Record<StatusOperasional, Car['status']> = {
  Tersedia: 'Aktif',
  Dipinjam: 'Digunakan',
  Servis: 'Service',
  'Tidak Layak': 'Rusak'
};

// Sekitar pusat Kabupaten Bangli — dipakai sebagai jangkar telemetri simulasi.
const BANGLI_CENTER = { lat: -8.4547, lng: 115.3542 };

function kodeBarang(type: Car['type']): KodeBarang {
  const { kodeSuffix, ...base } = KODE_BARANG_PER_TIPE[type];
  return {
    ...base,
    full: `${base.akun}.${base.kelompok}.${base.jenis}.${base.objek}.${base.rincianObjek}.${base.subRincian}.${base.subSub}.${kodeSuffix}`
  };
}

export function carToVehicleAsset(car: Car, tahunAnggaran: number, kodeLokasi: string, sumberImporId: string): VehicleAsset {
  return {
    nibar: car.id,
    nomorRegister: '',
    kodeBarang: kodeBarang(car.type),
    namaBarang: car.type,
    spesifikasiNama: car.model,
    spesifikasiLainnya: `${car.brand} ${car.model}`.trim(),
    merekTipe: `${car.brand} ${car.model}`.trim(),
    merek: car.brand,
    tipe: car.model,
    lokasi: car.agency,
    nomorPolisi: car.plateNumber,
    nomorRangka: '',
    nomorBpkb: null,
    jumlah: 1,
    satuan: 'Unit',
    hargaSatuanPerolehan: car.price,
    nilaiPerolehan: car.price,
    caraPerolehan: 'Pengadaan APBD',
    tanggalPerolehan: `${car.acquisitionYear}-01-01`,
    statusPenggunaan: car.agency,
    pemegang: car.driverName || null,
    isOperasionalBersama: !car.driverName,
    fotoId: null,
    masaBerlakuPajak: car.stnkActive ? car.nextServiceDate : car.lastServiceDate,
    masaBerlakuStnk: car.stnkActive ? car.nextServiceDate : car.lastServiceDate,
    tahunAnggaran,
    kodeLokasi,
    sumberImporId,
    dihapusPada: null
  };
}

export function carToVehicleOperational(car: Car, diperbaruiOleh: string): VehicleOperational {
  const kondisi: KondisiAset = car.status === 'Rusak' ? 'Rusak Berat' : 'Baik';
  const status = STATUS_OPERASIONAL_PER_CAR_STATUS[car.status];

  let telemetri: Telemetri | null = null;
  if (status === 'Dipinjam') {
    const jitter = () => (Math.random() - 0.5) * 0.05;
    telemetri = {
      lat: BANGLI_CENTER.lat + jitter(),
      lng: BANGLI_CENTER.lng + jitter(),
      kecepatan: car.speed,
      levelBbm: car.fuelLevel,
      sumber: 'simulasi',
      waktu: new Date().toISOString()
    };
  }

  return {
    nibar: car.id,
    kondisi,
    status,
    penanggungJawabId: null,
    telepon: car.driverPhone || null,
    telemetri,
    catatan: '',
    diperbaruiPada: new Date().toISOString(),
    diperbaruiOleh
  };
}

/** Kebalikan dari carToVehicleAsset/carToVehicleOperational. Posisi x/y kanvas
 * TIDAK termasuk di sini — itu tanggung jawab TelemetrySimulatorService. */
export function vehicleToCarBase(asset: VehicleAsset, operational: VehicleOperational): Omit<Car, 'x' | 'y' | 'routeProgress' | 'routeId'> {
  const acquisitionYear = Number(asset.tanggalPerolehan.slice(0, 4)) || new Date().getFullYear();
  const stnkActive = new Date(asset.masaBerlakuStnk) >= new Date();

  return {
    id: asset.nibar,
    plateNumber: asset.nomorPolisi,
    model: asset.tipe,
    brand: asset.merek,
    type: (asset.namaBarang as Car['type']) || 'MPV',
    agency: asset.lokasi,
    driverName: asset.pemegang || '',
    driverPhone: operational.telepon || '',
    status: CAR_STATUS_PER_STATUS_OPERASIONAL[operational.status],
    fuelLevel: operational.telemetri?.levelBbm ?? (operational.kondisi === 'Rusak Berat' ? 12 : 90),
    speed: operational.telemetri?.kecepatan ?? 0,
    acquisitionYear,
    lastServiceDate: asset.masaBerlakuPajak,
    nextServiceDate: asset.masaBerlakuStnk,
    stnkActive,
    price: asset.nilaiPerolehan
  };
}

/**
 * Posisi "diam" yang stabil untuk setiap NIBAR pada kanvas ilustratif
 * /tracking, dipakai saat simulasi telemetri tidak sedang berjalan (atau
 * kendaraan tidak berstatus Dipinjam). Dihitung dari hash string, bukan
 * disimpan — supaya tidak perlu menulis x/y ke IndexedDB (keputusan #6).
 */
export function deterministicRestingPosition(nibar: string): { x: number; y: number; routeId: number } {
  let hash = 0;
  for (let i = 0; i < nibar.length; i++) {
    hash = (hash * 31 + nibar.charCodeAt(i)) >>> 0;
  }
  const routeId = hash % ROUTES.length;
  const start = ROUTES[routeId][0];
  return { x: start.x, y: start.y, routeId };
}
