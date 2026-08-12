import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { ServiceRepository } from '../../../../core/repositories/service.repository';
import { CarRepository } from '../../../../core/repositories/car.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { computeStatusPajak } from '../../../../shared/asset-grouping';
import { toVehicleView } from '../../../../core/adapters/vehicle-view.model';

@Component({
  selector: 'app-dashboard-admin',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-admin.html',
  standalone: true
})
export class DashboardAdminComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private serviceRepository = inject(ServiceRepository);
  private carRepository = inject(CarRepository);
  private authService = inject(AuthService);

  // Panel peta ilustratif memang masih memakai CarRepository lama (Fase 2) —
  // tracking/GPS di luar cakupan putaran ini.
  public miniMapCars = computed(() => this.carRepository.cars().filter(c => c.status === 'Digunakan').slice(0, 4));

  private unitKerja = computed(() => this.authService.currentUser()?.unitKerja ?? '');

  public opdViews = computed(() => {
    const operationalByNibar = new Map(this.operationalRepository.operational().map(o => [o.nibar, o]));
    return this.assetRepository.assets()
      .filter(a => !a.dihapusPada && a.statusPenggunaan === this.unitKerja())
      .map(a => {
        const operational = operationalByNibar.get(a.nibar);
        return operational ? toVehicleView(a, operational) : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });

  public totalAsetOpd = computed(() => this.opdViews().length);

  public pajakSegeraHabis = computed(() =>
    this.opdViews().filter(v => {
      const status = computeStatusPajak(v.masaBerlakuPajak);
      return status === 'segera-habis' || status === 'kadaluarsa';
    })
  );

  public asetRusak = computed(() => this.opdViews().filter(v => v.kondisi === 'Rusak Ringan' || v.kondisi === 'Rusak Berat'));

  public antreanPersetujuan = computed(() =>
    this.loanRepository.loans().filter(l => l.status === 'Diajukan' && this.assetRepository.findByNibar(l.nibar)?.statusPenggunaan === this.unitKerja())
  );

  public servisTerbaru = computed(() => {
    const nibarSet = new Set(this.opdViews().map(v => v.nibar));
    return this.serviceRepository.records()
      .filter(r => nibarSet.has(r.nibar))
      .slice()
      .sort((a, b) => b.tahun - a.tahun)
      .slice(0, 5);
  });

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }
}
