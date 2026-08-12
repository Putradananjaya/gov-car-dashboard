import { Injectable, signal, Signal, inject } from '@angular/core';
import { VehicleOperationalRepository } from '../../core/repositories/vehicle-operational.repository';
import { ROUTES } from '../db/legacy-car-generator';

export interface SimulatedPosition {
  x: number;
  y: number;
  routeProgress: number;
  routeId: number;
  speed: number;
  fuelLevel: number;
}

/**
 * Simulasi posisi kendaraan berstatus "Dipinjam" pada kanvas ilustratif
 * /tracking. Murni state sementara di memori (K6 rencana implementasi) —
 * TIDAK ditulis ke IndexedDB. Mati secara default (K4); harus dinyalakan
 * eksplisit lewat start(), dan WAJIB dimatikan lewat stop() agar interval
 * tidak menyala selamanya di latar belakang.
 */
@Injectable({ providedIn: 'root' })
export class TelemetrySimulatorService {
  private operationalRepository = inject(VehicleOperationalRepository);

  private positionsSignal = signal<Map<string, SimulatedPosition>>(new Map());
  public readonly positions: Signal<Map<string, SimulatedPosition>> = this.positionsSignal;
  public readonly isRunning = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  public start(): void {
    if (this.intervalId) return;
    this.initializePositions();
    this.isRunning.set(true);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning.set(false);
  }

  public getPosition(nibar: string): SimulatedPosition | null {
    return this.positionsSignal().get(nibar) ?? null;
  }

  private initializePositions(): void {
    const map = new Map(this.positionsSignal());
    for (const op of this.operationalRepository.operational()) {
      if (op.status !== 'Dipinjam' || map.has(op.nibar)) continue;

      const routeId = Math.floor(Math.random() * ROUTES.length);
      const start = ROUTES[routeId][0];
      map.set(op.nibar, {
        x: start.x,
        y: start.y,
        routeProgress: 0,
        routeId,
        speed: op.telemetri?.kecepatan ?? 45,
        fuelLevel: op.telemetri?.levelBbm ?? 60
      });
    }
    this.positionsSignal.set(map);
  }

  private tick(): void {
    const movingNibar = new Set(
      this.operationalRepository.operational()
        .filter(o => o.status === 'Dipinjam')
        .map(o => o.nibar)
    );

    const previous = this.positionsSignal();
    const next = new Map<string, SimulatedPosition>();

    for (const nibar of movingNibar) {
      const prev = previous.get(nibar);
      let routeId = prev?.routeId ?? Math.floor(Math.random() * ROUTES.length);
      let progress = (prev?.routeProgress ?? 0) + 0.003;

      if (progress >= 1) {
        progress = 0;
        routeId = Math.floor(Math.random() * ROUTES.length);
      }

      const routePoints = ROUTES[routeId];
      const segmentCount = routePoints.length - 1;
      const exactSegment = progress * segmentCount;
      const segmentIndex = Math.floor(exactSegment);
      const segmentProgress = exactSegment - segmentIndex;
      const startPoint = routePoints[segmentIndex];
      const endPoint = routePoints[Math.min(segmentIndex + 1, routePoints.length - 1)];

      const x = Math.round(startPoint.x + (endPoint.x - startPoint.x) * segmentProgress);
      const y = Math.round(startPoint.y + (endPoint.y - startPoint.y) * segmentProgress);

      let speed = (prev?.speed ?? 45) + Math.floor(Math.random() * 5) - 2;
      speed = Math.max(25, Math.min(80, speed));

      let fuelLevel = prev?.fuelLevel ?? 60;
      if (Math.random() > 0.85) {
        fuelLevel = Math.max(1, fuelLevel - 1);
        if (fuelLevel <= 8) fuelLevel = 100;
      }

      next.set(nibar, { x, y, routeProgress: progress, routeId, speed, fuelLevel });
    }

    this.positionsSignal.set(next);
  }
}
