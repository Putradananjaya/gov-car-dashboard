import { Signal } from '@angular/core';
import { Car } from '../models/car.model';
import { TravelLog } from '../models/log.model';

export abstract class CarRepository {
  public abstract readonly cars: Signal<Car[]>;
  public abstract readonly logs: Signal<TravelLog[]>;

  public abstract addCar(carData: Omit<Car, 'id' | 'x' | 'y' | 'routeProgress' | 'speed' | 'fuelLevel' | 'routeId'>): void;
  public abstract updateCar(id: string, updatedData: Partial<Car>): void;
  public abstract deleteCar(id: string): void;
  public abstract addLog(
    carId: string,
    plateNumber: string,
    driverName: string,
    activity: string,
    type?: 'info' | 'warning' | 'success' | 'danger'
  ): void;
}
