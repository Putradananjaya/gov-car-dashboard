import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { UserRepository } from '../../../../core/repositories/user.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { Loan } from '../../../../core/models/loan.model';
import { TolakModalComponent } from '../../../components/tolak-modal/tolak-modal';
import { SerahTerimaModalComponent } from '../../../components/serah-terima-modal/serah-terima-modal';
import { BastPrintComponent, BastMode } from '../../../components/bast-print/bast-print';

@Component({
  selector: 'app-persetujuan',
  imports: [CommonModule, TolakModalComponent, SerahTerimaModalComponent, BastPrintComponent],
  templateUrl: './persetujuan.html',
  standalone: true
})
export class PersetujuanComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private userRepository = inject(UserRepository);
  private authService = inject(AuthService);

  private currentUser = this.authService.currentUser;
  private isAdmin = computed(() => this.authService.peran() === 'admin');

  public canSetujuiTahap1 = computed(() => {
    const peran = this.authService.peran();
    return peran === 'superadmin' || peran === 'admin';
  });

  public canSerahTerima = computed(() => {
    const peran = this.authService.peran();
    return peran === 'superadmin' || peran === 'pejabat_penatausahaan';
  });

  public canTolak = computed(() => this.canSetujuiTahap1() || this.canSerahTerima());

  private loansTerfilter = computed<Loan[]>(() => {
    const all = this.loanRepository.loans();
    if (this.isAdmin()) {
      const unitKerja = this.currentUser()?.unitKerja;
      return all.filter(l => this.assetRepository.findByNibar(l.nibar)?.statusPenggunaan === unitKerja);
    }
    return all;
  });

  public menungguPersetujuan = computed<Loan[]>(() => this.loansTerfilter().filter(l => l.status === 'Diajukan'));
  public menungguSerahTerima = computed<Loan[]>(() => this.loansTerfilter().filter(l => l.status === 'Disetujui'));

  public tolakTarget = signal<Loan | null>(null);
  public serahTerimaTarget = signal<Loan | null>(null);
  public bastTampil = signal<{ loan: Loan; mode: BastMode } | null>(null);

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }

  pemohonNama(pemohonId: string): string {
    return this.userRepository.findById(pemohonId)?.nama ?? pemohonId;
  }

  private actorId(): string {
    return this.currentUser()?.id ?? '';
  }

  private actorLabel(): string {
    return this.currentUser()?.nama ?? 'sistem';
  }

  async setujuiTahap1(loan: Loan): Promise<void> {
    try {
      await this.loanRepository.setujuiTahap1(loan.id);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'setujui-tahap1-peminjaman',
        entitas: 'Loan',
        entitasId: loan.id,
        nilaiLama: 'Diajukan',
        nilaiBaru: 'Disetujui'
      });
    } catch (error: unknown) {
      console.error('Gagal menyetujui peminjaman:', error);
      const pesan = this.pesanKesalahan(error) ?? 'Gagal menyetujui peminjaman. Periksa koneksi Anda dan coba lagi.';
      alert(pesan);
    }
  }

  private pesanKesalahan(error: unknown): string | null {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error?: { message?: string | string[] } }).error;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    }
    return null;
  }

  bukaTolak(loan: Loan): void {
    this.tolakTarget.set(loan);
  }

  tutupTolak(): void {
    this.tolakTarget.set(null);
  }

  onDitolak(): void {
    this.tolakTarget.set(null);
  }

  bukaSerahTerima(loan: Loan): void {
    this.serahTerimaTarget.set(loan);
  }

  tutupSerahTerima(): void {
    this.serahTerimaTarget.set(null);
  }

  onSerahTerimaSelesai(loan: Loan): void {
    this.serahTerimaTarget.set(null);
    this.bastTampil.set({ loan, mode: 'serah' });
  }

  tutupBast(): void {
    this.bastTampil.set(null);
  }
}
