import { Car } from '../../core/models/car.model';
import { TravelLog } from '../../core/models/log.model';

/**
 * Generator armada demo, dipindahkan apa adanya dari LocalCarRepository (Fase 1)
 * supaya perilaku "data bawaan" tetap identik setelah pindah ke IndexedDB.
 * Dipakai oleh data/db/seed.ts (instalasi baru) dan data/db/migration.ts
 * (fallback bila localStorage lama kosong).
 */

export const ROUTES = [
  [
    { x: 120, y: 350 },
    { x: 300, y: 350 },
    { x: 400, y: 230 },
    { x: 550, y: 280 }
  ],
  [
    { x: 400, y: 80 },
    { x: 400, y: 230 },
    { x: 550, y: 280 },
    { x: 700, y: 420 }
  ],
  [
    { x: 720, y: 260 },
    { x: 550, y: 280 },
    { x: 400, y: 230 },
    { x: 300, y: 350 }
  ],
  [
    { x: 750, y: 120 },
    { x: 550, y: 280 },
    { x: 400, y: 230 },
    { x: 120, y: 350 }
  ]
];

const PDF_CARS: Car[] = [
  {
    id: 'pdf-car-1',
    plateNumber: 'DK 1578 P',
    model: 'Kijang Innova TGN',
    brand: 'Toyota',
    type: 'MPV',
    agency: 'INSPEKTORAT DAERAH',
    driverName: 'Made Artawan',
    driverPhone: '0812-3987-1122',
    status: 'Aktif',
    fuelLevel: 80,
    speed: 0,
    x: 400,
    y: 230,
    routeProgress: 0,
    routeId: 0,
    acquisitionYear: 2010,
    lastServiceDate: '2026-05-10',
    nextServiceDate: '2026-11-10',
    stnkActive: true,
    price: 225300000
  },
  {
    id: 'pdf-car-2',
    plateNumber: 'DK 1905 P',
    model: 'Suzuki Arena 6X MT',
    brand: 'Suzuki',
    type: 'MPV',
    agency: 'INSPEKTORAT DAERAH',
    driverName: 'Ketut Wijaya',
    driverPhone: '0813-5544-3322',
    status: 'Digunakan',
    fuelLevel: 55,
    speed: 45,
    x: 120,
    y: 350,
    routeProgress: 0.25,
    routeId: 0,
    acquisitionYear: 2015,
    lastServiceDate: '2026-06-15',
    nextServiceDate: '2026-12-15',
    stnkActive: true,
    price: 190000000
  },
  {
    id: 'pdf-car-3',
    plateNumber: 'DK 21 P',
    model: 'Kijang Innova 2.0 G',
    brand: 'Toyota',
    type: 'MPV',
    agency: 'INSPEKTORAT DAERAH',
    driverName: 'Wayan Sudarta',
    driverPhone: '0852-3711-2299',
    status: 'Digunakan',
    fuelLevel: 90,
    speed: 60,
    x: 400,
    y: 80,
    routeProgress: 0,
    routeId: 1,
    acquisitionYear: 2018,
    lastServiceDate: '2026-04-24',
    nextServiceDate: '2026-10-24',
    stnkActive: true,
    price: 300370000
  },
  {
    id: 'pdf-car-4',
    plateNumber: 'DK 6303 P',
    model: 'YAMAHA 3SO (VEGA-R)',
    brand: 'Yamaha',
    type: 'Sepeda Motor',
    agency: 'INSPEKTORAT DAERAH',
    driverName: 'Ketut Suryadi',
    driverPhone: '0821-4433-8877',
    status: 'Service',
    fuelLevel: 30,
    speed: 0,
    x: 720,
    y: 260,
    routeProgress: 0,
    routeId: 2,
    acquisitionYear: 2006,
    lastServiceDate: '2026-07-14',
    nextServiceDate: '2026-08-14',
    stnkActive: false,
    price: 13600000
  }
];

export const INITIAL_LOGS: TravelLog[] = [
  {
    id: 'log-1',
    carId: 'pdf-car-2',
    plateNumber: 'DK 1234 AB',
    driverName: 'I Made Wijaya',
    timestamp: '26 Mei 2025',
    activity: 'Dinas Kesehatan • Mobil Toyota Avanza dipinjam',
    type: 'warning'
  },
  {
    id: 'log-2',
    carId: 'log-paj-1',
    plateNumber: 'DK 5678 CD',
    driverName: 'Ni Luh Putu Sari',
    timestamp: '24 Mei 2025',
    activity: 'Setda • Mobil Mitsubishi Pajero dipinjam',
    type: 'warning'
  },
  {
    id: 'log-3',
    carId: 'pdf-car-3',
    plateNumber: 'DK 9101 EF',
    driverName: 'Ketut Gede Darma',
    timestamp: '24 Mei 2025',
    activity: 'Dinas PUPR • Mobil Toyota Innova dikembalikan',
    type: 'success'
  },
  {
    id: 'log-4',
    carId: 'log-elf-1',
    plateNumber: 'DK 2468 GH',
    driverName: 'I Komang Adi',
    timestamp: '23 Mei 2025',
    activity: 'Dinas Pendidikan • Mobil Isuzu Elf Bus dipinjam',
    type: 'warning'
  },
  {
    id: 'log-5',
    carId: 'log-crv-1',
    plateNumber: 'DK 1357 IJ',
    driverName: 'Putu Agus Mahendra',
    timestamp: '23 Mei 2025',
    activity: 'BPKPD • Mobil Honda CR-V dikembalikan',
    type: 'success'
  }
];

export function generateLegacyCars(): Car[] {
  const cars: Car[] = [];
  cars.push(...PDF_CARS);

  const opdTargets = [
    { name: 'Sekretariat Daerah', count: 42 },
    { name: 'Dinas Pekerjaan Umum & Penataan Ruang', count: 38 },
    { name: 'Dinas Kesehatan', count: 28 },
    { name: 'Dinas Pendidikan, Pemuda & Olahraga', count: 26 },
    { name: 'Dinas Perhubungan', count: 22 },
    { name: 'Satuan Polisi Pamong Praja', count: 18 },
    { name: 'Dinas Sosial', count: 16 },
    { name: 'Badan Pengelolaan Keuangan, Pendapatan & Aset Daerah', count: 14 },
    { name: 'Kecamatan Bangli', count: 12 },
    { name: 'INSPEKTORAT DAERAH', count: 40 }
  ];

  const carBrands = ['Toyota', 'Mitsubishi', 'Honda', 'Hyundai', 'Suzuki', 'Yamaha', 'Honda Motor'];
  const carModels = {
    Toyota: ['Avanza', 'Innova', 'Camry', 'Fortuner', 'Hiace'],
    Mitsubishi: ['Pajero Sport', 'L300', 'Triton'],
    Honda: ['CR-V', 'HR-V', 'Civic', 'Brio'],
    Hyundai: ['Ioniq 5', 'Santa Fe'],
    Suzuki: ['APV Arena', 'Carry PickUp'],
    Yamaha: ['Vega-R', 'NMAX', 'Jupiter'],
    'Honda Motor': ['Supra X', 'Vario', 'PCX']
  };

  let activeTarget = 128 - 1;
  let usedTarget = 87 - 2;
  let serviceTarget = 18 - 1;
  let brokenTarget = 23;
  let taxExpiredTarget = 23 - 1;

  let counterId = 10;

  opdTargets.forEach(opd => {
    let itemsToGenerate = opd.count;
    if (opd.name === 'INSPEKTORAT DAERAH') {
      itemsToGenerate -= 4;
    }

    for (let i = 0; i < itemsToGenerate; i++) {
      let status: 'Aktif' | 'Digunakan' | 'Service' | 'Rusak' = 'Aktif';
      if (usedTarget > 0) {
        status = 'Digunakan';
        usedTarget--;
      } else if (serviceTarget > 0) {
        status = 'Service';
        serviceTarget--;
      } else if (brokenTarget > 0) {
        status = 'Rusak';
        brokenTarget--;
      } else {
        activeTarget--;
      }

      let stnkActive = true;
      if (taxExpiredTarget > 0) {
        stnkActive = false;
        taxExpiredTarget--;
      }

      const brand = carBrands[Math.floor(Math.random() * carBrands.length)];
      const modelList = carModels[brand as keyof typeof carModels];
      const model = modelList[Math.floor(Math.random() * modelList.length)];

      let type: any = 'MPV';
      if (brand === 'Yamaha' || brand === 'Honda Motor') {
        type = 'Sepeda Motor';
      } else if (model === 'CR-V' || model === 'HR-V' || model === 'Pajero Sport' || model === 'Fortuner') {
        type = 'SUV';
      } else if (model === 'Camry' || model === 'Civic') {
        type = 'Sedan';
      } else if (model === 'Ioniq 5') {
        type = 'Elektrik';
      }

      const digit = 1000 + counterId;
      const alphabet = String.fromCharCode(65 + (counterId % 26)) + String.fromCharCode(65 + ((counterId + 5) % 26));
      const plateNumber = `DK ${digit} ${alphabet}`;

      const randomRouteId = Math.floor(Math.random() * ROUTES.length);
      const route = ROUTES[randomRouteId];
      const startPoint = route[0];

      const acquisitionYear = 2012 + (counterId % 13);
      const lastServiceDate = `2026-0${1 + (counterId % 6)}-${10 + (counterId % 15)}`;
      const nextServiceDate = `2026-1${1 + (counterId % 2)}-${10 + (counterId % 15)}`;

      cars.push({
        id: `gen-car-${counterId}`,
        plateNumber,
        model,
        brand,
        type,
        agency: opd.name,
        driverName: `Driver ${counterId}`,
        driverPhone: `0812-9988-${8000 + counterId}`,
        status,
        fuelLevel: status === 'Digunakan' ? 40 + (counterId % 55) : (status === 'Rusak' ? 12 : 90),
        speed: status === 'Digunakan' ? 35 + (counterId % 30) : 0,
        x: startPoint.x,
        y: startPoint.y,
        routeProgress: 0,
        routeId: randomRouteId,
        acquisitionYear,
        lastServiceDate,
        nextServiceDate,
        stnkActive,
        price: 150000000 + (counterId * 1500000)
      });

      counterId++;
    }
  });

  return cars;
}
