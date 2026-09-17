import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { UserRepository } from '../../../core/repositories/user.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../components/has-permission/has-permission.directive';
import { KembalikanModalComponent } from '../../components/kembalikan-modal/kembalikan-modal';
import { BastPrintComponent, BastMode } from '../../components/bast-print/bast-print';
import { Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-peminjaman',
  imports: [CommonModule, RouterLink, HasPermissionDirective, KembalikanModalComponent, BastPrintComponent],
  templateUrl: './peminjaman.html',
  standalone: true
})
export class PeminjamanComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private loanRepository = inject(LoanRepository);
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

  public kembalikanTarget = signal<Loan | null>(null);
  public bastTampil = signal<{ loan: Loan; mode: BastMode } | null>(null);

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }

  pemohonNama(pemohonId: string): string {
    return this.userRepository.findById(pemohonId)?.nama ?? pemohonId;
  }

  isDraftMilikSendiri(loan: Loan): boolean {
    return loan.status === 'Draft' && loan.pemohonId === this.currentUser()?.id;
  }

  canKembalikan(loan: Loan): boolean {
    if (loan.status !== 'Berjalan') return false;
    return loan.pemohonId === this.currentUser()?.id || this.permissionService.can('peminjaman.setujui');
  }

  bukaKembalikan(loan: Loan): void {
    this.kembalikanTarget.set(loan);
  }

  tutupKembalikan(): void {
    this.kembalikanTarget.set(null);
  }

  onKembalikanSelesai(loan: Loan): void {
    this.kembalikanTarget.set(null);
    this.bastTampil.set({ loan, mode: 'kembali' });
  }

  tutupBast(): void {
    this.bastTampil.set(null);
  }
}
