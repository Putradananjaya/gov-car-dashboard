import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { UserRepository } from '../../../core/repositories/user.repository';
import { Loan, StatusPeminjaman } from '../../../core/models/loan.model';
import { TanggalIdPipe } from '../../../shared/pipes/tanggal-id.pipe';

const STATUS_MEMBLOKIR_JADWAL: StatusPeminjaman[] = ['Diajukan', 'Diverifikasi', 'Disetujui', 'Berjalan'];

export interface KelompokJadwal {
  nibar: string;
  label: string;
  loans: Loan[];
}

@Component({
  selector: 'app-jadwal',
  imports: [CommonModule, TanggalIdPipe],
  templateUrl: './jadwal.html',
  standalone: true
})
export class JadwalComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private loanRepository = inject(LoanRepository);
  private userRepository = inject(UserRepository);

  public kelompok = computed<KelompokJadwal[]>(() => {
    const relevan = this.loanRepository.loans().filter(l => STATUS_MEMBLOKIR_JADWAL.includes(l.status));

    const byNibar = new Map<string, Loan[]>();
    for (const loan of relevan) {
      if (!byNibar.has(loan.nibar)) byNibar.set(loan.nibar, []);
      byNibar.get(loan.nibar)!.push(loan);
    }

    return Array.from(byNibar.entries())
      .map(([nibar, loans]) => ({
        nibar,
        label: this.vehicleLabel(nibar),
        loans: loans.slice().sort((a, b) => a.rencanaMulai.localeCompare(b.rencanaMulai))
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }

  pemohonNama(pemohonId: string): string {
    return this.userRepository.findById(pemohonId)?.nama ?? pemohonId;
  }
}
