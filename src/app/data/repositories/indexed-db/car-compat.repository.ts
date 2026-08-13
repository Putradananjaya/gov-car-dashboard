import { Injectable, computed, inject, signal } from '@angular/core';
import { CarRepository } from '../../../core/repositories/car.repository';
import { Car } from '../../../core/models/car.model';
import { TravelLog } from '../../../core/models/log.model';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { TelemetrySimulatorService } from '../../simulation/telemetry-simulator.service';
import { carToVehicleAsset, carToVehicleOperational, deterministicRestingPosition, vehicleToCarBase } from '../../db/car-vehicle-mapper';
import { buildSeedFleet } from '../../db/seed';
import { INITIAL_LOGS } from '../../db/legacy-car-generator';

const LOGS_STORAGE_KEY = 'bangli_car_logs';

/**
 * Menggantikan LocalCarRepository (Fase 1). Mengimplementasikan CarRepository
 * apa adanya (kontrak tidak berubah) dengan menggabungkan VehicleAssetRepository
 * + VehicleOperationalRepository (data e-BMD di IndexedDB) + TelemetrySimulatorService
 * (posisi kanvas sementara). dashboard/inventory/tracking/car-form tidak perlu tahu
 * perubahan ini — "Car masih ada tapi hanya sebagai adapter" (Fase 2, dokumen v2).
 */
@Injectable({ providedIn: 'root' })
export class CarCompatRepository implements CarRepository {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);
  private telemetrySimulator = inject(TelemetrySimulatorService);

  private logsSignal = signal<TravelLog[]>([]);
  public readonly logs = computed(() => this.logsSignal());

  public readonly cars = computed<Car[]>(() => {
    const operationalByNibar = new Map(this.operationalRepository.operational().map(o => [o.nibar, o]));
    const positions = this.telemetrySimulator.positions();

    const result: Car[] = [];
    for (const asset of this.assetRepository.assets()) {
      const operational = operationalByNibar.get(asset.nibar);
      if (!operational) continue;

      const base = vehicleToCarBase(asset, operational);
      const live = positions.get(asset.nibar);

      if (live) {
        result.push({ ...base, x: live.x, y: live.y, routeProgress: live.routeProgress, routeId: live.routeId, speed: live.speed, fuelLevel: live.fuelLevel });
      } else {
        const resting = deterministicRestingPosition(asset.nibar);
        result.push({ ...base, x: resting.x, y: resting.y, routeProgress: 0, routeId: resting.routeId, speed: 0 });
      }
    }
    return result;
  });

  constructor() {
    this.loadLogsFromStorage();
  }

  private loadLogsFromStorage(): void {
    const stored = localStorage.getItem(LOGS_STORAGE_KEY);
    if (stored) {
      try {
        this.logsSignal.set(JSON.parse(stored));
        return;
      } catch {
        // lanjut ke default di bawah
      }
    }
    this.logsSignal.set(INITIAL_LOGS);
    this.saveLogsToStorage(INITIAL_LOGS);
  }

  private saveLogsToStorage(logs: TravelLog[]): void {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  }

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  public addCar(carData: Omit<Car, 'id' | 'x' | 'y' | 'routeProgress' | 'speed' | 'fuelLevel' | 'routeId'>): void {
    const newId = this.generateCarNibar();
    const fullCar: Car = {
      ...carData,
      id: newId,
      fuelLevel: carData.status === 'Service' || carData.status === 'Rusak' ? 25 : 100,
      speed: 0,
      x: 0,
      y: 0,
      routeProgress: 0,
      routeId: 0
    };

    const asset = carToVehicleAsset(fullCar, new Date().getFullYear(), '20.00.00', 'input-manual');
    const operational = carToVehicleOperational(fullCar, this.actorLabel());

    void Promise.all([this.assetRepository.upsert(asset), this.operationalRepository.upsert(operational)])
      .then(() => {
        this.addLog(newId, fullCar.plateNumber, fullCar.driverName, `${fullCar.agency} • Aset kendaraan dinas baru terdaftar`, 'success');
        void this.auditRepository.append({
          pelakuId: this.actorId(),
          pelakuNama: this.actorLabel(),
          aksi: 'tambah',
          entitas: 'VehicleAsset',
          entitasId: newId,
          nilaiBaru: asset
        });
      })
      .catch(error => {
        console.error('Gagal menyimpan aset kendaraan baru:', error);
        this.addLog(newId, fullCar.plateNumber, fullCar.driverName, `${fullCar.agency} • Gagal menyimpan aset — coba lagi`, 'danger');
      });
  }

  /** NIBAR 45 karakter — CarRepository.addCar() ini kontrak lama (Fase 1), interface-nya
   * `void` (fire-and-forget), dipertahankan apa adanya sebagai adapter, tidak diubah ke async. */
  private generateCarNibar(): string {
    const raw = `CAR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    return raw.padEnd(45, '0').slice(0, 45);
  }

  public updateCar(id: string, updatedData: Partial<Car>): void {
    const asset = this.assetRepository.findByNibar(id);
    const operational = this.operationalRepository.findByNibar(id);
    if (!asset || !operational) return;

    const previousStatus = vehicleToCarBase(asset, operational).status;
    const currentCar: Car = { ...vehicleToCarBase(asset, operational), x: 0, y: 0, routeProgress: 0, routeId: 0 };
    const mergedCar: Car = { ...currentCar, ...updatedData, id };

    const newAsset = carToVehicleAsset(mergedCar, asset.tahunAnggaran, asset.kodeLokasi, asset.sumberImporId);
    const newOperational = carToVehicleOperational(mergedCar, this.actorLabel());

    void Promise.all([this.assetRepository.upsert(newAsset), this.operationalRepository.upsert(newOperational)])
      .then(() => {
        if (updatedData.status && updatedData.status !== previousStatus) {
          let type: 'info' | 'warning' | 'success' = 'info';
          if (updatedData.status === 'Service') type = 'warning';
          if (updatedData.status === 'Aktif') type = 'success';
          this.addLog(id, mergedCar.plateNumber, mergedCar.driverName || 'Driver', `${mergedCar.agency} • Status diubah menjadi: ${updatedData.status}`, type);
        }
        void this.auditRepository.append({
          pelakuId: this.actorId(),
          pelakuNama: this.actorLabel(),
          aksi: 'ubah',
          entitas: 'VehicleAsset',
          entitasId: id,
          nilaiLama: asset,
          nilaiBaru: newAsset
        });
      })
      .catch(error => {
        console.error('Gagal memperbarui aset kendaraan:', error);
        this.addLog(id, mergedCar.plateNumber, mergedCar.driverName || 'Driver', `${mergedCar.agency} • Gagal menyimpan perubahan — coba lagi`, 'danger');
      });
  }

  public deleteCar(id: string): void {
    const asset = this.assetRepository.findByNibar(id);
    if (!asset) return;

    void Promise.all([this.assetRepository.remove(id), this.operationalRepository.remove(id)])
      .then(() => {
        this.addLog(id, asset.nomorPolisi, asset.pemegang ?? '', `${asset.lokasi} • Aset dihapus dari sistem`, 'warning');
        void this.auditRepository.append({
          pelakuId: this.actorId(),
          pelakuNama: this.actorLabel(),
          aksi: 'hapus',
          entitas: 'VehicleAsset',
          entitasId: id,
          nilaiLama: asset
        });
      })
      .catch(error => {
        console.error('Gagal menghapus aset kendaraan:', error);
        this.addLog(id, asset.nomorPolisi, asset.pemegang ?? '', `${asset.lokasi} • Gagal menghapus aset — coba lagi`, 'danger');
      });
  }

  public addLog(
    carId: string,
    plateNumber: string,
    driverName: string,
    activity: string,
    type: 'info' | 'warning' | 'success' | 'danger' = 'info'
  ): void {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const logType: 'info' | 'warning' | 'success' = type === 'danger' ? 'warning' : type;

    const newLog: TravelLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  /** Dipanggil dari modal Pengaturan (superadmin). Tidak menyentuh users/audit. */
  public async resetDatabase(): Promise<void> {
    this.telemetrySimulator.stop();

    await Promise.all([
      ...this.assetRepository.assets().map(a => this.assetRepository.remove(a.nibar)),
      ...this.operationalRepository.operational().map(o => this.operationalRepository.remove(o.nibar))
    ]);

    const { assets, operational } = buildSeedFleet();
    await Promise.all([
      ...assets.map(a => this.assetRepository.upsert(a)),
      ...operational.map(o => this.operationalRepository.upsert(o))
    ]);

    localStorage.removeItem(LOGS_STORAGE_KEY);
    this.logsSignal.set(INITIAL_LOGS);
    this.saveLogsToStorage(INITIAL_LOGS);
  }
}
