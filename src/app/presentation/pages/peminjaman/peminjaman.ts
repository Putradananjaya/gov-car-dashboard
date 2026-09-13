import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { UserRepository } from '../../../core/repositories/user.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../components/has-permission/has-permission.directive';
import { Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-peminjaman',
  imports: [CommonModule, RouterLink, HasPermissionDirective],
  templateUrl: './peminjaman.html',
  standalone: true
})
export class PeminjamanComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private userRepository = inject(UserRepository);
  private authService = inject(AuthService);
  public permissionService = inject(PermissionService);

  public currentUser = this.authService.currentUser;
  private isAdmin = computed(() => this.authService.peran() === 'admin');
  private isPegawai = computed(() => this.authService.peran() === 'pegawai');

  public loans = computed<Loan[]>(() => {
    const all = this.loanRepository.loans().slice().sort((a, b) => b.rencanaMulai.localeCompare(a.rencanaMulai));

    if (this.isPegawai()) {
      return all.filter(l => l.pemohonId === this.currentUser()?.id);
    }
    if (this.isAdmin()) {
      const unitKerja = this.currentUser()?.unitKerja;
      return all.filter(l => this.assetRepository.findByNibar(l.nibar)?.statusPenggunaan === unitKerja);
    }
    return all;
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

  isDraftMilikSendiri(loan: Loan): boolean {
    return loan.status === 'Draft' && loan.pemohonId === this.currentUser()?.id;
  }

  canKembalikan(loan: Loan): boolean {
    if (loan.status !== 'Berjalan') return false;
    return loan.pemohonId === this.currentUser()?.id || this.permissionService.can('peminjaman.setujui');
  }

  async kembalikan(loan: Loan): Promise<void> {
    const input = prompt('Odometer saat kendaraan dikembalikan (km):');
    if (input === null) return;
    const odometerMasuk = Number(input);
    if (!Number.isFinite(odometerMasuk) || odometerMasuk < 0) {
      alert('Odometer tidak valid.');
      return;
    }

    const updated: Loan = { ...loan, status: 'Selesai', realisasiKembali: new Date().toISOString().slice(0, 10), odometerMasuk };

    try {
      await this.loanRepository.upsert(updated);

      const operational = this.operationalRepository.findByNibar(loan.nibar);
      if (operational) {
        await this.operationalRepository.upsert({ ...operational, status: 'Tersedia', diperbaruiPada: new Date().toISOString(), diperbaruiOleh: this.actorLabel() });
      }

      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'kembalikan-peminjaman',
        entitas: 'Loan',
        entitasId: loan.id,
        nilaiLama: loan.status,
        nilaiBaru: 'Selesai'
      });
    } catch (error) {
      console.error('Gagal memproses pengembalian:', error);
      alert('Gagal memproses pengembalian. Periksa koneksi Anda dan coba lagi.');
    }
  }
}
