import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { UserRepository } from '../../../../core/repositories/user.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { Loan } from '../../../../core/models/loan.model';

@Component({
  selector: 'app-persetujuan',
  imports: [CommonModule],
  templateUrl: './persetujuan.html',
  standalone: true
})
export class PersetujuanComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private userRepository = inject(UserRepository);
  private authService = inject(AuthService);

  private currentUser = this.authService.currentUser;
  private isAdmin = computed(() => this.authService.peran() === 'admin');

  public antrean = computed<Loan[]>(() => {
    const pending = this.loanRepository.loans().filter(l => l.status === 'Diajukan');
    if (this.isAdmin()) {
      const unitKerja = this.currentUser()?.unitKerja;
      return pending.filter(l => this.assetRepository.findByNibar(l.nibar)?.statusPenggunaan === unitKerja);
    }
    return pending;
  });

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }

  pemohonNama(pemohonId: string): string {
    return this.userRepository.findById(pemohonId)?.nama ?? pemohonId;
  }

  private actorLabel(): string {
    return this.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.currentUser()?.id ?? '';
  }

  async setujui(loan: Loan): Promise<void> {
    const input = prompt('Odometer kendaraan saat diserahkan (km):');
    if (input === null) return;
    const odometerKeluar = Number(input);
    if (!Number.isFinite(odometerKeluar) || odometerKeluar < 0) {
      alert('Odometer tidak valid.');
      return;
    }

    const updated: Loan = { ...loan, status: 'Berjalan', disetujuiOleh: this.actorLabel(), odometerKeluar };
    await this.loanRepository.upsert(updated);

    const operational = this.operationalRepository.findByNibar(loan.nibar);
    if (operational) {
      await this.operationalRepository.upsert({ ...operational, status: 'Dipinjam', diperbaruiPada: new Date().toISOString(), diperbaruiOleh: this.actorLabel() });
    }

    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'setujui-peminjaman',
      entitas: 'Loan',
      entitasId: loan.id,
      nilaiLama: 'Diajukan',
      nilaiBaru: 'Berjalan'
    });
  }

  async tolak(loan: Loan): Promise<void> {
    const catatan = prompt('Alasan penolakan (wajib diisi):');
    if (!catatan) return;

    const updated: Loan = { ...loan, status: 'Ditolak', catatanPenolakan: catatan };
    await this.loanRepository.upsert(updated);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'tolak-peminjaman',
      entitas: 'Loan',
      entitasId: loan.id,
      nilaiLama: 'Diajukan',
      nilaiBaru: `Ditolak: ${catatan}`
    });
  }
}
