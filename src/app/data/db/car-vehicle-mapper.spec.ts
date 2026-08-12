import { Car } from '../../core/models/car.model';
import { carToVehicleAsset, carToVehicleOperational, deterministicRestingPosition, vehicleToCarBase } from './car-vehicle-mapper';

function buildCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 'car-1',
    plateNumber: 'DK 1234 AB',
    model: 'Innova',
    brand: 'Toyota',
    type: 'MPV',
    agency: 'Sekretariat Daerah',
    driverName: 'Budi',
    driverPhone: '0812-0000-0000',
    status: 'Aktif',
    fuelLevel: 90,
    speed: 0,
    x: 0,
    y: 0,
    routeProgress: 0,
    routeId: 0,
    acquisitionYear: 2020,
    lastServiceDate: '2026-01-01',
    nextServiceDate: '2026-07-01',
    stnkActive: true,
    price: 300000000,
    ...overrides
  };
}

describe('car-vehicle-mapper', () => {
  it('maps an Aktif car to Tersedia/Baik with no telemetry', () => {
    const car = buildCar({ status: 'Aktif' });
    const operational = carToVehicleOperational(car, 'tester');

    expect(operational.status).toBe('Tersedia');
    expect(operational.kondisi).toBe('Baik');
    expect(operational.telemetri).toBeNull();
  });

  it('maps a Rusak car to Tidak Layak/Rusak Berat', () => {
    const car = buildCar({ status: 'Rusak' });
    const operational = carToVehicleOperational(car, 'tester');

    expect(operational.status).toBe('Tidak Layak');
    expect(operational.kondisi).toBe('Rusak Berat');
  });

  it('maps a Digunakan car to Dipinjam with simulated telemetry', () => {
    const car = buildCar({ status: 'Digunakan', speed: 45, fuelLevel: 60 });
    const operational = carToVehicleOperational(car, 'tester');

    expect(operational.status).toBe('Dipinjam');
    expect(operational.telemetri).not.toBeNull();
    expect(operational.telemetri?.sumber).toBe('simulasi');
    expect(operational.telemetri?.kecepatan).toBe(45);
  });

  it('carries the car id through as the placeholder nibar', () => {
    const car = buildCar({ id: 'gen-car-42' });
    const asset = carToVehicleAsset(car, 2026, '20.00.00', 'test');

    expect(asset.nibar).toBe('gen-car-42');
    expect(asset.nomorPolisi).toBe(car.plateNumber);
  });

  it('round-trips status/type through vehicleToCarBase', () => {
    const car = buildCar({ status: 'Digunakan', type: 'SUV' });
    const asset = carToVehicleAsset(car, 2026, '20.00.00', 'test');
    const operational = carToVehicleOperational(car, 'tester');

    const rebuilt = vehicleToCarBase(asset, operational);

    expect(rebuilt.status).toBe('Digunakan');
    expect(rebuilt.type).toBe('SUV');
    expect(rebuilt.plateNumber).toBe(car.plateNumber);
  });

  it('deterministicRestingPosition is stable for the same nibar', () => {
    const first = deterministicRestingPosition('gen-car-42');
    const second = deterministicRestingPosition('gen-car-42');

    expect(first).toEqual(second);
  });
});
