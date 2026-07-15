import { Injectable, signal, computed } from '@angular/core';
import { CarRepository } from '../../core/repositories/car.repository';
import { Car } from '../../core/models/car.model';
import { TravelLog } from '../../core/models/log.model';

const ROUTES = [
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

const INITIAL_LOGS: TravelLog[] = [
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

@Injectable({
  providedIn: 'root'
})
export class LocalCarRepository implements CarRepository {
  private carsSignal = signal<Car[]>([]);
  private logsSignal = signal<TravelLog[]>([]);
  private trackingIntervalId: any = null;

  public readonly cars = computed(() => this.carsSignal());
  public readonly logs = computed(() => this.logsSignal());

  constructor() {
    this.loadFromStorage();
    this.startSimulation();
  }

  private loadFromStorage() {
    const storedCars = localStorage.getItem('bangli_cars');
    const storedLogs = localStorage.getItem('bangli_car_logs');

    if (storedCars) {
      this.carsSignal.set(JSON.parse(storedCars));
    } else {
      const generatedCars = this.generateArmadaData();
      this.carsSignal.set(generatedCars);
      this.saveCarsToStorage(generatedCars);
    }

    if (storedLogs) {
      this.logsSignal.set(JSON.parse(storedLogs));
    } else {
      this.logsSignal.set(INITIAL_LOGS);
      this.saveLogsToStorage(INITIAL_LOGS);
    }
  }

  private saveCarsToStorage(cars: Car[]) {
    localStorage.setItem('bangli_cars', JSON.stringify(cars));
  }

  private saveLogsToStorage(logs: TravelLog[]) {
    localStorage.setItem('bangli_car_logs', JSON.stringify(logs));
  }

  // Pengaturan Ulang Database ke Bawaan
  public resetDatabase() {
    localStorage.removeItem('bangli_cars');
    localStorage.removeItem('bangli_car_logs');
    this.loadFromStorage();
  }

  private generateArmadaData(): Car[] {
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

  public addCar(carData: Omit<Car, 'id' | 'x' | 'y' | 'routeProgress' | 'speed' | 'fuelLevel' | 'routeId'>) {
    const newId = `car-${Date.now()}`;
    const randomRouteId = Math.floor(Math.random() * ROUTES.length);
    const startPoint = ROUTES[randomRouteId][0];

    const newCar: Car = {
      ...carData,
      id: newId,
      fuelLevel: carData.status === 'Service' || carData.status === 'Rusak' ? 25 : 100,
      speed: carData.status === 'Digunakan' ? 40 : 0,
      x: startPoint.x,
      y: startPoint.y,
      routeProgress: 0,
      routeId: randomRouteId
    };

    const updatedCars = [...this.carsSignal(), newCar];
    this.carsSignal.set(updatedCars);
    this.saveCarsToStorage(updatedCars);

    this.addLog(newId, newCar.plateNumber, newCar.driverName, `${newCar.agency} • Aset kendaraan dinas baru terdaftar`, 'success');
  }

  public updateCar(id: string, updatedData: Partial<Car>) {
    const updatedCars = this.carsSignal().map(car => {
      if (car.id === id) {
        let speed = car.speed;
        if (updatedData.status && updatedData.status !== 'Digunakan') {
          speed = 0;
        } else if (updatedData.status === 'Digunakan' && car.status !== 'Digunakan') {
          speed = 45;
        }

        const newCar = { ...car, ...updatedData, speed };
        
        if (updatedData.status && updatedData.status !== car.status) {
          let type: 'info' | 'warning' | 'success' = 'info';
          if (updatedData.status === 'Service') type = 'warning';
          if (updatedData.status === 'Aktif') type = 'success';
          this.addLog(id, car.plateNumber, car.driverName || 'Driver', `${car.agency} • Status diubah menjadi: ${updatedData.status}`, type);
        }

        return newCar;
      }
      return car;
    });

    this.carsSignal.set(updatedCars);
    this.saveCarsToStorage(updatedCars);
  }

  public deleteCar(id: string) {
    const carToDelete = this.carsSignal().find(c => c.id === id);
    if (!carToDelete) return;

    const updatedCars = this.carsSignal().filter(car => car.id !== id);
    this.carsSignal.set(updatedCars);
    this.saveCarsToStorage(updatedCars);

    this.addLog(id, carToDelete.plateNumber, carToDelete.driverName, `${carToDelete.agency} • Aset dihapus dari sistem`, 'danger' as any);
  }

  public addLog(carId: string, plateNumber: string, driverName: string, activity: string, type: 'info' | 'warning' | 'success' | 'danger' = 'info') {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const logType: 'info' | 'warning' | 'success' = type === 'danger' ? 'warning' : type;

    const newLog: TravelLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      carId,
      plateNumber,
      driverName,
      timestamp: dateStr,
      activity,
      type: logType
    };

    const updatedLogs = [newLog, ...this.logsSignal()].slice(0, 50);
    this.logsSignal.set(updatedLogs);
    this.saveLogsToStorage(updatedLogs);
  }

  private startSimulation() {
    if (this.trackingIntervalId) {
      clearInterval(this.trackingIntervalId);
    }

    this.trackingIntervalId = setInterval(() => {
      let carsChanged = false;
      const currentCars = this.carsSignal();

      const updatedCars = currentCars.map(car => {
        if (car.status !== 'Digunakan') {
          return car;
        }

        carsChanged = true;
        let progress = car.routeProgress + 0.003;
        let routeId = car.routeId;
        
        if (progress >= 1) {
          progress = 0;
          routeId = Math.floor(Math.random() * ROUTES.length);
          
          const checkpoints = ['Taman Kota Bangli', 'Kawasan Kintamani', 'Kecamatan Susut', 'Pura Besakih', 'Kecamatan Tembuku'];
          const randomCheckpoint = checkpoints[Math.floor(Math.random() * checkpoints.length)];
          this.addLog(
            car.id,
            car.plateNumber,
            car.driverName,
            `${car.agency} • Tiba di: ${randomCheckpoint}`,
            'info'
          );
        }

        const routePoints = ROUTES[routeId];
        const pointCount = routePoints.length;
        const segmentCount = pointCount - 1;
        const exactSegment = progress * segmentCount;
        const segmentIndex = Math.floor(exactSegment);
        const segmentProgress = exactSegment - segmentIndex;

        const startPoint = routePoints[segmentIndex];
        const endPoint = routePoints[Math.min(segmentIndex + 1, pointCount - 1)];

        const x = Math.round(startPoint.x + (endPoint.x - startPoint.x) * segmentProgress);
        const y = Math.round(startPoint.y + (endPoint.y - startPoint.y) * segmentProgress);

        let speed = car.speed + Math.floor(Math.random() * 5) - 2;
        speed = Math.max(25, Math.min(80, speed));

        let fuelLevel = car.fuelLevel;
        if (Math.random() > 0.85) {
          fuelLevel = Math.max(1, car.fuelLevel - 1);
          if (fuelLevel <= 8) {
            fuelLevel = 100;
            this.addLog(
              car.id,
              car.plateNumber,
              car.driverName,
              `${car.agency} • Melakukan pengisian bahan bakar / daya baterai`,
              'success'
            );
          }
        }

        return {
          ...car,
          x,
          y,
          routeProgress: progress,
          routeId,
          speed,
          fuelLevel
        };
      });

      if (carsChanged) {
        this.carsSignal.set(updatedCars);
      }
    }, 1000);
  }

  public destroy() {
    if (this.trackingIntervalId) {
      clearInterval(this.trackingIntervalId);
    }
  }
}
