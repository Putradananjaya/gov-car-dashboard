import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { computeStatusPajak } from '../../../../shared/asset-grouping';
import { toVehicleView } from '../../../../core/adapters/vehicle-view.model';

@Component({
  selector: 'app-dashboard-pegawai',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-pegawai.html',
  standalone: true
})
export class DashboardPegawaiComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private authService = inject(AuthService);

  public currentUser = this.authService.currentUser;

  computeStatusPajak = computeStatusPajak;

  // Keterbatasan: `pemegang` adalah teks bebas (dari Excel/form), bukan
  // foreign key ke User — pencocokan berbasis kesamaan nama persis.
  public kendaraanDipegang = computed(() => {
    const nama = this.currentUser()?.nama;
    if (!nama) return [];
    const operationalByNibar = new Map(this.operationalRepository.operational().map(o => [o.nibar, o]));
    return this.assetRepository.assets()
      .filter(a => !a.dihapusPada && a.pemegang === nama)
      .map(a => {
        const operational = operationalByNibar.get(a.nibar);
        return operational ? toVehicleView(a, operational) : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });

  public pengingatPajak = computed(() =>
    this.kendaraanDipegang().filter(v => {
      const status = computeStatusPajak(v.masaBerlakuPajak);
      return status === 'segera-habis' || status === 'kadaluarsa';
    })
  );

  public pengajuanSaya = computed(() => {
    const userId = this.currentUser()?.id;
    return this.loanRepository.loans()
      .filter(l => l.pemohonId === userId)
      .slice()
      .sort((a, b) => b.rencanaMulai.localeCompare(a.rencanaMulai));
  });

  public pengajuanAktifCount = computed(() => this.pengajuanSaya().filter(l => l.status === 'Diajukan' || l.status === 'Berjalan').length);

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }
}
