import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { UserRepository } from '../../../../core/repositories/user.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { PermissionService } from '../../../../core/auth/permission.service';
import { Loan } from '../../../../core/models/loan.model';
import { TolakModalComponent } from '../../../components/tolak-modal/tolak-modal';
import { SerahTerimaModalComponent } from '../../../components/serah-terima-modal/serah-terima-modal';
import { BastPrintComponent, BastMode } from '../../../components/bast-print/bast-print';
import { TanggalIdPipe } from '../../../../shared/pipes/tanggal-id.pipe';

@Component({
  selector: 'app-persetujuan',
  imports: [CommonModule, TolakModalComponent, SerahTerimaModalComponent, BastPrintComponent, TanggalIdPipe],
  templateUrl: './persetujuan.html',
  standalone: true
})
export class PersetujuanComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private userRepository = inject(UserRepository);
  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);

  private currentUser = this.authService.currentUser;

  // Dulu memeriksa peran secara langsung sehingga lepas dari matriks hak
  // akses — sekarang keduanya ikut pengaturan superadmin.
  public canVerifikasi = computed(() => this.permissionService.can('peminjaman.verifikasi'));

  public canSetujui = computed(() => this.permissionService.can('peminjaman.setujui'));

  public canSerahTerima = computed(() => this.permissionService.can('peminjaman.serahTerima'));

  // Penolakan sah di langkah 2 (kendaraan tidak tersedia) maupun langkah 3
  // (permohonan ditolak disertai alasan).
  public canTolak = computed(() => this.canVerifikasi() || this.canSetujui());

  /**
   * Dulu daftar ini disaring `asset.statusPenggunaan === user.unitKerja` untuk
   * peran admin. Penyaringan itu membandingkan dua kolom yang isinya tidak
   * pernah sama: `unitKerja` dipilih dari daftar OPD (dan untuk Pengurus
   * Barang berisi "Sekretariat Badan Keuangan, Pendapatan dan Aset Daerah"),
   * sedangkan `statusPenggunaan` adalah OPD pemegang kendaraan hasil impor
   * e-BMD. Akibatnya Pengurus Barang melihat daftar kosong tanpa penjelasan.
   *
   * SOP Peminjaman Kendaraan Dinas menunjuk SATU Pengurus Barang untuk seluruh
   * kendaraan dinas — tidak ada pembagian per-OPD — jadi penyaringannya
   * dihapus. Kalau kelak ada Pengurus Barang per-OPD, pembatasnya harus kolom
   * tersendiri di data pengguna, bukan `unitKerja` yang dipakai ulang.
   */
  private loansTerfilter = computed<Loan[]>(() => this.loanRepository.loans());

  /** Tiga antrean mengikuti langkah 2, 3, dan 4 SOP. */
  public menungguVerifikasi = computed<Loan[]>(() => this.loansTerfilter().filter(l => l.status === 'Diajukan'));
  public menungguPersetujuan = computed<Loan[]>(() => this.loansTerfilter().filter(l => l.status === 'Diverifikasi'));
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

  /** Langkah 2 SOP — kendaraan dinyatakan tersedia. */
  async verifikasi(loan: Loan): Promise<void> {
    try {
      await this.loanRepository.verifikasi(loan.id);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'verifikasi-ketersediaan-peminjaman',
        entitas: 'Loan',
        entitasId: loan.id,
        nilaiLama: 'Diajukan',
        nilaiBaru: 'Diverifikasi'
      });
    } catch (error: unknown) {
      alert(this.pesanKesalahan(error) ?? 'Gagal memverifikasi ketersediaan. Periksa koneksi Anda dan coba lagi.');
    }
  }

  /** Langkah 3 SOP — persetujuan atas permohonan yang sudah diverifikasi. */
  async setujui(loan: Loan): Promise<void> {
    try {
      await this.loanRepository.setujui(loan.id);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'setujui-peminjaman',
        entitas: 'Loan',
        entitasId: loan.id,
        nilaiLama: 'Diverifikasi',
        nilaiBaru: 'Disetujui'
      });
    } catch (error: unknown) {
      alert(this.pesanKesalahan(error) ?? 'Gagal menyetujui permohonan. Periksa koneksi Anda dan coba lagi.');
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
