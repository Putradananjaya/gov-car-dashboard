import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { UserRepository } from '../../../core/repositories/user.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-peminjaman',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './peminjaman.html',
  standalone: true
})
export class PeminjamanComponent {
  private fb = inject(FormBuilder);
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

  public showAjukanModal = signal(false);
  public ajukanForm!: FormGroup;

  public availableVehicles = computed(() => {
    const operationalByNibar = new Map(this.operationalRepository.operational().map(o => [o.nibar, o]));
    const unitKerja = this.currentUser()?.unitKerja;

    return this.assetRepository.assets()
      .filter(a => !a.dihapusPada)
      .filter(a => operationalByNibar.get(a.nibar)?.status === 'Tersedia')
      .filter(a => !this.isAdmin() || a.statusPenggunaan === unitKerja);
  });

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

  openAjukanModal(): void {
    this.ajukanForm = this.fb.group({
      nibar: ['', Validators.required],
      keperluan: ['', Validators.required],
      tujuan: ['', Validators.required],
      rencanaMulai: ['', Validators.required],
      rencanaSelesai: ['', Validators.required]
    });
    this.showAjukanModal.set(true);
  }

  closeAjukanModal(): void {
    this.showAjukanModal.set(false);
  }

  isInvalid(controlName: string): boolean {
    const control = this.ajukanForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async submitAjukan(): Promise<void> {
    if (this.ajukanForm.invalid) {
      this.ajukanForm.markAllAsTouched();
      return;
    }

    const values = this.ajukanForm.value;
    const loan: Loan = {
      id: `loan-${Date.now()}`,
      nibar: values.nibar,
      pemohonId: this.actorId(),
      keperluan: values.keperluan,
      tujuan: values.tujuan,
      rencanaMulai: values.rencanaMulai,
      rencanaSelesai: values.rencanaSelesai,
      realisasiKembali: null,
      status: 'Diajukan',
      disetujuiOleh: null,
      catatanPenolakan: null,
      odometerKeluar: null,
      odometerMasuk: null
    };

    await this.loanRepository.upsert(loan);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'ajukan-peminjaman',
      entitas: 'Loan',
      entitasId: loan.id,
      nilaiBaru: loan
    });

    this.closeAjukanModal();
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
